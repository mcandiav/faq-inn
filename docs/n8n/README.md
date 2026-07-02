# n8n en FAQ Inn

## Rol de n8n

n8n será el motor de ejecución conversacional, no la fuente de verdad del onboarding.

## Decisión vigente

La app FAQ Inn debe crear workflows n8n desde una plantilla versionada y guardar el `workflow_id` asociado al tenant.

## Variables mínimas por workflow generado

```text
tenant_id
agent_id
tenant_slug
vertical
nombre_comercial
prompt_base
booking_url_base
booking_url_template
evolution_instance_name
evolution_api_url
webhook_path
faq_search_endpoint
unanswered_endpoint
pause_rule
```

## Plantilla inicial de referencia

```text
FAQ prototipo
```

Esta plantilla fue creada como referencia técnica desde MorroReservas ChatWoot. No debe considerarse plantilla productiva final hasta incorporar Evolution API y eliminar dependencias de ChatWoot si el MVP usa WhatsApp directo.
