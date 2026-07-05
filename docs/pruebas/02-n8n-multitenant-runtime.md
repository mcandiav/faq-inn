# 02 - n8n multitenant runtime

## Objetivo

Validar que un solo workflow n8n pueda atender múltiples tenants cargando configuración dinámica desde PostgreSQL/API.

## Alcance

```text
Webhook/mensaje entrante -> identificar tenant -> cargar configuración -> normalizar Datos -> ejecutar agente -> Respostas/SemResposta por tenant.
```

## Estado

En prueba.

## Workflow actual

```text
FAQ prototipo
```

## Configuración temporal

Actualmente el workflow usa un nodo Set llamado `Config Tenant` para simular la configuración que luego debe venir desde PostgreSQL/API.

## Endpoints API (red interna)

```text
http://n8n_inn-api:3000/api/runtime/tenant-config?instance_name=...
http://n8n_inn-api:3000/api/search
http://n8n_inn-api:3000/api/unanswered
```

Hostname documentado en EasyPanel: **`n8n_inn-api`** (servicio `inn-api`).

## Criterio de éxito

```text
El runtime recibe un mensaje.
Identifica tenant_id (slug), agent_id y chat_id.
Carga initial_greeting, pause_trigger y pause_ttl_seconds.
Consulta Respostas con tenant_id (= slug), tenant_slug y agent_id.
Registra SemResposta con tenant_id (= slug), agent_id, chat_id y channel.
No hay nodos IF de conexión WhatsApp ni reconsulta a Evolution en el path del mensaje.
```

## Criterio de descarte

```text
La lógica multitenant vuelve inmanejable el workflow.
Se requiere aislamiento técnico fuerte por cliente.
La personalización por tenant exige workflows dedicados.
```

## Decisión final

Pendiente. La decisión vigente para MVP sigue siendo workflow compartido multitenant.
