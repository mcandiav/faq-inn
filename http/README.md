# DFAQ — servicio `http`

Interfaz web (nginx) que proxifica `/api/*` hacia el servicio `api`.

## EasyPanel

| Campo | Valor |
|---|---|
| Repositorio | `mcandiav/dfaq` |
| Rama | `http` |
| Directorio raíz | `http` |
| Puerto | `80` |
| Dominio público | `https://dfaq.at-once.cl` |

## Variables

- `API_UPSTREAM` — URL interna del contenedor api, por ejemplo `http://dfaq-api:3000`

## Endpoints

- `GET /health` — estado del servicio http
- `GET /api/*` — proxy hacia api
