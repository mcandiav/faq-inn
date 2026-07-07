import { PRIMARY_OBJECTIVE_SLUGS, getObjective } from './objectives/index.js';

function validationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/** Columnas semánticas editables por objetivo. */
export const TEMPLATE_COLUMNS = [
  'role_template',
  'limits_template',
  'tools_template',
  'date_interpretation_template',
  'data_collection_template',
  'links_template',
];

const VALID_STATUS = ['draft', 'active', 'archived'];

/**
 * Slugs administrables en la tabla de objetivos.
 * Los 3 comerciales excluyentes + responder_preguntas (transversal FAQ).
 */
export const OBJECTIVE_TEMPLATE_SLUGS = [
  ...PRIMARY_OBJECTIVE_SLUGS,
  'responder_preguntas',
];

/**
 * Tokens neutros que el nodo Code "Armar SPrompt" reemplaza en n8n con
 * los valores del tenant/runtime. NO usar sintaxis n8n dentro de las columnas.
 * Tokens soportados: {{tenant_display_name}}, {{business_type}},
 * {{initial_greeting}}, {{validation_status}}, {{date_format}},
 * {{supports_rooms}}, {{supports_children}}, {{today}}, {{today_plus_1}},
 * {{today_plus_2}}.
 */
const RESERVAR_NOCHES = {
  role_template: `<rol>
Agente de IA para "{{tenant_display_name}}" - {{business_type}}.
Responda sempre no idioma que o cliente falar com você.
APRESENTE-SE SEMPRE e SOMENTE UMA VEZ no início do chat usando: "{{initial_greeting}}" traduzido para o idioma do cliente.
Suas funções são ajudar a reservar enviando links quando exista motor de reservas aprovado e responder dúvidas buscando sempre todas as respostas na tools "Respostas".
Despeça-se NO IDIOMA DO CLIENTE apenas uma vez com: "Obrigado por nos contactar."
Sua comunicação deve ser sempre no idioma que o cliente falar com você. NÃO MISTURE IDIOMAS.
</rol>`,
  limits_template: `<limites>
NÃO dê alternativas.
APENAS informações de {{tenant_display_name}}.
APENAS RESPONDA o que achar na ferramenta "Respostas", de forma breve, cordial e sem opções.
NÃO invente respostas.
</limites>`,
  tools_template: `<tools>
Uma resposta da ferramenta "Respostas" só é útil se responder diretamente à pergunta do cliente.
Se o resultado for genérico, aproximado, indireto, considere que não há resposta útil. execute a ferramenta "SemResposta" e responda ao cliente: "Vou me informar para ter a responsta em uma proxima oportunidade." en el idioma del cliente.
Nunca use uma resposta aproximada para inventar uma resposta.
</tools>`,
  date_interpretation_template: `<interpretacao_datas>
SEMPRE calcule datas usando hoje como referência.

Hoje é {{today}}

Para "amanhã" ou "mañana": {{today_plus_1}}

Para "depois de amanha": {{today_plus_2}}

Para dias da semana (domingo, segunda, etc):

* Calcule o próximo dia dessa semana a partir de hoje.
* Avance dias a partir de hoje até encontrar o dia correto.
* Exemplo: se hoje é sexta e cliente diz "domingo", calcule 2 dias à frente.

JAMAIS use datas passadas.

SEMPRE valide que checkin e checkout sejam maiores que hoje.
</interpretacao_datas>`,
  data_collection_template: `<recolecao>
Interesse em reservar:
→ colete os dados requeridos para enviar o link.

Variáveis conversacionais (datas sempre em ISO YYYY-MM-DD):

1. check-in, entrada, chegada → checkin (sempre futuras)
2. check-out, saída → checkout (sempre > checkin)
3. hóspedes, pessoas, adultos → adults
4. quartos → rooms (somente se supports_rooms = {{supports_rooms}})
5. menores → children e child_ages (somente se supports_children = {{supports_children}})

Pergunte, espere a resposta e prossiga:
"Data de entrada?" → "Data de saída?" → "Quantos adultos?"

Antes de enviar o link, confirme com o cliente se os dados estão corretos.

Prossiga somente se {{validation_status}} = approved.
</recolecao>`,
  links_template: `<links>
O pagamento é feito por nossos parceiros.

Status do motor: {{validation_status}}
Formato de data do tenant (date_format): {{date_format}}

NÃO monte o link manualmente. Use a ferramenta "GenerarLinkReserva" passando checkin, checkout (ISO YYYY-MM-DD) e adults. Inclua rooms, children e child_ages apenas se o cliente informou ou o motor exige.

O servidor aplica o date_format do tenant às datas. Use SOMENTE o campo short_url retornado por GenerarLinkReserva — nunca monte URL manualmente nem use o campo url longo.

Formato WhatsApp:
- Após GenerarLinkReserva, inclua short_url em uma linha separada no final da mensagem.
- Não use markdown (** ou links formatados).
- Pode confirmar dados, cumprimentar e despedir-se normalmente.

Se validation_status não for approved, NÃO gere link; use "SemResposta" antes de responder.
</links>`,
};

function emptyTemplateColumns() {
  return TEMPLATE_COLUMNS.reduce((acc, column) => {
    acc[column] = '';
    return acc;
  }, {});
}

/** Contenido inicial por objetivo. Solo reservar_noches viene poblado. */
function seedContentFor(slug) {
  if (slug === 'reservar_noches') {
    return { status: 'active', columns: RESERVAR_NOCHES };
  }
  return { status: 'draft', columns: emptyTemplateColumns() };
}

function objectiveName(slug) {
  const objective = getObjective(slug);
  return objective?.name || slug;
}

/**
 * Inserta las filas base de objetivos si no existen.
 * Idempotente: nunca sobrescribe contenido editado por el admin.
 */
export async function seedObjectiveTemplates(pool) {
  for (const slug of OBJECTIVE_TEMPLATE_SLUGS) {
    const seed = seedContentFor(slug);
    await pool.query(
      `INSERT INTO system_prompt_objective_templates
         (objective_slug, objective_name, role_template, limits_template,
          tools_template, date_interpretation_template, data_collection_template,
          links_template, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (objective_slug) DO NOTHING`,
      [
        slug,
        objectiveName(slug),
        seed.columns.role_template,
        seed.columns.limits_template,
        seed.columns.tools_template,
        seed.columns.date_interpretation_template,
        seed.columns.data_collection_template,
        seed.columns.links_template,
        seed.status,
      ]
    );
  }
}

function mapRow(row) {
  return {
    id: row.id,
    objective_slug: row.objective_slug,
    objective_name: row.objective_name,
    role_template: row.role_template || '',
    limits_template: row.limits_template || '',
    tools_template: row.tools_template || '',
    date_interpretation_template: row.date_interpretation_template || '',
    data_collection_template: row.data_collection_template || '',
    links_template: row.links_template || '',
    status: row.status || 'draft',
    version: Number(row.version || 1),
    updated_at: row.updated_at || null,
  };
}

export async function listObjectiveTemplates(pool) {
  const [rows] = await pool.query(
    `SELECT * FROM system_prompt_objective_templates
     ORDER BY
       CASE objective_slug
         WHEN 'reservar_noches' THEN 1
         WHEN 'reservar_horarios' THEN 2
         WHEN 'enviar_a_sitio_web' THEN 3
         WHEN 'responder_preguntas' THEN 4
         ELSE 5
       END,
       objective_slug`
  );
  return rows.map(mapRow);
}

export async function getObjectiveTemplate(pool, slug) {
  const [rows] = await pool.query(
    `SELECT * FROM system_prompt_objective_templates
     WHERE objective_slug = ?
     LIMIT 1`,
    [String(slug || '').trim()]
  );
  if (!rows[0]) {
    throw validationError('Objetivo no encontrado', 404);
  }
  return mapRow(rows[0]);
}

export async function updateObjectiveTemplate(pool, slug, input = {}) {
  const cleanSlug = String(slug || '').trim();
  await getObjectiveTemplate(pool, cleanSlug);

  const updates = [];
  const params = [];

  for (const column of TEMPLATE_COLUMNS) {
    if (input[column] !== undefined) {
      updates.push(`${column} = ?`);
      params.push(String(input[column] ?? ''));
    }
  }

  if (input.objective_name !== undefined) {
    const name = String(input.objective_name || '').trim();
    if (name.length < 2) {
      throw validationError('objective_name es obligatorio');
    }
    updates.push('objective_name = ?');
    params.push(name);
  }

  if (input.status !== undefined) {
    const status = String(input.status || '').trim();
    if (!VALID_STATUS.includes(status)) {
      throw validationError('status inválido');
    }
    updates.push('status = ?');
    params.push(status);
  }

  if (updates.length === 0) {
    return getObjectiveTemplate(pool, cleanSlug);
  }

  updates.push('version = version + 1');
  updates.push('updated_at = NOW()');

  await pool.query(
    `UPDATE system_prompt_objective_templates
     SET ${updates.join(', ')}
     WHERE objective_slug = ?`,
    [...params, cleanSlug]
  );

  return getObjectiveTemplate(pool, cleanSlug);
}

/**
 * Devuelve las 6 columnas crudas (con tokens neutros sin resolver) del
 * template ACTIVO para el objetivo dado. Si no existe o no está activo,
 * devuelve columnas vacías. Pensado para /runtime/tenant-config: n8n las
 * resuelve en el nodo Code "Armar SPrompt".
 */
export async function getRuntimeTemplateColumns(pool, slug) {
  const cleanSlug = String(slug || '').trim();
  const empty = emptyTemplateColumns();
  if (!cleanSlug) {
    return empty;
  }
  const [rows] = await pool.query(
    `SELECT ${TEMPLATE_COLUMNS.join(', ')}
     FROM system_prompt_objective_templates
     WHERE objective_slug = ? AND status = 'active'
     LIMIT 1`,
    [cleanSlug]
  );
  const row = rows[0];
  if (!row) {
    return empty;
  }
  return TEMPLATE_COLUMNS.reduce((acc, column) => {
    acc[column] = row[column] || '';
    return acc;
  }, {});
}
