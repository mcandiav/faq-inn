# DFAQ — servicio `api`

Backend Fastify conectado a **MariaDB externo** (`bignotti_mariadb` en EasyPanel).

Parte de la arquitectura: `dfaq-api` + `dfaq-http` + MariaDB compartido. Ver [DEPLOY.md](../DEPLOY.md).

## Rol

| Aspecto | Detalle |
|---|---|
| Rama Git | `api` |
| Puerto | `3000` |
| Base de datos | MariaDB `bignotti_mariadb:3306`, base `dfaq` |
| Persistencia | Volumen en el servicio MariaDB (no en `dfaq-api`) |
| Qdrant | Externo vía `QDRANT_URL` |
| Embeddings | NVIDIA API `baai/bge-m3` (por defecto) |

## EasyPanel

| Campo | Valor |
|---|---|
| Repositorio | `mcandiav/dfaq` |
| Rama | `api` |
| Directorio raíz | `/Dockerfile` en raíz del repo |
| App Service | `dfaq-api` (interno: `n8n_dfaq-api`) |

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | API + estado MariaDB |
| GET | `/api/db/health` | MariaDB |
| GET | `/api/qdrant/health` | Conectividad Qdrant |
| POST | `/api/qdrant/collections/ensure` | Crear/verificar colección tenant |
| POST | `/api/qdrant/faq/upsert-test` | Upsert FAQ WiFi de prueba |
| POST | `/api/search` | Búsqueda semántica (consumo n8n) — ver [docs/N8N-SEARCH.md](../docs/N8N-SEARCH.md) |
| POST | `/api/unanswered` | Registro de preguntas sin respuesta (n8n) |
| GET | `/api/unanswered` | Listado para cliente autenticado |
| PATCH | `/api/unanswered/:id` | Cambiar estado (`ignored`, `resolved_manually`, `pending`) |
| POST | `/api/unanswered/:id/convert` | Convertir pregunta en FAQ e indexar en Qdrant |
| POST | `/api/auth/login` | Login (cookie) |
| GET | `/api/auth/me` | Sesión actual |
| PATCH | `/api/auth/profile` | Nombre negocio / contraseña |
| GET/POST | `/api/admin/tenants` | Alta posadas (admin) |
| CRUD | `/api/faqs` | FAQs con reindex inmediato |

## Embeddings (V1.8)

Proveedor por defecto: **NVIDIA API** — modelo multilingüe `baai/bge-m3`.

```text
EMBEDDING_PROVIDER=nvidia
EMBEDDING_DIMENSION=1024
NVIDIA_API_KEY=<secreto>
NVIDIA_API_BASE=https://integrate.api.nvidia.com/v1
NVIDIA_EMBEDDING_MODEL=baai/bge-m3
QDRANT_COLLECTION_TEMPLATE=kb_<tenant_slug>_nvidia_1024
```

Alternativa OpenAI:

```text
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=<secreto>
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
QDRANT_COLLECTION_TEMPLATE=kb_<tenant_slug>_openai_1536
```

**Regla:** no mezclar vectores de distinto proveedor/dimensión en la misma colección Qdrant.

## Arranque

El script `docker/entrypoint.sh` ejecuta solo Node. Las migraciones SQL corren al iniciar la API.

Inicialización de la base: automática en el primer arranque con `DB_ADMIN_PASSWORD` (root MariaDB). Ver `src/lib/bootstrapDb.js`.
