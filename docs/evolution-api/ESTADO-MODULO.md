# Evolution API — cierre del módulo (MVP onboarding)

**Estado:** cerrado para el subproyecto `01-evolution-onboarding-mvp` (V1.3.x, julio 2026).

**Siguiente módulo:** `02-n8n-multitenant-runtime` (resolución tenant desde webhook; no forma parte de este cierre).

---

## Alcance cerrado

| Responsabilidad | Estado | Implementación |
|---|---|---|
| Crear instancia `faqinn_<tenant_slug>` | Hecho | `evolutionClient.createInstance` |
| Obtener y mostrar QR Base64 | Hecho | `createFreshQrSession` + frontend polling |
| Detectar conexión `state=open` | Hecho | `getConnectionState` + `getProvisionStatus` |
| Guardar `instance_name` y `phone_number` | Hecho | tabla `evolution_instances` |
| Configurar webhook hacia n8n | Hecho | `POST /webhook/set/{instance}` solo `MESSAGES_UPSERT` |
| Configurar settings instancia | Hecho | `POST /settings/set/{instance}` (`groupsIgnore: true`) |
| Limpiar instancias abandonadas (`faqinn_*`) | Hecho | `evolutionCleanup.js` |
| Frontend sin llamar directo a Evolution | Hecho | solo `/api/provision/*` |
| API key Evolution solo en backend | Hecho | `EVOLUTION_API_KEY` en `faq-inn-api` |

## Validación operativa (EasyPanel / inn.at-once.cl)

| Evidencia | Resultado |
|---|---|
| Deploy API | V1.3.2+ (`faq-inn-api`, rama `api`) |
| Deploy HTTP | V1.3.3+ (landing registro + QR, rama `http`) |
| Tenant prueba | Hotel Savoy → `faqinn_hotel-savoy` |
| QR escaneable | Validado |
| Webhook URL | `EVOLUTION_WEBHOOK_URL` → n8n interno `faq-prototipo` |
| Eventos webhook | Solo `MESSAGES_UPSERT` (V1.3.2) |
| Payload webhook Evolution | `{ webhook: { enabled, url, byEvents, events } }` (fix V1.3.1) |

---

## Contrato Evolution API v2.3.7 (validado)

Servicio: `n8n_evolution-api:8080` — imagen `evoapicloud/evolution-api:v2.3.7`.

| Operación | Método | Ruta | Notas |
|---|---|---|---|
| Crear instancia | POST | `/instance/create` | body incluye `webhook` anidado |
| Obtener QR | GET | `/instance/connect/{instance}` | solo al crear sesión; no en polling |
| Estado conexión | GET | `/instance/connectionState/{instance}` | `open` = conectado |
| Detalle instancia | GET | `/instance/fetchInstances?instanceName=` | `ownerJid` → teléfono |
| Configurar webhook | POST | `/webhook/set/{instance}` | body `{ webhook: { ... } }` |
| Settings | POST | `/settings/set/{instance}` | camelCase plano |
| Logout | DELETE | `/instance/logout/{instance}` | cleanup |
| Borrar | DELETE | `/instance/delete/{instance}` | cleanup |
| Listar | GET | `/instance/fetchInstances` | cleanup huérfanas |

Auth: header `apikey: EVOLUTION_API_KEY`.

---

## Endpoints FAQ Inn (provisioner)

| Método | Ruta | Auth |
|---|---|---|
| POST | `/api/provision/register` | público |
| POST | `/api/provision/whatsapp` | JWT efímero `typ=provision` |
| GET | `/api/provision/status/:instance` | JWT efímero |

Código: `api/src/routes/provision.js`, `provisionService.js`, `evolutionClient.js`.

---

## Variables de entorno (`faq-inn-api`)

```env
EVOLUTION_API_BASE_URL=http://n8n_evolution-api:8080
EVOLUTION_API_PUBLIC_URL=https://…
EVOLUTION_API_KEY=…
EVOLUTION_INSTANCE_PREFIX=faqinn_
EVOLUTION_WEBHOOK_URL=http://n8n_n8n:5678/webhook/faq-prototipo
EVOLUTION_CONNECTED_STATE=open
EVOLUTION_QR_POLL_INTERVAL_SECONDS=3
EVOLUTION_QR_TIMEOUT_SECONDS=180
EVOLUTION_STALE_MINUTES=10
EVOLUTION_CLEANUP_INTERVAL_MINUTES=5
```

---

## Persistencia (`evolution_instances`)

Implementado hoy:

```text
id, tenant_id, instance_name, status, phone_number, webhook_url,
last_qr_base64, last_qr_at, connected_at, last_error, created_at, updated_at
```

Estados: `draft` | `qr_pending` | `connected` | `error`.

---

## Reglas operativas acordadas

### Limpiador (`evolutionCleanup`)

- Solo instancias con prefijo `faqinn_` (nunca otras en el mismo Evolution).
- Borra `qr_pending` / `draft` / `error` sin conexión tras `EVOLUTION_STALE_MINUTES` (10 min).
- Sincroniza webhook/settings en instancias `connected`.
- **No regenerar QR en polling** (rompe emparejamiento si Evolution está en `connecting`).

### Webhook hacia n8n (regla arquitecto V1.9)

```text
payload Evolution → extraer instance_name → evolution_instances.instance_name
→ tenant_id → (futuro) configuración completa tenant/agente
```

El **nombre exacto del campo** en el payload real queda para el módulo n8n (`02`). Posibles: `instance`, `instanceName`, `sender`, `apikey`.

---

## Pendiente explícito (fuera de este módulo)

| Tema | Motivo | Módulo / decisión |
|---|---|---|
| `instance_token_encrypted` en DB | Arquitecto lo define; MVP usa API key global | Runtime / settings API (`03`) |
| Desconexión desde teléfono → cleanup DB + Evolution | Evitar basura en Evo o en PostgreSQL; requiere modelo de estados | Decisión arquitecto pendiente |
| Captura payload webhook real | Confirmar campo `instance_name` | `02-n8n-multitenant-runtime` |
| Envío/recepción mensajes productivos | Conversación | n8n runtime |
| Capa `WhatsAppProvider` | Abstracción futura WAHA / Cloud API | Post-MVP |

---

## Decisión final

**El módulo Evolution API para onboarding MVP queda cerrado.** Un usuario externo puede registrarse en `inn.at-once.cl`, obtener QR, vincular WhatsApp y dejar la instancia con webhook `MESSAGES_UPSERT` hacia n8n, sin intervención manual en Evolution.

No avanzar más código Evolution en este módulo hasta abrir `02-n8n-multitenant-runtime` o recibir decisión del arquitecto sobre desconexión y `instance_token`.
