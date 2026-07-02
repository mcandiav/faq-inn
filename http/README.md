# FAQ Inn — servicio `http`

Frontend estático (nginx) + proxy reverso hacia `faq-inn-api`.

## Rol

| Aspecto | Detalle |
|---|---|
| Rama Git | `http` |
| Puerto | `80` |
| Dominio objetivo | `https://inn.at-once.cl` |
| Título UI | `FAQ Inn $Tenant` (desde `/api/health`) |

## EasyPanel

| Campo | Valor |
|---|---|
| Repositorio | `mcandiav/faq-inn` |
| Rama | `http` |
| App Service | `faq-inn-http` |

## Proxy

| Ruta | Destino |
|---|---|
| `GET /` | `public/index.html` |
| `GET /api/*` | Proxy hacia `faq-inn-api` |

```env
API_UPSTREAM=http://n8n_faq-inn-api:3000
```

`n8n_faq-inn-api` = nombre interno del App Service api en EasyPanel.
