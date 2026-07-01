import { checkDatabase, getPool } from '../db.js';

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
      service: 'dfaq-api',
      env: config.appEnv,
      database,
      timestamp: new Date().toISOString(),
    };
  };

  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  app.get('/api/db/health', async (_request, reply) => {
    try {
      const pool = getPool(config.databaseUrl);
      const [rows] = await pool.query('SELECT VERSION() AS version');
      return {
        status: 'ok',
        database: {
          healthy: true,
          version: rows[0].version,
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
