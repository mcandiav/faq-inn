import { createAdminTenant } from '../lib/tenantService.js';
import {
  deleteAdminTenant,
  getAdminTenantDetail,
  listAdminTenants,
  resetAdminTenantPassword,
} from '../lib/adminService.js';

export async function adminRoutes(app, config) {
  const pool = app.db.pool;

  app.get(
    '/api/admin/tenants',
    { preHandler: [app.requireAdmin] },
    async () => {
      const tenants = await listAdminTenants(pool);
      return { status: 'ok', tenants };
    }
  );

  app.get(
    '/api/admin/tenants/:id',
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      try {
        const tenantId = Number(request.params.id);
        const tenant = await getAdminTenantDetail(pool, tenantId);
        return { status: 'ok', tenant };
      } catch (error) {
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo cargar el tenant',
        };
      }
    }
  );

  app.delete(
    '/api/admin/tenants/:id',
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      try {
        const tenantId = Number(request.params.id);
        const result = await deleteAdminTenant(
          pool,
          config,
          tenantId,
          request.body?.confirm_slug,
          app.log
        );
        return { status: 'ok', ...result };
      } catch (error) {
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo borrar el tenant',
        };
      }
    }
  );

  app.post(
    '/api/admin/tenants/:id/reset-password',
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      try {
        const tenantId = Number(request.params.id);
        const result = await resetAdminTenantPassword(
          pool,
          tenantId,
          request.body?.password
        );
        return { status: 'ok', ...result };
      } catch (error) {
        reply.code(error.statusCode || 500);
        return {
          status: 'error',
          error: error.message || 'No se pudo resetear la contraseña',
        };
      }
    }
  );

  app.post(
    '/api/admin/tenants',
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      try {
        const result = await createAdminTenant(pool, config, request.body || {}, {
          logger: app.log,
        });

        return {
          status: 'ok',
          tenant: {
            id: result.tenantId,
            slug: result.slug,
            email: result.email,
            agent_slug: result.agentSlug,
            qdrant_collection: result.qdrantCollection,
          },
        };
      } catch (error) {
        const status = error.statusCode || 500;
        reply.code(status);
        return {
          status: 'error',
          error: error.message || 'No se pudo crear el tenant',
        };
      }
    }
  );
}
