import {
  deactivateFaqCategory,
  ensureFaqCategory,
  listFaqCategories,
  seedDefaultFaqCategories,
  setFaqCategoryActive,
  updateFaqCategoryName,
} from '../lib/faqCategories.js';

function requireClient(request, reply) {
  if (request.user.role !== 'client' || !request.user.tenant_id) {
    reply.code(403);
    return false;
  }
  return true;
}

function parseRouteCategoryId(raw, reply) {
  const categoryId = Number(raw);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    reply.code(400);
    return null;
  }
  return categoryId;
}

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

  app.post('/api/faq-categories', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!requireClient(request, reply)) {
      return { status: 'error', error: 'Solo clientes con negocio' };
    }

    const name = request.body?.name?.trim() || '';
    if (!name) {
      reply.code(400);
      return { status: 'error', error: 'name es obligatorio' };
    }

    try {
      const normalized = await ensureFaqCategory(pool, request.user.tenant_id, name);
      const categories = await listFaqCategories(pool, request.user.tenant_id, {
        includeInactive: true,
      });
      const category = categories.find((item) => item.name === normalized) || null;
      return { status: 'ok', category };
    } catch (error) {
      reply.code(error.statusCode || 500);
      return { status: 'error', error: error.message };
    }
  });

  app.patch('/api/faq-categories/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!requireClient(request, reply)) {
      return { status: 'error', error: 'Solo clientes con negocio' };
    }

    const categoryId = parseRouteCategoryId(request.params.id, reply);
    if (!categoryId) {
      return { status: 'error', error: 'id inválido' };
    }

    const body = request.body || {};
    try {
      let category = null;

      if (body.name !== undefined) {
        category = await updateFaqCategoryName(
          pool,
          request.user.tenant_id,
          categoryId,
          body.name
        );
      }

      if (body.active !== undefined) {
        category = await setFaqCategoryActive(
          pool,
          request.user.tenant_id,
          categoryId,
          body.active
        );
      }

      if (!category) {
        reply.code(400);
        return { status: 'error', error: 'No hay cambios para guardar' };
      }

      return { status: 'ok', category };
    } catch (error) {
      reply.code(error.statusCode || 500);
      return { status: 'error', error: error.message };
    }
  });

  app.delete('/api/faq-categories/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!requireClient(request, reply)) {
      return { status: 'error', error: 'Solo clientes con negocio' };
    }

    const categoryId = parseRouteCategoryId(request.params.id, reply);
    if (!categoryId) {
      return { status: 'error', error: 'id inválido' };
    }

    try {
      const category = await deactivateFaqCategory(
        pool,
        request.user.tenant_id,
        categoryId
      );
      return { status: 'ok', category };
    } catch (error) {
      reply.code(error.statusCode || 500);
      return { status: 'error', error: error.message };
    }
  });
}
