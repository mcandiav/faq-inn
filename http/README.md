# DFAQ — servicio `http`

Interfaz web (nginx) que publica el dominio público y proxifica `/api/*` hacia el servicio `api`.

Parte de la arquitectura de 2 servicios: `api` + `http`. Ver [DEPLOY.md](../DEPLOY.md).

## Rol

| Aspecto | Detalle |
|---|---|
| Rama Git | `http` |
| Puerto | `80` |
| Dominio | `https://dfaq.at-once.cl` |
| Proxy API | `/api/*` → `API_UPSTREAM` |

## EasyPanel

| Campo | Valor |
|---|---|
| Repositorio | `mcandiav/dfaq` |
| Rama | `http` |
| Directorio raíz | `http` |
| App Service | `dfaq-http` |

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio http |
| GET | `/api/*` | Proxy hacia `dfaq-api` |
| GET | `/` | Interfaz web (placeholder MVP) |

## Variables

```text
API_UPSTREAM=http://dfaq-api:3000
```

`dfaq-api` = nombre interno del App Service api en EasyPanel.

## Estado actual

Placeholder estático que comprueba conectividad con la API vía `/api/health`.

Las pantallas de administración de FAQs se implementarán en esta rama.
