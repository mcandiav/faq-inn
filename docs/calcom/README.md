# Cal.com (agenda externa) — módulo en evaluación

Documento del intento de integrar **Cal.com self-hosted** como motor de agenda para el objetivo `reservar_horarios`, con UI embebida en FAQ Inn (iframe) y creación de citas vía API para el agente WhatsApp.

**Estado:** pausa — ver `ESTADO-MODULO.md`.

---

## Objetivo original

| Requisito | Descripción |
|---|---|
| Cliente en WhatsApp | Recolecta fecha/hora/datos; **no sale** del chat |
| Tenant | Pestaña **Agenda** en FAQ Inn con vista embebida (iframe) de su calendario |
| Infra | Cal.com en EasyPanel, **sin exponer** a internet (solo red interna + túnel admin si hace falta) |
| Bot n8n | Tools que consulten disponibilidad y creen bookings vía API |

---

## Contexto FAQ Inn

- Objetivo operativo: `reservar_horarios` (excluyente con `reservar_noches` y `enviar_a_sitio_web`).
- URL única del tenant: columna `tenant_url` en `tenant_settings` (link fijo o plantilla según system prompt).
- Motor de agenda propio en FAQ Inn: descubrimiento de plantilla de URL (`agendaUrlExtractor.js`) — independiente del motor de reservas.
- Alternativa evaluada: Cal.com como backend de citas + iframe en Mi cuenta, en lugar de construir calendario completo en PostgreSQL.

---

## Despliegue EasyPanel (template oficial)

Template: [Calcom | Easypanel](https://easypanel.io/docs/templates/calcom)

### Servicios que levanta el template

| Servicio | Imagen / rol |
|---|---|
| `calcom` | `calcom/cal.com:v6.2.0` (app web, puerto 3000) |
| `calcom-db` | PostgreSQL |
| `calcom-studio` (opcional) | Prisma Studio — **no habilitar** en producción |

El template **no** incluye:

- Contenedor `calcom-api` (API v2)
- Redis (requerido por API v2)

### Variables de entorno generadas por el template

```env
DATABASE_DIRECT_URL=postgres://postgres:***@$(PROJECT_NAME)_calcom-db:5432/$(PROJECT_NAME)
DATABASE_URL=postgres://postgres:***@$(PROJECT_NAME)_calcom-db:5432/$(PROJECT_NAME)
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://$(PRIMARY_DOMAIN)
CALENDSO_ENCRYPTION_KEY=...
NEXT_PUBLIC_WEBAPP_URL=https://$(PRIMARY_DOMAIN)
EMAIL_FROM=...
EMAIL_FROM_NAME=Cal.com
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
```

### SMTP

Para el flujo WhatsApp **no son obligatorios** correos reales. Cal.com arranca con placeholders; solo fallan notificaciones por email. Desactivar workflows de email en el admin de Cal.com si se retoma la prueba.

### Prisma Studio

`Enable Prisma Studio` = interfaz web para editar la base de datos directamente. Dejar en **false** salvo depuración puntual en red interna.

### Red interna (mismo proyecto EasyPanel)

Hostname Docker entre contenedores del proyecto `n8n`:

```text
http://n8n_calcom:3000/
```

FAQ Inn API y n8n deben usar esa URL (o el nombre que asigne EasyPanel) para llamadas internas. No es resoluble desde fuera del host Docker.

### Túnel Cloudflare (pruebas admin)

Para acceder a la UI desde el navegador sin dominio público en EasyPanel:

```text
https://dcal.at-once.cl
```

Alinear `NEXTAUTH_URL` y `NEXT_PUBLIC_WEBAPP_URL` con el dominio por el que se abre Cal.com (túnel o dominio EasyPanel).

---

## Pruebas de conectividad (julio 2026)

Ejecutadas contra `https://dcal.at-once.cl`:

| Endpoint | HTTP | Resultado |
|---|---|---|
| `/` | 200 | UI Cal.com (login/setup) |
| `/api/version` | 200 | `{"version":"6.2.0"}` |
| `/api/v2/health` | 500 | Internal Server Error |
| `/api/v2/slots` | 500 | Internal Server Error |
| `/api/v2/bookings` | 500 | Internal Server Error |

**Conclusión:** la app community **sí corre**; la **API v2 no está operativa** con el template 1-click de EasyPanel.

---

## Por qué falla la API v2

En un despliegue completo de Cal.com ([docker oficial](https://calcom-cal-com.mintlify.app/self-hosting/docker)) hacen falta:

| Componente | Función |
|---|---|
| `calcom` | App Next.js (puerto 3000) |
| `calcom-api` | Servicio NestJS API v2 |
| `redis` | Colas y cache para API v2 |
| Env adicionales | `NEXT_PUBLIC_API_V2_URL`, `JWT_SECRET`, `REDIS_URL`, etc. |

El template EasyPanel solo despliega `calcom` + `calcom-db`. Las rutas `/api/v2/*` responden 500 porque el servicio API v2 no existe en el stack.

### Implicancia para FAQ Inn

| Caso de uso | ¿Funciona con template actual? |
|---|---|
| Iframe / UI manual en pestaña Agenda | Parcial (requiere login Cal.com y auth embebida) |
| Bot crea cita (`POST /api/v2/bookings`) | **No** |
| Consultar slots (`GET /api/v2/slots`) | **No** |

### Platform API Cal.com

El plan “Platform” (managed users embebidos en SaaS) **no acepta clientes nuevos** (dic 2025). No depender de esa vía para FAQ Inn multi-tenant.

---

## Arquitectura prevista (no implementada)

```text
WhatsApp → n8n (agente) → FAQ Inn API → Cal.com API v2 (interno)
                ↓
         Pestaña Agenda (http) → iframe/proxy → http://n8n_calcom:3000/...
```

Proxy en FAQ Inn para no exponer Cal.com: ruta tipo `/embed/agenda` en la rama `http` que reenvíe a `n8n_calcom:3000` en red interna.

Mapeo por tenant (tabla o `tenant_settings`):

- `calcom_user_id` / `calcom_username`
- `event_type_id` o slug
- tokens OAuth si aplica

---

## Alternativas documentadas

1. **Completar stack Cal.com** en EasyPanel: agregar `calcom-api` + Redis + variables — esfuerzo alto, fuera del template 1-click.
2. **Motor de citas en PostgreSQL** (FAQ Inn API): citas + disponibilidad + tool n8n; sin contenedor extra; mejor multi-tenant.
3. **Cal.com solo como UI** (iframe) y citas creadas en FAQ Inn DB — híbrido posible pero redundante.

---

## Referencias

- [Cal.com API v2 — bookings](https://cal.com/docs/api-reference/v2/bookings/create-a-booking)
- [Cal.com API v2 — slots](https://cal.com/docs/api-reference/v2/slots)
- [Cal.com self-hosting Docker](https://calcom-cal-com.mintlify.app/self-hosting/docker)
- [EasyPanel template calcom](https://easypanel.io/docs/templates/calcom)
- FAQ Inn: `docs/systemprompt-configurable/` (objetivo `reservar_horarios`), motor agenda en API (`agendaEngineService.js`, `agendaUrlExtractor.js`)

---

## Siguiente paso cuando se retome

1. Decidir: completar Cal.com (API v2 + Redis) **o** motor propio en PostgreSQL.
2. Si Cal.com: desplegar `calcom-api` y validar `GET /api/v2/health` = 200 antes de integrar n8n.
3. Si motor propio: tablas `appointments` + `availability_rules`, endpoints y pestaña Agenda en `http`.
