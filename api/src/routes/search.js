import { createEmbedding } from '../lib/embeddings.js';
import {
  buildVectorizableText,
  faqPointId,
  qdrantRequest,
  resolveCollectionName,
} from '../lib/qdrant.js';

function testFaqDefaults(config) {
  return {
    tenant_id: config.tenantSlug,
    agent_id: 'principal',
    faq_id: 'wifi-001',
    question: 'Tienen Wifi?',
    answer:
      'Si, tenemos WIFI, pero estamos en una isla y el servicio no tiene la robustez de un servicio en el continente.',
    category: 'servicios',
    keywords: 'wifi, internet, conexion',
  };
}

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
    const tenantSlug = request.body?.tenant_slug || config.tenantSlug;
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
      const defaults = testFaqDefaults(config);
      const tenantSlug = request.body?.tenant_slug || defaults.tenant_id;
      const collection = resolveCollectionName(
        config.qdrantCollectionTemplate,
        tenantSlug
      );
      const faq = { ...defaults, ...(request.body?.faq || {}) };
      const text = buildVectorizableText(faq);
      const vector = await createEmbedding(text, config, { inputType: 'passage' });
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
      reply.code(error.message.includes('API_KEY') ? 503 : 500);
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
      let slug = String(tenant_slug || tenant_id || '').trim();
      if (/^\d+$/.test(slug)) {
        const pool = app.db.pool;
        const [rows] = await pool.query(
          'SELECT slug FROM tenants WHERE id = ? LIMIT 1',
          [Number(slug)]
        );
        slug = rows[0]?.slug || slug;
      }
      const collection = resolveCollectionName(
        config.qdrantCollectionTemplate,
        slug
      );
      const vector = await createEmbedding(query, config, { inputType: 'query' });

      const { response, body } = await qdrantRequest(
        config,
        'POST',
        `/collections/${encodeURIComponent(collection)}/points/search`,
        {
          vector,
          filter: searchFilter(slug, agent_id),
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
      reply.code(error.message.includes('API_KEY') ? 503 : 500);
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  });
}
