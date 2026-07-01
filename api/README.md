# DFAQ — servicio `api`

Backend Fastify con **MariaDB embebido** en el mismo contenedor.

Parte de la arquitectura de 2 servicios: `api` + `http`. Ver [DEPLOY.md](../DEPLOY.md).

## Rol

| Aspecto | Detalle |
|---|---|
| Rama Git | `api` |
| Puerto | `3000` |
| Base de datos | MariaDB en `127.0.0.1:3306` (mismo contenedor) |
| Persistencia | Volumen `/var/lib/mysql` |
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
| POST | `/api/search` | Búsqueda semántica |

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

El script `docker/entrypoint.sh`:

1. Espera lock exclusivo de `/var/lib/mysql`.
2. Inicializa MariaDB si es primera ejecución.
3. Crea base `dfaq` y usuario.
4. Arranca la API Node con apagado graceful en SIGTERM.
