# FAQ multiusuario (DFAQ)

> **Despliegue:** ver [DEPLOY.md](./DEPLOY.md) — 2 contenedores (`api` + `http`), MariaDB embebido en `api`.

## Bitácora de cambios

| Fecha | Versión | Cambio realizado | Motivo | Impacto | Sección afectada |
|---|---|---|---|---|---|
| 2026-07-01 | V1.8 | Embeddings productivos migrados a NVIDIA API (`baai/bge-m3`, 1024 dims). | Miguel provee API key gratuita de build.nvidia.com; se prioriza costo cero y soporte multilingüe sin depender de OpenAI. | Colección Qdrant productiva pasa a `kb_<tenant_slug>_nvidia_1024`; OpenAI queda como alternativa vía `EMBEDDING_PROVIDER=openai`. | Estrategia embeddings, Qdrant, DEPLOY, variables api |
| 2026-06-30 | V1.6 | Documentación alineada con arquitectura de 2 contenedores (`api` + `http`), ramas Git y MariaDB embebido. | Consolidar en README y DEPLOY la decisión V1.5 ya implementada en código. | Secciones 3, 4, 15, 16, 17 y 18 reflejan el despliegue real; repositorio `mcandiav/dfaq`. | README, DEPLOY.md |
| 2026-06-30 | V1.5 | Arquitectura reducida a 2 servicios Docker (`api` + `http`) con ramas Git homónimas; MariaDB embebido en `api`. | Miguel prefiere 2 contenedores (api/http) en lugar de 4 (web, api, worker, mariadb). | EasyPanel despliega `dfaq-api` desde rama `api` y `dfaq-http` desde rama `http`; MariaDB persiste en volumen `/var/lib/mysql` dentro de `api`. | DEPLOY.md, estructura repositorio |
| 2026-06-30 | V1.4 | Se define dominio público MVP `dfaq.at-once.cl`. | Miguel define el subdominio que se usará para publicar la aplicación en EasyPanel. | La arquitectura de despliegue queda con `APP_URL=https://dfaq.at-once.cl`; EasyPanel/Cloudflare/Traefik deberán publicar la app en ese dominio. | Arquitectura de despliegue en EasyPanel |
| 2026-06-30 | V1.3 | Se define colección Qdrant separada por cliente como estrategia inicial. | Miguel prefiere aislar clientes por colección para simplificar borrado, separación operativa y reducir riesgo de mezcla de datos entre clientes. | El MVP debe crear/verificar una colección por tenant, usando nombres normalizados; se mantiene `tenant_id` y `agent_id` en payload como defensa adicional. | Estrategia Qdrant, Modelo de datos, Plan de programación MVP |
| 2026-06-30 | V1.2 | Se adelanta Qdrant al inicio del MVP y se registra endpoint interno. | Miguel define que si Qdrant no funciona todo el proyecto es estéril, por lo que debe validarse desde el arranque del desarrollo. | El plan de programación cambia: la primera base técnica debe comprobar conectividad, colección, upsert y search contra `http://n8n_qdrant:6333/` antes del CRUD completo. | Estrategia Qdrant, Arquitectura de despliegue en EasyPanel, Plan de programación MVP |
| 2026-06-30 | V1.1 | Se define EasyPanel como plataforma obligatoria de despliegue. | Miguel confirma que el programa debe levantarse en EasyPanel y que la arquitectura debe nutrirse de `infra.md`. | La solución queda condicionada a servicios Docker operables desde EasyPanel, con proyecto propio, MariaDB propia y conexión controlada con Qdrant/n8n existentes. | Arquitectura de despliegue en EasyPanel |
| 2026-06-30 | V1.0 | Creación del proyecto `FAQ multiusuario` y definición inicial de arquitectura. | Formalizar la evolución desde una FAQ aislada de MorroReservas hacia una plataforma web multiusuario y multicliente para bases de conocimiento de agentes IA. | Se establece el objetivo, componentes, flujo de edición, flujo de indexación, flujo de búsqueda y evidencia técnica ya validada con n8n + OpenAI + Qdrant. | Todo el documento |

---

## 1. Objetivo del proyecto

Construir una aplicación web multiusuario y multicliente para administrar preguntas y respuestas utilizadas por agentes IA.

La aplicación debe permitir que cada cliente vea, cree, edite, active, desactive y mejore sus propias respuestas desde una interfaz web, sin tener que tocar directamente Qdrant, n8n ni configuraciones técnicas.

El objetivo funcional es que cada agente pueda consultar una base de conocimiento controlada, editable y semánticamente buscable.

Ejemplo conceptual:

```text
Cliente MorroReservas
  └── Agente ChatWoot Reservas
       └── Preguntas y respuestas propias

Cliente Clinica X
  └── Agente WhatsApp Recepcion
       └── Preguntas y respuestas propias
```

---

## 2. Problema que se quiere resolver

Actualmente las respuestas de un agente pueden quedar dispersas entre prompts, workflows, tablas auxiliares, MCPs o colecciones vectoriales.

Eso genera problemas operativos:

- Editar respuestas requiere conocimiento técnico.
- Qdrant no es una interfaz amigable para usuarios finales.
- n8n no debería ser usado como gestor editorial de conocimiento.
- Si hay más clientes, se necesita aislamiento claro por cliente/agente.
- La base vectorial debe actualizarse cuando cambia una respuesta, pero no debería hacerse manualmente.

Este proyecto busca separar responsabilidades:

```text
App web / MariaDB = fuente maestra editable
Qdrant = índice vectorial derivado
n8n / agente = consumidor de búsqueda semántica
```

---

## 3. Decisión arquitectónica inicial

La plataforma se diseñará como una aplicación multi-tenant.

Principios definidos:

1. MariaDB será la fuente maestra de datos.
2. Qdrant será un índice técnico derivado, no la fuente oficial.
3. Cada FAQ tendrá un identificador estable.
4. Cada edición que modifique el texto vectorizable deberá regenerar solo el vector de esa FAQ.
5. Debe existir una opción administrativa para reindexar una FAQ individual, un agente completo o toda una colección.
6. El agente no debe mezclar datos entre clientes.
7. Toda búsqueda debe filtrar por `tenant_id`, `agent_id` y `active = true`.

### 3.1 Decisión de despliegue (V1.5)

El MVP se desplegará con **exactamente 2 contenedores Docker** en EasyPanel:

| Contenedor | Rama Git | Equivalente conceptual | Rol |
|---|---|---|---|
| `http` | `http` | capa de presentación | Interfaz web (nginx) y proxy de `/api/*` hacia `api`. |
| `api` | `api` | capa de aplicación + datos | Backend Fastify, indexación futura y **MariaDB embebido** en el mismo contenedor. |

Reglas vigentes:

1. **No** se desplegarán 4 contenedores (`web`, `api`, `worker`, `mariadb`) como arquitectura inicial.
2. MariaDB **no** tendrá contenedor propio; corre dentro de `api` con volumen persistente en `/var/lib/mysql`.
3. El worker de indexación se integrará **después** como proceso lógico dentro de `api`, no como tercer contenedor.
4. Repositorio GitHub: `mcandiav/dfaq`. Guía operativa: [DEPLOY.md](./DEPLOY.md).

---

## 4. Arquitectura propuesta

### 4.1 Arquitectura lógica (negocio)

```text
Usuarios / Clientes
        ↓
Interfaz web (http)
        ↓
API + MariaDB (api)
        ↓
Indexación / embeddings (proceso en api)
        ↓
NVIDIA API — baai/bge-m3 (alternativa: OpenAI)
        ↓
Qdrant
        ↓
n8n / ChatWoot / Agente IA
```

### 4.2 Arquitectura física de despliegue (EasyPanel)

```text
https://dfaq.at-once.cl
        ↓
http  (rama Git `http`, puerto 80)
        ↓ proxy /api/*
api   (rama Git `api`, puerto 3000)
        ├── Fastify
        ├── MariaDB embebido  → volumen /var/lib/mysql
        └── (futuro) worker de indexación
        ↓
Qdrant  (n8n_qdrant:6333, externo al proyecto dfaq)
        ↓
n8n / ChatWoot / Agente IA
```

### 4.3 Componentes

| Componente | Rol | Contenedor |
|---|---|---|
| `http` | Interfaz web y proxy nginx hacia la API. | `http` |
| API Fastify | Autenticación, CRUD, búsqueda e integración. | `api` |
| MariaDB | Fuente maestra de tenants, usuarios, agentes, colecciones y FAQs. | `api` (embebido) |
| Indexación | Genera embeddings y actualiza Qdrant. | `api` (proceso futuro) |
| NVIDIA API Embeddings | Proveedor productivo: `baai/bge-m3` vía build.nvidia.com. | externo |
| OpenAI Embeddings | Alternativa opcional (`EMBEDDING_PROVIDER=openai`). | externo |
| Qdrant | Índice vectorial de búsqueda semántica. | `n8n_qdrant` (existente) |
| n8n | Orquestador de agentes y canales. | existente |
| ChatWoot | Canal de conversación del agente. | existente |

---

## 5. Modelo multiusuario y multicliente

La unidad principal será el cliente o tenant.

```text
Tenant
  └── Usuarios
  └── Agentes
       └── Colecciones de conocimiento
            └── FAQs
```

Roles iniciales propuestos:

| Rol | Permisos esperados |
|---|---|
| Admin global | Ve todos los clientes y administra la plataforma. |
| Admin cliente | Administra usuarios, agentes y FAQs de su cliente. |
| Editor | Crea y edita preguntas/respuestas del cliente. |
| Lector | Solo visualiza información. |

---

## 6. Modelo de datos propuesto

### 6.1 `tenants`

```text
id
name
slug
status
created_at
updated_at
```

### 6.2 `users`

```text
id
name
email
password_hash
status
created_at
updated_at
```

### 6.3 `tenant_users`

```text
tenant_id
user_id
role
created_at
```

### 6.4 `agents`

```text
id
tenant_id
name
channel
status
created_at
updated_at
```

### 6.5 `knowledge_collections`

```text
id
tenant_id
agent_id
name
qdrant_collection
embedding_provider
embedding_model
embedding_dimension
status
created_at
updated_at
```

### 6.6 `faq_items`

```text
id
tenant_id
agent_id
collection_id
question
answer
category
keywords
language
active
qdrant_point_id
embedding_hash
needs_reindex
created_at
updated_at
indexed_at
```

### 6.7 `faq_versions`

```text
id
faq_item_id
old_question
old_answer
old_keywords
changed_by
changed_at
```

### 6.8 `index_jobs`

```text
id
tenant_id
collection_id
faq_item_id
job_type
status
error_message
created_at
started_at
finished_at
```

---

## 7. Estrategia Qdrant

### 7.1 Decisión de prioridad para MVP

Qdrant debe validarse al inicio del desarrollo, no al final.

Motivo arquitectónico:

```text
Si Qdrant no funciona, la plataforma FAQ multiusuario pierde su propósito central.
```

Por lo tanto, el primer incremento programable debe comprobar:

1. Conectividad desde la app desplegable hacia Qdrant.
2. Existencia o creación controlada de colección.
3. Upsert de una FAQ de prueba.
4. Search semántico o vectorial contra esa FAQ.
5. Lectura correcta de payload, metadata y score.

Endpoint interno confirmado en `infra.md`:

```text
http://n8n_qdrant:6333/
```

Este endpoint debe usarse como `QDRANT_URL` dentro de los servicios EasyPanel que tengan red/resolución compatible con `n8n_qdrant`.

### 7.2 Estrategia de colecciones por cliente

La estrategia inicial será una colección Qdrant separada por cliente o tenant.

Motivo:

- Aislamiento operativo más claro entre clientes.
- Borrado completo de un cliente más simple y menos riesgoso.
- Menor posibilidad de mezcla accidental de datos entre tenants.
- Restauración, reindexación o diagnóstico más directo por cliente.

La colección de prueba validada fue:

```text
Embedding_OpenAI
```

Esa colección no debe considerarse nombre productivo.

Formato productivo vigente (V1.8):

```text
kb_<tenant_slug>_nvidia_1024
```

Ejemplos:

```text
kb_morroreservas_nvidia_1024
kb_clinica_x_nvidia_1024
```

Formato histórico POC n8n (OpenAI, no mezclar con productivo):

```text
kb_<tenant_slug>_openai_1536
kb_morroreservas_openai_1536
```

Reglas de nombre:

- Usar `tenant.slug` normalizado.
- Minúsculas.
- Sin espacios.
- Sin tildes.
- Solo caracteres seguros: letras, números y guion bajo.
- El modelo/dimensión debe quedar reflejado para evitar mezclar embeddings incompatibles.

### 7.3 Estrategia de aislamiento

Aunque exista una colección separada por cliente, el payload debe mantener `tenant_id`, `agent_id`, `faq_id` y `active` como defensa adicional.

Ejemplo de payload por vector:

```json
{
  "tenant_id": "morroreservas",
  "agent_id": "chatwoot_reservas",
  "faq_id": "wifi-001",
  "category": "servicios",
  "active": true
}
```

Toda consulta deberá aplicar filtro obligatorio dentro de la colección del cliente:

```text
agent_id = agente actual
active = true
```

También se recomienda conservar filtro por `tenant_id` aunque la colección ya sea específica del cliente:

```text
tenant_id = cliente actual
agent_id = agente actual
active = true
```

Esto evita resultados incorrectos si en una operación futura se migra, duplica o reindexa información entre colecciones.

---

## 8. Estrategia de embeddings

### 8.1 Decisión productiva vigente (V1.8)

Para DFAQ en producción se usa:

```text
Proveedor: NVIDIA API (build.nvidia.com)
Modelo: baai/bge-m3
Dimensión: 1024
Distancia Qdrant: Cosine
Colección: kb_<tenant_slug>_nvidia_1024
```

Motivo:

- Tier gratuito de desarrollo en NVIDIA NIM API.
- Modelo **multilingüe** (100+ idiomas; español, portugués e inglés).
- API compatible con formato OpenAI (`POST /v1/embeddings`).
- Sin dependencia de clave OpenAI de pago para el MVP.

Variables en `dfaq-api`:

```text
EMBEDDING_PROVIDER=nvidia
NVIDIA_API_KEY=<secreto>
NVIDIA_API_BASE=https://integrate.api.nvidia.com/v1
NVIDIA_EMBEDDING_MODEL=baai/bge-m3
EMBEDDING_DIMENSION=1024
QDRANT_COLLECTION_TEMPLATE=kb_<tenant_slug>_nvidia_1024
```

### 8.2 Decisión histórica POC n8n (OpenAI)

La prueba de concepto en n8n validó:

```text
Proveedor: OpenAI
Modelo: text-embedding-3-small
Dimensión: 1536
Colección POC: Embedding_OpenAI
```

Esa evidencia sigue siendo válida para n8n, pero **no se mezcla** con vectores NVIDIA en la misma colección.

### 8.3 Alternativa OpenAI en DFAQ

Si se configura `EMBEDDING_PROVIDER=openai`, DFAQ vuelve a usar OpenAI:

```text
OPENAI_API_KEY=<secreto>
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
QDRANT_COLLECTION_TEMPLATE=kb_<tenant_slug>_openai_1536
```

### 8.4 Otras alternativas evaluadas

| Alternativa | Estado | Observación |
|---|---|---|
| FastEmbed / `fast-multilingual-e5-large` | No adoptado | Colección `Claude` en Qdrant; n8n Ollama no lo soporta directamente. |
| Ollama / `nomic-embed-text` | Evaluado | Disponible en `n8n_ollama`; posible etapa posterior local. |
| Ollama / `mxbai-embed-large` | Evaluado | Candidato para prueba local posterior. |
| OpenAI / `text-embedding-3-small` | POC n8n validada | Alternativa en DFAQ vía `EMBEDDING_PROVIDER=openai`. |
| NVIDIA / `baai/bge-m3` | **Adoptado en DFAQ** | Multilingüe, tier gratuito NVIDIA API. |

---

## 9. Reglas de indexación

### 9.1 Actualización individual

No es necesario recalcular todos los vectores cada vez que se edita una respuesta.

Cada FAQ tendrá un `qdrant_point_id` estable.

Cuando se edite una FAQ:

```text
1. La app guarda el cambio en MariaDB.
2. Calcula un hash del texto vectorizable.
3. Si el hash cambió, marca needs_reindex = true.
4. El worker genera un nuevo embedding solo para esa FAQ.
5. El worker hace upsert del mismo qdrant_point_id en Qdrant.
6. La app marca needs_reindex = false e indexed_at = ahora.
```

### 9.2 Cuándo recalcular embedding

Se debe recalcular embedding si cambia:

- Pregunta.
- Respuesta.
- Keywords.
- Texto vectorizable.
- Categoría si forma parte del texto vectorizable.
- Idioma si forma parte del texto vectorizable.

No es necesario recalcular embedding si cambia solo:

- Estado visual.
- Orden.
- Usuario editor.
- Fecha administrativa.
- Nota interna que no se vectoriza.

### 9.3 Reindexación total

Debe existir opción de reindexación total para casos como:

- Cambio de modelo de embedding.
- Cambio de dimensión.
- Cambio de formato del texto vectorizable.
- Migración de colección.
- Reparación de inconsistencias.

---

## 10. Formato del texto vectorizable

No se vectorizará solo la respuesta.

Formato recomendado:

```text
Pregunta: Tienen Wifi?
Respuesta: Si, tenemos WIFI, pero estamos en una isla y el servicio no tiene la robustez de un servicio en el continente.
Categoria: servicios
Keywords: wifi, internet, conexion, ilha, trabalho remoto
```

Esto mejora la recuperación semántica ante preguntas formuladas de distintas maneras.

---

## 11. API esperada para agentes

La app debería exponer una API de búsqueda para que n8n o cualquier agente no tenga que conocer los detalles internos de Qdrant.

**Configuración del nodo HTTP Request en n8n:** [docs/N8N-SEARCH.md](docs/N8N-SEARCH.md)

Endpoint conceptual:

```http
POST /api/search
```

Body conceptual:

```json
{
  "tenant_id": "morroreservas",
  "agent_id": "chatwoot_reservas",
  "query": "Tem internet bom para trabalhar?"
}
```

Respuesta conceptual:

```json
{
  "results": [
    {
      "faq_id": "wifi-001",
      "question": "Tienen Wifi?",
      "answer": "Si, tenemos WIFI, pero estamos en una isla y el servicio no tiene la robustez de un servicio en el continente.",
      "score": 0.7002034
    }
  ]
}
```

---

## 12. Evidencia técnica validada

### 12.1 Flujo de inserción creado en n8n

Se creó el workflow:

```text
Nombre: qdrant insertar OpenAI WiFi
ID: R8J5ICA4zWNrlyKO
URL: https://dn8n.at-once.cl/workflow/R8J5ICA4zWNrlyKO
```

Función:

```text
Inserta una única FAQ de WiFi en Qdrant usando OpenAI text-embedding-3-small.
```

FAQ insertada:

```text
Pregunta: Tienen Wifi?
Respuesta: Si, tenemos WIFI, pero estamos en una isla y el servicio no tiene la robustez de un servicio en el continente.
```

Colección usada:

```text
Embedding_OpenAI
```

Credenciales autoasignadas por n8n:

```text
Qdrant: QdrantApi account
OpenAI: Kimi
```

### 12.2 Flujo de consulta actualizado en n8n

Se actualizó el workflow:

```text
Nombre: qdrant
ID: fTTK3GOqs2Ym72aT
URL: https://dn8n.at-once.cl/workflow/fTTK3GOqs2Ym72aT
```

Función:

```text
Consulta la colección Embedding_OpenAI con OpenAI text-embedding-3-small.
```

Consulta validada:

```text
Pregunta: Tienen Wifi?
```

Resultado recuperado desde Qdrant:

```text
Pregunta: Tienen Wifi?
Respuesta: Si, tenemos WIFI, pero estamos en una isla y el servicio no tiene la robustez de un servicio en el continente.
```

Score registrado:

```text
0.7002034
```

### 12.3 Corrección técnica aplicada

El nodo Qdrant devuelve el contenido en:

```text
document.pageContent
```

No en:

```text
pageContent
```

Por eso el workflow `qdrant` fue corregido para leer:

```text
$json.document.pageContent
$json.document.metadata
$json.score
```

---

## 13. Lo que se probó que funciona

Queda validado:

1. n8n puede crear/usar una colección Qdrant nueva.
2. n8n puede insertar documentos usando OpenAI embeddings.
3. Qdrant puede recuperar una FAQ insertada con OpenAI embeddings.
4. La consulta devuelve metadata y score.
5. El flujo de consulta no depende del MCP Qdrant para esta colección nueva.
6. La arquitectura nativa n8n + OpenAI + Qdrant es viable para una FAQ reconstruida.

---

## 14. Lo que queda por validar

Antes de convertir esto en plataforma productiva falta validar:

1. Diseño final de la app web.
2. Framework backend/frontend.
3. Modelo definitivo de autenticación.
4. Roles y permisos.
5. Estrategia final de colección Qdrant compartida o dedicada.
6. Reindexación individual desde la app.
7. Reindexación total.
8. Filtros obligatorios por tenant/agente.
9. Endpoint de búsqueda para n8n.
10. Pruebas multilingües reales en español, portugués e inglés.
11. Política de auditoría e historial de cambios.

---

## 15. Decisiones abiertas y cerradas

| Tema | Decisión |
|---|---|
| Nombre del producto | **DFAQ** — dominio `dfaq.at-once.cl`. |
| Repositorio GitHub | `mcandiav/dfaq`. |
| Contenedores EasyPanel | **2:** `http` + `api`. MariaDB embebido en `api`. |
| Ramas Git de despliegue | `http` (interfaz) y `api` (backend + BD). |
| Framework API | Node.js + Fastify (Fase 1 implementada). |
| Framework interfaz | Pendiente; placeholder nginx en rama `http`. |
| Colección Qdrant productiva | `kb_<tenant_slug>_nvidia_1024` |
| Modelo de embeddings DFAQ | NVIDIA `baai/bge-m3` (1024 dims). OpenAI alternativo. |
| POC n8n embeddings | OpenAI `text-embedding-3-small` en `Embedding_OpenAI` (histórico). |
| API para n8n | Pendiente contrato final (`POST /api/search`). |
| Multi-tenant | Lógico con filtros `tenant_id` + `agent_id`. |
| Worker de indexación | Proceso lógico futuro **dentro de `api`**, no contenedor aparte. |

---

## 16. Próxima acción recomendada

Fase 1 (esqueleto `api` + validación Qdrant/MariaDB) **implementada en código**. Siguiente foco:

1. Desplegar `dfaq-api` en EasyPanel (rama `api`, directorio `api`).
2. Desplegar `dfaq-http` en EasyPanel (rama `http`, directorio `http`, dominio `dfaq.at-once.cl`).
3. Validar `/api/qdrant/health` y `/api/db/health` desde producción.
4. Resolver conectividad de red hacia `n8n_qdrant:6333` si falla.
5. Definir migraciones MariaDB y modelo CRUD.
6. Implementar pantallas reales en `http`.
7. Integrar worker de indexación dentro de `api`.
8. Exponer `POST /api/search` para n8n.

Guía de despliegue: [DEPLOY.md](./DEPLOY.md).

---

## 17. Arquitectura de despliegue en EasyPanel

### 17.1 Decisión de plataforma

La aplicación `FAQ multiusuario` se desplegará obligatoriamente en EasyPanel, sobre la infraestructura documentada en `infra.md`.

Regla arquitectónica vigente:

```text
No se instalarán dependencias manuales en el host DEV.
Todo componente del sistema debe correr como servicio Docker administrado por EasyPanel.
```

El proyecto no debe diseñarse como una instalación manual, ni como una aplicación dependiente de rutas locales del servidor. Debe ser portable, contenerizado y configurable por variables de entorno.

### 17.2 Proyecto EasyPanel

Proyecto EasyPanel:

```text
dfaq
```

Repositorio Git: `https://github.com/mcandiav/dfaq`

Motivo:

- Separa DFAQ del proyecto EasyPanel `n8n`.
- Dos App Services (`dfaq-http`, `dfaq-api`) desde ramas homónimas.
- MariaDB no requiere servicio aparte: vive en `api`.

### 17.3 Servicios Docker (decisión V1.5)

Arquitectura **obligatoria** para MVP: **2 contenedores**.

```text
dfaq
  ├── dfaq-http   → rama Git `http`, directorio `http/`, puerto 80
  └── dfaq-api    → rama Git `api`, directorio `api/`, puerto 3000
```

| App Service | Rama Git | Directorio | Puerto | Rol |
|---|---|---|---|---|
| `dfaq-http` | `http` | `http/` | 80 | Interfaz web (nginx) y proxy `/api/*` → `api`. Dominio público: `dfaq.at-once.cl`. |
| `dfaq-api` | `api` | `api/` | 3000 | Backend Fastify + **MariaDB embebido**. Volumen: `/var/lib/mysql`. |

**No** forman parte del despliegue inicial:

- Contenedor separado de MariaDB (embebido en `api`).
- Contenedor `worker` (indexación futura como proceso en `api`).
- Contenedores adicionales `faq-web` / `faq-mariadb` / `faq-worker` de diseños anteriores.

Separación conceptual mantenida:

```text
http  = capa de presentación (equivalente a “front”)
api   = capa de aplicación + datos (equivalente a “back” + MariaDB)
```

Detalle operativo: [DEPLOY.md](./DEPLOY.md).

### 17.4 Servicios de infraestructura integrados

El proyecto debe integrarse con servicios ya documentados en `infra.md`:

| Servicio existente | Uso esperado |
|---|---|
| `n8n_n8n` | Consumidor/orquestador de búsquedas para agentes y canales. |
| `n8n_qdrant` | Vector DB inicial obligatoria para el arranque del MVP. Endpoint interno confirmado: `http://n8n_qdrant:6333/`. |
| Cloudflare / Traefik | Publicación HTTPS y perímetro de acceso. |
| Duplicati / backups existentes | Referencia para política de respaldo, a validar antes de producción. |
| mcp-doc / workspace | Documentación y trazabilidad del proyecto, no almacenamiento operativo de la app. |

### 17.5 Qdrant: uso recomendado en EasyPanel

Para MVP se usará desde el inicio la instancia Qdrant existente documentada como `n8n_qdrant`, siempre que se mantenga aislamiento lógico obligatorio por payload.

Endpoint interno confirmado:

```text
http://n8n_qdrant:6333/
```

Esta URL debe configurarse como `QDRANT_URL` en los servicios de la app que necesiten indexar o buscar.

Colección productiva vigente para MVP:

```text
kb_<tenant_slug>_nvidia_1024
```

Ejemplo inicial para MorroReservas:

```text
kb_morroreservas_nvidia_1024
```

Colección histórica POC n8n (OpenAI, no reutilizar para DFAQ productivo):

```text
Embedding_OpenAI
kb_morroreservas_openai_1536
```

Toda búsqueda debe seleccionar la colección del cliente y aplicar filtros obligatorios:

```text
tenant_id = cliente actual
agent_id = agente actual
active = true
```

Si el volumen, criticidad o aislamiento requerido aumenta, se podrá evaluar una instancia Qdrant dedicada para clientes específicos, pero la separación por colección ya será la base inicial.

### 17.6 MariaDB como fuente maestra (embebida en `api`)

MariaDB corre **dentro del contenedor `api`**, no como servicio Docker independiente.

Qdrant no es fuente maestra. Qdrant es un índice técnico derivado que puede reconstruirse desde MariaDB.

Implicación operativa:

```text
Si Qdrant se pierde o se corrompe → se reindexa desde MariaDB.
Si MariaDB se pierde → se pierde la fuente oficial del sistema.
```

Persistencia obligatoria en EasyPanel:

```text
Volumen en dfaq-api → /var/lib/mysql
```

Política de backup de `/var/lib/mysql` requerida antes de producción.

### 17.7 Flujo operativo de despliegue

```text
Cloudflare / Traefik
        ↓
dfaq-http  (https://dfaq.at-once.cl)
        ↓ proxy /api/*
dfaq-api
        ├── Fastify
        ├── MariaDB (127.0.0.1:3306, embebido)
        └── (futuro) worker indexación
        ↓
NVIDIA API — baai/bge-m3
        ↓
Qdrant (n8n_qdrant:6333)
        ↓
n8n / ChatWoot / Agente IA
```

### 17.8 Variables de entorno esperadas

**Servicio `dfaq-api` (rama `api`):**

```text
APP_ENV
APP_URL=https://dfaq.at-once.cl
DATABASE_URL=mysql://dfaq:<password>@127.0.0.1:3306/dfaq
MYSQL_DATABASE=dfaq
MYSQL_USER=dfaq
MYSQL_PASSWORD
MYSQL_ROOT_PASSWORD
EMBEDDING_PROVIDER=nvidia
EMBEDDING_DIMENSION=1024
NVIDIA_API_KEY
NVIDIA_API_BASE=https://integrate.api.nvidia.com/v1
NVIDIA_EMBEDDING_MODEL=baai/bge-m3
JWT_SECRET
QDRANT_URL=http://n8n_qdrant:6333/
QDRANT_API_KEY
QDRANT_COLLECTION_TEMPLATE=kb_<tenant_slug>_nvidia_1024
N8N_ALLOWED_TOKEN
```

Alternativa OpenAI (solo si `EMBEDDING_PROVIDER=openai`):

```text
OPENAI_API_KEY
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
QDRANT_COLLECTION_TEMPLATE=kb_<tenant_slug>_openai_1536
```

**Servicio `dfaq-http` (rama `http`):**

```text
API_UPSTREAM=http://dfaq-api:3000
```

(`dfaq-api` = nombre interno del App Service api en EasyPanel)

Las claves reales deben configurarse en EasyPanel, nunca en Git ni documentación.

### 17.9 Publicación y acceso

La app debe publicarse por dominio o subdominio bajo Cloudflare/Traefik.

Dominio público MVP definido:

```text
dfaq.at-once.cl
```

URL pública esperada:

```text
https://dfaq.at-once.cl
```

Variable operativa asociada:

```text
APP_URL=https://dfaq.at-once.cl
```

La seguridad de acceso queda pendiente de decisión:

1. Login propio de la aplicación.
2. Cloudflare Access delante de la aplicación.
3. Ambos mecanismos combinados.

Para administración interna inicial se recomienda evaluar Cloudflare Access además del login propio.

### 17.10 Requisitos para el Programador

El Programador debe construir la aplicación pensando en EasyPanel desde el inicio:

- Dockerfile reproducible.
- Variables de entorno para toda configuración sensible.
- Logs por stdout/stderr.
- Healthcheck HTTP en `http` (`/health`) y `api` (`/health`, `/api/db/health`, `/api/qdrant/health`).
- Migraciones de base de datos versionadas.
- Sin rutas absolutas del host.
- Sin dependencia de instalación manual en DEV.
- MariaDB embebido en `api` con volumen `/var/lib/mysql`.
- Separación clara entre datos maestros (MariaDB) e índice derivado (Qdrant).
- Endpoint de búsqueda para n8n/agentes.
- Indexación como proceso dentro de `api` (no tercer contenedor).

### 17.11 Estado de etapa

El proyecto queda en esta etapa:

```text
POC técnica Qdrant validada (n8n)
+
Fase 1 código: api (Fastify + MariaDB + Qdrant health) + http (nginx)
+
Arquitectura 2 contenedores documentada e implementada
+
Repositorio: mcandiav/dfaq (ramas api, http, main)
```

Siguiente etapa:

```text
Primer deploy EasyPanel (dfaq-api + dfaq-http) y validación en producción
```

---

## 18. Plan de programación MVP

### 18.1 Criterio rector

El desarrollo debe comenzar validando Qdrant desde la app o desde un servicio mínimo desplegable, no después del CRUD completo.

Regla arquitectónica:

```text
Sin Qdrant funcionando no hay MVP útil.
```

### 18.2 Fases recomendadas

| Fase | Objetivo | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Esqueleto `api` dockerizado + healthcheck | `GET /health`, MariaDB embebido operativo. | Implementado |
| 2 | Conectividad Qdrant desde `api` | `GET /api/qdrant/health` OK en EasyPanel. | Pendiente deploy |
| 3 | Esqueleto `http` + proxy | `dfaq.at-once.cl` sirve UI y proxifica `/api/*`. | Implementado |
| 4 | Colección Qdrant MVP | Crear/verificar `kb_morroreservas_nvidia_1024`. | Pendiente |
| 5 | Upsert FAQ técnica | Insertar FAQ WiFi con embedding NVIDIA. | Pendiente |
| 6 | Search Qdrant | `POST /api/search` multilingüe. | Pendiente |
| 7 | MariaDB esquema + CRUD | Migraciones y CRUD FAQs desde `http`. | Pendiente |
| 8 | Reindexación individual | Al editar FAQ, regenerar embedding en `api`. | Pendiente |
| 9 | API para n8n | `POST /api/search` con filtros obligatorios. | Pendiente |
| 10 | Seguridad y operación | Login, roles, backups, dominio definitivo. | Pendiente |

### 18.3 Primer incremento programable (completado en código)

Implementado en rama `api` del repositorio `mcandiav/dfaq`:

```text
App dockerizada con healthcheck, MariaDB embebido y validación Qdrant.
```

Endpoints mínimos:

1. `GET /health` — API + estado MariaDB.
2. `GET /api/db/health` — MariaDB.
3. `GET /api/qdrant/health` — conectividad Qdrant.
4. `QDRANT_URL` desde variable de entorno.
5. Logs por stdout/stderr.

Implementado en rama `http`:

1. `GET /health` — servicio http.
2. Proxy `/api/*` hacia `dfaq-api` vía `API_UPSTREAM`.

### 18.4 Variables mínimas del primer deploy

**`dfaq-api`:**

```text
APP_ENV=production
APP_URL=https://dfaq.at-once.cl
QDRANT_URL=http://n8n_qdrant:6333/
EMBEDDING_PROVIDER=nvidia
EMBEDDING_DIMENSION=1024
NVIDIA_API_KEY=<secreto>
NVIDIA_EMBEDDING_MODEL=baai/bge-m3
QDRANT_COLLECTION_TEMPLATE=kb_<tenant_slug>_nvidia_1024
MYSQL_PASSWORD=<secreto>
DATABASE_URL=mysql://dfaq:<secreto>@127.0.0.1:3306/dfaq
```

Volumen: `/var/lib/mysql`

**`dfaq-http`:**

```text
API_UPSTREAM=http://dfaq-api:3000
```

### 18.5 Criterio de aprobación de la primera fase

La primera fase solo se considera aprobada si desde el servicio desplegado en EasyPanel se confirma conexión real contra Qdrant interno.

Si `http://n8n_qdrant:6333/` no resuelve desde el nuevo proyecto EasyPanel, la prioridad será resolver red interna, nombre de servicio o alternativa de exposición interna antes de continuar con pantallas o CRUD.

