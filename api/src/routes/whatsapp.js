import {
  getProvisionStatus,
  startWhatsappProvision,
  disconnectWhatsapp,
} from '../lib/provisionService.js';

function tenantFromUser(user) {
  return {
    id: user.tenant_id,
    slug: user.tenant_slug,
    name: user.tenant_name || '',
    email: user.email,
  };
}

function requireClient(request, reply) {
  if (request.user.role !== 'client' || !request.user.tenant_id) {
    reply.code(403);
    return false;
  }
  return true;
}

export async function whatsappRoutes(app, config) {
  const pool = app.db.pool;

  app.post(
    '/api/whatsapp/connect',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!requireClient(request, reply)) {
        return { status: 'error', error: 'Solo clientes con negocio' };
      }

      try {
        const result = await startWhatsappProvision(
          pool,
          config,
          tenantFromUser(request.user)
        );

        return {
          status: 'ok',
          instance_name: result.instanceName,
          connection_status: result.status,
          phone_number: result.phoneNumber,
          qr_base64: result.qrBase64,
          message: result.message || null,
          poll_interval_seconds: config.evolutionQrPollIntervalSeconds,
          timeout_seconds: config.evolutionQrTimeoutSeconds,
        };
      } catch (error) {
        app.log.error({ err: error, detail: error.detail }, 'whatsapp connect failed');
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo iniciar WhatsApp',
        };
      }
    }
  );

  app.post(
    '/api/whatsapp/disconnect',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!requireClient(request, reply)) {
        return { status: 'error', error: 'Solo clientes con negocio' };
      }

      try {
        const result = await disconnectWhatsapp(
          pool,
          config,
          tenantFromUser(request.user)
        );

        return {
          status: 'ok',
          connection_status: result.status,
          instance_name: result.instanceName,
        };
      } catch (error) {
        app.log.error({ err: error }, 'whatsapp disconnect failed');
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo desconectar WhatsApp',
        };
      }
    }
  );

  app.get(
    '/api/whatsapp/status/:instance',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!requireClient(request, reply)) {
        return { status: 'error', error: 'Solo clientes con negocio' };
      }

      try {
        const instanceName = String(request.params.instance || '').trim();
        const expectedPrefix = (
          config.evolutionInstancePrefix || 'faqinn_'
        ).replace(/_+$/, '_');
        if (!instanceName.startsWith(expectedPrefix)) {
          reply.code(400);
          return { status: 'error', error: 'instance_name inválido' };
        }

        const result = await getProvisionStatus(
          pool,
          config,
          tenantFromUser(request.user),
          instanceName
        );

        return {
          status: 'ok',
          instance_name: result.instanceName,
          connection_status: result.status,
          phone_number: result.phoneNumber,
          qr_base64: result.qrBase64,
          tenant_status: result.tenantStatus,
          evolution_state: result.evolutionState || null,
          message: result.message || null,
        };
      } catch (error) {
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo consultar WhatsApp',
        };
      }
    }
  );
}
