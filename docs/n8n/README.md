# n8n en FAQ Inn

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

Config Tenant es temporal. En producción debe reemplazarse por una consulta a PostgreSQL/API de FAQ Inn basada en `evolution_instance_name`, manteniendo los mismos nombres de variables para no romper el runtime.
