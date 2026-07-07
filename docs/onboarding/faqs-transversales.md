# FAQs transversales — pack de onboarding

Documento canónico del pack de **3 FAQs plantilla** que todo tenant recibe al completar el onboarding.

## Decisión vigente

| Regla | Valor |
|---|---|
| Alcance | **Transversal** — aplica a los 4 objetivos operativos |
| Cuándo se crean | Durante el onboarding (paso final del wizard), editables antes de guardar |
| Dónde se editan después | Panel **FAQs** (no en Mi cuenta) |
| Flag en base | `is_starter_template = true` hasta que el tenant edite la respuesta |
| Rubro / objetivo | No cambia el pack; el rubro solo ajusta vocabulario del agente |

Estas FAQs **no** sustituyen la configuración por objetivo (motor de reservas, motor de agenda o URL de sitio). Cubren datos que antes vivían en el perfil (dirección, horario, contacto humano).

---

## Pack v1 — tres preguntas

### FAQ 1 — Ubicación

| Campo | Valor |
|---|---|
| `starter_key` | `location` |
| `faq_uid` | `starter:transversal:location` |
| **Pregunta** | ¿Dónde están ubicados? |
| **Respuesta default** | Estamos en Avenida San Martin 180. |
| `category` | ubicación |
| `keywords` | dirección, ubicación, cómo llegar, maps, san martin |

### FAQ 2 — Horario

| Campo | Valor |
|---|---|
| `starter_key` | `hours` |
| `faq_uid` | `starter:transversal:hours` |
| **Pregunta** | ¿Cuál es su horario de atención? |
| **Respuesta default** | Horario de atención de lunes a viernes de 9:00 a 17:00. |
| `category` | horario |
| `keywords` | horario, atención, recepción, abierto, lunes, viernes |

### FAQ 3 — Atención humana

| Campo | Valor |
|---|---|
| `starter_key` | `human` |
| `faq_uid` | `starter:transversal:human` |
| **Pregunta** | ¿Puedo hablar con una persona? |
| **Respuesta default** | Si necesitas atención humana acá puedes contactar a Alexa: https://wa.me/56927294379 |
| `category` | atención |
| `keywords` | humano, persona, operador, atención, alexa, whatsapp |

---

## Comportamiento en UI

1. El wizard de onboarding muestra las 3 FAQs con badge **Plantilla**.
2. El tenant puede editar pregunta, respuesta y keywords antes de finalizar.
3. Al guardar una edición, `is_starter_template` pasa a `false` (deja de ser plantilla).
4. El tenant puede borrar una FAQ plantilla; no se vuelve a crear sola.

---

## Implementación en código

| Ubicación | Estado |
|---|---|
| `api/src/lib/faqTemplates/` | Implementado (pendiente renombrar de `hotel` a `transversal`) |
| `api/src/lib/seedStarterFaqs.js` | Inserta en PostgreSQL + indexa en Qdrant al signup |
| Onboarding UI dedicado | Pendiente — hoy el seed ocurre al alta; la edición en wizard falta |

### Nota de migración de `faq_uid`

La implementación actual usa prefijo `starter:hotel:*`. Al alinear código con este documento, renombrar a `starter:transversal:*` o mantener UIDs estables si ya hay tenants indexados (hoy los tenants son descartables).

---

## Relación con el agente n8n

El agente responde estas preguntas vía búsqueda semántica (`POST /api/search`), no vía variables de runtime. Por eso la dirección y el horario salieron del perfil y pasaron a FAQ.
