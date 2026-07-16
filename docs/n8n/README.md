# n8n en FAQ Inn

## Hostnames internos EasyPanel (proyecto `n8n`)

| Servicio EasyPanel | Hostname interno | Puerto |
|---|---|---|
| API FAQ Inn (`inn-api`) | `n8n_inn-api` | 3000 |
| HTTP FAQ Inn | `n8n_inn-http` (si aplica) | 80 |
| PostgreSQL | `n8n_faq-inn_postgres` | 5432 |
| Evolution API | `n8n_evolution-api` | 8080 |
| n8n | `n8n_n8n` | 5678 |

Los nodos HTTP del workflow **FAQ Productivo** deben apuntar a:

```text
http://n8n_inn-api:3000/api/runtime/tenant-config
http://n8n_inn-api:3000/api/runtime/conversation-state
http://n8n_inn-api:3000/api/runtime/conversation-control
http://n8n_inn-api:3000/api/search
http://n8n_inn-api:3000/api/unanswered
http://n8n_inn-api:3000/api/runtime/booking-link
http://n8n_inn-api:3000/api/runtime/agenda-link
```

Solo resuelven desde contenedores en la red `easypanel-n8n`.

## Backups del workflow productivo

Backup versionado en repo (pre-migración suspensión Redis):

```text
docs/n8n/workflows/backups/FAQ-Productivo.rt5MZuQBonSFwS7J.2026-07-08.json
```

Referencia de la migración suspensión PostgreSQL (julio 2026):

```text
scripts/n8n-faq-v2-create.json
```

Workflow sandbox usado para validar antes del merge: **FAQ V2.0** (`K4skbzUW8tO4s69S`, webhook `faq-v2-0`). La lógica quedó portada a **FAQ Productivo** el 2026-07-15.

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
  -> tenant_settings / agents / faq_config / conversation_states
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
Webhook Evolution
  -> If (messageType texto)
  -> Datos Tenant (GET tenant-config)
  -> ¿Comando control? (fromMe + match exacto agent_off/on_trigger)
       | true  -> Control conversacion (POST) -> stop
       | false -> Estado conversacion (GET)
            -> ¿Agente activo? (no suspended + fromMe=false)
                 | true  -> Armar SPrompt -> FAQ inn -> Enviar WhatsApp
                 | false -> stop
```

## Separación de dominios (contrato vigente)

**Llave entre dominios:** `Parse Evolution.evolution_instance` → `GET /api/runtime/tenant-config?instance_name=…`

El campo de objetivo en esa respuesta es `objetivo_slug` (misma columna `tenant_settings.objetivo_slug` que usa Admin en `GET /api/admin/tenants/:id`). Ver README principal §8.2.2.

| Dominio Evolution (webhook → Parse Evolution) | Dominio inn-api (Resolver Tenant) |
|---|---|
| `chatInput`, `sessionId`, `remoteJid`, `pushName` | `tenant_id`, `tenant_slug`, `agent_id`, `initial_greeting` |
| `fromMe`, `event`, `message_type`, `source_channel` | motor reservas, `business_hours`, `policies` |
| `evolution_instance` (solo lookup) | `agent_off_trigger`, `agent_on_trigger`, `search_limit`, `unanswered_limit` |
| | `evolution_instance_name`, `evolution_api_url`, `evolution_api_key` |

**Derivados en n8n:** `chat_id` (dígitos de `remoteJid`), texto del mensaje, `agent_status` / `conversation_status` desde los endpoints de conversación. El estado de suspensión **no** vive en Redis ni en variables del merge local.

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
custom_sprompt
sprompt.*                 (columnas del objetivo activo: role/limits/tools/…)
agent_off_trigger         (default **)
agent_on_trigger          (default ##)
```

Estado de conversación (runtime, no viene en tenant-config):

```text
agent_status              active | suspended
conversation_status       active | suspended
```

## Workflow FAQ Productivo — Armar SPrompt y `custom_sprompt`

Workflow productivo vigente (backup versionado arriba): **FAQ Productivo**.

Cadena relevante al system prompt (rama activa del agente):

```text
… → ¿Agente activo? → Armar SPrompt → FAQ inn (systemMessage)
```

1. **Datos Tenant** carga `custom_sprompt`, `sprompt` y triggers desde `GET /api/runtime/tenant-config`.
2. **Armar SPrompt** (Code) resuelve tokens neutros (`tenant_display_name`, `url`, `today`, `validation_status`, etc.) en cada columna del objetivo y en `custom_sprompt`.
3. El **systemMessage** del AI Agent concatena, en este orden:

```text
{{ $('Armar SPrompt').item.json.rol }}
{{ $('Armar SPrompt').item.json.limites }}
{{ $('Armar SPrompt').item.json.tools }}
{{ $('Armar SPrompt').item.json.interpretar_fecha }}
{{ $('Armar SPrompt').item.json.data_collect }}
{{ $('Armar SPrompt').item.json.links }}
{{ $('Armar SPrompt').item.json.custom_sprompt }}
```

Reglas:

- `custom_sprompt` vacío → no altera el prompt.
- Solo Admin lo edita (no el cliente del tenant).
- No hardcodear el prompt completo en el nodo del agente; siempre partir de **Armar SPrompt**.

## Workflow FAQ Productivo — cadena de suspensión y agente

Cadena vigente (julio 2026):

```text
Webhook → If → Datos Tenant → ¿Comando control? → … → Armar SPrompt → FAQ inn
```

- **Datos Tenant**: `GET /api/runtime/tenant-config?instance_name=…` — config aplanada del tenant (incluye `agent_off_trigger` / `agent_on_trigger`).
- **¿Comando control?**: `fromMe === true` y mensaje **exacto** igual a `agent_off_trigger` o `agent_on_trigger`.
- **Control conversacion**: `POST /api/runtime/conversation-control` con `tenant_db_id`, `agent_id`, `chat_id`, `message`, `from_me: true`. Responde `action: suspend|resume` y actualiza PostgreSQL (`conversation_states`).
- **Estado conversacion**: `GET /api/runtime/conversation-state` con la misma clave de chat.
- **¿Agente activo?**: continúa solo si `agent_status !== 'suspended'` **y** `fromMe === false` (mensaje del cliente).
- El system prompt pasa por **Armar SPrompt** e incluye `custom_sprompt` al final.

### Reglas operativas de los comandos

| Condición | Efecto |
|---|---|
| Negocio envía exactamente `**` (o `agent_off_trigger`) | Suspende el agente en ese chat |
| Negocio envía exactamente `##` (o `agent_on_trigger`) | Reactiva el agente en ese chat |
| Cliente envía `**` o texto con `**` al inicio | No es comando; no suspende |
| Cliente escribe mientras `suspended` | Flujo termina en No Operation (sin respuesta) |
| Negocio escribe texto normal (sin comando exacto) | No pasa por Control conversacion; el flujo no “resuelve” la intervención humana (responsabilidad del operador) |

Clave de estado en API (PostgreSQL):

```text
tenant_id + agent_id + chat_id
```

`chat_id` = dígitos de `remoteJid` (misma expresión que memoria y SemResposta).

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

| Workflow | ID n8n | Webhook | Rol |
|---|---|---|---|
| **FAQ Productivo** | `rt5MZuQBonSFwS7J` | `faq-prototipo` | Runtime multitenant activo (Evolution global) |
| FAQ V2.0 | `K4skbzUW8tO4s69S` | `faq-v2-0` | Sandbox de validación; misma lógica que Productivo tras merge 2026-07-15 |
| FAQ prototipo | — | — | Legado / referencia histórica |

Estado: **FAQ Productivo** es el runtime multitenant activo. Backup pre-migración: `docs/n8n/workflows/backups/FAQ-Productivo.rt5MZuQBonSFwS7J.2026-07-08.json`.

Características incorporadas (Productivo, post-migración):

```text
Datos Tenant (GET tenant-config): custom_sprompt, sprompt, agent_off_trigger, agent_on_trigger.
Armar SPrompt: tokens neutros + custom_sprompt.
Suspensión persistente PostgreSQL (sin Redis, sin TTL).
Nodos: ¿Comando control? / Control conversacion / Estado conversacion / ¿Agente activo?
initial_greeting como variable, no texto fijo del prompt.
Respostas y SemResposta: tenant_id, tenant_slug, agent_id.
Tools: GenerarLinkReserva, GenerarLinkAgenda, Enviar WhatsApp.
```

### Migración n8n — suspensión Redis → PostgreSQL (2026-07-15)

**Contexto arquitectónico:** la decisión ya estaba en bitácora **V1.22 / V1.23** (rama `api`). El port a **FAQ Productivo** fue implementación operativa en n8n (sandbox **FAQ V2.0** → Productivo); **no** introdujo una decisión arquitectónica nueva ni pasó por una ronda de arquitecto adicional. Documentación alineada en README §8.3 / §14.6 (V1.17 operativa en rama `http`).

**Eliminado de FAQ Productivo:**

```text
Detecta comando     (prefijo en modelo anterior)
Redis pausa         (INCR + TTL)
Redis consulta pausa
¿Pausa vigente?
```

**Añadido (equivalente FAQ V2.0):**

```text
¿Comando control?
Control conversacion   POST /api/runtime/conversation-control
Estado conversacion    GET  /api/runtime/conversation-state
¿Agente activo?
```

**Cambio de comportamiento respecto al modelo Redis:**

- Antes: mensaje del negocio que **empezaba** con `**` activaba una suspensión temporal.
- Ahora: solo suspende/reactiva con mensaje **exacto** `**` o `##` desde `fromMe: true`.
- La suspensión no vence sola; solo `##` (o `agent_on_trigger`) la levanta.

Validación en sandbox: ejecuciones FAQ V2.0 `15097`–`15106` (tenant `faqinn_mcandia`). Productivo verificado operativo el mismo día.

`tenant_id` en runtime es el **slug** (`miguel-telefono`), no el id numérico de PostgreSQL. Coincide con el filtro Qdrant y con `docs/N8N-SEARCH.md`.

**Nota UI (fuera de n8n):** el botón **Descargar Excel** del dashboard FAQ es export CSV en el front HTTP; no forma parte del workflow.

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

## Suspensión del agente (intervención del operador)

La suspensión **no** debe implementarse con Wait de n8n, apagando workflows ni Redis TTL.

Regla vigente (API + n8n):

```text
agent_off_trigger=**     (configurable por tenant, 2 caracteres)
agent_on_trigger=##      (configurable por tenant, 2 caracteres)
pause_scope=chat         (implícito: clave tenant_id + agent_id + chat_id)
persistencia=PostgreSQL  (tabla conversation_states)
```

Mientras `conversation_status = suspended` para ese chat, n8n no ejecuta FAQ inn ni Enviar WhatsApp ante mensajes del cliente (`fromMe: false`).

Documentación operador: [../onboarding/pausa-operador.md](../onboarding/pausa-operador.md) (texto UI; la implementación técnica ya no usa Redis).

## Regla de evolución del prototipo

El aplanado del tenant vive en la API (`buildRuntimeWorkflowItem` en `runtimeService.js`). El estado de suspensión lo gobiernan `conversationStateService.js` y los endpoints runtime. En n8n, `chat_id` y el texto del mensaje se derivan del webhook Evolution; los comandos exactos se evalúan en **¿Comando control?** antes del agente.
