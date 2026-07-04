# n8n en FAQ Inn

## Rol de n8n

n8n será el runtime de ejecución conversacional, no la fuente de verdad del onboarding.

La app/backend FAQ Inn gobierna tenants, agentes, configuración, Evolution API, estado de onboarding y trazabilidad.

## Decisión vigente MVP

FAQ Inn usará un workflow n8n compartido y multitenant durante el MVP.

La app/backend FAQ Inn guarda la configuración del tenant en PostgreSQL/API. El workflow n8n identifica el tenant desde la instancia Evolution, webhook path, token o metadata y carga la configuración antes de ejecutar el agente.

No se crearán workflows n8n por tenant durante el MVP. Esa opción queda reservada para una decisión futura documentada si se requiere aislamiento, personalización fuerte o lógica conversacional distinta por cliente.

## Variables mínimas cargadas por runtime

```text
tenant_id
agent_id
tenant_slug
vertical
agent_name
initial_greeting
primary_language
timezone
booking_url_base
booking_url_template
evolution_instance_name
evolution_api_url
webhook_path
faq_search_endpoint
unanswered_endpoint
pause_enabled
pause_trigger
pause_ttl_seconds
pause_scope
```

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

Config Tenant es temporal. En producción debe reemplazarse por una consulta a PostgreSQL/API de FAQ Inn, manteniendo los mismos nombres de variables para no romper el runtime.
