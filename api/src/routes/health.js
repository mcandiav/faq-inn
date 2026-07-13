import { checkDatabase, getPool } from '../db.js';
import { readGitCommit } from '../lib/gitVersion.js';

export async function healthRoutes(app, config) {
  const healthHandler = async () => {
    let database = { healthy: false };

    try {
      await checkDatabase(config.databaseUrl);
      database = { healthy: true };
    } catch (error) {
      database = { healthy: false, error: error.message };
    }

    return {
      status: database.healthy ? 'ok' : 'degraded',
      service: 'faq-inn-api',
      env: config.appEnv,
      app: {
        tenant: config.tenant,
        tenant_slug: config.tenantSlug,
        tenant_display_name: config.tenantDisplayName,
        product_name: config.appProductName || 'FAQ Inn',
        title: config.appTitle,
        version: config.appVersion,
        turnstile_enabled: config.turnstileEnabled,
        turnstile_site_key: config.turnstileEnabled
          ? config.turnstileSiteKey
          : '',
      },
      git: { commit: readGitCommit() },
      database,
      timestamp: new Date().toISOString(),
    };
  };

  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  app.get('/api/db/health', async (_request, reply) => {
    try {
      const pool = getPool(config.databaseUrl);
      const [rows] = await pool.query('SELECT version() AS version');
      return {
        status: 'ok',
        database: {
          healthy: true,
          engine: 'postgresql',
          version: rows[0].version,
          name: config.dbName,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      reply.code(503);
      return {
        status: 'error',
        database: {
          healthy: false,
          error: error.message,
        },
        timestamp: new Date().toISOString(),
      };
    }
  });
}
