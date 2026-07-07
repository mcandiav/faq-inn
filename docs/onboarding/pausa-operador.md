# Pausa del agente — intervención del operador

Texto canónico para mostrar en **onboarding** y en documentación de operación.

## Regla para el operador

> Para suspender el agente por **5 minutos** en una conversación, inicie su intervención con **`**`** (asterisco asterisco).
>
> Con esta clave el agente hace una pausa de 5 minutos en **ese chat** y usted puede responder al cliente sin que el bot interfiera.

## Detalle técnico (referencia)

| Parámetro | Valor |
|---|---|
| `pause_enabled` | `true` |
| `pause_trigger` | `**` |
| `pause_ttl_seconds` | `300` (5 minutos) |
| `pause_scope` | `chat` (solo la conversación actual) |

### Cómo funciona

1. El operador envía un mensaje al cliente por WhatsApp cuyo texto **empieza** con `**`.
2. El workflow n8n detecta el trigger y escribe una clave Redis con TTL.
3. Mientras la clave existe, el agente **no responde** a mensajes entrantes de ese chat.
4. Tras 5 minutos la clave expira y el agente vuelve a responder.

Clave Redis:

```text
faqinn:pause:{tenant_slug}:{agent_slug}:{chat_id}
```

Ver también: [../pruebas/04-pausa-humana-redis.md](../pruebas/04-pausa-humana-redis.md).

## Dónde debe mostrarse

| Pantalla | Obligatorio |
|---|---|
| **Onboarding** (wizard post-WhatsApp) | Sí — bloque visible antes de finalizar |
| Mi cuenta → Agente WhatsApp | Sí — recordatorio permanente |
| Documentación operador | Sí — este archivo |

## Textos sugeridos por idioma (UI)

**Español**

```text
Para pausar el agente en un chat, escribile al cliente un mensaje que empiece con ** (dos asteriscos). El asistente queda pausado 5 minutos en esa conversación y podés responder vos.
```

**Portugués**

```text
Para pausar o agente num chat, escreva ao cliente uma mensagem que comece com ** (dois asteriscos). O assistente fica pausado 5 minutos nessa conversa e você pode responder.
```

**Inglés**

```text
To pause the agent in a chat, send the client a message starting with ** (two asterisks). The assistant stays paused for 5 minutes in that conversation so you can reply yourself.
```
