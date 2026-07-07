import { createHotelTenant } from '../lib/tenantService.js';
import { normalizeTenantSlug } from '../lib/tenantSlug.js';
import {
  completeOnboarding,
  getOnboardingStatus,
  updateOnboardingSetup,
} from '../lib/onboardingService.js';
import { OBJECTIVES } from '../lib/objectives/index.js';

function publicUserFromTenant(result) {
  return {
    id: result.userId,
    email: result.email,
    role: 'client',
    tenant: {
      id: result.tenantId,
      slug: result.slug,
      name: result.businessName,
    },
  };
}

function requireClient(request, reply) {
  if (request.user.role !== 'client' || !request.user.tenant_id) {
    reply.code(403);
    return false;
  }
  return true;
}

export async function onboardingRoutes(app, config) {
  const pool = app.db.pool;

  app.get('/api/onboarding/objectives', async () => {
    return {
      status: 'ok',
      objectives: OBJECTIVES.map((o) => ({
        slug: o.slug,
        name: o.name,
        description: o.description,
        examples: o.examples,
        motor: o.motor,
        needs_destination_url: o.needs_destination_url,
        needs_booking_motor: o.needs_booking_motor,
      })),
    };
  });

  app.get(
    '/api/onboarding/status',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!requireClient(request, reply)) {
        return { status: 'error', error: 'Solo clientes con negocio' };
      }
      try {
        const onboarding = await getOnboardingStatus(
          pool,
          config,
          request.user.id,
          request.user.tenant_id
        );
        return { status: 'ok', onboarding };
      } catch (error) {
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo cargar el onboarding',
        };
      }
    }
  );

  app.patch(
    '/api/onboarding/setup',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!requireClient(request, reply)) {
        return { status: 'error', error: 'Solo clientes con negocio' };
      }
      try {
        const onboarding = await updateOnboardingSetup(
          pool,
          config,
          request.user.id,
          request.user.tenant_id,
          request.body || {}
        );
        return { status: 'ok', onboarding };
      } catch (error) {
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo guardar el onboarding',
        };
      }
    }
  );

  app.post(
    '/api/onboarding/complete',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!requireClient(request, reply)) {
        return { status: 'error', error: 'Solo clientes con negocio' };
      }
      try {
        const onboarding = await completeOnboarding(
          pool,
          config,
          request.user.id,
          request.user.tenant_id,
          request.body || {}
        );
        return { status: 'ok', onboarding };
      } catch (error) {
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo completar el onboarding',
        };
      }
    }
  );

  /** @deprecated MVP hotel legacy */
  app.get('/api/onboarding/verticals', async () => {
    return {
      status: 'ok',
      verticals: [
        {
          slug: 'hotel',
          name: 'Hotel v1',
          description: 'Hoteles, hostels, posadas y alojamientos',
        },
      ],
    };
  });

  app.post('/api/onboarding/hotel', async (request, reply) => {
    try {
      const result = await createHotelTenant(pool, config, request.body || {}, {
        logger: app.log,
      });

      const token = await app.signToken(result.userId);
      app.setAuthCookie(reply, token);

      return {
        status: 'ok',
        user: publicUserFromTenant(result),
        tenant: {
          id: result.tenantId,
          slug: result.slug,
          name: result.businessName,
          vertical: 'hotel',
          postgres_database: result.slug,
          qdrant_collection: result.qdrantCollection,
        },
        provisioning: {
          status: result.provisioningStatus,
          pending: ['evolution_api', 'n8n_workflow', 'whatsapp_qr'],
        },
        message:
          'Hotel creado. Ya puedes cargar FAQs. WhatsApp y n8n se activarán en una próxima etapa.',
      };
    } catch (error) {
      const status = error.statusCode || 500;
      reply.code(status);
      return {
        status: 'error',
        error: error.message || 'No se pudo completar el registro',
      };
    }
  });

  app.get('/api/onboarding/slug-preview', async (request) => {
    const name = request.query?.name || '';
    const slug = normalizeTenantSlug(name);
    return { status: 'ok', slug };
  });
}
