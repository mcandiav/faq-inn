async function qdrantFetch(config, path) {
  const headers = { Accept: 'application/json' };

  if (config.qdrantApiKey) {
    headers['api-key'] = config.qdrantApiKey;
  }

  const response = await fetch(`${config.qdrantUrl}${path}`, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  const bodyText = await response.text();
  let body = null;

  if (bodyText) {
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = bodyText;
    }
  }

  return { response, body };
}

export async function qdrantRoutes(app, config) {
  app.get('/api/qdrant/health', async (_request, reply) => {
    const startedAt = Date.now();

    try {
      const { response: healthResponse, body: healthBody } = await qdrantFetch(
        config,
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
          await qdrantFetch(config, '/collections');

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
