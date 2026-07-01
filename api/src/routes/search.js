import { createEmbedding } from '../lib/embeddings.js';
import {
  buildVectorizableText,
  faqPointId,
  qdrantRequest,
  resolveCollectionName,
} from '../lib/qdrant.js';

const TEST_FAQ = {
  tenant_id: 'morroreservas',
  agent_id: 'chatwoot_reservas',
  faq_id: 'wifi-001',
  question: 'Tienen Wifi?',
  answer:
    'Si, tenemos WIFI, pero estamos en una isla y el servicio no tiene la robustez de un servicio en el continente.',
  category: 'servicios',
  keywords: 'wifi, internet, conexion, ilha, trabalho remoto',
};

function searchFilter(tenantId, agentId) {
  return {
    must: [
      { key: 'tenant_id', match: { value: tenantId } },
      { key: 'agent_id', match: { value: agentId } },
      { key: 'active', match: { value: true } },
    ],
  };
}

export async function searchRoutes(app, config) {
  app.post('/api/qdrant/collections/ensure', async (request, reply) => {
    const tenantSlug = request.body?.tenant_slug || 'morroreservas';
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
      return {
        status: 'ok',
        action: 'exists',
        collection,
        timestamp: new Date().toISOString(),
      };
    }

    const { response: putResponse, body } = await qdrantRequest(
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

    if (!putResponse.ok) {
      reply.code(502);
      return {
        status: 'error',
        collection,
        error: 'Failed to create collection',
        detail: body,
      };
    }

    return {
      status: 'ok',
      action: 'created',
      collection,
      timestamp: new Date().toISOString(),
    };
  });

  app.post('/api/qdrant/faq/upsert-test', async (request, reply) => {
    try {
      const tenantSlug = request.body?.tenant_slug || TEST_FAQ.tenant_id;
      const collection = resolveCollectionName(
        config.qdrantCollectionTemplate,
        tenantSlug
      );
      const faq = { ...TEST_FAQ, ...(request.body?.faq || {}) };
      const text = buildVectorizableText(faq);
      const vector = await createEmbedding(text, config);
      const pointId = faqPointId(faq.faq_id);

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
                tenant_id: faq.tenant_id,
                agent_id: faq.agent_id,
                faq_id: faq.faq_id,
                question: faq.question,
                answer: faq.answer,
                category: faq.category,
                keywords: faq.keywords,
                active: true,
                text,
              },
            },
          ],
        }
      );

      if (!response.ok) {
        reply.code(502);
        return {
          status: 'error',
          error: 'Qdrant upsert failed',
          detail: body,
        };
      }

      return {
        status: 'ok',
        collection,
        point_id: pointId,
        faq_id: faq.faq_id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      app.log.error({ err: error }, 'FAQ upsert test failed');
      reply.code(error.message.includes('OPENAI_API_KEY') ? 503 : 500);
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  });

  app.post('/api/search', async (request, reply) => {
    const { tenant_id, agent_id, query, tenant_slug, limit } = request.body || {};

    if (!tenant_id || !agent_id || !query) {
      reply.code(400);
      return {
        status: 'error',
        error: 'tenant_id, agent_id and query are required',
      };
    }

    try {
      const slug = tenant_slug || tenant_id;
      const collection = resolveCollectionName(
        config.qdrantCollectionTemplate,
        slug
      );
      const vector = await createEmbedding(query, config);

      const { response, body } = await qdrantRequest(
        config,
        'POST',
        `/collections/${encodeURIComponent(collection)}/points/search`,
        {
          vector,
          filter: searchFilter(tenant_id, agent_id),
          limit: Math.min(Number(limit) || 5, 20),
          with_payload: true,
        }
      );

      if (!response.ok) {
        reply.code(502);
        return {
          status: 'error',
          error: 'Qdrant search failed',
          detail: body,
        };
      }

      const results = (body?.result || []).map((item) => ({
        faq_id: item.payload?.faq_id,
        question: item.payload?.question,
        answer: item.payload?.answer,
        score: item.score,
      }));

      return {
        status: 'ok',
        collection,
        results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      app.log.error({ err: error }, 'Search failed');
      reply.code(error.message.includes('OPENAI_API_KEY') ? 503 : 500);
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  });
}
