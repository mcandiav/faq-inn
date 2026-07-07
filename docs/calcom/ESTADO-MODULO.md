# Cal.com — estado del módulo

**Estado:** ⏸ **PAUSA** (julio 2026)

**Motivo:** el template 1-click de EasyPanel levanta la UI de Cal.com v6.2.0 pero **no** el servicio API v2 necesario para automatizar citas desde el agente WhatsApp. Sin API v2 no se cumple el requisito “cliente no sale de WhatsApp”.

---

## Qué se probó

| Paso | Resultado |
|---|---|
| Deploy EasyPanel template Cal.com | OK — `calcom` + `calcom-db` |
| Imagen | `calcom/cal.com:v6.2.0` |
| Prisma Studio | Deshabilitado (recomendado) |
| SMTP | Placeholders / vacío — sin emails |
| URL interna Docker | `http://n8n_calcom:3000/` |
| Túnel Cloudflare (admin) | `https://dcal.at-once.cl` |
| UI web (`GET /`) | 200 — login/setup visible |
| Versión (`GET /api/version`) | 200 — `6.2.0` |
| API v2 (`/api/v2/health`, `/slots`, `/bookings`) | **500** en todos |

---

## Decisión

No avanzar con integración Cal.com hasta definir si:

- se monta el stack completo (`calcom-api` + Redis + env), o
- se implementa **motor de citas propio** en PostgreSQL de FAQ Inn (recomendado para multi-tenant y bot).

La documentación de diseño y despliegue queda en `README.md` de esta carpeta.

---

## Evidencia curl (2026-07-07)

```text
GET  https://dcal.at-once.cl/              → 200 (HTML Cal.com)
GET  https://dcal.at-once.cl/api/version   → 200 {"version":"6.2.0"}
GET  https://dcal.at-once.cl/api/v2/health → 500 Internal Server Error
GET  https://dcal.at-once.cl/api/v2/slots  → 500 Internal Server Error
```

---

## No implementado en FAQ Inn

- Pestaña **Agenda** con iframe/proxy a Cal.com
- Mapeo tenant FAQ Inn ↔ usuario Cal.com
- Tools n8n `CrearCita` / `ConsultarDisponibilidad` contra Cal.com
- Variables `calcom_*` en `tenant_settings`

---

## Relación con otros módulos

| Módulo | Relación |
|---|---|
| `reservar_horarios` | Objetivo que motivó la evaluación de Cal.com |
| Motor agenda FAQ Inn | Sigue activo para descubrimiento de `tenant_url` (plantilla/link) |
| System prompt configurable | Plantillas por objetivo; `{{url}}` desde `tenant_url` |
| n8n | Flujo de prueba con `GenerarLinkAgenda`; sin Cal.com API |

---

## Retomar

Condición mínima para reabrir este módulo:

```text
GET https://<calcom>/api/v2/health
Header: cal-api-version: 2024-08-13
→ HTTP 200 (no 500)
```

Hasta entonces, priorizar diseño del motor de citas en FAQ Inn API si el producto requiere booking sin salir de WhatsApp.
