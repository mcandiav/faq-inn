# FAQ multiusuario

## Bitácora de cambios

| Fecha | Versión | Cambio realizado | Motivo | Impacto | Sección afectada |
|---|---|---|---|---|---|
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

---

## 4. Arquitectura propuesta

```text
Usuarios / Clientes
        ↓
App Web FAQ Manager
        ↓
MariaDB
        ↓
Worker / servicio de indexación
        ↓
OpenAI Embeddings
        ↓
Qdrant
        ↓
n8n / ChatWoot / Agente IA
```

### 4.1 Componentes

| Componente | Rol |
|---|---|
| App web | Interfaz multiusuario para administrar FAQs. |
| MariaDB | Fuente maestra de clientes, usuarios, agentes, colecciones y FAQs. |
| Worker de indexación | Genera embeddings y actualiza Qdrant. |
| OpenAI Embeddings | Servicio inicial elegido para generar vectores multilingües. |
| Qdrant | Índice vectorial de búsqueda semántica. |
| n8n | Orquestador actual de agentes y canales como ChatWoot. |
| ChatWoot | Canal de conversación donde opera el agente. |

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

Formato productivo recomendado para colecciones por cliente:

```text
kb_<tenant_slug>_openai_1536
```

Ejemplos:

```text
kb_morroreservas_openai_1536
kb_clinica_x_openai_1536
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

### 8.1 Decisión inicial

Para la primera etapa se usará:

```text
Proveedor: OpenAI
Modelo: text-embedding-3-small
Dimensión: 1536
Distancia Qdrant: Cosine
```

Motivo:

- Buen soporte multilingüe para español, portugués e inglés.
- Integración nativa disponible en n8n.
- Bajo volumen inicial.
- Costo marginal para FAQs pequeñas.
- Menos incertidumbre operativa que modelos locales no validados.

### 8.2 Alternativas evaluadas

| Alternativa | Estado | Observación |
|---|---|---|
| FastEmbed / `fast-multilingual-e5-large` | No adoptado inicialmente | La colección `Claude` muestra este embedding, pero el nodo `Embeddings Ollama` de n8n no lo soporta directamente. |
| Ollama / `nomic-embed-text` | Evaluado | Disponible en la UI de n8n/Ollama, pero no fue elegido como primera opción multilingüe. |
| Ollama / `mxbai-embed-large` | Evaluado | Disponible en la UI de n8n/Ollama, candidato para prueba local posterior. |
| OpenAI / `text-embedding-3-small` | Adoptado para prueba | Validado con Qdrant y n8n. |

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

## 15. Decisiones abiertas

| Tema | Decisión pendiente |
|---|---|
| Nombre del producto | Pendiente. Dominio público MVP definido: `dfaq.at-once.cl`. |
| Framework app web | Pendiente. |
| Colección Qdrant productiva | Definido: una colección por cliente con formato `kb_<tenant_slug>_openai_1536`. |
| Modelo de embeddings definitivo | Inicialmente OpenAI `text-embedding-3-small`; evaluar Ollama local más adelante. |
| API para n8n | Pendiente definir contrato final. |
| Multi-tenant físico o lógico | Inicialmente lógico con filtros por `tenant_id` y `agent_id`. |

---

## 16. Próxima acción recomendada

Definir la arquitectura MVP implementable sobre EasyPanel antes de programar:

1. Nombre del producto/módulo.
2. Framework tecnológico.
3. Modelo de datos MariaDB definitivo.
4. Contrato API de búsqueda.
5. Contrato API de indexación.
6. Pantallas mínimas de administración.
7. Roles mínimos.
8. Flujo de integración con n8n.
9. Servicios Docker requeridos para EasyPanel.
10. Variables de entorno.
11. Estrategia de dominio y publicación por Cloudflare/Traefik.
12. Conectividad con Qdrant existente o dedicado.
13. Estrategia de backup y persistencia.

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

### 17.2 Proyecto EasyPanel recomendado

Se recomienda crear un proyecto EasyPanel propio:

```text
faq-multiusuario
```

Motivo:

- Separa la plataforma FAQ del proyecto EasyPanel actual `n8n`.
- Evita mezclar la operación editorial de conocimiento con workflows de automatización.
- Facilita backup, despliegue, variables, logs y reinicios independientes.
- Permite crecer a futuro sin acoplarse al ciclo operativo de n8n.

### 17.3 Servicios recomendados

Arquitectura objetivo para MVP:

```text
faq-multiusuario
  ├── faq-web
  ├── faq-api
  ├── faq-worker
  └── faq-mariadb
```

| Servicio | Rol | Observación |
|---|---|---|
| `faq-web` | Interfaz web de administración | Pantallas para clientes, agentes, colecciones y FAQs. |
| `faq-api` | Backend/API | Autenticación, permisos, CRUD, búsqueda e integración interna. |
| `faq-worker` | Indexación | Genera embeddings y actualiza Qdrant de forma desacoplada. |
| `faq-mariadb` | Base de datos maestra | Fuente oficial de tenants, usuarios, agentes, FAQs, versiones y jobs. |

Para una primera versión muy simple se podría levantar web y API en un solo contenedor si el framework elegido lo justifica, pero la arquitectura lógica debe conservar la separación entre interfaz, API, base de datos e indexación.

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

La colección de prueba validada fue:

```text
Embedding_OpenAI
```

Esa colección no debe considerarse nombre productivo.

Colección productiva recomendada para MVP:

```text
kb_<tenant_slug>_openai_1536
```

Ejemplo inicial para MorroReservas:

```text
kb_morroreservas_openai_1536
```

Toda búsqueda debe seleccionar la colección del cliente y aplicar filtros obligatorios:

```text
tenant_id = cliente actual
agent_id = agente actual
active = true
```

Si el volumen, criticidad o aislamiento requerido aumenta, se podrá evaluar una instancia Qdrant dedicada para clientes específicos, pero la separación por colección ya será la base inicial.

### 17.6 MariaDB como fuente maestra propia

El servicio `faq-mariadb` debe ser la fuente oficial de datos.

Qdrant no es fuente maestra. Qdrant es un índice técnico derivado que puede reconstruirse desde MariaDB.

Implicación operativa:

```text
Si Qdrant se pierde o se corrompe, se reindexa desde MariaDB.
Si MariaDB se pierde, se pierde la fuente oficial del sistema.
```

Por eso `faq-mariadb` requiere volumen persistente y política de backup antes de producción.

### 17.7 Flujo operativo de despliegue

Flujo esperado en EasyPanel:

```text
Cloudflare / Traefik
        ↓
faq-web / faq-api
        ↓
faq-mariadb
        ↓
faq-worker
        ↓
OpenAI Embeddings
        ↓
Qdrant
        ↓
n8n / ChatWoot / Agente IA
```

### 17.8 Variables de entorno esperadas

Variables conceptuales mínimas, sin valores reales en documentación:

```text
APP_ENV
APP_URL
DATABASE_URL
JWT_SECRET
OPENAI_API_KEY
OPENAI_EMBEDDING_MODEL
QDRANT_URL=http://n8n_qdrant:6333/
QDRANT_API_KEY
QDRANT_COLLECTION_TEMPLATE=kb_<tenant_slug>_openai_1536
N8N_ALLOWED_TOKEN
```

Las claves reales, tokens y secretos deben configurarse en EasyPanel o en archivos `.env` no versionados, nunca en documentación ni Git.

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
- Healthcheck HTTP para API/web.
- Migraciones de base de datos versionadas.
- Sin rutas absolutas del host.
- Sin dependencia de instalación manual en DEV.
- Separación clara entre datos maestros en MariaDB e índice derivado en Qdrant.
- Endpoint de búsqueda para n8n/agentes.
- Worker desacoplado para indexación.

### 17.11 Estado de etapa

El proyecto queda en esta etapa:

```text
POC técnica validada
+
Arquitectura base documentada
+
Plataforma de despliegue definida: EasyPanel
+
Qdrant definido como validación inicial obligatoria
```

Siguiente etapa:

```text
Diseño MVP implementable en EasyPanel con Qdrant validado desde el primer incremento
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

| Fase | Objetivo | Resultado esperado |
|---|---|---|
| 1 | Esqueleto dockerizado EasyPanel + healthcheck | App mínima desplegable y observable. |
| 2 | Conectividad Qdrant | Servicio puede llamar `http://n8n_qdrant:6333/` desde EasyPanel. |
| 3 | Colección Qdrant MVP | Crear o verificar colección por cliente, por ejemplo `kb_morroreservas_openai_1536`. |
| 4 | Upsert FAQ técnica | Insertar una FAQ de prueba con payload multi-tenant. |
| 5 | Search Qdrant | Recuperar la FAQ y validar score/payload. |
| 6 | MariaDB mínima | Crear fuente maestra inicial para tenants, agents y faq_items. |
| 7 | CRUD FAQ | Crear, editar, activar/desactivar FAQs desde la app. |
| 8 | Reindexación individual | Al editar FAQ, regenerar embedding y upsert en Qdrant. |
| 9 | API para n8n | Exponer `/api/search` con filtros obligatorios. |
| 10 | Seguridad y operación | Login, roles, backups, logs y dominio definitivo. |

### 18.3 Primer incremento programable

El primer incremento que debe recibir el Programador es:

```text
Crear una app mínima dockerizada para EasyPanel que tenga un endpoint de healthcheck y un endpoint técnico que valide conectividad con Qdrant en http://n8n_qdrant:6333/.
```

Ese incremento debe probar como mínimo:

1. `GET /health` responde OK.
2. `GET /api/qdrant/health` consulta Qdrant y confirma conectividad.
3. La URL de Qdrant viene desde `QDRANT_URL`.
4. No hay URL hardcodeada fuera de `.env.example` o variables EasyPanel.
5. Los logs salen por stdout/stderr.

### 18.4 Variables mínimas del primer incremento

```text
APP_ENV
APP_URL=https://dfaq.at-once.cl
QDRANT_URL=http://n8n_qdrant:6333/
QDRANT_COLLECTION_TEMPLATE=kb_<tenant_slug>_openai_1536
```

### 18.5 Criterio de aprobación de la primera fase

La primera fase solo se considera aprobada si desde el servicio desplegado en EasyPanel se confirma conexión real contra Qdrant interno.

Si `http://n8n_qdrant:6333/` no resuelve desde el nuevo proyecto EasyPanel, la prioridad será resolver red interna, nombre de servicio o alternativa de exposición interna antes de continuar con pantallas o CRUD.

