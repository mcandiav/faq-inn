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

## EasyPanel

| Campo | Valor |
|---|---|
| Repositorio | `mcandiav/dfaq` |
| Rama | `api` |
| Directorio raíz | `api` |
| App Service | `dfaq-api` |

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | API + estado MariaDB |
| GET | `/api/db/health` | MariaDB |
| GET | `/api/qdrant/health` | Conectividad Qdrant |

## Variables (.env.example)

MariaDB y Qdrant se configuran por entorno. En EasyPanel usar secretos reales para `MYSQL_PASSWORD`.

## Arranque

El script `docker/entrypoint.sh`:

1. Inicializa MariaDB si es primera ejecución.
2. Crea base `dfaq` y usuario.
3. Arranca la API Node.

## Futuro

- Migraciones de esquema MariaDB.
- Worker de indexación como proceso adicional en este mismo contenedor.
- `POST /api/search` para n8n.
