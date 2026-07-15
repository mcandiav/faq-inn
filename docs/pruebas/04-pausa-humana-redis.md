# 04 - Suspensión humana persistente (ex pausa Redis)

> **Estado:** modelo Redis TTL **obsoleto**. Vigente: suspensión PostgreSQL (arquitectura V1.22/V1.23; FAQ Productivo 2026-07-15).

## Objetivo

Validar suspensión / reactivación por conversación con comandos exactos del negocio.

## Alcance

```text
Negocio envía ** exacto (fromMe=true)
  -> POST conversation-control (suspend)
  -> Cliente escribe -> n8n NoOp (sin respuesta)
Negocio envía ## exacto
  -> POST conversation-control (resume)
  -> Cliente escribe -> agente responde
```

## Workflow

```text
FAQ Productivo (webhook faq-prototipo)
```

## Configuración vigente

```text
agent_off_trigger=**
agent_on_trigger=##
persistencia=PostgreSQL conversation_states
clave=tenant_id + agent_id + chat_id
```

## Criterio de éxito

```text
** exacto desde negocio suspende (action: suspend).
Cliente mientras suspended: sin FAQ inn / Enviar WhatsApp.
## exacto desde negocio reactiva (action: resume).
Cliente tras resume: agente responde.
** que pasa / ** desde cliente: no suspende.
Suspensión no vence sola (no hay TTL).
```

## Criterio de descarte

```text
El flujo vuelve a Redis TTL o startsWith.
Los comandos se interpretan como prefijo en vez de match exacto.
Se afecta a otros chats del mismo tenant por error de chat_id.
```

## Decisión final

Aprobado en sandbox **FAQ V2.0** (ejecuciones 15097–15106, tenant `faqinn_mcandia`) y portado a **FAQ Productivo** el 2026-07-15. Detalle: [../n8n/README.md](../n8n/README.md).

## Histórico Redis (referencia)

Modelo anterior (no usar):

```text
pause_trigger=** (startsWith)
pause_ttl_seconds=300
clave Redis: faqinn:pause:{tenant}:{agent}:{chat}
```
