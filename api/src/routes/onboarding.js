import { createHotelTenant } from '../lib/tenantService.js';
import { normalizeTenantSlug } from '../lib/tenantSlug.js';

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

export async function onboardingRoutes(app, config) {
  const pool = app.db.pool;

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
