import {
  ensureFaqCategory,
  listFaqCategories,
  seedDefaultFaqCategories,
} from '../lib/faqCategories.js';

function requireClient(request, reply) {
  if (request.user.role !== 'client' || !request.user.tenant_id) {
    reply.code(403);
    return false;
  }
  return true;
}

/** Paso 1: solo lectura. CRUD de categorías = paso 3. */
export async function categoryRoutes(app) {
  const pool = app.db.pool;

  app.get('/api/faq-categories', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!requireClient(request, reply)) {
      return { status: 'error', error: 'Solo clientes con negocio' };
    }

    const includeInactive =
      String(request.query?.include_inactive || '').toLowerCase() === 'true' ||
      String(request.query?.include_inactive || '') === '1';

    let categories = await listFaqCategories(pool, request.user.tenant_id, {
      includeInactive,
    });

    if (!categories.length) {
      await seedDefaultFaqCategories(pool, request.user.tenant_id);
      categories = await listFaqCategories(pool, request.user.tenant_id, {
        includeInactive,
      });
    }

    return { status: 'ok', categories };
  });
}
