# FAQ Inn

## Bitácora de cambios

| Fecha | Versión | Cambio realizado | Motivo | Impacto | Sección afectada |
|---|---|---|---|---|---|
| 2026-07-12 | V1.16 | Se documenta `objetivo_slug` en Admin detalle tenant, la separación Admin vs `tenant-config`, y la regla de cache-bust al versionar la UI. | El detalle Admin mostraba `—` aunque Postgres tenía el objetivo: la API admin no lo exponía y la UI cacheada leía `objective_slug` con `?v=` repetido. | `GET /api/admin/tenants/:id` devuelve `objetivo_slug`; la UI lee ese campo; cada release `http` debe subir `VERSION` para invalidar `app.js?v=`. | Admin, Variables por tenant, Deploy, Esquema, Estado actual |
| 2026-07-12 | V1.15 | Se incorpora el esquema vigente de la base de datos directamente en el README oficial. | Documentar tablas, campos y relaciones sin crear documentos paralelos. | El README identifica las nueve tablas implementadas, sus claves y las brechas pendientes de migración. | Esquema de base de datos |
| 2026-07-08 | V1.14 | Se documenta el botón **Descargar Excel** del dashboard FAQ (export CSV client-side). | Faltaba inventario operativo simétrico al Importar Excel / Sincronizar respuestas. | El cliente puede bajar `id,question,answer,category,keywords,active` con BOM UTF-8 para Excel; no pasa por n8n. | Variables FAQ, Estado actual, UI dashboard |
| 2026-07-08 | V1.13 | Se documenta `custom_sprompt` admin-only por tenant y su uso en n8n como `{{ $('Armar SPrompt').item.json.custom_sprompt }}`. | Un tenant puede necesitar instrucciones extra al final del system prompt sin editar la matriz de objetivos. | Campo `tenant_settings.custom_sprompt`; runtime `GET /api/runtime/tenant-config`; Admin `GET/PUT /api/admin/tenants/:id/custom-sprompt`; n8n **FAQ Productivo** lo appendea tras `links`. Vacío = sin cambio. | n8n, Variables agente/prompt, docs/systemprompt-configurable, Estado actual |
| 2026-07-05 | V1.12 | Se consolida inventario único de variables del proyecto por módulo. | El módulo `motor-reservas` incorporó variables nuevas y el runtime n8n ya consume variables adicionales de tenant, agente, pausa, Evolution API, FAQ y reservas. | El README principal pasa a gobernar las variables canónicas de FAQ Inn y separa responsabilidad por módulo para evitar hardcodeos y duplicación documental. | Variables obligatorias por tenant, motor-reservas, n8n como motor de conversaciones |
| 2026-07-05 | V1.11 | Se crea módulo documental `motor-reservas`. | Separar la lógica de descubrimiento y validación de URLs de reserva del prompt y del runtime conversacional n8n. | FAQ Inn tendrá una página/servicio para construir `booking_url_template` por tenant usando links de prueba; n8n consumirá solo plantillas aprobadas. | docs/motor-reservas, n8n como motor de conversaciones, Estado actual |
| 2026-07-04 | V1.10 | Cierre documental del módulo Evolution API (onboarding MVP). | Validación operativa en inn.at-once.cl y alineación con arquitectura V1.9. | Subproyecto `01-evolution-onboarding-mvp` aprobado; pendientes explícitos (token instancia, desconexión teléfono, payload n8n) fuera de alcance. | docs/evolution-api, docs/pruebas, Estado actual |
| 2026-07-04 | V1.9 | Se define la resolución runtime del tenant desde webhook Evolution API. | El onboarding debe guardar todos los datos del cliente y n8n debe operar sin datos hardcodeados. | El runtime n8n identificará la instancia Evolution recibida en el webhook, consultará PostgreSQL/API y cargará configuración completa del tenant/agente antes de conversar. | Arquitectura objetivo, Evolution API, n8n, Datos por tenant, Estado actual |
| 2026-07-04 | V1.8 | Se acota el MVP inmediato a onboarding automático de WhatsApp con Evolution API. | El auditor recomienda validar primero la creación de tenant, instancia Evolution, QR y conexión antes de invertir en n8n conversacional o FAQs. | El primer MVP queda limitado a registro mínimo, creación de instancia `faqinn_<tenant_slug>`, QR, polling de estado y marcado `connected`; n8n, FAQs, prompts y conversación quedan fuera de alcance de este MVP. | Alcance inicial, Arquitectura objetivo, Onboarding, Evolution API, Estado actual |
| 2026-07-04 | V1.7 | Se normaliza la arquitectura MVP: onboarding gobernado por backend FAQ Inn, Evolution API creada por provisioner y n8n como workflow compartido multitenant. | El proyecto avanzó desde diseño conceptual hacia pruebas reales con Evolution API y `FAQ prototipo`; era necesario eliminar ambigüedad entre workflow por tenant y workflow compartido. | Queda definido que el MVP no generará un workflow n8n por tenant; usará un runtime n8n compartido que carga configuración por tenant. Se crean subproyectos de prueba documentados. | Arquitectura objetivo, Provisioner, Evolution API, n8n, Estado actual |
| 2026-07-02 | V1.6 | Se valida operativamente el PostgreSQL de FAQ Inn. | Miguel ejecuta consulta interna desde el contenedor y confirma respuesta correcta de PostgreSQL. | Queda confirmado PostgreSQL 17.10, base `faq-inn`, usuario `postgres`, puerto interno 5432 y sin puerto público externo. | Configuración EasyPanel PostgreSQL, Estado actual |
| 2026-07-02 | V1.5 | Se confirma creación real del PostgreSQL de FAQ Inn en EasyPanel. | Miguel crea el servicio y aporta captura con credenciales visibles del servicio. | Host interno real confirmado: `n8n_faq-inn_postgres`; base `faq-inn`; usuario `postgres`; imagen `postgres:17`; puerto interno 5432; sin puerto público externo. La contraseña no se documenta. | Configuración EasyPanel PostgreSQL, Estado actual |
| 2026-07-02 | V1.4 | Se define la configuración base para crear PostgreSQL en EasyPanel. | Miguel inicia la creación del servicio Postgres propio de FAQ Inn en EasyPanel. | El servicio debe llamarse `faq-inn_postgres`, usar base `faq-inn`, usuario `postgres`, imagen `postgres:17`, contraseña autogenerada por EasyPanel y sin puerto público externo. | Base de datos, Configuración EasyPanel PostgreSQL |
| 2026-07-02 | V1.3 | Se define PostgreSQL propio e interno para FAQ Inn. | FAQ Inn requiere aislamiento de datos y no debe usar la base compartida existente del ecosistema n8n. | El servicio `faq-inn_postgres` debe operar solo por red interna, en puerto 5432, sin puerto público externo. | Base de datos, Variables por tenant, Próxima etapa técnica, Estado actual |
| 2026-07-02 | V1.2 | Se definen las variables iniciales por tenant y el primer cambio obligatorio para el Programador. | La base heredada desde DFAQ debe reconstruirse como producto multitenant de FAQ Inn, evitando valores fijos del sistema anterior. | El desarrollo debe iniciar en versión de código 1.0 usando tenant de desarrollo `FAQ-INN`, título HTTP `FAQ Inn $Tenant` y base PostgreSQL derivada de `$tenant`. | Variables por tenant, Próxima etapa técnica, Estado actual |
| 2026-07-02 | V1.1 | Se define `faq-inn` como repositorio GitHub oficial del proyecto. | El proyecto necesitaba una definición documental explícita para evitar ambigüedad entre reutilizar `dfaq`, crear branch/fork o mantener repositorio propio. | El Programador debe usar `faq-inn` como repositorio independiente de FAQ Inn; DFAQ/MorroReservas queda sin cambios operativos. | Repositorio GitHub oficial, Etapa técnica inicial, Estado actual |
| 2026-07-02 | V1.0 | Creación del proyecto FAQ Inn como evolución separada de DFAQ para vertical Hoteles y futura arquitectura multivertical. | MorroReservas está en producción y debe quedar congelado; el nuevo producto requiere onboarding, Evolution API, QR WhatsApp y generación automática de workflows n8n sin afectar `dfaq.at-once.cl`. | Se crea proyecto documental separado bajo `FAQ Inn`; `dfaq.at-once.cl` queda como producción/legacy de MorroReservas y `inn.at-once.cl` queda como dominio objetivo del nuevo producto. | Todo el documento |

---

## 1. Objetivo del proyecto

Construir **FAQ Inn**, una plataforma SaaS inicialmente orientada a hoteles, hospedajes y alojamientos, basada en el aprendizaje técnico de DFAQ/MorroReservas pero separada de la producción existente.

El objetivo es que un nuevo cliente hotelero pueda registrarse, cargar datos de su negocio, vincular su WhatsApp mediante QR, cargar sus preguntas y respuestas, y quedar con un agente operativo sin que Miguel tenga que editar manualmente n8n, Qdrant, Evolution API o archivos técnicos.

El producto debe nacer como **Hotel v1**, pero con diseño **multivertical** para permitir futuras verticales como ferretería, clínica, comercio, servicios profesionales u otras.

---

## 2. Decisión de separación respecto de DFAQ

### 2.1 MorroReservas queda congelado

MorroReservas ya está operativo en producción y no debe usarse como laboratorio.

Regla vigente:

```text
MorroReservas / dfaq.at-once.cl = producción estable
FAQ Inn / inn.at-once.cl = nuevo producto SaaS hotelero/multivertical
```

### 2.2 DFAQ queda como base técnica e histórica

El proyecto `FAQ multiusuario` conserva la documentación y base técnica de DFAQ:

- Administración de FAQ.
- MariaDB como fuente maestra.
- Qdrant como índice vectorial derivado.
- Embeddings NVIDIA/OpenAI.
- API de búsqueda.
- Preguntas sin respuesta.
- Integración actual con MorroReservas.

FAQ Inn hereda aprendizajes de DFAQ, pero no modifica producción.

---

## 3. Alcance inicial

### 3.0 MVP inmediato: onboarding WhatsApp con Evolution API

El MVP inmediato del proyecto no incluye todavía conversación automática, n8n productivo, carga de FAQs ni prompts finales.

Objetivo del MVP inmediato:

```text
Permitir que un hotelero cree su tenant mínimo y vincule su WhatsApp mediante QR en Evolution API sin intervención técnica manual.
```

Flujo cerrado del MVP:

```text
Registro mínimo -> tenant draft -> crear instancia Evolution -> mostrar QR -> polling de estado -> capturar phone_number -> tenant connected
```

Datos mínimos del registro:

```text
nombre_comercial
email
tenant_slug generado automáticamente
```

Reglas obligatorias:

```text
El frontend nunca llama directo a Evolution API.
Toda llamada a Evolution API pasa por el backend Fastify de FAQ Inn.
La API key de Evolution vive solo en variables de entorno del servidor.
El instance_name debe usar prefijo técnico: faqinn_<tenant_slug>.
El estado de conexión se consulta por polling desde el frontend contra el backend propio.
```

Fuera de alcance de este MVP:

```text
n8n conversacional
carga de FAQs
prompts por vertical
respuestas automáticas
Chatwoot operativo
panel completo de administración
login completo de usuarios
```

### 3.1 Vertical inicial: Hotel v1

El primer vertical será `hotel`.

El onboarding hotelero debe pedir como mínimo:

| Dato | Uso |
|---|---|
| Nombre comercial | Nombre visible del hotel/alojamiento. |
| `tenant_slug` | Identificador técnico seguro del cliente. |
| Idioma principal | Idioma por defecto del agente. |
| URL de reservas | Link base o plantilla de reservas del hotel. |
| Plantilla de URL de reservas | Permite insertar `checkin`, `checkout` y `guests` si el motor lo soporta. |
| Tipo de alojamiento | Hotel, hostel, posada, apartamento, cabaña, etc. |
| Horario de atención | Contexto para derivación humana. |
| Políticas principales | Check-in, check-out, cancelación, mascotas, niños, desayuno, estacionamiento, etc. |
| Mensaje de bienvenida | Presentación inicial del agente. |
| FAQ iniciales | Preguntas y respuestas aprobadas del cliente. |

### 3.2 Reglas del agente hotelero

El agente Hotel v1 debe:

1. Responder solo con información aprobada por el tenant.
2. No inventar respuestas.
3. Detectar intención de reserva.
4. Recolectar `checkin`, `checkout` y `guests`.
5. Confirmar los datos antes de enviar link de reserva.
6. Construir el link con la URL o plantilla de URL del hotel.
7. Registrar preguntas sin respuesta.
8. Permitir pausa humana mediante prefijo `**`.

---

## 4. Arquitectura objetivo

```text
Cliente hotelero
      ↓
Sitio FAQ Inn — inn.at-once.cl
      ↓
Registro mínimo
      ↓
Backend / Provisioner interno de FAQ Inn
      ├── crea tenant en estado draft
      ├── genera tenant_slug único
      ├── crea instancia Evolution API con instance_name faqinn_<tenant_slug>
      ├── obtiene QR WhatsApp
      ├── expone estado por endpoint propio
      ├── espera conexión por polling
      ├── captura phone_number
      └── marca tenant connected
      ↓
WhatsApp vinculado en Evolution API

Etapas posteriores al MVP:
      ↓
Configurar webhook Evolution → runtime n8n multitenant
      ↓
Webhook n8n recibe evento con identificador de instancia Evolution
      ↓
Runtime n8n resuelve instance_name → tenant_id → configuración completa
      ↓
Workflow n8n compartido carga datos del tenant/agente desde PostgreSQL/API
      ↓
Agente WhatsApp operativo
```

Principio arquitectónico:

```text
La app FAQ Inn controla el onboarding y el estado del cliente.
n8n ejecuta conversaciones.
Evolution API conecta WhatsApp.
DFAQ/API FAQ administra conocimiento.
Qdrant busca semánticamente.
```

---

## 5. Diagrama funcional del onboarding Hotel v1

```mermaid
flowchart TB
  A[Prospecto entra a inn.at-once.cl] --> B[Elige plan y vertical Hotel]
  B --> C[Completa formulario hotelero]
  C --> D[FAQ Inn crea tenant]
  D --> E[Asigna plantilla vertical hotel]
  E --> F[Guarda configuración del hotel]
  F --> G[Crea instancia en Evolution API]
  G --> H[Obtiene QR de WhatsApp]
  H --> I[Cliente escanea QR]
  I --> J{WhatsApp conectado?}
  J -- No --> H
  J -- Sí --> K[Configura webhook Evolution hacia runtime n8n multitenant]
  K --> L[Marca tenant como conectado]
  L --> M[Runtime n8n carga variables desde PostgreSQL/API]
  M --> N[Activa tenant/agente]
  N --> O[Envía mensaje de prueba]
  O --> P{Prueba OK?}
  P -- No --> Q[Marca onboarding con error y muestra diagnóstico]
  P -- Sí --> R[Tenant activo]
  R --> S[Agente responde por WhatsApp usando FAQ del hotel]
```

---

## 6. Provisioner

El provisioning principal debe vivir en la app FAQ Inn, no en n8n.

Motivo:

- El alta de cliente es parte del dominio de negocio.
- La app debe controlar suscripción, tenant, estado, permisos y trazabilidad.
- n8n no debe ser la fuente de verdad del onboarding.
- La app debe poder recrear, pausar, actualizar o auditar workflows.

Responsabilidades del Provisioner:

1. Crear tenant.
2. Crear configuración de vertical.
3. Crear o registrar instancia Evolution API.
4. Obtener y mostrar QR.
5. Esperar estado `connected`.
6. Crear credencial o configuración segura para n8n.
7. Registrar la configuración necesaria para que el runtime n8n multitenant pueda identificar y cargar el tenant.
8. Configurar webhook en Evolution API hacia el runtime n8n compartido.
9. Ejecutar prueba final.
10. Marcar tenant como `active` o `error`.

---

## 7. Evolution API y WhatsApp

### 7.1 Decisión MVP

FAQ Inn usará Evolution API como proveedor inicial para WhatsApp por QR.

Motivo:

- Encaja con el onboarding simple para clientes pequeños.
- Permite vinculación por QR de una cuenta WhatsApp existente.
- Es compatible con un modelo SaaS liviano.
- Ya existe experiencia previa en el ecosistema de Miguel.

### 7.2 Abstracción recomendada

Aunque se use Evolution API, la app debe diseñarse con una capa lógica:

```text
WhatsAppProvider
```

Esto permitirá evaluar o migrar en el futuro hacia:

- WAHA.
- WhatsApp Cloud API oficial.
- Otro proveedor compatible.

### 7.3 Datos esperados por instancia

```text
tenant_id
instance_name
evolution_api_url
credencial_evolution_cifrada
phone_number
connection_status
last_qr
connected_at
webhook_url
created_at
updated_at
```

La credencial de Evolution debe guardarse cifrada y no debe mostrarse al cliente.

---

## 8. n8n como motor de conversaciones

n8n ejecutará la conversación del agente, pero no gobernará el alta del cliente.

### 8.1 Plantilla inicial

Se creó un workflow inicial llamado:

```text
FAQ prototipo
```

Este workflow sirve como referencia técnica para transformar MorroReservas en un flujo parametrizable, pero no debe asumirse como plantilla final productiva.

### 8.2 Workflow compartido multitenant para MVP

La decisión vigente para el MVP es usar **un workflow n8n compartido y multitenant**, no un workflow generado por cada tenant.

Motivo:

- Reduce duplicación operativa.
- Permite corregir la lógica conversacional una sola vez.
- Mantiene el onboarding en la app FAQ Inn, no en n8n.
- Facilita pruebas iniciales de Evolution API, Redis TTL, búsqueda FAQ y preguntas sin respuesta.

El workflow debe identificar el tenant desde el identificador de la instancia Evolution recibido en el webhook, webhook path, token, metadata o mapeo persistido, y luego cargar su configuración completa desde PostgreSQL/API. La llave preferida de runtime será `evolution_instance_name`, confirmando el nombre exacto del campo con un payload real de Evolution API.

Variables mínimas que debe cargar el runtime n8n:

```text
tenant_id
agent_id
tenant_slug
vertical
agent_name
initial_greeting
primary_language
timezone
booking_url_base
booking_url_template
custom_sprompt
evolution_instance_name
evolution_api_url
faq_search_endpoint
unanswered_endpoint
pause_enabled
pause_trigger
pause_ttl_seconds
pause_scope
```

#### 8.2.1 Composición del system prompt en FAQ Productivo

El workflow productivo (**FAQ Productivo**, backup en `docs/n8n/workflows/backups/`) no hardcodea el prompt completo. El nodo Code **Armar SPrompt** resuelve tokens de las columnas `sprompt.*` del objetivo activo y expone secciones al AI Agent.

Orden vigente del `systemMessage`:

```text
rol
limites
tools
interpretar_fecha
data_collect
links
custom_sprompt
```

`custom_sprompt` es texto libre **admin-only** por tenant (`tenant_settings.custom_sprompt`). En n8n se referencia así:

```text
{{ $('Armar SPrompt').item.json.custom_sprompt }}
```

Reglas:

- Vacío o solo whitespace → no altera el prompt armado por objetivo.
- Solo Admin (View tenant → Custom SPrompt) puede editarlo; el cliente del tenant no.
- Los mismos tokens neutros que el resto del prompt (`{{tenant_display_name}}`, `{{url}}`, `{{today}}`, etc.) se resuelven en **Armar SPrompt**.
- Endpoints Admin: `GET/PUT /api/admin/tenants/:id/custom-sprompt`.
- Runtime: incluido en `GET /api/runtime/tenant-config`.

#### 8.2.2 Objetivo del tenant: Admin vs runtime n8n

El campo canónico en PostgreSQL es `tenant_settings.objetivo_slug` (slug técnico: `reservar_noches`, `reservar_horarios`, `enviar_a_sitio_web`, `responder_preguntas`).

Misma tabla, **endpoints distintos**:

| Consumidor | Endpoint | Auth | Campo de objetivo |
|---|---|---|---|
| UI Admin → **Ver** tenant | `GET /api/admin/tenants/:id` | sesión admin | `objetivo_slug` |
| n8n → nodo Resolver Tenant / datos tenant | `GET /api/runtime/tenant-config?instance_name=…` | token n8n | `objetivo_slug` |

Reglas operativas:

- El detalle Admin **no** llama a `tenant-config`; solo a `/api/admin/tenants/:id`.
- La UI debe leer `tenant.objetivo_slug` (compatibilidad opcional con `objective_slug`).
- En el diálogo Admin se muestra el **slug técnico**, no el nombre visible del catálogo.
- Si la UI muestra `—` pero n8n sí ve el objetivo: primero verificar el JSON de `/api/admin/tenants/:id`; si el campo llega y la pantalla no, sospechar `app.js` cacheado con el mismo `?v=` (ver [DEPLOY.md](DEPLOY.md)).

Detalle del módulo de columnas por objetivo: [docs/systemprompt-configurable/README.md](docs/systemprompt-configurable/README.md). Operativa n8n: [docs/n8n/README.md](docs/n8n/README.md).

El modelo de workflow por tenant queda reservado como alternativa futura solo si existe una necesidad explícita de aislamiento, personalización fuerte o lógica conversacional distinta por cliente.

### 8.3 Regla de pausa humana

MVP:

```text
Si un mensaje entrante comienza con el `pause_trigger` configurado, el agente se pausa para esa conversación.
```

La pausa humana se implementa con Redis TTL, no con `Wait` de n8n ni apagando workflows.

Clave estándar:

```text
faqinn:pause:<tenant_id>:<agent_id>:<chat_id>
```

Configuración mínima por tenant/agente:

```text
pause_enabled=true
pause_trigger=**
pause_ttl_seconds=300
pause_scope=chat
pause_mode=redis_ttl
```

Mientras exista la clave Redis de pausa, n8n no debe responder al cliente, para permitir intervención humana desde WhatsApp o Chatwoot.

---

## 9. Motor de reservas por tenant

FAQ Inn tendrá un módulo separado para descubrir, validar y guardar la lógica de URL de reservas de cada tenant.

Documento oficial del módulo:

```text
docs/motor-reservas/README.md
```

Decisión arquitectónica:

```text
La URL de reserva no se define en el prompt del agente ni queda hardcodeada en n8n.
La configuración se realiza en una página especial del perfil del tenant.
FAQ Inn solicita escenarios controlados, recibe links de prueba, detecta una plantilla, la valida y la guarda como booking_url_template aprobada.
El runtime conversacional solo consume plantillas aprobadas.
```

La página de configuración debe permitir al tenant pegar links de prueba generados desde escenarios controlados, por ejemplo:

```text
1 habitación, hoy por 3 noches, 2 adultos y 1 menor de 10 años.
1 habitación, hoy por 7 noches, 3 adultos y 2 menores de 10 y 11 años.
2 habitaciones, hoy por 3 noches, 2 adultos y sin menores.
```

El backend de FAQ Inn será responsable de extraer y validar la plantilla. Un helper n8n o agente auxiliar puede apoyar casos ambiguos, pero no será fuente final de verdad.

---

## 10. Modelo multivertical

FAQ Inn debe evitar hardcodear reglas de hotel dentro del motor.

Se propone una tabla o configuración:

```text
vertical_templates
```

Campos conceptuales:

```text
id
vertical_slug
name
status
required_onboarding_fields
prompt_template
conversation_rules
booking_rules
created_at
updated_at
```

Primer registro:

```text
vertical_slug = hotel
name = Hotel v1
```

Futuras verticales podrán tener:

```text
vertical_slug = ferreteria
vertical_slug = clinica
vertical_slug = comercio
```

Cada tenant apunta a una vertical:

```text
tenants.vertical_slug = hotel
```

---

## 11. Datos mínimos por tenant hotelero

```text
id
name
slug
vertical_slug
status
plan
primary_language
booking_url_base
booking_url_template
welcome_message
timezone
human_handoff_enabled
pause_default_minutes
created_at
updated_at
```

Datos que el onboarding debe capturar o derivar para que el runtime n8n no tenga valores hardcodeados:

```text
tenant_id
tenant_slug
agent_id
agent_name
initial_greeting
primary_language
timezone
vertical_slug
business_type
booking_url_base
booking_url_template
human_contact
pause_enabled
pause_trigger
pause_ttl_seconds
pause_scope
evolution_instance_name
evolution_instance_token_encrypted
phone_number
webhook_url
faq_search_endpoint
unanswered_endpoint
```

Regla runtime:

```text
El webhook de Evolution entrega la instancia; n8n resuelve esa instancia contra PostgreSQL/API y carga todos los datos del tenant antes de ejecutar el agente.
```

Estados sugeridos:

```text
draft
provisioning
waiting_qr_scan
connected
workflow_created
testing
active
error
suspended
cancelled
```

---

## 12. Relación con dominios

| Dominio | Uso |
|---|---|
| `dfaq.at-once.cl` | Producción actual / MorroReservas / DFAQ legacy. |
| `inn.at-once.cl` | Nuevo producto FAQ Inn para vertical hoteles y evolución SaaS. |

Regla:

```text
No usar dfaq.at-once.cl como laboratorio de FAQ Inn.
```

---

## 13. Repositorio GitHub oficial

El repositorio GitHub oficial del proyecto FAQ Inn es:

```text
faq-inn
```

Regla vigente:

```text
FAQ Inn mantiene repositorio propio e independiente.
No debe reutilizar el repositorio dfq/dfaq/MorroReservas para desarrollo activo de FAQ Inn.
DFAQ/MorroReservas queda como base técnica heredada y producción/legacy congelada.
```

El Programador debe trabajar sobre `faq-inn` como repositorio oficial del producto nuevo, salvo decisión arquitectónica posterior documentada en este README.

---

## 14. Variables obligatorias por tenant y por módulo

FAQ Inn debe operar como aplicación parametrizada por tenant desde el inicio. Esta sección consolida el inventario canónico de variables del proyecto y define a qué módulo pertenece cada una.

Regla arquitectónica:

```text
Ningún valor heredado de DFAQ/MorroReservas debe quedar hardcodeado como identidad, endpoint, motor de reservas, workflow, prompt, instancia WhatsApp o configuración runtime de FAQ Inn.
```

El tenant oficial de desarrollo seguirá siendo:

```text
FAQ-INN
```

Este valor es solo una instancia de prueba y debe tratarse como variable.

### 14.1 Módulo identidad de tenant / aplicación

| Variable | Valor ejemplo / desarrollo | Uso obligatorio | Fuente esperada |
|---|---|---|---|
| `$tenant` | `FAQ-INN` | Identificador funcional principal del tenant en desarrollo. | Configuración inicial / tabla tenants |
| `tenant_id` | UUID o id interno | Identificador interno estable para relaciones, runtime, FAQ y auditoría. | PostgreSQL |
| `tenant_slug` | `faq-inn` o slug del cliente | Identificador seguro para URLs, rutas, nombres técnicos, Redis y Evolution. | Derivado al crear tenant |
| `tenant_display_name` | `FAQ-INN` | Nombre visible o etiqueta administrativa del tenant. | PostgreSQL |
| `name` / `nombre_comercial` | Nombre del hotel o negocio | Nombre comercial visible del cliente. | Onboarding |
| `vertical_slug` | `hotel` | Vertical funcional asociada al tenant. | Onboarding / vertical_templates |
| `status` | `draft`, `connected`, `active`, etc. | Estado operativo del tenant. | PostgreSQL |
| `plan` | Plan contratado | Control comercial y límites funcionales. | PostgreSQL / facturación futura |
| `app_title` | `FAQ Inn $Tenant` | Título visible en frontend/HTTP. | Derivado desde tenant |
| `primary_language` | `pt-BR`, `es`, etc. | Idioma base del agente cuando no pueda inferirse idioma del cliente. | Onboarding |
| `timezone` | Zona horaria del tenant | Fechas, escenarios de reserva, horarios y auditoría. | Onboarding |
| `business_type` | hotel, hostel, posada, cabaña, etc. | Contexto vertical específico para el prompt y onboarding. | Onboarding |

### 14.2 Módulo base de datos / infraestructura

| Variable | Valor ejemplo / desarrollo | Uso obligatorio | Fuente esperada |
|---|---|---|---|
| `postgres_service_name` | `faq-inn_postgres` | Nombre lógico del servicio PostgreSQL. | EasyPanel / documentación |
| `postgres_internal_host` | `n8n_faq-inn_postgres` | Host interno real en red EasyPanel. | EasyPanel |
| `postgres_port` | `5432` | Puerto interno PostgreSQL. | EasyPanel |
| `postgres_database` | `faq-inn` | Base técnica inicial del proyecto. | EasyPanel / env |
| `postgres_user` | `postgres` | Usuario técnico de PostgreSQL. | EasyPanel / env |
| `postgres_password` | No documentar | Credencial de conexión; debe vivir solo en variables de entorno o secreto. | EasyPanel / env secreto |

Regla vigente:

```text
PostgreSQL de FAQ Inn no debe exponer puerto público. La aplicación debe conectarse por hostname interno.
```

### 14.3 Módulo Evolution API / WhatsApp

| Variable | Valor ejemplo / desarrollo | Uso obligatorio | Fuente esperada |
|---|---|---|---|
| `evolution_instance_name` / `instance_name` | `faqinn_<tenant_slug>` | Identificar la instancia WhatsApp y resolver tenant en runtime. | Provisioner / Evolution API |
| `evolution_api_url` | URL interna/externa Evolution | Base para crear instancia, obtener QR y enviar mensajes. | Config servidor / tenant_settings seguro |
| `evolution_api_key` | No documentar | API key global o de servicio; no debe exponerse al cliente. | Variable de entorno / secreto |
| `evolution_instance_token_encrypted` | Token cifrado | Token específico de instancia, pendiente de consolidación definitiva. | PostgreSQL cifrado |
| `phone_number` | Número vinculado | Número WhatsApp conectado al tenant. | Evolution API |
| `connection_status` | `waiting_qr_scan`, `connected`, etc. | Estado de conexión WhatsApp. | Evolution API / PostgreSQL |
| `last_qr` | QR vigente o referencia temporal | Mostrar QR durante onboarding. | Backend / Evolution API |
| `connected_at` | Timestamp | Auditoría de conexión. | PostgreSQL |
| `webhook_url` | URL webhook n8n | URL configurada en Evolution para eventos entrantes. | Provisioner |
| `source_channel` | `whatsapp_evolution` | Canal de origen usado por n8n y SemResposta. | Runtime n8n |
| `remoteJid` | JID recibido | Identificador original del chat recibido desde Evolution. | Payload Evolution |
| `sessionId` | Teléfono normalizado o `manual` | Clave de sesión/memoria/conversación. | Parse Evolution n8n |
| `fromMe` | boolean | Permite ignorar mensajes salientes propios. | Payload Evolution |
| `event` | `messages.upsert` | Permite filtrar eventos válidos entrantes. | Payload Evolution |
| `message_type` | `text` / `other` | Permite procesar solo texto en MVP. | Parse Evolution n8n |

### 14.4 Módulo agente / prompt / conversación

| Variable | Valor ejemplo / desarrollo | Uso obligatorio | Fuente esperada |
|---|---|---|---|
| `agent_id` | id interno del agente | Identificar configuración, memoria, FAQ y herramientas del agente. | PostgreSQL |
| `agent_name` | Nombre del agente | Identidad visible usada por el system prompt. | PostgreSQL |
| `initial_greeting` | Mensaje de bienvenida | Saludo inicial configurable por tenant/agente. | Onboarding / tenant_settings |
| `custom_sprompt` | Texto libre (puede vacío) | Bloque admin-only al final del system prompt; vacío = sin cambio. Tokens neutros se resuelven en n8n **Armar SPrompt**. | `tenant_settings` / Admin API / runtime tenant-config |
| `welcome_message` | Mensaje de bienvenida ampliado | Variante funcional para UI o primer contacto. | Onboarding |
| `chatInput` | Texto recibido | Entrada normalizada que procesa el agente. | Parse Evolution / Chat Trigger |
| `Texto` | Texto recibido | Alias heredado/operativo usado en nodos n8n. | Nodo Datos |
| `question` | Pregunta del cliente | Texto usado por Respostas y SemResposta. | Nodo Datos |
| `data` | Texto final al agente | Entrada final enviada al nodo agente. | Nodo TextoFinal |
| `chat_id` | sessionId normalizado | Identificador de conversación para memoria, pausa y SemResposta. | Runtime n8n |
| `phone` | sessionId normalizado | Teléfono usado para trazabilidad de preguntas sin respuesta. | Runtime n8n |
| `Remote_Id` | sessionId o `manual` | Compatibilidad operativa con estructura heredada. | Runtime n8n |
| `Message_type` | `text` | Filtro operativo previo al agente. | Runtime n8n |
| `contextWindowLength` | `8` en prototipo | Cantidad de mensajes mantenidos en memoria simple. | n8n / configuración agente |
| `model_temperature` | `0.1` en prototipo | Control de creatividad del modelo. | n8n / configuración agente |

### 14.5 Módulo FAQ / conocimiento / preguntas sin respuesta

| Variable | Valor ejemplo / desarrollo | Uso obligatorio | Fuente esperada |
|---|---|---|---|
| `faq_search_endpoint` | `/api/search` | Endpoint interno para búsqueda de respuestas aprobadas. | Config runtime |
| `unanswered_endpoint` | `/api/unanswered` | Endpoint interno para registrar preguntas sin respuesta. | Config runtime |
| `search_limit` | `2` en prototipo | Cantidad máxima de respuestas candidatas. | tenant_settings / runtime |
| `unanswered_limit` | `1` en prototipo | Límite operativo para registro/deduplicación de no respondidas. | tenant_settings / runtime |
| `query` | Pregunta del cliente | Parámetro enviado a búsqueda FAQ. | Runtime n8n |
| `limit` | número | Límite enviado a Respostas o SemResposta. | Runtime n8n |
| `channel` | `whatsapp_evolution` | Canal registrado en preguntas sin respuesta. | Runtime n8n |

Regla del agente:

```text
Si no existe respuesta útil desde FAQ aprobada, el agente debe ejecutar obligatoriamente SemResposta antes de responder al cliente y no debe inventar información.
```

#### 14.5.1 Acciones del dashboard FAQ (UI HTTP)

En la vista **Preguntas y respuestas** el cliente tiene:

| Acción UI | Comportamiento | Notas |
|---|---|---|
| **Importar Excel** | Sube `.xlsx` / `.xls` / `.csv` a `POST /api/faqs/import` | Opción “Reemplazar todas las FAQs al importar”. |
| **Descargar Excel** | Export client-side a CSV UTF-8 con BOM | Columnas: `id,question,answer,category,keywords,active`. Nombre: `faqs-<tenant_slug>-YYYY-MM-DD.csv`. No llama a la API ni a n8n. |
| **Sincronizar respuestas** | Reindexa FAQs del tenant en Qdrant | Recuperación tras import/bulk o índice fallido. |
| **Nueva FAQ** | Alta + indexación atómica | Si falla el índice, se revierte el guardado en PostgreSQL. |

**Descargar Excel** existe para respaldar o editar fuera de la app el mismo conjunto que se ve en pantalla; no reemplaza el flujo conversacional n8n.

### 14.6 Módulo pausa humana

| Variable | Valor ejemplo / desarrollo | Uso obligatorio | Fuente esperada |
|---|---|---|---|
| `pause_enabled` | `true` | Habilita o deshabilita pausa humana por tenant/agente. | tenant_settings |
| `pause_trigger` | `**` | Prefijo que activa pausa humana cuando aparece al inicio del mensaje. | tenant_settings |
| `pause_ttl_seconds` | `300` | Duración de la pausa Redis en segundos. | tenant_settings |
| `pause_scope` | `chat` | Alcance de la pausa: conversación específica. | tenant_settings |
| `pause_mode` | `redis_ttl` | Mecanismo técnico de pausa. | Arquitectura / tenant_settings |
| `pause_key` | `faqinn:pause:<tenant_slug>:<agent_id>:<chat_id>` | Clave Redis usada para bloquear respuesta automática. | Runtime n8n |
| `pause_lock` | valor Redis | Indica si la pausa está vigente. | Redis / runtime n8n |

Regla vigente:

```text
Mientras exista `pause_lock`, n8n no debe responder al cliente.
```

Nota: la documentación anterior usaba como clave estándar `faqinn:pause:<tenant_id>:<agent_id>:<chat_id>`. El prototipo n8n vigente usa `tenant_slug`. Esta diferencia debe resolverse antes de producción; por ahora ambas deben considerarse equivalentes conceptuales y la implementación final debe elegir una sola convención.

### 14.7 Módulo motor-reservas

El documento técnico específico del módulo es `docs/motor-reservas/README.md`. El inventario canónico que debe conocer el README principal es el siguiente:

| Variable | Valor ejemplo / desarrollo | Uso obligatorio | Fuente esperada |
|---|---|---|---|
| `booking_url_template` | URL con placeholders | Plantilla aprobada para construir links de reserva. | `tenant_settings`, solo al aprobar |
| `booking_url_base` | `https://book.omnibees.com` | Origen/base del motor de reservas. | `tenant_settings`, solo al aprobar |
| `booking_url_mode` | `discovered_template`, `fixed_link`, `manual_template` | Modo de construcción del link. | `tenant_settings` |
| `validation_status` | `approved`, `pending`, `detected` | Estado de validación de la plantilla. | `tenant_settings` / sesión |
| `confidence_score` | `0.85` | Confianza del extractor. | Extractor / `tenant_settings` al aprobar |
| `booking_config` | JSON | Contrato runtime para n8n/agente. | `tenant_settings` |
| `booking_approved_at` | Timestamp | Auditoría de aprobación del link. | `tenant_settings` |
| `required_fields` | `checkin`, `checkout`, `adults`, etc. | Campos que el agente debe recolectar antes de generar link. | `booking_config` |
| `placeholder_map` | mapa canónica → placeholder | Traducción entre variables lógicas y tokens del motor. | `booking_config` |
| `date_format` | `DDMMYYYY` | Formato requerido por el motor externo. | `booking_config` |
| `occupancy_format` | `query_params` | Formato de ocupación del motor. | `booking_config` |
| `supports_rooms` | boolean | Indica si el motor acepta habitaciones. | `booking_config` |
| `supports_children` | boolean | Indica si el motor acepta menores. | `booking_config` |
| `supports_child_ages` | boolean | Indica si el motor requiere edades de menores. | `booking_config` |
| `fixed_params` | JSON | Parámetros constantes del motor. | `booking_config` |
| `variable_params` | JSON | Parámetros variables del motor. | `booking_config` |
| `booking_engine_name` | host o nombre motor | Identificación del motor detectado. | `booking_config` |
| `approved_by_user_id` | id usuario | Usuario que aprobó el link. | `booking_config` / auditoría |

Variables canónicas que el agente debe recolectar para reservas:

| Variable | Uso |
|---|---|
| `checkin` | Fecha de entrada lógica. |
| `checkout` | Fecha de salida lógica. |
| `nights` | Noches cuando el motor o conversación lo requiera. |
| `adults` | Cantidad de adultos. |
| `children` | Cantidad de menores. |
| `child_ages` | Edades de menores. |
| `rooms` | Cantidad de habitaciones. |

Tokens soportados dentro de `booking_url_template`:

```text
{{checkin}}
{{checkin_yyyy_mm_dd}}
{{checkin_ddmmyyyy}}
{{checkin_yyyymmdd}}
{{checkout}}
{{checkout_yyyy_mm_dd}}
{{checkout_ddmmyyyy}}
{{checkout_yyyymmdd}}
{{nights}}
{{adults}}
{{children}}
{{rooms}}
{{child_ages_csv}}
{{child_ages_semicolon}}
{{child_ages_dash}}
{{occupancy_path}}
```

Regla runtime:

```text
n8n solo puede construir link dinámico si `validation_status = approved` y existe `booking_url_template` con `booking_config` válido.
```

### 14.8 Módulo discovery de motor-reservas

Estas variables pertenecen al wizard de descubrimiento y no son fuente final de verdad del tenant.

| Variable | Uso | Persistencia |
|---|---|---|
| `session_id` | Identifica sesión temporal del wizard. | `booking_discovery_sessions` |
| `status` | `draft`, `pending_verification`, `approved`, `rejected`, `cancelled`. | `booking_discovery_sessions` |
| `scenarios` | Escenarios S1-S3 usados para analizar links. | `booking_discovery_sessions` |
| `sample_urls` | Tres URLs pegadas por el tenant. | `booking_discovery_sessions` |
| `candidate_template` | Plantilla candidata aún no aprobada. | `booking_discovery_sessions` |
| `candidate_config` | Metadatos detectados por extractor. | `booking_discovery_sessions` |
| `verification_scenario` | Escenario usado para preview. | `booking_discovery_sessions` |
| `verification_url` | URL generada para prueba del tenant. | `booking_discovery_sessions` |
| `warnings` | Diagnóstico del extractor. | `booking_discovery_sessions` |
| `confidence_score` | Confianza preliminar del extractor. | `booking_discovery_sessions` |

Regla crítica:

```text
`discover` y `preview` no escriben en `tenant_settings`. Solo `approve` persiste la plantilla aprobada.
```

### 14.9 Módulo vertical_templates

| Variable | Uso |
|---|---|
| `id` | Identificador interno de plantilla vertical. |
| `vertical_slug` | Identificador de vertical (`hotel`, futura `ferreteria`, `clinica`, etc.). |
| `name` | Nombre visible de la vertical. |
| `status` | Estado de la plantilla vertical. |
| `required_onboarding_fields` | Campos obligatorios de onboarding para esa vertical. |
| `prompt_template` | Plantilla base de prompt por vertical. |
| `conversation_rules` | Reglas conversacionales por vertical. |
| `booking_rules` | Reglas de reserva/cotización/derivación por vertical. |
| `created_at` | Auditoría de creación. |
| `updated_at` | Auditoría de modificación. |

### 14.10 Alcance mínimo que el Programador debe parametrizar

El Programador debe revisar y reconstruir con variables de tenant, como mínimo:

1. Nombre visible de la aplicación.
2. Título HTML/HTTP.
3. Conexión interna PostgreSQL.
4. Identidad de tenant y agente.
5. Resolución de tenant por `evolution_instance_name`.
6. Endpoints internos para FAQ, Qdrant y preguntas sin respuesta.
7. Configuración de pausa humana por Redis TTL.
8. Configuración de motor-reservas solo cuando esté aprobada.
9. Construcción del system prompt desde variables de tenant/agente/vertical.
10. Registro de preguntas sin respuesta asociado a tenant, agente, canal, teléfono y chat.

---

## 15. Configuración EasyPanel PostgreSQL

Para crear la instancia PostgreSQL propia de FAQ Inn en EasyPanel, usar estos valores base:

| Campo EasyPanel | Valor |
|---|---|
| Nombre del servicio | `faq-inn_postgres` |
| Nombre real en red EasyPanel | `n8n_faq-inn_postgres` |
| Nombre de la base de datos | `faq-inn` |
| Usuario | `postgres` |
| Contraseña | Generada por EasyPanel; no documentar en texto plano |
| Imagen Docker | `postgres:17` |
| Puerto interno | `5432` |
| Puerto público externo | No publicado |
| Conexión esperada | Solo interna por red EasyPanel/Docker |

Reglas:

```text
La contraseña generada por EasyPanel no debe documentarse en texto plano.
No publicar PostgreSQL de FAQ Inn hacia internet ni hacia el host si no es estrictamente necesario.
La app FAQ Inn debe consumir PostgreSQL por nombre interno del servicio.
```

Nota de normalización:

```text
El tenant funcional de desarrollo sigue siendo FAQ-INN.
La base técnica inicial en PostgreSQL se crea como faq-inn para mantener compatibilidad con nombres seguros en PostgreSQL, Docker y herramientas.
```

---

## 16. Próxima etapa recomendada

### 16.1 Etapa documental inmediata

1. Registrar FAQ Inn en el README raíz de @Acer.
2. Mantener DFAQ sin cambios operativos.
3. Usar este README como fuente oficial inicial del nuevo proyecto.
4. Mantener `faq-inn` como repositorio GitHub oficial del proyecto.

### 16.2 Etapa técnica inicial

1. Crear o vincular el repositorio GitHub `faq-inn` como repositorio propio del proyecto.
2. Iniciar versión de código **1.0** de FAQ Inn usando variables de tenant.
3. Definir `$tenant = FAQ-INN` para desarrollo.
4. Cambiar el título HTTP/frontend a `FAQ Inn $Tenant`.
5. Asociar PostgreSQL al tenant mediante la variable de base definida para FAQ Inn y conexión interna del servicio PostgreSQL.
6. Implementar primero el MVP `evolution-onboarding-mvp`:
   - registro mínimo con nombre comercial y email;
   - generación automática de `tenant_slug`;
   - creación de instancia Evolution con `instance_name = faqinn_<tenant_slug>`;
   - obtención y visualización de QR;
   - polling de estado;
   - captura de `phone_number`;
   - actualización del tenant a `connected`.
7. Diseñar modelo mínimo para `tenants` y `evolution_instances`.
8. Validar contrato real con Evolution API v2.3.7.
9. Crear primer tenant demo hotelero sin tocar MorroReservas.
10. Recién después de validar WhatsApp conectado, avanzar a n8n multitenant, FAQs, prompts y conversación.

---

## 17. Base técnica heredada desde DFAQ

Para que el Programador pueda partir desde una base ya validada, se copió una base técnica limpia desde `FAQ multiusuario` hacia `FAQ Inn`.

Incluye:

- `api/` — backend Fastify, PostgreSQL, rutas FAQ, búsqueda, Qdrant, embeddings y preguntas sin respuesta.
- `http/` — frontend/nginx y proxy hacia API.
- `.cursor/` — reglas de trabajo para Cursor/Programador.
- `scripts/` — scripts de apoyo heredados.
- `DEPLOY.md`, `Dockerfile`, `Dockerfile.http` — base de despliegue a adaptar.
- `docs/N8N-SEARCH.md` — contrato histórico de búsqueda desde n8n.

No se copió `.env`, datasets operativos, imágenes históricas ni archivos temporales.

Detalle oficial: [docs/base-heredada-dfaq.md](docs/base-heredada-dfaq.md).

---

## 18. Estado actual

```text
Proyecto documental creado.
Repositorio GitHub oficial definido: faq-inn.
Variables iniciales por tenant definidas.
Tenant de desarrollo definido: FAQ-INN.
Título HTTP/frontend objetivo definido: FAQ Inn $Tenant.
Base PostgreSQL lógica definida por tenant mediante variable propia del proyecto.
Base técnica DFAQ copiada como punto de partida.
MorroReservas permanece congelado.
Dominio objetivo definido: inn.at-once.cl.
Vertical inicial definida: Hotel v1.
Arquitectura SaaS/multivertical definida a nivel conceptual.
Módulo documental `motor-reservas` creado para descubrir, validar y guardar `booking_url_template` por tenant.
MVP Evolution onboarding validado en inn.at-once.cl (V1.3.x): registro, QR, conexión, webhook MESSAGES_UPSERT. Ver docs/evolution-api/ESTADO-MODULO.md.
System prompt por objetivo (`system_prompt_objective_templates`) + `custom_sprompt` admin-only documentados; n8n FAQ Productivo usa Armar SPrompt + append de custom_sprompt.
Admin detalle tenant (`GET /api/admin/tenants/:id`) expone `objetivo_slug` (slug técnico) desde `tenant_settings`; UI Admin lo muestra en **Ver**.
Dashboard FAQ: Importar Excel, Descargar Excel (CSV), Sincronizar respuestas, Nueva FAQ.
Siguiente etapa: 02-n8n-multitenant-runtime (payload webhook + resolución tenant por evolution_instance_name).
Pendiente arquitecto: cleanup al desvincular WhatsApp desde teléfono; persistencia instance_token_encrypted.
```

## 19. Esquema de base de datos

La fuente del esquema vigente es `api/src/lib/migrate.js` (rama `api` en producción). PostgreSQL contiene nueve tablas implementadas: `tenants` como entidad raíz; `users` para acceso y roles; `agents` para agentes por tenant; `faq_items` para preguntas y respuestas indexables; `unanswered_questions` para consultas no resueltas; `tenant_settings` para la configuración única del tenant; `tenant_provisioning` para el estado del onboarding; `evolution_instances` para las conexiones WhatsApp; y `booking_discovery_sessions` para descubrir y validar motores de reserva.

| Tabla | Campos principales | Relaciones |
|---|---|---|
| `tenants` | `id`, `slug`, `name`, `email`, `status`, `created_at`, `updated_at` | Tabla raíz. `slug` es único. |
| `users` | `id`, `tenant_id`, `email`, `password_hash`, `role`, `status`, `created_at`, `updated_at` | `tenant_id → tenants.id` con `ON DELETE SET NULL`. `email` único. |
| `agents` | `id`, `tenant_id`, `slug`, `name`, `channel`, `status`, `created_at`, `updated_at` | `tenant_id → tenants.id` con `ON DELETE CASCADE`. Único por `tenant_id + slug`. |
| `faq_items` | `id`, `tenant_id`, `agent_id`, `faq_uid`, `question`, `answer`, `category`, `keywords`, `language`, `active`, `qdrant_point_id`, `embedding_hash`, `indexed_at`, `created_at`, `updated_at` | `tenant_id → tenants.id`; `agent_id → agents.id`, ambos en cascada. Único por `tenant_id + faq_uid`. |
| `unanswered_questions` | `id`, `tenant_id`, `agent_id`, `tenant_slug`, `channel`, `remote_id`, `contact_name`, `phone`, `question`, `language`, `score`, `suggested_faq_id`, `suggested_faq_question`, `status`, `converted_faq_id`, `resolved_by`, `resolved_at`, `created_at`, `updated_at` | `tenant_id → tenants.id`; `agent_id → agents.id`; `converted_faq_id → faq_items.id`; `resolved_by → users.id`. |
| `tenant_settings` | `tenant_id`, `objetivo_slug`, `vertical_slug`, `primary_language`, `booking_url_base`, `booking_url_template`, `booking_url_mode`, `validation_status`, `confidence_score`, `booking_config`, `booking_approved_at`, `lodging_type`, `business_hours`, `policies`, `welcome_message`, `address`, `postgres_database`, `custom_sprompt`, `created_at`, `updated_at` | `tenant_id` es PK y FK a `tenants.id`; existe como máximo una configuración por tenant. Campo canónico de objetivo: `objetivo_slug`. |
| `tenant_provisioning` | `tenant_id`, `status`, `last_error`, `created_at`, `updated_at` | `tenant_id` es PK y FK a `tenants.id`; existe como máximo un estado de provisionamiento por tenant. |
| `evolution_instances` | `id`, `tenant_id`, `instance_name`, `status`, `phone_number`, `webhook_url`, `last_qr_base64`, `last_qr_at`, `connected_at`, `last_error`, `created_at`, `updated_at` | `tenant_id → tenants.id` en cascada. `instance_name` único. |
| `booking_discovery_sessions` | `id`, `tenant_id`, `status`, `scenarios`, `sample_urls`, `candidate_template`, `candidate_config`, `verification_scenario`, `verification_url`, `warnings`, `confidence_score`, `created_at`, `updated_at` | `tenant_id → tenants.id` en cascada. Un tenant puede tener varias sesiones. |

```mermaid
erDiagram
  TENANTS ||--o{ USERS : tiene
  TENANTS ||--o{ AGENTS : tiene
  TENANTS ||--o{ FAQ_ITEMS : contiene
  AGENTS ||--o{ FAQ_ITEMS : utiliza
  TENANTS ||--o{ UNANSWERED_QUESTIONS : registra
  AGENTS ||--o{ UNANSWERED_QUESTIONS : genera
  FAQ_ITEMS ||--o{ UNANSWERED_QUESTIONS : convierte
  USERS ||--o{ UNANSWERED_QUESTIONS : resuelve
  TENANTS ||--o| TENANT_SETTINGS : configura
  TENANTS ||--o| TENANT_PROVISIONING : provisiona
  TENANTS ||--o{ EVOLUTION_INSTANCES : conecta
  TENANTS ||--o{ BOOKING_DISCOVERY_SESSIONS : ejecuta
```

Brechas / notas:

- El catálogo visible de nombres de objetivo vive en `public.system_prompt_objective_templates` (`objective_slug` / `objective_name`). El tenant guarda el slug técnico en `tenant_settings.objetivo_slug` (sin FK obligatoria al catálogo).
- Admin y runtime leen `objetivo_slug` desde `tenant_settings`. No confundir con el nombre inglés `objective_slug` del catálogo de plantillas.
- `custom_sprompt` se crea/asegura en la migración de la rama `api` junto a `objetivo_slug`.
