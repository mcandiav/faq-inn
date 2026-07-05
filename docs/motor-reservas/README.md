# Motor de Reservas

Documento único del módulo (V1.7.3). Implementado en FAQ Inn para descubrir, validar y guardar la plantilla de URL de reservas por tenant.

Este módulo **no** forma parte del flujo conversacional de n8n. Configura una vez la lógica de reserva y deja una plantilla **aprobada** que el runtime conversacional consume después.

---

## Principios

```text
La UI descubre y valida la plantilla (borrador en sesión temporal).
El backend persiste en tenant_settings SOLO cuando el tenant pulsa "Link aprobado".
n8n no descubre motores ni interpreta URLs en tiempo real.
La URL de reserva no vive en el prompt del agente.
```

El tenant **no** escribe `booking_url_base` a mano en Mi cuenta. Desde el perfil hay un enlace a la pestaña **Motor reservas** (`#booking-engine`).

---

## Flujo implementado (UI)

```text
Mi cuenta → "Configurar motor de reservas"
      ↓
Paso 1 — Pegar 3 links de escenarios controlados → "Analizar links"
      ↓
Paso 2 — Preview interactivo (check-in, check-out, adultos, menores, habitaciones)
         → "Generar link de prueba" → tenant abre el link en su motor real
      ↓
"Link aprobado" → persiste en tenant_settings
      ↓
Runtime n8n consume solo si validation_status = approved
```

Botones en Paso 2:

| Botón | Acción |
|---|---|
| **Generar link de prueba** | Arma URL desde plantilla candidata + datos del formulario |
| **Link aprobado** | Guarda plantilla y config en `tenant_settings` |
| **Configurar de nuevo** | Reinicia wizard; borrador en sesión, sin tocar DB del tenant |

Panel plantilla aprobada: badge **Link aprobado** + preview interactivo + **Configurar de nuevo**.

---

## Escenarios de descubrimiento (3 links)

Fechas relativas al día de configuración (`buildDiscoveryScenarios`).

| ID | Habitaciones | Entrada | Salida | Adultos | Menores |
|---|---|---|---|---|---|
| S1 | 1 | hoy | hoy + 3 noches | 2 | 1 (10 años) |
| S2 | 1 | hoy | hoy + 7 noches | 3 | 2 (10 y 11 años) |
| S3 | 2 | hoy | hoy + 3 noches | 2 | 0 |

Reglas al pegar links:

- URL válida `http` / `https`
- Mismo dominio/motor en los 3 links
- Cada URL debe corresponder al escenario indicado (mismas fechas/huéspedes)
- El extractor **nunca** analiza URLs sin escenario esperado

Escenario de verificación por defecto (preview): hoy → mañana, 1 adulto, 1 menor (8 años).

---

## Persistencia

### Tabla auxiliar (solo borrador)

`booking_discovery_sessions` — sesión temporal mientras dura el wizard.

| Campo | Uso |
|---|---|
| `status` | `draft`, `pending_verification`, `approved`, `rejected`, `cancelled` |
| `scenarios` | JSON escenarios S1–S3 |
| `sample_urls` | 3 URLs pegadas |
| `candidate_template` | Plantilla detectada (aún no aprobada) |
| `candidate_config` | Metadatos del extractor |
| `verification_scenario` / `verification_url` | Preview inicial |
| `warnings`, `confidence_score` | Diagnóstico |

### Tabla del tenant (fuente de verdad)

Todo en **`tenant_settings`** (no hay tabla `tenant_booking_config` separada).

| Columna | Cuándo se escribe | Descripción |
|---|---|---|
| `booking_url_template` | Solo al aprobar | Plantilla con tokens del motor |
| `booking_url_base` | Solo al aprobar | Origen del motor (ej. `https://book.omnibees.com`) |
| `booking_url_mode` | Solo al aprobar | `discovered_template` o `fixed_link` |
| `validation_status` | Solo al aprobar | `approved` (pendiente antes: `pending`) |
| `confidence_score` | Solo al aprobar | Confianza del extractor |
| `booking_config` | Solo al aprobar | JSON contrato runtime (ver abajo) |
| `booking_approved_at` | Solo al aprobar | Timestamp |

**Regla crítica:** `discover` y `preview` **no** escriben en `tenant_settings`.

---

## Contrato `booking_config` (JSON en `tenant_settings`)

Generado por `buildApprovedBookingRecord` al pulsar **Link aprobado**:

```json
{
  "required_fields": ["checkin", "checkout", "adults", "children", "child_ages", "rooms"],
  "placeholder_map": {
    "checkin": "{{checkin_ddmmyyyy}}",
    "checkout": "{{checkout_ddmmyyyy}}",
    "adults": "{{adults}}",
    "children": "{{children}}",
    "child_ages": "{{child_ages_semicolon}}",
    "rooms": "{{rooms}}"
  },
  "date_format": "DDMMYYYY",
  "occupancy_format": "query_params",
  "supports_rooms": true,
  "supports_children": true,
  "supports_child_ages": true,
  "fixed_params": { "c": "1374", "q": "2166" },
  "variable_params": {
    "CheckIn": "{{checkin_ddmmyyyy}}",
    "CheckOut": "{{checkout_ddmmyyyy}}",
    "ad": "{{adults}}",
    "ch": "{{children}}",
    "ag": "{{child_ages_semicolon}}",
    "NRooms": "{{rooms}}"
  },
  "booking_engine_name": "book.omnibees.com",
  "warnings": [],
  "approved_by_user_id": 42
}
```

### Variables canónicas (las que usa n8n / el agente)

El agente recolecta estos campos lógicos:

```text
checkin
checkout
nights
adults
children
child_ages
rooms
```

`required_fields` lista cuáles exige este tenant según su motor.

`placeholder_map` traduce cada canónica al token concreto en `booking_url_template`.

### Tokens en plantilla (motor específico)

Placeholders que puede contener `booking_url_template`:

```text
{{checkin}} / {{checkin_yyyy_mm_dd}} / {{checkin_ddmmyyyy}} / {{checkin_yyyymmdd}}
{{checkout}} / {{checkout_yyyy_mm_dd}} / {{checkout_ddmmyyyy}} / {{checkout_yyyymmdd}}
{{nights}}
{{adults}}
{{children}}
{{rooms}}
{{child_ages_csv}}      → edades unidas por coma (10,11)
{{child_ages_semicolon}} → edades unidas por punto y coma (10;11) — Omnibees
{{child_ages_dash}}     → edades unidas por guión
{{occupancy_path}}      → path compacto (ej. 2-10-11)
```

Resolución al generar URL: `api/src/lib/bookingTemplateBuilder.js` (`buildUrlFromTemplate`).

Entrada preview (formulario tenant / API):

```text
checkin, checkout   → ISO YYYY-MM-DD
adults, children, rooms → número
child_ages          → texto "8" o "10,11" o "10;11"
```

---

## API backend

Rutas en `api/src/routes/bookingEngine.js` (auth cliente):

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/booking-engine/state` | Estado tenant + sesión activa |
| POST | `/api/booking-engine/start` | Nueva sesión + escenarios |
| POST | `/api/booking-engine/discover` | Analiza 3 URLs → candidato en sesión |
| POST | `/api/booking-engine/preview` | Genera URL desde candidato o plantilla aprobada |
| POST | `/api/booking-engine/approve` | **Persiste** en `tenant_settings` |
| POST | `/api/booking-engine/reject` | Cancela sesión y reinicia wizard |

Body típico `discover`:

```json
{ "session_id": 1, "urls": ["https://...", "https://...", "https://..."] }
```

Body típico `preview` / escenario:

```json
{
  "session_id": 1,
  "checkin": "2026-07-05",
  "checkout": "2026-07-06",
  "adults": 1,
  "children": 1,
  "child_ages": "8",
  "rooms": 1
}
```

---

## Extractor de URL

Implementación: `api/src/lib/bookingUrlExtractor.js`

Proceso:

1. Normalizar URLs; validar mismo host
2. Comparar query params y segmentos path contra valores esperados de S1–S3
3. Detectar formatos de fecha (YYYY-MM-DD, DDMMYYYY, YYYYMMDD, etc.)
4. Usar hints de nombre de param (`CheckIn`, `ad`, `NRooms`, `ag`, …)
5. Construir plantilla candidata con tokens
6. Calcular `confidence_score` y `warnings`
7. Round-trip: reconstruir URLs de prueba

Salida candidata (solo sesión, no DB tenant):

```json
{
  "booking_url_mode": "discovered_template",
  "booking_url_template": "https://...",
  "date_format": "DDMMYYYY",
  "required_fields": ["checkin", "checkout", "adults", "children", "child_ages", "rooms"],
  "supports_rooms": true,
  "supports_children": true,
  "supports_child_ages": true,
  "fixed_params": {},
  "variable_params": {},
  "confidence_score": 0.85,
  "validation_status": "detected",
  "warnings": []
}
```

Confianza:

| Nivel | Condición |
|---|---|
| Alta | Fechas + adultos + niños + habitaciones consistentes |
| Media | Fechas OK, ocupación ambigua |
| Baja | Fechas no detectadas |

El extractor propone; **solo el tenant aprueba** con **Link aprobado**.

---

## Runtime n8n

Consulta: `GET /api/runtime/tenant-config?instance_name=...`

Campos de reservas expuestos (solo si `validation_status === approved`):

```text
booking_url_base
booking_url_template
booking_url_mode
validation_status
confidence_score
booking_config          → objeto JSON parseado
```

Si **no** está aprobado: `booking_url_template`, `booking_url_base`, `booking_config` van **vacíos** y n8n no debe armar link dinámico.

Campos mínimos que n8n debe usar:

```text
validation_status
booking_url_template
booking_config.required_fields
booking_config.placeholder_map
booking_config.date_format
booking_config.supports_rooms
booking_config.supports_children
booking_config.supports_child_ages
```

Alternativa segura si no hay plantilla aprobada: derivar a humano o mensaje fijo.

Para generar URL en runtime: `POST /api/booking-engine/preview` (tenant autenticado) o construir en n8n usando `buildUrlFromTemplate` con los mismos campos canónicos.

---

## Modos soportados

| Modo | `booking_url_mode` | Estado |
|---|---|---|
| Descubrimiento desde 3 links | `discovered_template` | **Implementado** (MVP) |
| Link fijo | `fixed_link` | Backend listo; UI pendiente |
| Plantilla manual | `manual_template` | Pendiente |

---

## Casos de prueba

| # | Caso | Criterio |
|---|---|---|
| 1 | Link fijo | `fixed_link`, template = URL literal, `approved` |
| 2 | Query params simples | Detecta checkin, checkout, adults, rooms; round-trip OK |
| 3 | Omnibees-like | `NRooms`, `CheckIn`/`CheckOut` DDMMYYYY, `ad`, `ch`, `ag` |
| 4 | Path compacto | Segmentos fecha + `occupancy_path`; ambiguo → warning |
| 5 | Dominios distintos | Rechazo / error |
| 6 | Fechas no en URL | `confidence_score` bajo, no aprobar |
| 7 | Runtime sin aprobar | Template vacío en `/api/runtime/tenant-config` |
| 8 | Aprobar | Solo entonces aparece en `tenant_settings` |

Tests unitarios: `api/src/lib/bookingUrlExtractor.test.js`, `api/src/lib/bookingApprovedFormat.test.js`.

---

## Límites del módulo

No debe:

- prometer disponibilidad ni precios
- reservar en el motor externo
- aceptar links aleatorios sin escenario
- persistir plantilla antes de aprobación del tenant
- dejar que el prompt controle la lógica de URL

---

## Código fuente

| Archivo | Rol |
|---|---|
| `api/src/lib/bookingScenarios.js` | Escenarios S1–S3 y normalización preview |
| `api/src/lib/bookingUrlExtractor.js` | Extractor |
| `api/src/lib/bookingTemplateBuilder.js` | `buildUrlFromTemplate` |
| `api/src/lib/bookingApprovedFormat.js` | Formato persistido al aprobar |
| `api/src/lib/bookingEngineService.js` | Orquestación y persistencia |
| `api/src/routes/bookingEngine.js` | Rutas API |
| `api/src/lib/runtimeService.js` | Exposición n8n (solo approved) |
| `http/public/app.js` | UI wizard + preview |
