# Suspensión del agente — intervención del operador

Texto canónico para mostrar en **onboarding** y en documentación de operación.

Arquitectura: V1.22 / V1.23 (README rama `api`). Implementación n8n: **FAQ Productivo** — ver [../n8n/README.md](../n8n/README.md).

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
2. n8n llama a `POST /api/runtime/conversation-control` y PostgreSQL guarda el estado en `conversation_states`.
3. Mientras el chat esté `suspended`, el agente **no responde** a mensajes del cliente.
4. Solo `##` (o el `agent_on_trigger` configurado en Mi cuenta) reactiva el agente.

Clave de estado:

```text
tenant_id + agent_id + chat_id
```

Los comandos se editan en **Mi cuenta** (WhatsApp conectado). Deben tener exactamente 2 caracteres y ser distintos.

## Dónde debe mostrarse

| Pantalla | Obligatorio |
|---|---|
| **Onboarding** (wizard post-WhatsApp) | Sí — bloque visible antes de finalizar |
| Mi cuenta → Agente WhatsApp | Sí — campos editables + recordatorio |
| Documentación operador | Sí — este archivo |

## Textos sugeridos por idioma (UI)

**Español**

```text
Para suspender al agente en un chat, enviá exactamente ** (dos asteriscos) desde el WhatsApp del negocio. Para reactivarlo, enviá exactamente ##. La suspensión no vence sola y solo afecta esa conversación.
```

**Portugués**

```text
Para suspender o agente num chat, envie exatamente ** (dois asteriscos) pelo WhatsApp do negócio. Para reativar, envie exatamente ##. A suspensão não expira sozinha e afeta só essa conversa.
```

**Inglés**

```text
To suspend the agent in a chat, send exactly ** (two asterisks) from the business WhatsApp. To resume it, send exactly ##. Suspension does not expire on its own and only affects that conversation.
```

## Modelo anterior (obsoleto)

Hasta julio 2026 el MVP usaba Redis TTL (`pause_trigger` con `startsWith` + 5 minutos). Ese modelo quedó reemplazado por la suspensión persistente PostgreSQL. No usar Redis para este control.
