# n8n — nodo HTTP Request para búsqueda DFAQ

Referencia fija para conectar workflows n8n con la API de búsqueda semántica de DFAQ.

**No insertar vectores ni tocar Qdrant desde n8n.** Solo consumir `POST /api/search`; DFAQ indexa desde la web o import Excel.

---

## Resumen

| Campo | Valor |
|-------|-------|
| Nodo | **HTTP Request** |
| Descripción del nodo | `Respostas` (o el nombre que prefieras) |
| Método | `POST` |
| URL (red interna EasyPanel) | `http://n8n_dfaq-api:3000/api/search` |
| Autenticación | **None** |
| Body | JSON (campos abajo) |

`n8n_dfaq-api` es el nombre interno del App Service `dfaq-api` en el proyecto EasyPanel `n8n`. Solo resuelve desde contenedores en la misma red (n8n, no desde el navegador).

---

## Configuración del nodo (Parameters)

### Method / URL

| Parámetro | Valor |
|-----------|-------|
| **Method** | `POST` |
| **URL** | `http://n8n_dfaq-api:3000/api/search` |
| **Authentication** | `None` |

### Send Body

| Parámetro | Valor |
|-----------|-------|
| **Send Body** | activado |
| **Body Content Type** | `JSON` |
| **Specify Body** | `Using Fields Below` |

### Body Parameters (fijos por posada + query dinámica)

| Name | Value | Notas |
|------|-------|-------|
| `tenant_id` | `morroreservas` | Slug técnico del tenant (filtro Qdrant). Cambiar por posada. |
| `tenant_slug` | `morroreservas` | Mismo slug; define colección `kb_<tenant_slug>_nvidia_1024`. |
| `agent_id` | `principal` | Slug del agente en DFAQ. Debe coincidir con el agente de las FAQs indexadas. |
| `query` | `={{ $json.data }}` | **Pregunta del usuario.** Ver sección [Expresiones n8n](#expresiones-n8n). |
| `limit` | `3` | Máximo de resultados (API cap: 20). |

### Options

Sin opciones extra. **Optimize Response** desactivado (respuesta JSON completa).

---

## Importar con cURL (n8n → HTTP Request → Import cURL)

Pega esto en n8n y luego cambia `query` por la expresión dinámica:

```bash
curl -X POST 'http://n8n_dfaq-api:3000/api/search' \
  -H 'Content-Type: application/json' \
  -d '{
    "tenant_id": "morroreservas",
    "tenant_slug": "morroreservas",
    "agent_id": "principal",
    "query": "Aceptan mascotas?",
    "limit": 3
  }'
```

Tras importar, en el campo **query** reemplaza el texto fijo por:

```text
={{ $json.data }}
```

(o la expresión que corresponda al nodo anterior de tu flujo).

---

## Expresiones n8n

### Campo `query` (obligatorio)

En n8n, las expresiones deben empezar con **`=`**:

```text
={{ $json.data }}
```

| Error | Causa |
|-------|-------|
| `Embeddings failed (400)` | Falta el `=` al inicio; n8n envía el texto literal `{{ $json.data }}` en lugar de evaluarlo. |
| `tenant_id, agent_id and query are required` | `query` vacío o solo espacios. |

Ajusta `$json.data` al campo real del nodo previo (ej. `={{ $json.message.text }}` en Chatwoot).

### Leer la respuesta en el siguiente nodo

Respuesta exitosa (`status: "ok"`):

```json
{
  "status": "ok",
  "collection": "kb_morroreservas_nvidia_1024",
  "results": [
    {
      "faq_id": "uuid-de-la-faq",
      "question": "¿Aceptan mascotas?",
      "answer": "Sí, mascotas pequeñas...",
      "score": 0.72
    }
  ],
  "timestamp": "2026-07-01T12:00:00.000Z"
}
```

| Uso | Expresión n8n |
|-----|----------------|
| Mejor respuesta (texto para el agente) | `={{ $json.results[0].answer }}` |
| Pregunta FAQ emparejada | `={{ $json.results[0].question }}` |
| Confianza semántica | `={{ $json.results[0].score }}` |
| Sin resultados | `={{ $json.results.length === 0 }}` |

Si `results` está vacío, la FAQ puede estar inactiva, no indexada, o la pregunta no tiene match suficiente.

---

## Parámetros por posada (plantilla)

Copia y adapta por cada cliente:

| Parámetro | Morro Reservas (prueba) | Tu posada |
|-----------|-------------------------|-----------|
| `tenant_id` | `morroreservas` | `<slug>` |
| `tenant_slug` | `morroreservas` | `<slug>` |
| `agent_id` | `principal` | `<agent_slug>` |
| Colección Qdrant | `kb_morroreservas_nvidia_1024` | `kb_<slug>_nvidia_1024` |

El `agent_id` debe ser el mismo slug con el que se crearon/importaron las FAQs en DFAQ (panel cliente → posada creada en Admin).

---

## Flujo típico en n8n

```text
[Trigger / Chatwoot / Webhook]
        │
        ▼
[Set / Edit Fields]  ← opcional: normalizar texto a `data`
        │
        ▼
[HTTP Request: Respostas]  ← POST /api/search
        │
        ▼
[IF results.length > 0]
   ├─ sí → responder con results[0].answer
   └─ no → mensaje fallback al usuario
```

---

## Errores frecuentes

| HTTP | Mensaje | Qué revisar |
|------|---------|-------------|
| 400 | `tenant_id, agent_id and query are required` | Body incompleto o `query` vacío. |
| 502 | `Qdrant search failed` | Colección inexistente, Qdrant caído, o `agent_id` sin FAQs indexadas. |
| 503 | `API_KEY` / embeddings | `NVIDIA_API_KEY` en variables de `dfaq-api`. |
| — | Timeout | Muchas FAQs o red lenta; el embedding tarda unos segundos. |

**Validación rápida** (desde red interna, mismo host que n8n):

```bash
curl -s -X POST 'http://n8n_dfaq-api:3000/api/search' \
  -H 'Content-Type: application/json' \
  -d '{"tenant_id":"morroreservas","tenant_slug":"morroreservas","agent_id":"principal","query":"wifi","limit":3}'
```

Desde fuera del cluster usar el dominio público (solo pruebas):

```bash
curl -s -X POST 'https://dfaq.at-once.cl/api/search' \
  -H 'Content-Type: application/json' \
  -d '{"tenant_id":"morroreservas","tenant_slug":"morroreservas","agent_id":"principal","query":"wifi","limit":3}'
```

---

## Relación con workflows históricos (POC OpenAI)

Los workflows antiguos que hablaban **directo con Qdrant** y OpenAI (`Embedding_OpenAI`, 1536 dims) son **POC**. No mezclar con DFAQ productivo (NVIDIA `baai/bge-m3`, 1024 dims, colección `kb_<tenant_slug>_nvidia_1024`).

| Antes (POC) | Ahora (DFAQ) |
|-------------|--------------|
| n8n → Qdrant + OpenAI embeddings | n8n → `dfaq-api` → `/api/search` |
| Colección `Embedding_OpenAI` | `kb_<tenant_slug>_nvidia_1024` |
| Edición de FAQs en n8n | Edición en https://dfaq.at-once.cl |

---

## Referencias en el repo

- Contrato API: `api/src/routes/search.js`
- Despliegue y healthchecks: [DEPLOY.md](../DEPLOY.md)
- Arquitectura general: [README.md](../README.md)

**Última validación:** posada `morroreservas`, agente `principal`, queries PT/ES (ej. «Aceptan mascotas?», «Do you have wifi?»).
