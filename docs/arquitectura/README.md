# Arquitectura FAQ Inn

## Decisión base

FAQ Inn será un producto SaaS separado de DFAQ/MorroReservas.

```text
DFAQ / MorroReservas = producción estable
FAQ Inn = nuevo producto hotelero/multivertical
```

## Decisión MVP vigente

El MVP de FAQ Inn usará un **runtime n8n compartido y multitenant**. No se creará un workflow n8n por cada tenant durante el MVP.

La app/backend FAQ Inn será la fuente de verdad de tenants, agentes, instancias Evolution, estado de onboarding, configuración conversacional y trazabilidad.

## Componentes principales

| Componente | Responsabilidad |
|---|---|
| App FAQ Inn | Portal, onboarding, tenants, verticales, administración y provisioner. |
| Provisioner | Crea tenant, crea instancia Evolution API, obtiene QR, configura webhook, registra estado y ejecuta pruebas. |
| PostgreSQL FAQ Inn | Fuente de verdad para `tenant_settings`, `agents`, `whatsapp_instances`, `provisioning_runs` y configuración del runtime. |
| Evolution API | Vinculación WhatsApp por QR y canal de entrada/salida. |
| n8n | Runtime conversacional compartido. Identifica tenant, carga configuración y ejecuta agente. |
| Redis | Pausa humana temporal por chat con TTL y otros locks/estados efímeros. |
| API FAQ / DFAQ base | Administración de FAQ, búsqueda semántica y preguntas sin respuesta. |
| Qdrant | Índice vectorial derivado por tenant. |

## Principio rector

La app FAQ Inn debe ser la fuente de verdad del onboarding y del estado del tenant. n8n no debe gobernar el alta de clientes ni almacenar configuración definitiva del tenant.

## Alternativa futura

Workflows n8n dedicados por tenant quedan permitidos solo como decisión futura documentada, cuando exista necesidad explícita de aislamiento, personalización fuerte o lógica conversacional distinta por cliente.
