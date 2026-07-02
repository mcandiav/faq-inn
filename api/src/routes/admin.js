import { createAdminTenant } from '../lib/tenantService.js';

export async function adminRoutes(app, config) {
  const pool = app.db.pool;

  app.get(
    '/api/admin/tenants',
    { preHandler: [app.requireAdmin] },
    async () => {
      const [rows] = await pool.query(
        `SELECT t.id, t.slug, t.name, t.status, t.created_at,
                u.email AS client_email,
                a.slug AS agent_slug, a.name AS agent_name,
                tp.status AS provisioning_status
         FROM tenants t
         LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'client'
         LEFT JOIN agents a ON a.tenant_id = t.id
         LEFT JOIN tenant_provisioning tp ON tp.tenant_id = t.id
         ORDER BY t.created_at DESC`
      );

      return { status: 'ok', tenants: rows };
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
