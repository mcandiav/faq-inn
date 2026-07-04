# 01 - Evolution onboarding MVP

## Objetivo

Validar que un usuario externo pueda crear un tenant mínimo y vincular su WhatsApp mediante QR en Evolution API sin intervención técnica manual.

## Alcance

```text
Registro mínimo -> tenant draft -> crear instancia Evolution -> mostrar QR -> polling -> capturar phone_number -> tenant connected.
```

Este MVP se detiene cuando el número queda conectado en Evolution API.

## Fuera de alcance

```text
n8n conversacional
carga de FAQs
prompts por vertical
respuestas automáticas
Chatwoot operativo
panel completo de administración
login completo de usuarios
```

## Estado

Implementado en código (V1.2). Pendiente validación operativa en EasyPanel.

## Flujo de usuario

```text
1. Usuario ingresa nombre comercial y email.
2. Sistema genera tenant_slug único.
3. Sistema crea tenant en estado draft.
4. Usuario presiona Conectar WhatsApp.
5. Backend crea instancia Evolution instance_name=faqinn_<tenant_slug>.
6. Backend obtiene QR Base64.
7. Frontend muestra QR con instrucciones.
8. Frontend consulta estado cada 3 segundos.
9. Backend detecta state=open.
10. Backend guarda phone_number y marca tenant connected.
```

## Endpoints propios propuestos

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
```

## Criterio de éxito

```text
Se crea un tenant mínimo.
Se crea una instancia Evolution con prefijo faqinn_ sobre tenant_slug.
La app muestra QR escaneable.
El estado cambia a connected/open después del escaneo.
El phone_number queda registrado.
El usuario ve pantalla de éxito sin intervención técnica manual.
```

## Criterio de descarte

```text
La versión Evolution API v2.3.7 no permite crear instancia por API.
No se puede obtener QR por endpoint controlable.
La creación exige intervención manual no automatizable.
El estado de conexión no puede consultarse de forma confiable.
```

## Decisión final

Pendiente.
