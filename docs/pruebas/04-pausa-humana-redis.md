# 04 - Pausa humana Redis

## Objetivo

Validar pausa humana temporal por chat usando Redis TTL.

## Alcance

```text
Mensaje con pause_trigger -> crear lock Redis TTL -> mensajes posteriores del mismo chat no reciben respuesta hasta vencer TTL.
```

## Estado

En prueba.

## Configuración vigente

```text
pause_enabled=true
pause_trigger=**
pause_ttl_seconds=300
pause_scope=chat
pause_mode=redis_ttl
```

## Clave Redis estándar

```text
faqinn:pause:{tenant_id}:{agent_id}:{chat_id}
```

## Servicio Redis confirmado

```text
Servicio: n8n_redis
Host interno: n8n_redis
Puerto interno: 6379
```

## Criterio de éxito

```text
Enviar pause_trigger crea lock Redis.
Un mensaje posterior del mismo chat cae en NoOp.
Al vencer TTL, el agente vuelve a responder.
La pausa no afecta otros chats del mismo tenant.
```

## Criterio de descarte

```text
Redis no resulta accesible desde n8n.
La clave no puede segmentarse por tenant, agent y chat.
El comportamiento genera bloqueo global no deseado.
```

## Decisión final

Pendiente. La solución Redis TTL sigue vigente para MVP.
