import { createHash, randomUUID } from 'node:crypto';
import { createEmbedding } from './embeddings.js';
import {
  buildVectorizableText,
  faqPointId,
  qdrantRequest,
  resolveCollectionName,
} from './qdrant.js';

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
  const pointId = faqPointId(faq.faq_uid);

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

export async function removeFaqFromQdrant(config, tenantSlug, faqUid) {
  const collection = resolveCollectionName(
    config.qdrantCollectionTemplate,
    tenantSlug
  );
  const pointId = faqPointId(faqUid);

  const { response } = await qdrantRequest(
    config,
    'POST',
    `/collections/${encodeURIComponent(collection)}/points/delete?wait=true`,
    { points: [pointId] }
  );

  return response.ok;
}
