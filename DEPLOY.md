# DFAQ — Guía de despliegue

Plataforma multiusuario para administrar FAQs de agentes IA.

- Repositorio: https://github.com/mcandiav/dfaq
- Dominio público: https://dfaq.at-once.cl
- Documento maestro: [README.md](./README.md)

---

## Decisión arquitectónica (V2.0)

El MVP usa **2 contenedores de aplicación** + **MariaDB compartido** (igual que Cronómetro / Planificador):

| Contenedor / servicio | Rama Git | Rol |
|---|---|---|
| `dfaq-http` | `http` | Interfaz web (nginx) + proxy `/api/*` |
| `dfaq-api` | `api` | Fastify (stateless — solo Node) |
| `bignotti_mariadb` | *(existente)* | MariaDB compartido — base `dfaq` |

**No** se embebe MariaDB en `dfaq-api`. Deploy del API = **solo Deploy** (sin Stop manual).

```text
https://dfaq.at-once.cl
        ↓
   dfaq-http  (rama http, puerto 80)
        ↓ proxy /api/*
   dfaq-api   (rama api, puerto 3000)
        ↓ TCP 3306
   bignotti_mariadb  (base dfaq, usuario dfaq_app)
        ↓
   Qdrant (n8n_qdrant:6333, externo)
```

El worker de indexación se añadirá **como proceso dentro de `api`**, no como tercer contenedor.

## Embeddings (V1.8)

DFAQ genera vectores con **NVIDIA API** (`baai/bge-m3`, 1024 dimensiones, multilingüe).

| Variable | Valor producción |
|---|---|
| `EMBEDDING_PROVIDER` | `nvidia` |
| `NVIDIA_API_KEY` | Secreto desde [build.nvidia.com](https://build.nvidia.com) |
| `NVIDIA_EMBEDDING_MODEL` | `baai/bge-m3` |
| `EMBEDDING_DIMENSION` | `1024` |
| `QDRANT_COLLECTION_TEMPLATE` | `kb_<tenant_slug>_nvidia_1024` |

La POC histórica en n8n usó OpenAI (`Embedding_OpenAI`, 1536 dims). **No mezclar** con colecciones NVIDIA.

n8n y agentes deben consumir búsqueda vía `POST /api/search` de DFAQ, no insertar vectores OpenAI en colecciones NVIDIA.

---

> **EasyPanel:** el build usa la **raíz del repositorio**. El `Dockerfile` debe estar en `/`, no solo dentro de `api/` o `http/`.

### Historial de deploy (versión Git visible)

EasyPanel muestra: `Deploy service: <asunto del commit>`.

| Asunto del commit | Lo que ves en EasyPanel |
|---|---|
| `[V1.9] merge main: ...` | `[V1.9] merge main: ...` — **sin hash** |
| `[V2.1@59f69da] feat: import Excel` | `[V2.1@59f69da] feat: import Excel` — **con hash** |

El hash **va en el asunto**, no lo agrega EasyPanel. Tras `git commit`, enmendar:

```powershell
.\scripts\commit-version.ps1 -Version "2.1" -Message "feat: descripcion corta"
```

Evitar `Co-authored-by:` en commits de deploy (aparece en la misma línea del historial).

Tras deploy, verificar commit en producción: `GET https://dfaq.at-once.cl/api/health` → campo `git.commit`.

EasyPanel pasa `GIT_SHA` al build (sin carpeta `.git` en el archive). Los Dockerfiles usan ese build-arg, no `COPY .git`.


## Estructura del repositorio

```text
dfaq/
├── README.md          # Arquitectura y decisiones
├── DEPLOY.md          # Esta guía
├── api/               # Servicio backend (rama api)
│   ├── Dockerfile
│   ├── docker/entrypoint.sh
│   └── src/
└── http/              # Servicio interfaz (rama http)
    ├── Dockerfile
    ├── nginx.conf.template
    └── public/
```

| Rama | Uso en EasyPanel |
|---|---|
| `main` | Desarrollo integrado (contiene `api/` + `http/`) |
| `api` | Deploy de `dfaq-api` — directorio raíz: `api` |
| `http` | Deploy de `dfaq-http` — directorio raíz: `http` |

---

## EasyPanel — proyecto `dfaq`

### 1. Servicio `dfaq-api`

| Campo | Valor |
|---|---|
| Fuente | GitHub `mcandiav/dfaq` |
| Rama | `api` |
| Dockerfile | `/Dockerfile` en la **raíz del repo** (no `api/Dockerfile`) |
| Puerto interno | `3000` |
| Healthcheck | `GET /health` |
| Volumen | **Ninguno** (quitar `/var/lib/mysql` si existía) |
| Réplicas | `1` (cero downtime puede quedar OFF u ON — ya no hay lock MariaDB) |

**Preparación MariaDB:** en el **primer deploy**, la API crea sola la base `dfaq` y el usuario `dfaq_app` si no existen. Solo necesitas el password **root** de `bignotti_mariadb` en `DB_ADMIN_PASSWORD` (una vez). Opcional: script manual `api/scripts/init-dfaq-database.sql`.

**Variables de entorno:**

```text
APP_ENV=production
APP_URL=https://dfaq.at-once.cl
PORT=3000
QDRANT_URL=http://n8n_qdrant:6333
QDRANT_COLLECTION_TEMPLATE=kb_<tenant_slug>_nvidia_1024

# MariaDB compartido (misma instancia que planificador)
DB_HOST=bignotti_mariadb
DB_PORT=3306
DB_NAME=dfaq
DB_USER=dfaq_app
DB_PASSWORD=<secreto app>
DB_ADMIN_USER=root
DB_ADMIN_PASSWORD=<root de bignotti_mariadb — solo para bootstrap inicial>

# Auth V1.9
ADMIN_EMAIL=<tu email admin>
ADMIN_PASSWORD=<secreto>
SESSION_SECRET=<secreto>

# Embeddings NVIDIA (gratuito en build.nvidia.com)
EMBEDDING_PROVIDER=nvidia
EMBEDDING_DIMENSION=1024
NVIDIA_API_KEY=<secreto>
NVIDIA_API_BASE=https://integrate.api.nvidia.com/v1
NVIDIA_EMBEDDING_MODEL=baai/bge-m3
```

Quitar variables obsoletas: `MYSQL_ROOT_PASSWORD`, volumen `/var/lib/mysql`, `DATABASE_URL` con `127.0.0.1` (salvo que prefieras URL completa).

**Endpoints de validación post-deploy:**

- `GET /health` — API + MariaDB
- `GET /api/db/health` — MariaDB
- `GET /api/qdrant/health` — Qdrant
- `POST /api/qdrant/collections/ensure` — crear/verificar colección
- `POST /api/qdrant/faq/upsert-test` — upsert FAQ WiFi (requiere `NVIDIA_API_KEY` u `OPENAI_API_KEY`)
- `POST /api/search` — búsqueda semántica

**Secuencia fases 4-6:**

1. `POST /api/qdrant/collections/ensure` body `{}` → crea `kb_morroreservas_nvidia_1024`
2. `POST /api/qdrant/faq/upsert-test` body `{}` → FAQ WiFi con embedding NVIDIA
3. `POST /api/search` body `{"tenant_id":"morroreservas","agent_id":"chatwoot_reservas","query":"Tem internet bom para trabalhar?"}`

### 2. Servicio `dfaq-http`

| Campo | Valor |
|---|---|
| Fuente | GitHub `mcandiav/dfaq` |
| Rama | `http` |
| Dockerfile | `/Dockerfile` en la **raíz del repo** (rama `http` apunta a build http) |
| Puerto interno | `80` |
| Dominio | `dfaq.at-once.cl` |
| Healthcheck | `GET /health` |

**Variables de entorno:**

```text
API_UPSTREAM=http://n8n_dfaq-api:3000
```

`n8n_dfaq-api` = nombre interno del App Service api en el proyecto EasyPanel `n8n`.

**Validación post-deploy:**

- `GET https://dfaq.at-once.cl/health` → `dfaq-http` OK
- `GET https://dfaq.at-once.cl/api/health` → proxy hacia `dfaq-api` OK

---

## Orden de despliegue recomendado

1. Desplegar **`dfaq-api`** primero y validar `/api/qdrant/health`.
2. Si Qdrant no conecta, resolver red hacia `n8n_qdrant:6333` antes de continuar.
3. Desplegar **`dfaq-http`** con `API_UPSTREAM` apuntando al servicio api.
4. Publicar dominio `dfaq.at-once.cl` en el servicio `http`.

---

## Desarrollo local (Acer)

Copiar variables desde `api/.env.example` y `http/.env.example`.

- En local, `QDRANT_URL` suele ser `http://127.0.0.1:6333`.
- MariaDB local o túnel; en EasyPanel usar `DB_HOST=bignotti_mariadb`.

Ver también: `api/README.md` y `http/README.md`.

---

## Criterios de aprobación Fase 1

Desde producción EasyPanel:

1. `dfaq-api` → `/api/qdrant/health` responde `status: ok`.
2. `dfaq-api` → `/api/db/health` responde `status: ok`.
3. `dfaq-http` → `/api/health` proxifica correctamente hacia api.
