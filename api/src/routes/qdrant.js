import { qdrantRequest } from '../lib/qdrant.js';

export async function qdrantRoutes(app, config) {
  app.get('/api/qdrant/health', async (_request, reply) => {
    const startedAt = Date.now();

    try {
      const { response: healthResponse, body: healthBody } = await qdrantRequest(
        config,
        'GET',
        '/healthz'
      );

      if (!healthResponse.ok) {
        reply.code(503);
        return {
          status: 'error',
          qdrant: {
            reachable: true,
            healthy: false,
            http_status: healthResponse.status,
            url: config.qdrantUrl,
          },
          latency_ms: Date.now() - startedAt,
          error: 'Qdrant healthz check failed',
          detail: healthBody,
        };
      }

      let collections = null;

      try {
        const { response: collectionsResponse, body: collectionsBody } =
          await qdrantRequest(config, 'GET', '/collections');

        if (collectionsResponse.ok && collectionsBody?.result?.collections) {
          collections = {
            count: collectionsBody.result.collections.length,
            names: collectionsBody.result.collections.map((item) => item.name),
          };
        }
      } catch {
        collections = { count: null, names: [], note: 'Could not list collections' };
      }

      return {
        status: 'ok',
        qdrant: {
          reachable: true,
          healthy: true,
          url: config.qdrantUrl,
          collection_template: config.qdrantCollectionTemplate,
        },
        collections,
        latency_ms: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      app.log.error({ err: error }, 'Qdrant connectivity check failed');
      reply.code(503);
      return {
        status: 'error',
        qdrant: {
          reachable: false,
          healthy: false,
          url: config.qdrantUrl,
        },
        latency_ms: Date.now() - startedAt,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  });
}
