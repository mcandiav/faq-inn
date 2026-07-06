import crypto from 'node:crypto';

function randomCode(length = 8) {
  return crypto.randomBytes(9).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, length);
}

export async function createBookingShortLink(pool, targetUrl, tenantDbId, ttlDays = 90) {
  const url = String(targetUrl || '').trim();
  if (!url) {
    throw new Error('URL de destino vacía');
  }

  const tenantId = tenantDbId ? Number(tenantDbId) : null;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = randomCode();
    try {
      await pool.query(
        `INSERT INTO booking_short_links (code, target_url, tenant_id, expires_at)
         VALUES (?, ?, ?, ?)`,
        [code, url, tenantId, expiresAt.toISOString()]
      );
      return code;
    } catch (error) {
      if (error.code === '23505' && attempt < 5) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('No se pudo generar código de link corto');
}

export async function resolveBookingShortLink(pool, code) {
  const normalized = String(code || '').trim();
  if (!/^[a-zA-Z0-9_-]{4,16}$/.test(normalized)) {
    return null;
  }

  const [rows] = await pool.query(
    `SELECT target_url
     FROM booking_short_links
     WHERE code = ? AND expires_at > NOW()
     LIMIT 1`,
    [normalized]
  );

  return rows[0]?.target_url || null;
}

export function buildPublicShortUrl(config, code) {
  const base = String(config.appUrl || '').replace(/\/$/, '');
  return `${base}/api/r/${code}`;
}
