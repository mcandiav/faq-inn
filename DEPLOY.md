# DFAQ — Guía de despliegue

Plataforma multiusuario para administrar FAQs de agentes IA.

- Repositorio: https://github.com/mcandiav/dfaq
- Dominio público: https://dfaq.at-once.cl
- Documento maestro: [README.md](./README.md)

---

## Decisión arquitectónica (V1.5)

El MVP usa **exactamente 2 contenedores Docker** en EasyPanel:

| Contenedor | Rama Git | Equivalente | Rol |
|---|---|---|---|
| `http` | `http` | presentación | Interfaz web (nginx) + proxy `/api/*` |
| `api` | `api` | aplicación + datos | Fastify + **MariaDB embebido** |

**No se despliegan** contenedores separados para MariaDB, worker ni “front/back” adicionales.

```text
https://dfaq.at-once.cl
        ↓
   dfaq-http  (rama http, puerto 80)
        ↓ proxy /api/*
   dfaq-api   (rama api, puerto 3000)
        ├── Fastify
        └── MariaDB  → volumen /var/lib/mysql
        ↓
   Qdrant (n8n_qdrant:6333, externo)
```

El worker de indexación se añadirá **como proceso dentro de `api`**, no como tercer contenedor.

---

> **EasyPanel:** el build usa la **raíz del repositorio**. El `Dockerfile` debe estar en `/`, no solo dentro de `api/` o `http/`.

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
| Volumen persistente | `/var/lib/mysql` (tipo **Volumen**, ruta absoluta `/var/lib/mysql`) |
| Réplicas | **1 sola instancia** (obligatorio) |

Dos contenedores compartiendo el mismo volumen MariaDB causan errores `Can't lock aria control file` e `Unable to lock ./ibdata1`.

**Variables de entorno:**

```text
APP_ENV=production
APP_URL=https://dfaq.at-once.cl
PORT=3000
QDRANT_URL=http://n8n_qdrant:6333
QDRANT_COLLECTION_TEMPLATE=kb_<tenant_slug>_openai_1536
OPENAI_API_KEY=<secreto>
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSION=1536
MYSQL_DATABASE=dfaq
MYSQL_USER=dfaq
MYSQL_PASSWORD=<secreto>
MYSQL_ROOT_PASSWORD=<secreto>
DATABASE_URL=mysql://dfaq:<secreto>@127.0.0.1:3306/dfaq
```

**Endpoints de validación post-deploy:**

- `GET /health` — API + MariaDB
- `GET /api/db/health` — MariaDB
- `GET /api/qdrant/health` — Qdrant
- `POST /api/qdrant/collections/ensure` — crear/verificar colección
- `POST /api/qdrant/faq/upsert-test` — upsert FAQ WiFi (requiere `OPENAI_API_KEY`)
- `POST /api/search` — búsqueda semántica

**Secuencia fases 4-6:**

1. `POST /api/qdrant/collections/ensure` body `{}`
2. `POST /api/qdrant/faq/upsert-test` body `{}`
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

- En local, `QDRANT_URL` suele ser `http://127.0.0.1:6333` (Qdrant local o túnel).
- MariaDB arranca automáticamente dentro del contenedor `api` al usar Docker.

Ver también: `api/README.md` y `http/README.md`.

---

## Criterios de aprobación Fase 1

Desde producción EasyPanel:

1. `dfaq-api` → `/api/qdrant/health` responde `status: ok`.
2. `dfaq-api` → `/api/db/health` responde `status: ok`.
3. `dfaq-http` → `/api/health` proxifica correctamente hacia api.
