# FAQ Inn — Guía de despliegue

Plataforma SaaS hotelera/multivertical para administrar FAQs de agentes IA.

- Repositorio: https://github.com/mcandiav/faq-inn
- Dominio objetivo: https://inn.at-once.cl
- Documento maestro: [README.md](./README.md)

---

## Arquitectura (V1.0 código)

| Servicio | Rama Git | Rol |
|---|---|---|
| `faq-inn-http` | `http` | Interfaz web (nginx) + proxy `/api/*` |
| `faq-inn-api` | `api` | Fastify (stateless — solo Node) |
| `faq-inn_postgres` | *(EasyPanel)* | PostgreSQL 17 propio — base `faq-inn` |
| `n8n_qdrant` | *(existente)* | Índice vectorial |

```text
https://inn.at-once.cl
        ↓
   faq-inn-http  (rama http, puerto 80)
        ↓ proxy /api/*
   faq-inn-api   (rama api, puerto 3000)
        ↓ TCP 5432 (solo red interna)
   n8n_faq-inn_postgres  (base faq-inn, usuario postgres)
        ↓
   n8n_qdrant:6333
```

**No publicar** PostgreSQL hacia internet. La API se conecta por hostname interno `n8n_faq-inn_postgres:5432`.

---

## Variables tenant (desarrollo)

| Variable | Valor dev |
|---|---|
| `TENANT` | `FAQ-INN` |
| `TENANT_SLUG` | `faq-inn` |
| `APP_TITLE` | `FAQ Inn FAQ-INN` |
| `DB_NAME` | `faq-inn` |

---

## Embeddings

FAQ Inn genera vectores con **Ollama** (`mxbai-embed-large:latest`, 1024 dimensiones) en la red interna.

| Variable | Valor |
|---|---|
| `EMBEDDING_PROVIDER` | `ollama` |
| `OLLAMA_API_BASE` | `http://n8n_ollama:11434` |
| `OLLAMA_EMBEDDING_MODEL` | `mxbai-embed-large:latest` |
| `EMBEDDING_DIMENSION` | `1024` |
| `QDRANT_COLLECTION_TEMPLATE` | `kb_<tenant_slug>_mxbai_1024` |

Alternativas: `EMBEDDING_PROVIDER=nvidia` o `openai` (cada una con su plantilla de colección).

n8n debe consumir `POST /api/search`; no insertar vectores directo en Qdrant.

---

## Historial de deploy (versión Git visible)

```powershell
.\scripts\commit-version.ps1 -Version "1.0" -Message "feat: descripcion corta"
```

Verificar en producción: `GET https://inn.at-once.cl/api/health` → `app.title`, `app.version`, `git.commit`.

---

## Estructura del repositorio

```text
faq-inn/
├── README.md
├── DEPLOY.md
├── api/               # rama api
└── http/              # rama http
```

| Rama | Uso en EasyPanel |
|---|---|
| `main` | Desarrollo integrado |
| `api` | Deploy `faq-inn-api` |
| `http` | Deploy `faq-inn-http` |

---

## EasyPanel — servicio `faq-inn-api`

| Campo | Valor |
|---|---|
| Fuente | GitHub `mcandiav/faq-inn` |
| Rama | `api` |
| Puerto interno | `3000` |
| Healthcheck | `GET /health` |

**Variables mínimas:**

```env
APP_ENV=production
APP_URL=https://inn.at-once.cl
TENANT=FAQ-INN
TENANT_SLUG=faq-inn
APP_TITLE=FAQ Inn FAQ-INN
DB_HOST=n8n_faq-inn_postgres
DB_PORT=5432
DB_NAME=faq-inn
DB_USER=postgres
DB_PASSWORD=<desde EasyPanel, no documentar>
QDRANT_URL=http://n8n_qdrant:6333
EMBEDDING_PROVIDER=ollama
OLLAMA_API_BASE=http://n8n_ollama:11434
OLLAMA_EMBEDDING_MODEL=mxbai-embed-large:latest
EMBEDDING_DIMENSION=1024
QDRANT_COLLECTION_TEMPLATE=kb_<tenant_slug>_mxbai_1024
SESSION_SECRET=<secreto>
ADMIN_EMAIL=admin@at-once.cl
ADMIN_PASSWORD=<secreto>
```

**Smoke test tras deploy:**

1. `GET /api/health` → `service: faq-inn-api`, `database.healthy: true`
2. `POST /api/qdrant/collections/ensure` body `{"tenant_slug":"faq-inn"}`
3. `POST /api/search` con `tenant_id` / `agent_id` del tenant demo

---

## EasyPanel — servicio `faq-inn-http`

| Campo | Valor |
|---|---|
| Fuente | GitHub `mcandiav/faq-inn` |
| Rama | `http` |
| Dominio | `inn.at-once.cl` |

```env
API_UPSTREAM=http://n8n_faq-inn-api:3000
```

Validar:

- `GET /health` → `faq-inn-http`
- `GET /api/health` → proxy OK, título `FAQ Inn FAQ-INN`

---

## PostgreSQL (`faq-inn_postgres`)

| Campo | Valor |
|---|---|
| Nombre servicio | `faq-inn_postgres` |
| Host interno | `n8n_faq-inn_postgres` |
| Imagen | `postgres:17` |
| Base | `faq-inn` |
| Usuario | `postgres` |
| Puerto interno | `5432` |
| Puerto público | No publicado |

La contraseña la genera EasyPanel; configurarla solo en variables de `faq-inn-api`.

---

## Nota sobre DFAQ legacy

`dfaq.at-once.cl` / MorroReservas permanece en producción con MariaDB. **No** mezclar despliegues ni bases entre DFAQ y FAQ Inn.
