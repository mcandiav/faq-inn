# Onboarding de tenants FAQ Inn

Documento vigente del flujo de alta: cuenta, onboarding dedicado (negocio + FAQs), vinculación WhatsApp.

## Principio

```text
Onboarding = wizard único (objetivo, negocio, FAQs, vinculación WhatsApp)
Mi cuenta   = mantenimiento posterior (perfil, cambios, recordatorios)
```

El onboarding **no** es la pantalla Mi cuenta. Es una ruta/vista bloqueante hasta `onboarding_completed = true`.

La **vinculación de WhatsApp es la última tarea** del onboarding: el tenant completa primero su negocio y FAQs, y solo al conectar WhatsApp se marca `onboarding_completed = true` y se habilita el panel operativo.

---

## Flujo completo

```text
1. Crea tu cuenta        → email + contraseña
2. Completa tu negocio   → wizard: objetivo, nombre + saludo, motor/URL, FAQs, pausa operador
3. Vincula WhatsApp      → QR Evolution + polling hasta connected
4. Panel operativo       → FAQs, sin respuesta, etc.
```

```mermaid
flowchart TB
  A[Signup] --> B[Wizard: completa tu negocio]
  B --> B1[Paso 1: Objetivo]
  B1 --> B2[Paso 2: Nombre + saludo]
  B2 --> B3[Paso 3: Motor o URL según objetivo]
  B3 --> B4[Paso 4: 3 FAQs transversales]
  B4 --> B5[Paso 5: Pausa operador **]
  B5 --> C[Vincula WhatsApp: QR Evolution]
  C --> DTenant connected + onboarding_completed = true
  D --> E[Panel operativo]
```

---

## Paso 0 — Registro (Crea tu cuenta)

```text
Email + contraseña → tenant en estado draft
```

Caption de la pantalla principal (paso 1): «Email y contraseña. Con esto accedes al panel.»

---

## Paso A — Completa tu negocio (wizard bloqueante)

### Paso 1 — Elige tu objetivo de negocio

El tenant elige **un** objetivo principal. Solo se habilita la configuración que corresponda.

| Opción visible | `objetivo_slug` | Ejemplos de rubro | Config que sigue |
|---|---|---|---|
| Agendar horarios | `reservar_horarios` | barbería, salón, spa, dentista | Motor de **agenda** |
| Reservar noches | `reservar_noches` | hotel, posada, hostal | Motor de **reservas** |
| Llevar a un sitio web | `enviar_a_sitio_web` | catálogo, landing, tienda | URL destino |
| Solo responder preguntas | `responder_preguntas` | cualquier rubro informativo | Ningún motor ni URL |

Regla: los botones **Configurar motor de reservas** y **Configurar motor de agenda** son distintos; solo se habilita el del objetivo elegido.

Documentos relacionados:

- Motor de reservas (noches): [../motor-reservas/README.md](../motor-reservas/README.md)
- Motor de agenda (horarios): pendiente de módulo hermano

### Paso 2 — Datos mínimos del negocio

| Campo | Uso |
|---|---|
| Nombre comercial | Nombre visible del negocio en respuestas del agente |
| Saludo de bienvenida | Presentación única al inicio de cada chat nuevo |
| Idioma principal | Idioma por defecto del agente |

Campos que **ya no** van en onboarding/perfil (pasaron a FAQ):

- Dirección → FAQ transversal «¿Dónde están ubicados?»
- Horario de atención → FAQ transversal «¿Cuál es su horario de atención?»
- Contacto humano → FAQ transversal «¿Puedo hablar con una persona?»

### Paso 3 — Configuración según objetivo

| Objetivo | Acción en onboarding |
|---|---|
| `reservar_noches` | Botón **Configurar motor de reservas** (wizard existente en `docs/motor-reservas/`) |
| `reservar_horarios` | Botón **Configurar motor de agenda** (módulo pendiente; misma idea: plantilla aprobada) |
| `enviar_a_sitio_web` | Campo **URL destino** del sitio |
| `responder_preguntas` | Sin paso adicional |

El tenant puede posponer motor/URL y completar después, pero el onboarding debe dejar claro qué falta para operar reservas o derivación web.

### Paso 4 — FAQs transversales

Tres FAQs plantilla editables antes de finalizar. Detalle canónico: [faqs-transversales.md](faqs-transversales.md).

```text
1. ¿Dónde están ubicados?
2. ¿Cuál es su horario de atención?
3. ¿Puedo hablar con una persona?
```

### Paso 5 — Pausa del operador (obligatorio en onboarding)

Debe quedar **explícito** en el wizard, no solo en Mi cuenta.

Texto canónico:

> Para suspender el agente en una conversación, envíe exactamente **`**`** desde el WhatsApp del negocio.
>
> Para reactivarlo en esa misma conversación, envíe exactamente **`##`**.
>
> La suspensión es persistente: no vence sola y solo afecta ese chat.

Detalle técnico e i18n: [pausa-operador.md](pausa-operador.md).

Al cerrar el wizard el tenant queda con el negocio completo, pero **sin WhatsApp** y con `onboarding_completed = false`.

---

## Paso B — Vincula WhatsApp (última tarea del onboarding)

Bloque final del wizard. Solo se habilita tras completar el Paso A.

```text
Genera instancia Evolution (instance_name = faqinn_<tenant_slug>)
Muestra QR
Polling de estado hasta connected
Captura phone_number
onboarding_completed = true → acceso al panel
```

Caption de la pantalla principal (paso 3): «Escanea el QR con tu teléfono y conecta el número del negocio.»

---

## MVP Evolution (WhatsApp) — ya validado

Etapas de vinculación (QR) están operativas. Ver [../evolution-api/ESTADO-MODULO.md](../evolution-api/ESTADO-MODULO.md).

### Endpoints provisioner

```text
POST /api/provision/register
POST /api/provision/whatsapp
GET  /api/provision/status/:instance
```

### Reglas de seguridad

```text
El frontend nunca llama directo a Evolution API.
La API key de Evolution vive solo en variables de entorno del backend.
instance_name = faqinn_<tenant_slug>
```

---

## Persistencia esperada

### Flag de onboarding

```text
onboarding_completed  BOOLEAN  DEFAULT false   -- solo true al conectar WhatsApp
objetivo_slug          VARCHAR  -- vacío hasta paso 1 del wizard
destination_url        TEXT     -- para sitio web o agenda simple (fase inicial)
```

### Tablas involucradas

```text
tenants
tenant_settings
tenant_provisioning
evolution_instances
faq_items          -- 3 starter al completar paso 4
agents
```

---

## Onboarding vs Mi cuenta

| | Onboarding | Mi cuenta |
|---|---|---|
| Frecuencia | Una vez (hasta completar) | Siempre disponible |
| Objetivo | Elegir y fijar flujo principal | Ver/editar (si se permite cambio) |
| 3 FAQs plantilla | Edición guiada en wizard | Panel FAQs normal |
| Motor reservas / agenda | Botón según objetivo | Mismo botón, solo el habilitado |
| Vincula WhatsApp | Última tarea del wizard (`onboarding_completed = true`) | Recordatorio / re-vincular |
| Pausa `**` | Explicación obligatoria | Recordatorio |
| Contraseña / email | No | Sí |

---

## Criterio de éxito del onboarding completo

```text
Objetivo_slug definido
+ nombre comercial y saludo guardados
+ configuración del objetivo iniciada o pospuesta con aviso claro
+ 3 FAQs transversales confirmadas o editadas
+ operador informado de la pausa con **
+ WhatsApp connected en Evolution
→ onboarding_completed = true → acceso al panel
```

---

## Fuera de alcance inmediato

```text
Cambio de objetivo con migración automática de motores
Motor de agenda implementado (solo documentado como hermano del motor de reservas)
Seed retroactivo para tenants legacy (tenants actuales son descartables)
```

## Regla operativa

MorroReservas no debe usarse para pruebas. Todo piloto usa tenants demo nuevos en FAQ Inn.
