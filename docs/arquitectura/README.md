# Arquitectura FAQ Inn

## Decisión base

FAQ Inn será un producto SaaS separado de DFAQ/MorroReservas.

```text
DFAQ / MorroReservas = producción estable
FAQ Inn = nuevo producto hotelero/multivertical
```

## Componentes principales

| Componente | Responsabilidad |
|---|---|
| App FAQ Inn | Portal, onboarding, tenants, verticales, administración y provisioner. |
| Provisioner | Crea configuración técnica del tenant: Evolution API, n8n, webhooks y pruebas. |
| Evolution API | Vinculación WhatsApp por QR y canal de entrada/salida. |
| n8n | Motor conversacional ejecutado por tenant/workflow. |
| API FAQ / DFAQ base | Administración de FAQ, búsqueda semántica y preguntas sin respuesta. |
| Qdrant | Índice vectorial derivado por tenant. |

## Principio rector

La app FAQ Inn debe ser la fuente de verdad del onboarding y del estado del tenant. n8n no debe gobernar el alta de clientes.
