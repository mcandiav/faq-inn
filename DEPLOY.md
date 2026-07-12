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

### Cache-bust de la UI (`app.js?v=`)

`commit-version.ps1` escribe `VERSION` y actualiza `http/public/index.html` (`app.js?v=X.Y.Z`, `i18n.js?v=X.Y.Z`).

**Regla:** cada push a `http` que cambie JS/CSS/HTML servido debe **subir** el número de `VERSION`. Reutilizar el mismo `VERSION` (varios commits `[V1.7.79] …`) deja el query string igual y el navegador/CDN puede seguir sirviendo un `app.js` viejo.

Síntoma típico: la API ya devuelve un campo nuevo pero la UI Admin sigue mostrando `—` o comportamiento anterior. Comprobar:

1. `GET /api/admin/tenants/:id` → ¿viene el campo?
2. Título de la UI / `index.html` → ¿`app.js?v=` coincide con el `VERSION` del último deploy `http`?
3. Contenido de `https://inn.at-once.cl/app.js?v=<VERSION>` → ¿incluye el cambio?

Ramas: cambios de API solo en `api`; cambios de UI solo en `http`. No mezclar un fix de `api/src` en un commit de la rama `http` (EasyPanel no lo despliega en el servicio API).

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
API_UPSTREAM=http://n8n_inn-api:3000
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
