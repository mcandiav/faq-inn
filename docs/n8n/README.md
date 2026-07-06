# n8n en FAQ Inn

## Hostnames internos EasyPanel (proyecto `n8n`)

| Servicio EasyPanel | Hostname interno | Puerto |
|---|---|---|
| API FAQ Inn (`inn-api`) | `n8n_inn-api` | 3000 |
| HTTP FAQ Inn | `n8n_inn-http` (si aplica) | 80 |
| PostgreSQL | `n8n_faq-inn_postgres` | 5432 |
| Evolution API | `n8n_evolution-api` | 8080 |
| n8n | `n8n_n8n` | 5678 |

Los nodos HTTP del workflow **FAQ prototipo** deben apuntar a:

```text
http://n8n_inn-api:3000/api/runtime/tenant-config
http://n8n_inn-api:3000/api/search
http://n8n_inn-api:3000/api/unanswered
```

Solo resuelven desde contenedores en la red `easypanel-n8n`.

## Rol de n8n

n8n será el runtime de ejecución conversacional, no la fuente de verdad del onboarding.

La app/backend FAQ Inn gobierna tenants, agentes, configuración, Evolution API, estado de onboarding y trazabilidad.

## Decisión vigente MVP

FAQ Inn usará un workflow n8n compartido y multitenant durante el MVP conversacional.

El onboarding debe guardar todos los datos del cliente/tenant en PostgreSQL/API. Cuando Evolution API envíe un evento al webhook inicial, n8n debe extraer el identificador de la instancia Evolution y consultar la configuración completa del tenant antes de ejecutar el agente.

No se crearán workflows n8n por tenant durante el MVP. Esa opción queda reservada para una decisión futura documentada si se requiere aislamiento, personalización fuerte o lógica conversacional distinta por cliente.

## Regla de resolución del tenant

La llave preferida de runtime es:

```text
evolution_instance_name
```

Relación esperada:

```text
evolution_instances.instance_name
  -> evolution_instances.tenant_id
  -> tenants.id
  -> tenant_settings / agents / faq_config / pause_config
```

El nombre exacto del campo recibido desde Evolution API debe confirmarse con un payload real. Posibles nombres a validar:

```text
instance
instanceName
instanceId
sender
apikey
```

## Flujo runtime esperado

```text
Webhook Evolution -> Parse Evolution -> Es mensaje entrante? -> Resolver Tenant (GET API plana) -> Detecta ** -> … -> Datos -> TextoFinal -> FAQ inn
```

## Separación de dominios (contrato vigente)

**Llave entre dominios:** `Parse Evolution.evolution_instance` → `GET /api/runtime/tenant-config?instance_name=…`

| Dominio Evolution (webhook → Parse Evolution) | Dominio inn-api (Resolver Tenant) |
|---|---|
| `chatInput`, `sessionId`, `remoteJid`, `pushName` | `tenant_id`, `tenant_slug`, `agent_id`, `initial_greeting` |
| `fromMe`, `event`, `message_type`, `source_channel` | motor reservas, `business_hours`, `policies` |
| `evolution_instance` (solo lookup) | `pause_trigger`, `pause_ttl_seconds`, `search_limit`, `unanswered_limit` |
| | `evolution_instance_name`, `evolution_api_url`, `evolution_api_key` |

**Derivados en n8n (Datos):** `Texto`, `question`, `chat_id`, `pause_key`, etc. — merge de ambos dominios, no viven en ninguna API.

## Variables mínimas cargadas por runtime

```text
tenant_id          (slug técnico, mismo valor que tenant_slug)
tenant_slug
tenant_db_id       (id numérico PostgreSQL; auditoría)
tenant_display_name
business_type      (vertical, ej. hotel)
agent_id
agent_name
initial_greeting
primary_language
booking_url_base
booking_url_template
booking_url_mode
validation_status
confidence_score
booking_config            (objeto JSON)
booking_config_json       (string para prompts n8n)
placeholder_map           (objeto, derivado si falta en BD)
required_fields
date_format
supports_rooms / supports_children / supports_child_ages
evolution_instance_name
evolution_api_url
evolution_api_key
faq_search_endpoint
unanswered_endpoint
pause_enabled / pause_trigger / pause_ttl_seconds / pause_scope
```

## Workflow FAQ prototipo — propagación al agente

Cadena vigente:

```text
Parse Evolution → Es mensaje entrante? → Resolver Tenant → Detecta ** → … → Datos → TextoFinal → FAQ inn
```

- **Parse Evolution**: extrae `chatInput`, `sessionId`, `evolution_instance`, `source_channel` del webhook Evolution.
- **Resolver Tenant**: `GET /api/runtime/tenant-config?instance_name=…` devuelve solo **config del tenant** (item plano). El mensaje (`chatInput`, `sessionId`) viene de **Parse Evolution**, no de la API.
- **Datos / TextoFinal**: merge **Parse Evolution** + **Resolver Tenant**; propaga variables al agente.
- El system prompt del agente usa `{{booking_url_template}}`, `{{validation_status}}`, etc. desde `$json` de **TextoFinal**.

## Memoria conversacional PostgreSQL (dominio n8n)

**No** forma parte del esquema ni migraciones de FAQ Inn API. Es infraestructura del runtime n8n.

Tabla: **`n8n_faq_inn`** — la crea el nodo **Postgres Chat Memory** la primera vez que escribe (si no existe). Esquema mínimo LangChain:

| Campo | Tipo | Uso |
|---|---|---|
| `id` | SERIAL | PK autoincremental |
| `session_id` | VARCHAR(255) | Clave de sesión |
| `message` | JSONB | Mensaje LangChain (rol + contenido) |

n8n y FAQ Inn comparten el mismo servidor PostgreSQL (`n8n_pgvector`, base **`n8n`** para memoria LangChain en workflows de referencia), pero **solo n8n** gestiona la tabla de chat memory.

**Session ID recomendado** (scope por tenant + agente + chat WhatsApp):

```text
faqinn:memory:{tenant_slug}:{agent_id}:{chat_id}
```

Expresión en Postgres Chat Memory:

```text
={{ 'faqinn:memory:' + $('Datos').item.json.tenant_slug + ':' + $('Datos').item.json.agent_id + ':' + $('Datos').item.json.chat_id }}
```

Configuración del nodo: `tableName = n8n_faq_inn`, `contextWindowLength = 8`.

## Workflow de referencia actual

```text
FAQ prototipo
```

Estado: prototipo de runtime multitenant.

Características incorporadas:

```text
Resolver Tenant (GET inn-api) devuelve solo config tenant.
Redis TTL para pausa humana por chat.
Clave Redis: faqinn:pause:{tenant_slug}:{agent_id}:{chat_id}.
Datos merge Evolution + inn-api.
initial_greeting vive como variable, no como texto fijo del prompt.
Respostas y SemResposta reciben tenant_id, tenant_slug y agent_id.
```

`tenant_id` en runtime es el **slug** (`miguel-telefono`), no el id numérico de PostgreSQL. Coincide con el filtro Qdrant y con `docs/N8N-SEARCH.md`.

## Sin verificación de conexión en runtime

Regla alineada con [Evolution API](../evolution-api/README.md):

```text
Si la instancia no está connected, Evolution no entrega MESSAGES_UPSERT al webhook.
n8n no debe revalidar whatsapp_status, tenant_status ni consultar Evolution en el path conversacional.
```

Prohibido en el workflow (nodos IF / HTTP extra):

```text
Consultar Evolution getConnectionState antes de responder
Rechazar mensaje si tenant_status != active
Rechazar mensaje si whatsapp_status != connected
```

La API `/api/runtime/tenant-config` resuelve por `instance_name` registrado en PostgreSQL y devuelve el tenant aplanado. `chatInput` y `sessionId` los extrae n8n del webhook (Parse Evolution). No devuelve campos de estado de conexión para evitar gates redundantes.

`evolution_api_url` en runtime apunta a la **URL interna** (`http://n8n_evolution-api:8080`) para el nodo Enviar WhatsApp desde n8n.

## Pausa humana

La pausa humana no debe implementarse con Wait de n8n ni apagando workflows.

La regla vigente es Redis TTL por chat:

```text
pause_enabled=true
pause_trigger=**
pause_ttl_seconds=300
pause_scope=chat
pause_mode=redis_ttl
```

Mientras exista la clave Redis de pausa, el runtime n8n no debe responder al cliente.

## Regla de evolución del prototipo

El aplanado del tenant vive en la API (`buildRuntimeWorkflowItem` en `runtimeService.js`). El mensaje WhatsApp y la clave Redis de pausa se arman en n8n referenciando **Parse Evolution** + **Resolver Tenant** (`Datos`, Redis, Enviar WhatsApp).
