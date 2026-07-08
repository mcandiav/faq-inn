# System Prompt Configurable

## Objetivo

Definir el módulo funcional que permite construir el `system prompt` final del agente FAQ Inn desde una plantilla transversal protegida y una tabla editable por objetivo en PostgreSQL.

La decisión vigente es que el admin no edita el `system prompt` completo. El admin edita columnas semánticas controladas asociadas a un `objective_slug`. El runtime arma el `final_system_prompt` antes del AI Agent resolviendo variables desde tenant, objetivo y contexto n8n/backend.

---

## Decisión arquitectónica vigente

FAQ Inn usará una única estructura transversal de system prompt y perfiles de objetivo almacenados en PostgreSQL.

El objetivo activo del tenant determina qué fila se carga desde la tabla `system_prompt_objective_templates`.

Objetivos iniciales (fila activa por `objective_slug`):

```text
responder_preguntas
reservar_noches
reservar_horarios
enviar_a_sitio_web
```

`responder_preguntas` es transversal y debe estar disponible junto a los demás perfiles según el `objetivo_slug` del tenant.

Regla central:

```text
El system prompt final se compone de:
1. Bloques editables por objetivo desde system_prompt_objective_templates
   (rol, limites, tools, interpretar_fecha, data_collect, links).
2. Variables/tokens resueltos en n8n (nodo Armar SPrompt) desde tenant, objetivo y fechas.
3. Bloque opcional admin-only custom_sprompt (tenant_settings), al final.
```

---

## Responsabilidad del módulo

El módulo System Prompt Configurable define políticas de comportamiento del agente por objetivo.

No administra contenido comercial del cliente.

Separación de responsabilidades:

| Contenido | Módulo responsable |
|---|---|
| Rol operativo del agente por objetivo | System Prompt Configurable |
| Límites de respuesta por objetivo | System Prompt Configurable |
| Política de uso de tools por objetivo | System Prompt Configurable |
| Interpretación de fechas por objetivo | System Prompt Configurable |
| Recolección de datos conversacionales por objetivo | System Prompt Configurable |
| Política de generación o entrega de links por objetivo | System Prompt Configurable |
| Preguntas frecuentes y respuestas aprobadas | FAQ / Knowledge Base |
| Datos del negocio | Tenant / Agent settings |
| Instrucciones extra por tenant (`custom_sprompt`) | Admin View tenant → Custom SPrompt |
| URLs, motor de reservas y short links | Motor de reservas / Link builder |
| Pausa humana y handoff | Módulo pausa humana / Redis TTL |

---

## `custom_sprompt` (admin-only por tenant)

Campo: `tenant_settings.custom_sprompt` (`TEXT NOT NULL DEFAULT ''`).

| Superficie | Contrato |
|---|---|
| Runtime | `GET /api/runtime/tenant-config` → `custom_sprompt` |
| Admin API | `GET/PUT /api/admin/tenants/:id/custom-sprompt` |
| UI | Admin → View tenant → **Custom SPrompt** |
| n8n | Tras `links` en `systemMessage`: `{{ $('Armar SPrompt').item.json.custom_sprompt }}` |

Reglas:

```text
Vacío = no altera el prompt armado por objetivo.
Solo Admin puede editarlo; el cliente del tenant no.
Armar SPrompt resuelve tokens neutros también en este bloque.
No debe usarse para pegar FAQs ni para reemplazar la matriz de objetivos.
```

---

## Tabla principal: `system_prompt_objective_templates`

Esta tabla debe ser administrable desde el Admin web por usuarios autorizados.

Cada fila representa un objetivo operativo disponible para tenants actuales o futuros.

Campos iniciales:

| Campo | Uso |
|---|---|
| `id` | Identificador interno. |
| `objective_slug` | Llave funcional del objetivo. Ejemplo: `reservar_noches`. |
| `objective_name` | Nombre visible para administración. |
| `role_template` | Bloque `<rol>` del objetivo. |
| `limits_template` | Bloque `<limites>` del objetivo. |
| `tools_template` | Bloque `<tools>` del objetivo. |
| `date_interpretation_template` | Bloque `<interpretacao_datas>` cuando el objetivo requiere fechas. |
| `data_collection_template` | Bloque `<recolecao>` del objetivo. |
| `links_template` | Bloque `<links>` del objetivo cuando el objetivo genera o entrega links. |
| `status` | `draft`, `active`, `archived`. |
| `version` | Versión editable/auditable del perfil de objetivo. |
| `created_by` | Usuario que creó el registro. |
| `updated_by` | Usuario que modificó el registro. |
| `created_at` | Fecha de creación. |
| `updated_at` | Fecha de última modificación. |
| `activated_at` | Fecha de activación. |

Regla de activación:

```text
Solo registros status = active pueden ser usados por el runtime conversacional.
```

Regla de edición:

```text
El Admin web puede editar columnas semánticas del objetivo, pero no puede editar el bloque transversal protegido del producto ni la lógica de composición runtime.
```

---

## Ejemplo documentado: objetivo `reservar_noches`

Este ejemplo corresponde al system prompt del flujo prototipo de reserva de noches, separado en columnas de base de datos.

| objective_slug | role_template | limits_template | tools_template | date_interpretation_template | data_collection_template | links_template |
|---|---|---|---|---|---|---|
| `reservar_noches` | `<rol>`<br>`Agente de IA para "{{ $('Resolver Tenant').item.json.tenant_display_name }}" - {{ $('Resolver Tenant').item.json.business_type }}.`<br>`Responda sempre no idioma que o cliente falar com você.`<br>`APRESENTE-SE SEMPRE e SOMENTE UMA VEZ no início do chat usando: "{{ $('Resolver Tenant').item.json.initial_greeting }}" traduzido para o idioma do cliente.`<br>`Suas funções são ajudar a reservar enviando links quando exista motor de reservas aprovado e responder dúvidas buscando sempre todas as respostas na tools "Respostas".`<br>`Despeça-se NO IDIOMA DO CLIENTE apenas uma vez com: "Obrigado por nos contactar."`<br>`Sua comunicação deve ser sempre no idioma que o cliente falar com você. NÃO MISTURE IDIOMAS.`<br>`</rol>` | `<limites>`<br>`NÃO dê alternativas.`<br>`APENAS informações de {{ $('Resolver Tenant').item.json.tenant_display_name }}.`<br>`APENAS RESPONDA o que achar na ferramenta "Respostas", de forma breve, cordial e sem opções.`<br>`NÃO invente respostas.`<br>`</limites>` | `<tools>`<br>`Uma resposta da ferramenta "Respostas" só é útil se responder diretamente à pergunta do cliente.`<br>`Se o resultado for genérico, aproximado, indireto, considere que não há resposta útil. execute a ferramenta "SemResposta" e responda ao cliente: "Vou me informar para ter a responsta em uma proxima oportunidade." en el idioma del cliente.`<br>`Nunca use uma resposta aproximada para inventar uma resposta.`<br>`</tools>` | `<interpretacao_datas>`<br>`SEMPRE calcule datas usando hoje como referência.`<br><br>`Hoje é {{ $today.toFormat('yyyy-MM-dd') }}`<br><br>`Para "amanhã" ou "mañana": {{ $today.plus({days: 1}).toFormat('yyyy-MM-dd') }}`<br><br>`Para "depois de amanha": {{ $today.plus({days: 2}).toFormat('yyyy-MM-dd') }}`<br><br>`Para dias da semana (domingo, segunda, etc):`<br><br>`* Calcule o próximo dia dessa semana a partir de hoje.`<br>`* Use $today.plus() para avançar dias até encontrar o dia correto.`<br>`* Exemplo: se hoje é sexta e cliente diz "domingo", calcule 2 dias à frente.`<br><br>`JAMAIS use datas passadas.`<br><br>`SEMPRE valide que checkin e checkout sejam > $today.`<br>`</interpretacao_datas>` | `<recolecao>`<br>`Interesse em reservar:`<br>`→ colete os dados requeridos para enviar o link.`<br><br>`Variáveis conversacionais (datas sempre em ISO YYYY-MM-DD):`<br><br>`1. check-in, entrada, chegada → checkin (sempre futuras)`<br>`2. check-out, saída → checkout (sempre > checkin)`<br>`3. hóspedes, pessoas, adultos → adults`<br>`4. quartos → rooms (somente se supports_rooms = {{ $('Resolver Tenant').item.json.supports_rooms }})`<br>`5. menores → children e child_ages (somente se supports_children = {{ $('Resolver Tenant').item.json.supports_children }})`<br><br>`Pergunte, espere a resposta e prossiga:`<br>`"Data de entrada?" → "Data de saída?" → "Quantos adultos?"`<br><br>`Antes de enviar o link, confirme com o cliente se os dados estão corretos.`<br><br>`Prossiga somente se {{ $('Resolver Tenant').item.json.validation_status }} = approved.`<br>`</recolecao>` | `<links>`<br>`O pagamento é feito por nossos parceiros.`<br><br>`Status do motor: {{ $('Resolver Tenant').item.json.validation_status }}`<br>`Formato de data do tenant (date_format): {{ $('Resolver Tenant').item.json.date_format }}`<br><br>`NÃO monte o link manualmente. Use a ferramenta "GenerarLinkReserva" passando checkin, checkout (ISO YYYY-MM-DD) e adults. Inclua rooms, children e child_ages apenas se o cliente informou ou o motor exige.`<br><br>`O servidor aplica o date_format do tenant às datas. Use SOMENTE o campo short_url retornado por GenerarLinkReserva — nunca monte URL manualmente nem use o campo url longo.`<br><br>`Formato WhatsApp:`<br>`- Após GenerarLinkReserva, inclua short_url em uma linha separada no final da mensagem.`<br>`- Não use markdown (** ou links formatados).`<br>`- Pode confirmar dados, cumprimentar e despedir-se normalmente.`<br><br>`Se validation_status não for approved, NÃO gere link; use "SemResposta" antes de responder.`<br>`</links>` |

---

## Registro equivalente en base de datos

```text
table: system_prompt_objective_templates

objective_slug: reservar_noches

role_template:
<rol>
Agente de IA para "{{ $('Resolver Tenant').item.json.tenant_display_name }}" - {{ $('Resolver Tenant').item.json.business_type }}.
Responda sempre no idioma que o cliente falar com você.
APRESENTE-SE SEMPRE e SOMENTE UMA VEZ no início do chat usando: "{{ $('Resolver Tenant').item.json.initial_greeting }}" traduzido para o idioma do cliente.
Suas funções são ajudar a reservar enviando links quando exista motor de reservas aprovado e responder dúvidas buscando sempre todas as respostas na tools "Respostas".
Despeça-se NO IDIOMA DO CLIENTE apenas uma vez com: "Obrigado por nos contactar."
Sua comunicação deve ser sempre no idioma que o cliente falar com você. NÃO MISTURE IDIOMAS.
</rol>

limits_template:
<limites>
NÃO dê alternativas.
APENAS informações de {{ $('Resolver Tenant').item.json.tenant_display_name }}.
APENAS RESPONDA o que achar na ferramenta "Respostas", de forma breve, cordial e sem opções.
NÃO invente respostas.
</limites>

tools_template:
<tools>
Uma resposta da ferramenta "Respostas" só é útil se responder diretamente à pergunta do cliente.
Se o resultado for genérico, aproximado, indireto, considere que não há resposta útil. execute a ferramenta "SemResposta" e responda ao cliente: "Vou me informar para ter a responsta em uma proxima oportunidade." en el idioma del cliente.
Nunca use uma resposta aproximada para inventar uma resposta.
</tools>

date_interpretation_template:
<interpretacao_datas>
SEMPRE calcule datas usando hoje como referência.

Hoje é {{ $today.toFormat('yyyy-MM-dd') }}

Para "amanhã" ou "mañana": {{ $today.plus({days: 1}).toFormat('yyyy-MM-dd') }}

Para "depois de amanha": {{ $today.plus({days: 2}).toFormat('yyyy-MM-dd') }}

Para dias da semana (domingo, segunda, etc):

* Calcule o próximo dia dessa semana a partir de hoje.
* Use $today.plus() para avançar dias até encontrar o dia correto.
* Exemplo: se hoje é sexta e cliente diz "domingo", calcule 2 dias à frente.

JAMAIS use datas passadas.

SEMPRE valide que checkin e checkout sejam > $today.
</interpretacao_datas>

data_collection_template:
<recolecao>
Interesse em reservar:
→ colete os dados requeridos para enviar o link.

Variáveis conversacionais (datas sempre em ISO YYYY-MM-DD):

1. check-in, entrada, chegada → checkin (sempre futuras)
2. check-out, saída → checkout (sempre > checkin)
3. hóspedes, pessoas, adultos → adults
4. quartos → rooms (somente se supports_rooms = {{ $('Resolver Tenant').item.json.supports_rooms }})
5. menores → children e child_ages (somente se supports_children = {{ $('Resolver Tenant').item.json.supports_children }})

Pergunte, espere a resposta e prossiga:
"Data de entrada?" → "Data de saída?" → "Quantos adultos?"

Antes de enviar o link, confirme com o cliente se os dados estão corretos.

Prossiga somente se {{ $('Resolver Tenant').item.json.validation_status }} = approved.
</recolecao>

links_template:
<links>
O pagamento é feito por nossos parceiros.

Status do motor: {{ $('Resolver Tenant').item.json.validation_status }}
Formato de data do tenant (date_format): {{ $('Resolver Tenant').item.json.date_format }}

NÃO monte o link manualmente. Use a ferramenta "GenerarLinkReserva" passando checkin, checkout (ISO YYYY-MM-DD) e adults. Inclua rooms, children e child_ages apenas se o cliente informou ou o motor exige.

O servidor aplica o date_format do tenant às datas. Use SOMENTE o campo short_url retornado por GenerarLinkReserva — nunca monte URL manualmente nem use o campo url longo.

Formato WhatsApp:
- Após GenerarLinkReserva, inclua short_url em uma linha separada no final da mensagem.
- Não use markdown (** ou links formatados).
- Pode confirmar dados, cumprimentar e despedir-se normalmente.

Se validation_status não for approved, NÃO gere link; use "SemResposta" antes de responder.
</links>
```

---

## Composición runtime

El Programador / n8n deben cargar el perfil por objetivo antes del AI Agent.

Flujo vigente (**FAQ Productivo**):

```text
Webhook Evolution
  ↓
Resolver Tenant (GET /api/runtime/tenant-config)
  ↓
Datos Tenant (incluye sprompt.* + custom_sprompt)
  ↓
Armar SPrompt (resuelve tokens neutros)
  ↓
AI Agent systemMessage:
  rol → limites → tools → interpretar_fecha → data_collect → links → custom_sprompt
```

Regla obligatoria:

```text
El AI Agent nunca debe recibir templates con placeholders sin resolver
(excepto el resultado vacío intencional de custom_sprompt).
```

---

## Administración web

El Admin web debe permitir:

1. Crear nuevos objetivos futuros.
2. Editar columnas semánticas del objetivo.
3. Guardar cambios como `draft`.
4. Activar una versión cuando esté validada.
5. Archivar versiones antiguas.
6. Ver historial básico de cambios.
7. Validar placeholders permitidos antes de activar.
8. Editar `custom_sprompt` por tenant (View tenant → Custom SPrompt), sin mezclarlo con la matriz de objetivos.

No debe permitir:

1. Que el cliente del tenant edite `custom_sprompt`.
2. Editar la lógica de composición runtime (nodo Armar SPrompt / orden del systemMessage).
3. Activar templates de objetivo con variables desconocidas o sin resolver.
4. Mezclar contenido de FAQ dentro de `system_prompt_objective_templates` ni dentro de `custom_sprompt` como sustituto de la KB.

---

## Reglas para el Programador

1. Crear la tabla `system_prompt_objective_templates` en PostgreSQL.
2. Usar `objective_slug` como llave funcional para cargar el comportamiento del objetivo.
3. Implementar CRUD desde Admin web para usuarios autorizados.
4. Permitir agregar nuevos objetivos futuros sin modificar el workflow n8n.
5. Separar `draft`, `active` y `archived`.
6. Resolver variables antes de entregar el prompt al AI Agent.
7. Registrar `final_system_prompt`, `prompt_hash`, `objective_slug`, `template_version`, `tenant_id`, `agent_id`, `conversation_id` y `workflow_execution_id` para auditoría.
8. No hardcodear el prompt completo en n8n.
9. No mover FAQ, reglas comerciales del cliente, datos del tenant o pausa humana a esta tabla.

---

## Auditoría sugerida

Además de `system_prompt_objective_templates`, debe existir una tabla de builds o ejecuciones para reconstrucción posterior.

Tabla sugerida: `system_prompt_builds`

```text
id
tenant_id
agent_id
objective_slug
template_version
prompt_hash
final_prompt_snapshot
built_at
conversation_id
workflow_execution_id
```

Esta tabla permite saber exactamente qué instrucciones recibió el agente en una conversación determinada.
