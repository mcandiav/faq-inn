import {
  getAccountSettings,
  updateAccountSettings,
} from '../lib/accountService.js';

function requireClient(request, reply) {
  if (request.user.role !== 'client' || !request.user.tenant_id) {
    reply.code(403);
    return false;
  }
  return true;
}

export async function accountRoutes(app, config) {
  const pool = app.db.pool;

  app.get(
    '/api/account/settings',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!requireClient(request, reply)) {
        return { status: 'error', error: 'Solo clientes con negocio' };
      }

      try {
        const account = await getAccountSettings(
          pool,
          config,
          request.user.id,
          request.user.tenant_id
        );
        return { status: 'ok', ...account };
      } catch (error) {
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo cargar la cuenta',
        };
      }
    }
  );

  app.patch(
    '/api/account/settings',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!requireClient(request, reply)) {
        return { status: 'error', error: 'Solo clientes con negocio' };
      }

      try {
        const account = await updateAccountSettings(
          pool,
          config,
          request.user.id,
          request.user.tenant_id,
          request.body || {}
        );
        return { status: 'ok', ...account };
      } catch (error) {
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo guardar la cuenta',
        };
      }
    }
  );
}
