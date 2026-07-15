# Suspensión del agente — intervención del operador

Texto canónico para mostrar en **onboarding** y en documentación de operación.

## Regla para el operador

> Para suspender al agente en una conversación, envía exactamente **`**`** desde el WhatsApp del negocio.
>
> Para reactivarlo en esa misma conversación, envía exactamente **`##`**.
>
> La suspensión es persistente: no vence sola y solo afecta ese chat.

## Detalle técnico (referencia)

| Parámetro | Valor default |
|---|---|
| `agent_off_trigger` | `**` |
| `agent_on_trigger` | `##` |

### Cómo funciona

1. El operador envía un mensaje **exacto** `**` o `##` desde el teléfono del negocio (`fromMe = true`).
2. n8n llama a `POST /api/runtime/conversation-control` y FAQ Inn persiste el estado en PostgreSQL (`conversation_states`).
3. Mientras el estado sea `suspended`, el agente no responde en ese chat.
4. Al enviar `##`, la conversación vuelve a `active` y el siguiente mensaje del contacto se procesa con la memoria acumulada.

Identidad lógica del estado:

```text
tenant_id + agent_id + chat_id
```

Los comandos no se envían al contacto, no pasan al AI Agent y no se tratan como mensaje conversacional normal.

## Dónde debe mostrarse

| Pantalla | Obligatorio |
|---|---|
| **Onboarding** (wizard post-WhatsApp) | Sí — bloque visible antes de finalizar |
| Mi cuenta → Agente WhatsApp | Sí — recordatorio permanente |
| Documentación operador | Sí — este archivo |

## Textos sugeridos por idioma (UI)

**Español**

```text
Para suspender el agente en un chat, envía exactamente ** desde el WhatsApp del negocio. Para reactivarlo en esa conversación, envía exactamente ##. La suspensión no vence sola.
```

**Portugués**

```text
Para suspender o agente num chat, envie exatamente ** pelo WhatsApp do negócio. Para reativar nessa conversa, envie exatamente ##. A suspensão não expira sozinha.
```

**Inglés**

```text
To suspend the agent in a chat, send exactly ** from the business WhatsApp. To resume that conversation, send exactly ##. Suspension does not expire automatically.
```
