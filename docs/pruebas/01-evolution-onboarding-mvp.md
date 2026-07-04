# 01 - Evolution onboarding MVP

## Objetivo

Validar que un usuario externo pueda crear un tenant mínimo y vincular su WhatsApp mediante QR en Evolution API sin intervención técnica manual.

## Alcance

```text
Registro mínimo -> tenant draft -> crear instancia Evolution -> mostrar QR -> polling -> capturar phone_number -> tenant connected.
```

Este MVP se detiene cuando el número queda conectado en Evolution API y el webhook apunta a n8n con `MESSAGES_UPSERT`.

## Fuera de alcance

```text
n8n conversacional
carga de FAQs
prompts por vertical
respuestas automáticas
Chatwoot operativo
panel completo de administración
login completo de usuarios
instance_token_encrypted (pendiente módulo runtime)
cleanup por desconexión manual desde teléfono (pendiente arquitecto)
```

## Estado

**Validado en producción** (V1.3.x, julio 2026). Detalle técnico: [../evolution-api/ESTADO-MODULO.md](../evolution-api/ESTADO-MODULO.md).

## Flujo de usuario

```text
1. Usuario ingresa nombre comercial y email en inn.at-once.cl.
2. Sistema genera tenant_slug único.
3. Sistema crea tenant en estado draft.
4. Usuario pulsa Registrar y continuar.
5. Backend crea instancia Evolution instance_name=faqinn_<tenant_slug>.
6. Backend configura webhook (MESSAGES_UPSERT) y settings.
7. Backend obtiene QR Base64.
8. Frontend muestra QR con instrucciones.
9. Frontend consulta estado cada 3 segundos (sin regenerar QR).
10. Backend detecta state=open.
11. Backend guarda phone_number y marca tenant connected.
12. Frontend muestra pantalla de éxito.
```

## Endpoints propios

```text
POST /api/provision/register
POST /api/provision/whatsapp
GET  /api/provision/status/:instance
```

## Servicio Evolution confirmado en DEV

```text
Servicio: n8n_evolution-api
Imagen: evoapicloud/evolution-api:v2.3.7
Puerto interno: 8080
URL interna recomendada: http://n8n_evolution-api:8080
URL pública: https://n8n-evolution-api.to9nfy.easypanel.host
```

## Persistencia mínima

```text
tenants
evolution_instances
tenant_provisioning
```

## Criterio de éxito

```text
Se crea un tenant mínimo.
Se crea una instancia Evolution con prefijo faqinn_ sobre tenant_slug.
La app muestra QR escaneable.
El estado cambia a connected/open después del escaneo.
El phone_number queda registrado.
Webhook habilitado con MESSAGES_UPSERT hacia n8n.
El usuario ve pantalla de éxito sin intervención técnica manual.
```

## Evidencia

```text
inn.at-once.cl — API V1.3.2+, HTTP V1.3.3+
Prueba Hotel Savoy: faqinn_hotel-savoy (registro + QR generado jul 2026)
Prueba previa: faqinn_miguel-telefono (conexión + webhook corregido V1.3.1)
```

## Criterio de descarte

No aplica — contrato Evolution v2.3.7 validado por API.

## Decisión final

**APROBADO — módulo Evolution onboarding cerrado.** Continuar con `02-n8n-multitenant-runtime`.
