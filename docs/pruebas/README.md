# Pruebas controladas FAQ Inn

## Propósito

Esta carpeta registra subproyectos de prueba del producto FAQ Inn.

Las pruebas deben validar piezas reales de la arquitectura sin convertir MorroReservas ni DFAQ en laboratorio.

## Regla general

Cada prueba debe tener:

```text
objetivo
alcance
estado
criterio de éxito
criterio de descarte
evidencia
decisión final
```

## Subproyectos vigentes

| Subproyecto | Estado | Objetivo |
|---|---|---|
| `01-evolution-onboarding-mvp` | **Cerrado / validado** | Registro, instancia Evolution, QR, polling, webhook MESSAGES_UPSERT. |
| `02-n8n-multitenant-runtime` | En prueba | Validar workflow compartido multitenant con configuración por tenant. |
| `03-tenant-settings-api` | Pendiente | Definir API/tablas para configuración de tenant y agente. |
| `04-pausa-humana-redis` | En prueba | Validar suspensión humana persistente por chat. |
| `05-respostas-semresposta` | En prueba | Validar búsqueda FAQ y registro de preguntas sin respuesta por tenant/agente. |
| `06-panel-admin-tenant` | Pendiente | Validar UI mínima para alta y administración del tenant. |

## Criterio arquitectónico

Una prueba solo pasa a arquitectura oficial cuando queda documentada su decisión final en el README principal o en el documento específico correspondiente.
