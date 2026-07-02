export async function qdrantRequest(config, method, path, body = null) {
  const headers = { Accept: 'application/json' };

  if (config.qdrantApiKey) {
    headers['api-key'] = config.qdrantApiKey;
  }

  if (body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${config.qdrantUrl}${path}`, {
    method,
    headers,
    body: body === null ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  const bodyText = await response.text();
  let parsed = null;

  if (bodyText) {
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      parsed = bodyText;
    }
  }

  return { response, body: parsed };
}

export function resolveCollectionName(template, tenantSlug) {
  return template.replace('<tenant_slug>', tenantSlug);
}

export function faqPointId(faqId) {
  const hex = Buffer.from(`faq-inn:${faqId}`).toString('hex').padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** ID estable en Qdrant: preferimos el id numérico de faq_items. */
export function resolvePointId(faq) {
  const dbId = Number(faq?.id);
  if (Number.isInteger(dbId) && dbId > 0) {
    return dbId;
  }
  return faqPointId(faq?.faq_uid || faq?.faq_id);
}

export function buildVectorizableText({ question, answer, category, keywords }) {
  return [
    `Pregunta: ${question}`,
    `Respuesta: ${answer}`,
    `Categoria: ${category}`,
    `Keywords: ${keywords}`,
  ].join('\n');
}
