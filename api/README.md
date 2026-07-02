# FAQ Inn — servicio `api`

Backend Fastify conectado a **PostgreSQL propio** (`n8n_faq-inn_postgres` en EasyPanel).

Arquitectura: `faq-inn-api` + `faq-inn-http` + `faq-inn_postgres`. Ver [DEPLOY.md](../DEPLOY.md).

## Rol

| Aspecto | Detalle |
|---|---|
| Rama Git | `api` |
| Puerto | `3000` |
| Base de datos | PostgreSQL `n8n_faq-inn_postgres:5432`, base `faq-inn` |
| Tenant dev | `FAQ-INN` / slug `faq-inn` |
| Qdrant | Externo vía `QDRANT_URL` |
| Embeddings | Ollama `mxbai-embed-large:latest` (por defecto) vía `OLLAMA_API_BASE` |

## EasyPanel

| Campo | Valor |
|---|---|
| Repositorio | `mcandiav/faq-inn` |
| Rama | `api` |
| App Service | `faq-inn-api` (interno: `n8n_faq-inn-api`) |

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | API + metadatos app/tenant |
| GET | `/api/db/health` | PostgreSQL |
| POST | `/api/search` | Búsqueda semántica |
| POST | `/api/qdrant/collections/ensure` | Crear/verificar colección tenant |

Ver código en `src/routes/` para el listado completo.

## Variables clave

Copiar desde [`.env.example`](./.env.example).

```env
TENANT=FAQ-INN
TENANT_SLUG=faq-inn
DB_HOST=n8n_faq-inn_postgres
DB_NAME=faq-inn
DB_USER=postgres
OLLAMA_API_BASE=http://n8n_ollama:11434
OLLAMA_EMBEDDING_MODEL=mxbai-embed-large:latest
EMBEDDING_PROVIDER=ollama
EMBEDDING_DIMENSION=1024
QDRANT_COLLECTION_TEMPLATE=kb_<tenant_slug>_mxbai_1024
QDRANT_URL=http://n8n_qdrant:6333
```
