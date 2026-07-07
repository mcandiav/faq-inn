import {
  approveDiscovery,
  discoverFromUrls,
  getAgendaEngineState,
  previewAgendaUrl,
  rejectDiscovery,
  startDiscoverySession,
} from '../lib/agendaEngineService.js';

function requireClient(request, reply) {
  if (request.user.role !== 'client' || !request.user.tenant_id) {
    reply.code(403);
    return false;
  }
  return true;
}

export async function agendaEngineRoutes(app) {
  const pool = app.db.pool;

  app.get(
    '/api/agenda-engine/state',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!requireClient(request, reply)) {
        return { status: 'error', error: 'Solo clientes con negocio' };
      }

      try {
        const data = await getAgendaEngineState(pool, request.user.tenant_id);
        return { status: 'ok', ...data };
      } catch (error) {
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo cargar motor de agenda',
        };
      }
    }
  );

  app.post(
    '/api/agenda-engine/start',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!requireClient(request, reply)) {
        return { status: 'error', error: 'Solo clientes con negocio' };
      }

      try {
        const data = await startDiscoverySession(pool, request.user.tenant_id);
        return { status: 'ok', ...data };
      } catch (error) {
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo iniciar descubrimiento de agenda',
        };
      }
    }
  );

  app.post(
    '/api/agenda-engine/discover',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!requireClient(request, reply)) {
        return { status: 'error', error: 'Solo clientes con negocio' };
      }

      const sessionId = Number(request.body?.session_id);
      const urls = request.body?.urls;

      if (!sessionId) {
        reply.code(400);
        return { status: 'error', error: 'session_id es obligatorio' };
      }

      try {
        const data = await discoverFromUrls(
          pool,
          request.user.tenant_id,
          sessionId,
          urls
        );
        return { status: 'ok', ...data };
      } catch (error) {
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo analizar los links de agenda',
        };
      }
    }
  );

  app.post(
    '/api/agenda-engine/reject',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!requireClient(request, reply)) {
        return { status: 'error', error: 'Solo clientes con negocio' };
      }

      const sessionId = Number(request.body?.session_id);
      if (!sessionId) {
        reply.code(400);
        return { status: 'error', error: 'session_id es obligatorio' };
      }

      try {
        const data = await rejectDiscovery(
          pool,
          request.user.tenant_id,
          sessionId
        );
        return { status: 'ok', ...data };
      } catch (error) {
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo reiniciar descubrimiento de agenda',
        };
      }
    }
  );

  app.post(
    '/api/agenda-engine/preview',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!requireClient(request, reply)) {
        return { status: 'error', error: 'Solo clientes con negocio' };
      }

      try {
        const data = await previewAgendaUrl(
          pool,
          request.user.tenant_id,
          request.body || {}
        );
        return { status: 'ok', ...data };
      } catch (error) {
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo generar el link de agenda',
        };
      }
    }
  );

  app.post(
    '/api/agenda-engine/approve',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!requireClient(request, reply)) {
        return { status: 'error', error: 'Solo clientes con negocio' };
      }

      const sessionId = Number(request.body?.session_id);
      if (!sessionId) {
        reply.code(400);
        return { status: 'error', error: 'session_id es obligatorio' };
      }

      try {
        const agenda = await approveDiscovery(
          pool,
          request.user.tenant_id,
          request.user.id,
          sessionId
        );
        return { status: 'ok', agenda };
      } catch (error) {
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo aprobar plantilla de agenda',
        };
      }
    }
  );
}
