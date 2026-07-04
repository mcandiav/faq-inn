import {
  getProvisionStatus,
  registerProvisionTenant,
  startWhatsappProvision,
} from '../lib/provisionService.js';

const PROVISION_COOKIE = 'faq_inn_provision';

function parseCookies(header) {
  if (!header) {
    return {};
  }

  return Object.fromEntries(
    header.split(';').map((part) => {
      const [key, ...rest] = part.trim().split('=');
      return [key, decodeURIComponent(rest.join('='))];
    })
  );
}

function setProvisionCookie(reply, token, config) {
  const secure = config.appEnv === 'production';
  const parts = [
    `${PROVISION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=7200',
  ];
  if (secure) {
    parts.push('Secure');
  }
  reply.header('Set-Cookie', parts.join('; '));
}

async function loadProvisionTenant(pool, tenantId) {
  const [rows] = await pool.query(
    `SELECT id, slug, name, email, status
     FROM tenants
     WHERE id = ?`,
    [tenantId]
  );
  return rows[0] || null;
}

function readProvisionToken(request) {
  const auth = request.headers.authorization || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  const cookies = parseCookies(request.headers.cookie);
  return cookies[PROVISION_COOKIE] || '';
}

export async function provisionRoutes(app, config) {
  const pool = app.db.pool;

  app.decorate('authenticateProvision', async (request, reply) => {
    const token = readProvisionToken(request);
    if (!token) {
      return reply
        .code(401)
        .send({ status: 'error', error: 'Sesión de provisionamiento requerida' });
    }

    try {
      const payload = await app.jwt.verify(token);
      if (payload.typ !== 'provision' || !payload.tenant_id) {
        return reply
          .code(401)
          .send({ status: 'error', error: 'Token de provisionamiento inválido' });
      }

      const tenant = await loadProvisionTenant(pool, payload.tenant_id);
      if (!tenant) {
        return reply
          .code(401)
          .send({ status: 'error', error: 'Tenant no encontrado' });
      }

      request.provision = { tenant, tokenPayload: payload };
    } catch {
      return reply
        .code(401)
        .send({ status: 'error', error: 'Sesión de provisionamiento inválida' });
    }
  });

  app.post('/api/provision/register', async (request, reply) => {
    try {
      const tenant = await registerProvisionTenant(pool, request.body || {});
      const token = await app.jwt.sign(
        {
          typ: 'provision',
          tenant_id: tenant.tenantId,
          slug: tenant.slug,
        },
        { expiresIn: '2h' }
      );
      setProvisionCookie(reply, token, config);

      return {
        status: 'ok',
        token,
        tenant: {
          id: tenant.tenantId,
          slug: tenant.slug,
          commercial_name: tenant.commercialName,
          email: tenant.email,
          status: tenant.status,
        },
        poll_interval_seconds: config.evolutionQrPollIntervalSeconds,
        timeout_seconds: config.evolutionQrTimeoutSeconds,
      };
    } catch (error) {
      reply.code(error.statusCode || 500);
      return {
        status: 'error',
        error: error.message || 'No se pudo registrar el tenant',
      };
    }
  });

  app.post(
    '/api/provision/whatsapp',
    { preHandler: [app.authenticateProvision] },
    async (request, reply) => {
      try {
        const result = await startWhatsappProvision(
          pool,
          config,
          request.provision.tenant
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
        app.log.error({ err: error, detail: error.detail }, 'provision whatsapp failed');
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo crear la instancia WhatsApp',
          detail: config.appEnv === 'development' ? error.detail : undefined,
        };
      }
    }
  );

  app.get(
    '/api/provision/status/:instance',
    { preHandler: [app.authenticateProvision] },
    async (request, reply) => {
      try {
        const instanceName = String(request.params.instance || '').trim();
        if (!instanceName) {
          reply.code(400);
          return { status: 'error', error: 'instance es obligatorio' };
        }

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
          request.provision.tenant,
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
        app.log.error({ err: error, detail: error.detail }, 'provision status failed');
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo consultar el estado',
        };
      }
    }
  );
}
