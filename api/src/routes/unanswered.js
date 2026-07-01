import {
  convertUnansweredToFaq,
  listUnansweredForUser,
  registerUnanswered,
  updateUnansweredStatus,
} from '../lib/unansweredService.js';

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

export async function unansweredRoutes(app, config) {
  const pool = app.db.pool;

  app.post('/api/unanswered', async (request, reply) => {
    if (!verifyN8nToken(request, config)) {
      reply.code(401);
      return { status: 'error', error: 'Token n8n inválido' };
    }

    try {
      const result = await registerUnanswered(pool, request.body || {});
      return result;
    } catch (error) {
      const code = error.statusCode || 500;
      if (code >= 500) {
        app.log.error({ err: error }, 'Registrar pregunta sin respuesta falló');
      }
      reply.code(code);
      return { status: 'error', error: error.message };
    }
  });

  app.get(
    '/api/unanswered',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = request.user;

      if (user.role !== 'client' && user.role !== 'admin_global') {
        reply.code(403);
        return { status: 'error', error: 'Sin permisos' };
      }

      const items = await listUnansweredForUser(pool, user, request.query || {});
      const pending = items.filter((item) => item.status === 'pending').length;

      return { status: 'ok', items, total: items.length, pending };
    }
  );

  app.patch(
    '/api/unanswered/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = request.user;

      if (user.role !== 'client') {
        reply.code(403);
        return { status: 'error', error: 'Solo clientes pueden administrar preguntas' };
      }

      const status = request.body?.status;
      if (!status) {
        reply.code(400);
        return { status: 'error', error: 'status es obligatorio' };
      }

      try {
        const updated = await updateUnansweredStatus(
          pool,
          request.params.id,
          user,
          status
        );
        return { status: 'ok', item: updated };
      } catch (error) {
        const code = error.statusCode || 500;
        reply.code(code);
        return { status: 'error', error: error.message };
      }
    }
  );

  app.post(
    '/api/unanswered/:id/convert',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = request.user;

      if (user.role !== 'client') {
        reply.code(403);
        return { status: 'error', error: 'Solo clientes pueden convertir en FAQ' };
      }

      try {
        const result = await convertUnansweredToFaq(
          pool,
          config,
          request.params.id,
          user,
          request.body || {}
        );
        return { status: 'ok', ...result };
      } catch (error) {
        const code = error.statusCode || 502;
        if (code >= 500) {
          app.log.error({ err: error }, 'Convertir pregunta en FAQ falló');
        }
        reply.code(code);
        return {
          status: 'error',
          error: error.message,
          detail: error.detail,
        };
      }
    }
  );
}
