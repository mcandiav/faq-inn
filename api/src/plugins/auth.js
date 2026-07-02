import { getPool } from '../db.js';

async function loadUser(pool, userId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.email, u.role, u.status, u.tenant_id,
            t.slug AS tenant_slug, t.name AS tenant_name
     FROM users u
     LEFT JOIN tenants t ON t.id = u.tenant_id
     WHERE u.id = ?`,
    [userId]
  );

  return rows[0] || null;
}

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

export async function registerAuth(app, config) {
  const pool = () => app.db.pool;

  app.decorate('authenticate', async (request, reply) => {
    const cookies = parseCookies(request.headers.cookie);
    const token = cookies.faq_inn_token || cookies.dfaq_token;

    if (!token) {
      return reply.code(401).send({ status: 'error', error: 'No autenticado' });
    }

    try {
      const payload = await app.jwt.verify(token);
      const user = await loadUser(pool(), payload.sub);

      if (!user || user.status !== 'active') {
        return reply.code(401).send({ status: 'error', error: 'Usuario no válido' });
      }

      request.user = user;
    } catch {
      return reply.code(401).send({ status: 'error', error: 'Sesión inválida' });
    }
  });

  app.decorate('requireAdmin', async (request, reply) => {
    await app.authenticate(request, reply);
    if (reply.sent) {
      return;
    }

    if (request.user.role !== 'admin_global') {
      return reply
        .code(403)
        .send({ status: 'error', error: 'Solo administrador global' });
    }
  });

  app.decorate('signToken', async (userId) => {
    return app.jwt.sign({ sub: String(userId) }, { expiresIn: '7d' });
  });

  app.decorate('setAuthCookie', (reply, token) => {
    const secure = config.appEnv === 'production';
    const parts = [
      `faq_inn_token=${encodeURIComponent(token)}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=604800',
    ];

    if (secure) {
      parts.push('Secure');
    }

    reply.header('Set-Cookie', parts.join('; '));
  });

  app.decorate('clearAuthCookie', (reply) => {
    const secure = config.appEnv === 'production';
    const parts = [
      'faq_inn_token=',
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=0',
    ];

    if (secure) {
      parts.push('Secure');
    }

    reply.header('Set-Cookie', parts.join('; '));
  });
}
