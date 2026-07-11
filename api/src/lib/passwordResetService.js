import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { hashPassword } from './password.js';
import { createMailProvider } from './mail/zohoSmtpMailProvider.js';

export const FORGOT_PASSWORD_PUBLIC_MESSAGE =
  'Si existe una cuenta asociada a este correo, recibirás instrucciones para restablecer tu contraseña.';

const rateBuckets = new Map();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

function clientIp(request) {
  const forwarded = request.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim().slice(0, 64);
  }
  return String(request.ip || '').slice(0, 64) || null;
}

function clientUserAgent(request) {
  return String(request.headers?.['user-agent'] || '').slice(0, 512) || null;
}

function pruneRateBucket(key, windowMs) {
  const now = Date.now();
  const hits = (rateBuckets.get(key) || []).filter((ts) => now - ts < windowMs);
  if (hits.length) {
    rateBuckets.set(key, hits);
  } else {
    rateBuckets.delete(key);
  }
  return hits;
}

function assertRateLimit({ email, ip }) {
  const windowMs = 60 * 60 * 1000;
  const emailKey = `email:${email}`;
  const ipKey = `ip:${ip || 'unknown'}`;
  const emailHits = pruneRateBucket(emailKey, windowMs);
  const ipHits = pruneRateBucket(ipKey, windowMs);

  if (emailHits.length >= 5 || ipHits.length >= 20) {
    const error = new Error('Demasiadas solicitudes. Probá más tarde.');
    error.statusCode = 429;
    throw error;
  }

  const now = Date.now();
  emailHits.push(now);
  ipHits.push(now);
  rateBuckets.set(emailKey, emailHits);
  rateBuckets.set(ipKey, ipHits);
}

function buildResetUrl(config, token) {
  const base = String(config.appPublicUrl || config.appUrl || '')
    .replace(/\/+$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

function ttlMinutes(config) {
  const raw = Number(config.passwordResetTtlMinutes || 30);
  return Number.isFinite(raw) && raw > 0 ? raw : 30;
}

export async function requestPasswordReset(pool, config, request, emailRaw) {
  const email = normalizeEmail(emailRaw);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error('email inválido');
    error.statusCode = 400;
    throw error;
  }

  const ip = clientIp(request);
  assertRateLimit({ email, ip });

  const [users] = await pool.query(
    `SELECT id, email, status
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );
  const user = users[0];

  if (!user || user.status !== 'active') {
    return { status: 'ok', message: FORGOT_PASSWORD_PUBLIC_MESSAGE };
  }

  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const minutes = ttlMinutes(config);
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

  await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = COALESCE(used_at, NOW())
     WHERE user_id = ? AND used_at IS NULL`,
    [user.id]
  );

  await pool.query(
    `INSERT INTO password_reset_tokens
      (user_id, token_hash, expires_at, requested_ip, user_agent)
     VALUES (?, ?, ?, ?, ?)`,
    [user.id, tokenHash, expiresAt.toISOString(), ip, clientUserAgent(request)]
  );

  const mail = createMailProvider(config);
  const resetUrl = buildResetUrl(config, token);

  try {
    await mail.sendPasswordReset({
      to: user.email,
      resetUrl,
      expiresAt,
    });
  } catch (error) {
    await pool.query(
      `DELETE FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL`,
      [tokenHash]
    );
    if (typeof console?.error === 'function') {
      console.error(
        '[faq-inn-api] Fallo envío forgot-password (detalle no expuesto al cliente):',
        error.message
      );
    }
    // Misma respuesta pública: no revelar si el correo existe ni el fallo SMTP.
  }

  return { status: 'ok', message: FORGOT_PASSWORD_PUBLIC_MESSAGE };
}

export async function resetPasswordWithToken(pool, config, tokenRaw, newPassword) {
  const token = String(tokenRaw || '').trim();
  if (!token) {
    const error = new Error('token es obligatorio');
    error.statusCode = 400;
    throw error;
  }

  if (!newPassword || newPassword.length < 8) {
    const error = new Error(
      'La nueva contraseña debe tener al menos 8 caracteres'
    );
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = hashToken(token);
  const [rows] = await pool.query(
    `SELECT t.id, t.user_id, t.expires_at, t.used_at, u.email, u.status
     FROM password_reset_tokens t
     INNER JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = ?
     LIMIT 1`,
    [tokenHash]
  );
  const row = rows[0];

  if (!row || row.status !== 'active') {
    const error = new Error('Enlace inválido o expirado');
    error.statusCode = 400;
    throw error;
  }

  if (row.used_at) {
    const error = new Error('Este enlace ya fue utilizado');
    error.statusCode = 400;
    throw error;
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    const error = new Error('Enlace inválido o expirado');
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await hashPassword(newPassword);
  const changedAt = new Date();

  await pool.query(
    `UPDATE users
     SET password_hash = ?, password_changed_at = ?, updated_at = NOW()
     WHERE id = ?`,
    [passwordHash, changedAt.toISOString(), row.user_id]
  );

  await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE id = ?`,
    [row.id]
  );

  await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = COALESCE(used_at, NOW())
     WHERE user_id = ? AND used_at IS NULL`,
    [row.user_id]
  );

  const mail = createMailProvider(config);
  try {
    await mail.sendPasswordChanged({
      to: row.email,
      changedAt,
    });
  } catch (error) {
    // La contraseña ya cambió; el mail de confirmación es best-effort.
    if (typeof console?.error === 'function') {
      console.error(
        '[faq-inn-api] No se pudo enviar confirmación de cambio de contraseña:',
        error.message
      );
    }
  }

  return { status: 'ok' };
}

/** Compara iat del JWT con password_changed_at del usuario. */
export function isJwtIssuedBeforePasswordChange(payload, passwordChangedAt) {
  if (!passwordChangedAt) {
    return false;
  }
  const changedMs = new Date(passwordChangedAt).getTime();
  if (!Number.isFinite(changedMs)) {
    return false;
  }
  const iatSec = Number(payload?.iat);
  if (!Number.isFinite(iatSec)) {
    return true;
  }
  // Holgura de 1s por redondeo de iat.
  return iatSec * 1000 < changedMs - 1000;
}

export function tokensMatch(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}
