import {
  createFaqCategory,
  deleteFaqCategory,
  listFaqCategories,
  updateFaqCategory,
} from '../lib/categoryService.js';

function clientTenantId(user) {
  return user?.role === 'client' ? user.tenant_id : null;
}

export async function faqCategoryRoutes(app) {
  const pool = app.db.pool;

  app.get('/api/faq-categories', { preHandler: [app.authenticate] }, async (request, reply) => {
    const tenantId = clientTenantId(request.user);
    if (!tenantId) {
      reply.code(403);
      return { status: 'error', error: 'Solo clientes pueden gestionar categorías' };
    }

    const includeInactive = String(request.query?.include_inactive || '').toLowerCase() === 'true';
    const categories = await listFaqCategories(pool, tenantId, { includeInactive });
    return { status: 'ok', categories };
  });

  app.post('/api/faq-categories', { preHandler: [app.authenticate] }, async (request, reply) => {
    const tenantId = clientTenantId(request.user);
    if (!tenantId) {
      reply.code(403);
      return { status: 'error', error: 'Solo clientes pueden crear categorías' };
    }

    try {
      const category = await createFaqCategory(pool, tenantId, request.body || {});
      return { status: 'ok', category };
    } catch (error) {
      reply.code(error.statusCode || 500);
      return { status: 'error', error: error.message || 'No se pudo crear la categoría' };
    }
  });

  app.patch('/api/faq-categories/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const tenantId = clientTenantId(request.user);
    if (!tenantId) {
      reply.code(403);
      return { status: 'error', error: 'Solo clientes pueden editar categorías' };
    }

    try {
      const categoryId = Number(request.params.id);
      const category = await updateFaqCategory(pool, tenantId, categoryId, request.body || {});
      return { status: 'ok', category };
    } catch (error) {
      reply.code(error.statusCode || 500);
      return { status: 'error', error: error.message || 'No se pudo actualizar la categoría' };
    }
  });

  app.delete('/api/faq-categories/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const tenantId = clientTenantId(request.user);
    if (!tenantId) {
      reply.code(403);
      return { status: 'error', error: 'Solo clientes pueden eliminar categorías' };
    }

    try {
      const categoryId = Number(request.params.id);
      const result = await deleteFaqCategory(pool, tenantId, categoryId);
      return { status: 'ok', ...result };
    } catch (error) {
      reply.code(error.statusCode || 500);
      return { status: 'error', error: error.message || 'No se pudo eliminar la categoría' };
    }
  });
}
