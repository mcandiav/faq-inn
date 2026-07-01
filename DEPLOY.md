# DFAQ

Plataforma multiusuario para administrar FAQs de agentes IA.

Repositorio: https://github.com/mcandiav/dfaq

## Arquitectura de despliegue (2 contenedores)

```text
dfaq.at-once.cl
      ↓
   http  (rama `http`, puerto 80)
      ↓ proxy /api/*
   api   (rama `api`, puerto 3000)
      ├── Fastify API
      └── MariaDB embebido (volumen /var/lib/mysql)
      ↓
   Qdrant (n8n_qdrant:6333)
```

| Servicio | Rama Git | Rol |
|---|---|---|
| `http` | `http` | Interfaz web + proxy nginx |
| `api` | `api` | Backend + MariaDB en el mismo contenedor |

No se usan 4 contenedores. El worker de indexación se integrará después dentro de `api` o como proceso del mismo contenedor.

## EasyPanel — proyecto recomendado

```text
dfaq
  ├── dfaq-http   → rama http, directorio http, puerto 80
  └── dfaq-api    → rama api, directorio api, puerto 3000
```

### Variables `api`

```text
APP_ENV=production
APP_URL=https://dfaq.at-once.cl
QDRANT_URL=http://n8n_qdrant:6333
MYSQL_PASSWORD=<secreto>
DATABASE_URL=mysql://dfaq:<secreto>@127.0.0.1:3306/dfaq
```

Volumen persistente obligatorio en `api`: `/var/lib/mysql`

### Variables `http`

```text
API_UPSTREAM=http://dfaq-api:3000
```

(`dfaq-api` = nombre interno del App Service api en EasyPanel)

## Desarrollo local

Ver `api/README.md` y `http/README.md`.
