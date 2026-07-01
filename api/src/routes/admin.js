import { hashPassword } from '../lib/password.js';
import { ensureTenantCollection } from '../lib/indexer.js';

export async function adminRoutes(app, config) {
  const pool = app.db.pool;

  app.get(
    '/api/admin/tenants',
    { preHandler: [app.requireAdmin] },
    async () => {
      const [rows] = await pool.query(
        `SELECT t.id, t.slug, t.name, t.status, t.created_at,
                u.email AS client_email,
                a.slug AS agent_slug, a.name AS agent_name
         FROM tenants t
         LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'client'
         LEFT JOIN agents a ON a.tenant_id = t.id
         ORDER BY t.created_at DESC`
      );

      return { status: 'ok', tenants: rows };
    }
  );

  app.post(
    '/api/admin/tenants',
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const slug = request.body?.slug?.trim().toLowerCase();
      const email = request.body?.email?.trim().toLowerCase();
      const password = request.body?.password || '';
      const agentSlug =
        request.body?.agent_slug?.trim().toLowerCase() || 'principal';
      const agentName = request.body?.agent_name?.trim() || 'Agente principal';

      if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
        reply.code(400);
        return {
          status: 'error',
          error: 'slug inválido (solo a-z, 0-9, _ y -)',
        };
      }

      if (!email || !email.includes('@')) {
        reply.code(400);
        return { status: 'error', error: 'email inválido' };
      }

      if (password.length < 8) {
        reply.code(400);
        return {
          status: 'error',
          error: 'password debe tener al menos 8 caracteres',
        };
      }

      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const [existingSlug] = await connection.query(
          'SELECT id FROM tenants WHERE slug = ?',
          [slug]
        );
        if (existingSlug.length > 0) {
          await connection.rollback();
          reply.code(409);
          return { status: 'error', error: 'slug ya existe' };
        }

        const [existingEmail] = await connection.query(
          'SELECT id FROM users WHERE email = ?',
          [email]
        );
        if (existingEmail.length > 0) {
          await connection.rollback();
          reply.code(409);
          return { status: 'error', error: 'email ya registrado' };
        }

        const [tenantResult] = await connection.query(
          `INSERT INTO tenants (slug, name, status) VALUES (?, '', 'active')`,
          [slug]
        );
        const tenantId = tenantResult.insertId;

        const passwordHash = await hashPassword(password);
        await connection.query(
          `INSERT INTO users (tenant_id, email, password_hash, role, status)
           VALUES (?, ?, ?, 'client', 'active')`,
          [tenantId, email, passwordHash]
        );

        await connection.query(
          `INSERT INTO agents (tenant_id, slug, name, channel, status)
           VALUES (?, ?, ?, 'default', 'active')`,
          [tenantId, agentSlug, agentName]
        );

        await connection.commit();

        try {
          await ensureTenantCollection(config, slug);
        } catch (error) {
          app.log.warn({ err: error }, 'Colección Qdrant no creada al alta');
        }

        return {
          status: 'ok',
          tenant: {
            id: tenantId,
            slug,
            email,
            agent_slug: agentSlug,
            qdrant_collection: config.qdrantCollectionTemplate.replace(
              '<tenant_slug>',
              slug
            ),
          },
        };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }
  );
}
