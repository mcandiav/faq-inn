# Base heredada desde DFAQ

## Propósito

Este documento registra qué se copió desde `FAQ multiusuario` hacia `FAQ Inn` para que el Programador pueda iniciar el desarrollo desde la misma base técnica ya validada.

## Copiado a FAQ Inn

| Origen DFAQ | Destino FAQ Inn | Motivo |
|---|---|---|
| `api/` | `FAQ Inn/api/` | Backend Fastify, MariaDB embebido, rutas FAQ, búsqueda, Qdrant, embeddings y preguntas sin respuesta. |
| `http/` | `FAQ Inn/http/` | Frontend estático/nginx y proxy hacia API. |
| `.cursor/` | `FAQ Inn/.cursor/` | Reglas de trabajo para Cursor/Programador. |
| `scripts/` | `FAQ Inn/scripts/` | Scripts de apoyo de versionado y ramas heredados. |
| `src/` | `FAQ Inn/src/` | Estructura auxiliar existente del proyecto base. |
| `docs/N8N-SEARCH.md` | `FAQ Inn/docs/N8N-SEARCH.md` | Contrato histórico de búsqueda desde n8n. |
| `DEPLOY.md` | `FAQ Inn/DEPLOY.md` | Guía base de despliegue a adaptar para `inn.at-once.cl`. |
| `Dockerfile` | `FAQ Inn/Dockerfile` | Dockerfile raíz heredado. |
| `Dockerfile.http` | `FAQ Inn/Dockerfile.http` | Dockerfile raíz heredado para http. |

## No copiado intencionalmente

| Archivo | Motivo |
|---|---|
| `.env` | Contiene configuración local/sensible o específica de DFAQ. |
| `FAQ_Qdrant_PTBR.xlsx` | Dataset operativo/histórico, no base limpia del producto. |
| `Esquema FAQ.png` | Imagen documental histórica, no necesaria para arrancar código. |
| `tmp-c.txt` | Archivo temporal. |
| `README.md` de DFAQ | FAQ Inn tiene README propio como fuente oficial. |

## Reglas para el Programador

1. Tratar el código copiado como **base heredada**, no como producto final.
2. Renombrar variables, textos, dominios y referencias `dfaq` hacia `faq-inn` (en progreso desde V1.0 código).
3. Usar PostgreSQL propio `faq-inn_postgres`; no MariaDB compartido de DFAQ.
4. Adaptar `DEPLOY.md` para `inn.at-once.cl` antes de ejecutar despliegues.
5. Incorporar módulos nuevos: `vertical_templates`, `tenant_provisioning`, `whatsapp_instances`, `n8n_workflows` y `provisioner`.
6. No copiar secretos desde DFAQ; crear `.env.example` y variables nuevas para FAQ Inn.

## Estado

```text
Base técnica DFAQ copiada a FAQ Inn.
Adaptación V1.0: PostgreSQL, variables tenant FAQ-INN y rebranding HTTP aplicados en código.
Pendiente: Provisioner y módulos SaaS nuevos.
```
