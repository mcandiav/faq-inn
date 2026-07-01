# DFAQ — servicio `api`

Backend Fastify + **MariaDB embebido** en el mismo contenedor.

## EasyPanel

| Campo | Valor |
|---|---|
| Repositorio | `mcandiav/dfaq` |
| Rama | `api` |
| Directorio raíz | `api` |
| Puerto | `3000` |
| Volumen persistente | `/var/lib/mysql` |

## Endpoints

- `GET /health` — API + estado MariaDB
- `GET /api/db/health` — MariaDB
- `GET /api/qdrant/health` — Qdrant
