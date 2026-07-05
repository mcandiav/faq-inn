import { getRuntimeTenantConfig } from '../lib/runtimeService.js';

function verifyN8nToken(request, config) {
  const expected = config.n8nAllowedToken;
  if (!expected) {
    return true;
  }

  const header = request.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const alt = request.headers['x-n8n-token'] || '';

  return bearer === expected || alt === expected;
}

export async function runtimeRoutes(app, config) {
  const pool = app.db.pool;

  app.get('/api/runtime/tenant-config', async (request, reply) => {
    if (!verifyN8nToken(request, config)) {
      reply.code(401);
      return { status: 'error', error: 'Token n8n inválido' };
    }

    const instanceName =
      request.query?.instance_name ||
      request.query?.instance ||
      request.query?.evolution_instance_name ||
      '';

    try {
      const tenant = await getRuntimeTenantConfig(pool, config, instanceName);
      return { status: 'ok', tenant };
    } catch (error) {
      reply.code(error.statusCode || 500);
      return {
        status: 'error',
        error: error.message || 'No se pudo cargar configuración runtime',
      };
    }
  });

  app.post('/api/runtime/tenant-config', async (request, reply) => {
    if (!verifyN8nToken(request, config)) {
      reply.code(401);
      return { status: 'error', error: 'Token n8n inválido' };
    }

    const instanceName =
      request.body?.instance_name ||
      request.body?.instance ||
      request.body?.evolution_instance_name ||
      '';

    try {
      const tenant = await getRuntimeTenantConfig(pool, config, instanceName);
      return { status: 'ok', tenant };
    } catch (error) {
      reply.code(error.statusCode || 500);
      return {
        status: 'error',
        error: error.message || 'No se pudo cargar configuración runtime',
      };
    }
  });
}
