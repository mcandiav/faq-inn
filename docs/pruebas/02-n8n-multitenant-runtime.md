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

## Criterio de éxito

```text
El runtime recibe un mensaje.
Identifica tenant_id, agent_id y chat_id.
Carga initial_greeting, pause_trigger y pause_ttl_seconds.
Consulta Respostas con tenant_id, tenant_slug y agent_id.
Registra SemResposta con tenant_id, agent_id, chat_id y channel.
```

## Criterio de descarte

```text
La lógica multitenant vuelve inmanejable el workflow.
Se requiere aislamiento técnico fuerte por cliente.
La personalización por tenant exige workflows dedicados.
```

## Decisión final

Pendiente. La decisión vigente para MVP sigue siendo workflow compartido multitenant.
