import { hashPassword, verifyPassword } from '../lib/password.js';

async function fetchUserByEmail(pool, email) {
  const [rows] = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.role, u.status, u.tenant_id,
            t.slug AS tenant_slug, t.name AS tenant_name
     FROM users u
     LEFT JOIN tenants t ON t.id = u.tenant_id
     WHERE u.email = ?`,
    [email]
  );

  return rows[0] || null;
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    tenant: row.tenant_id
      ? {
          id: row.tenant_id,
          slug: row.tenant_slug,
          name: row.tenant_name,
        }
      : null,
  };
}

export async function authRoutes(app, config) {
  const pool = app.db.pool;

  app.post('/api/auth/login', async (request, reply) => {
    const email = request.body?.email?.trim().toLowerCase();
    const password = request.body?.password || '';

    if (!email || !password) {
      reply.code(400);
      return { status: 'error', error: 'email y password son obligatorios' };
    }

    const user = await fetchUserByEmail(pool, email);

    if (!user || user.status !== 'active') {
      reply.code(401);
      return { status: 'error', error: 'Credenciales inválidas' };
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      reply.code(401);
      return { status: 'error', error: 'Credenciales inválidas' };
    }

    const token = await app.signToken(user.id);
    app.setAuthCookie(reply, token);

    return {
      status: 'ok',
      user: publicUser(user),
    };
  });

  app.post('/api/auth/logout', async (_request, reply) => {
    app.clearAuthCookie(reply);
    return { status: 'ok' };
  });

  app.get('/api/auth/me', { preHandler: [app.authenticate] }, async (request) => {
    const refreshed = await fetchUserByEmail(pool, request.user.email);
    return {
      status: 'ok',
      user: publicUser(refreshed || request.user),
    };
  });

  app.patch('/api/auth/profile', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user;
    const businessName = request.body?.business_name?.trim();
    const newEmailRaw = request.body?.email;
    const newEmail =
      newEmailRaw !== undefined ? newEmailRaw.trim().toLowerCase() : undefined;
    const currentPassword = request.body?.current_password || '';
    const newPassword = request.body?.new_password || '';

    const emailChanging =
      newEmail !== undefined && newEmail && newEmail !== user.email;
    const passwordChanging = Boolean(newPassword);

    if (emailChanging) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        reply.code(400);
        return { status: 'error', error: 'Email inválido' };
      }

      const taken = await fetchUserByEmail(pool, newEmail);
      if (taken && taken.id !== user.id) {
        reply.code(409);
        return { status: 'error', error: 'Ese email ya está en uso' };
      }
    }

    if (emailChanging || passwordChanging) {
      if (!currentPassword) {
        reply.code(400);
        return {
          status: 'error',
          error:
            'current_password es obligatorio para cambiar email o contraseña',
        };
      }

      const [rows] = await pool.query(
        'SELECT password_hash FROM users WHERE id = ?',
        [user.id]
      );
      const valid = await verifyPassword(currentPassword, rows[0].password_hash);

      if (!valid) {
        reply.code(400);
        return { status: 'error', error: 'Contraseña actual incorrecta' };
      }
    }

    if (user.role === 'client' && businessName !== undefined) {
      if (!user.tenant_id) {
        reply.code(400);
        return { status: 'error', error: 'Usuario sin negocio asignado' };
      }

      await pool.query('UPDATE tenants SET name = ? WHERE id = ?', [
        businessName,
        user.tenant_id,
      ]);
    }

    if (emailChanging) {
      await pool.query('UPDATE users SET email = ? WHERE id = ?', [
        newEmail,
        user.id,
      ]);
    }

    if (passwordChanging) {
      if (newPassword.length < 8) {
        reply.code(400);
        return {
          status: 'error',
          error: 'La nueva contraseña debe tener al menos 8 caracteres',
        };
      }

      const passwordHash = await hashPassword(newPassword);
      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [
        passwordHash,
        user.id,
      ]);
    }

    const lookupEmail = emailChanging ? newEmail : user.email;
    const refreshed = await fetchUserByEmail(pool, lookupEmail);
    return {
      status: 'ok',
      user: publicUser(refreshed),
    };
  });
}
