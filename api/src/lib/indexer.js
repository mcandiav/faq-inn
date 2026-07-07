import { createHash, randomUUID } from 'node:crypto';
import { createEmbedding } from './embeddings.js';
import {
  buildVectorizableText,
  faqPointId,
  qdrantRequest,
  resolveCollectionName,
  resolvePointId,
} from './qdrant.js';

export async function deleteAllTenantPoints(config, tenantSlug) {
  const collection = resolveCollectionName(
    config.qdrantCollectionTemplate,
    tenantSlug
  );

  const { response: getResponse } = await qdrantRequest(
    config,
    'GET',
    `/collections/${encodeURIComponent(collection)}`
  );

  if (!getResponse.ok) {
    return { collection, deleted: false, reason: 'collection_not_found' };
  }

  const { response, body } = await qdrantRequest(
    config,
    'POST',
    `/collections/${encodeURIComponent(collection)}/points/delete?wait=true`,
    {
      filter: {
        must: [{ key: 'tenant_id', match: { value: tenantSlug } }],
      },
    }
  );

  if (!response.ok) {
    const error = new Error('No se pudieron borrar los puntos Qdrant del tenant');
    error.detail = body;
    throw error;
  }

  return { collection, deleted: true };
}

/**
 * Borra la colección completa del tenant (una colección por tenant:
 * kb_<slug>_...). Usar solo al eliminar el tenant entero; para vaciar FAQs
 * sin borrar el tenant usar deleteAllTenantPoints.
 */
export async function deleteTenantCollection(config, tenantSlug) {
  const collection = resolveCollectionName(
    config.qdrantCollectionTemplate,
    tenantSlug
  );

  const { response, body } = await qdrantRequest(
    config,
    'DELETE',
    `/collections/${encodeURIComponent(collection)}?wait=true`
  );

  if (!response.ok) {
    const error = new Error('No se pudo borrar la colección Qdrant del tenant');
    error.detail = body;
    throw error;
  }

  return { collection, deleted: true };
}

export async function deleteFaqPoints(config, collection, tenantSlug, faqUid, extraPointIds = []) {
  const ids = new Set();

  for (const rawId of extraPointIds) {
    if (rawId === null || rawId === undefined || rawId === '') {
      continue;
    }
    const numeric = Number(rawId);
    if (Number.isInteger(numeric) && numeric > 0) {
      ids.add(numeric);
      continue;
    }
    ids.add(String(rawId));
  }

  const { response: filterResponse } = await qdrantRequest(
    config,
    'POST',
    `/collections/${encodeURIComponent(collection)}/points/delete?wait=true`,
    {
      filter: {
        must: [
          { key: 'tenant_id', match: { value: tenantSlug } },
          { key: 'faq_id', match: { value: faqUid } },
        ],
      },
    }
  );

  let deletedByFilter = filterResponse.ok;

  if (ids.size > 0) {
    const { response: idResponse } = await qdrantRequest(
      config,
      'POST',
      `/collections/${encodeURIComponent(collection)}/points/delete?wait=true`,
      { points: [...ids] }
    );
    deletedByFilter = deletedByFilter || idResponse.ok;
  }

  return deletedByFilter;
}

export function embeddingHash(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 32);
}

export function newFaqUid() {
  return randomUUID();
}

export async function ensureTenantCollection(config, tenantSlug) {
  const collection = resolveCollectionName(
    config.qdrantCollectionTemplate,
    tenantSlug
  );

  const { response: getResponse } = await qdrantRequest(
    config,
    'GET',
    `/collections/${encodeURIComponent(collection)}`
  );

  if (getResponse.ok) {
    return { collection, action: 'exists' };
  }

  const { response, body } = await qdrantRequest(
    config,
    'PUT',
    `/collections/${encodeURIComponent(collection)}`,
    {
      vectors: {
        size: config.embeddingDimension,
        distance: 'Cosine',
      },
    }
  );

  if (!response.ok) {
    const error = new Error('No se pudo crear la colección Qdrant');
    error.detail = body;
    throw error;
  }

  return { collection, action: 'created' };
}

export async function indexFaqItem(config, faq, tenantSlug) {
  const collection = resolveCollectionName(
    config.qdrantCollectionTemplate,
    tenantSlug
  );

  await ensureTenantCollection(config, tenantSlug);

  const text = buildVectorizableText({
    question: faq.question,
    answer: faq.answer,
    category: faq.category,
    keywords: faq.keywords,
  });
  const hash = embeddingHash(text);
  const vector = await createEmbedding(text, config, { inputType: 'passage' });
  const pointId = resolvePointId(faq);

  await deleteFaqPoints(config, collection, tenantSlug, faq.faq_uid, [
    faq.qdrant_point_id,
    faqPointId(faq.faq_uid),
  ]);

  const { response, body } = await qdrantRequest(
    config,
    'PUT',
    `/collections/${encodeURIComponent(collection)}/points?wait=true`,
    {
      points: [
        {
          id: pointId,
          vector,
          payload: {
            tenant_id: tenantSlug,
            agent_id: faq.agent_slug,
            faq_id: faq.faq_uid,
            question: faq.question,
            answer: faq.answer,
            category: faq.category,
            keywords: faq.keywords,
            active: Boolean(faq.active),
            text,
          },
        },
      ],
    }
  );

  if (!response.ok) {
    const error = new Error('Qdrant upsert failed');
    error.detail = body;
    throw error;
  }

  return {
    collection,
    point_id: pointId,
    embedding_hash: hash,
    indexed_at: new Date(),
  };
}

export async function removeFaqFromQdrant(config, tenantSlug, faqUid, extraPointIds = []) {
  const collection = resolveCollectionName(
    config.qdrantCollectionTemplate,
    tenantSlug
  );

  return deleteFaqPoints(config, collection, tenantSlug, faqUid, [
    ...extraPointIds,
    faqPointId(faqUid),
  ]);
}
