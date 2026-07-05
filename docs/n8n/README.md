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
Webhook Evolution -> n8n Webhook inicial -> extraer instance_name -> consultar API/PostgreSQL FAQ Inn -> cargar Config Tenant -> normalizar Datos -> ejecutar agente.
```

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
Resolver Tenant → Normalizar Tenant → Config Tenant → … → Datos → TextoFinal → FAQ inn
```

- **Normalizar Tenant**: parsea `booking_config`, deriva `placeholder_map` si falta.
- **Config Tenant / Datos / TextoFinal**: nodos Code que propagan todas las variables de reservas al item del agente.
- El system prompt del agente usa `{{booking_url_template}}`, `{{validation_status}}`, etc. desde `$json` de **TextoFinal**.

## Workflow de referencia actual

```text
FAQ prototipo
```

Estado: prototipo de runtime multitenant.

Características incorporadas:

```text
Config Tenant como nodo Set temporal.
Redis TTL para pausa humana por chat.
Clave Redis: faqinn:pause:{tenant_id}:{agent_id}:{chat_id}.
Datos normaliza tenant, agent, chat y question.
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

La API `/api/runtime/tenant-config` resuelve solo por `instance_name` registrado en PostgreSQL. No devuelve campos de estado de conexión para evitar gates redundantes.

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

Config Tenant es temporal. En producción debe reemplazarse por una consulta a PostgreSQL/API de FAQ Inn basada en `evolution_instance_name`, manteniendo los mismos nombres de variables para no romper el runtime.
