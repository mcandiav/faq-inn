import { randomBytes } from 'node:crypto';
import { createEvolutionClient } from './evolutionClient.js';
import { isFaqInnInstance } from './evolutionCleanup.js';
import { deleteTenantCollection, ensureTenantCollection } from './indexer.js';
import { normalizeObjectiveSlug } from './objectives/index.js';
import { hashPassword } from './password.js';

function validationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function generateTempPassword() {
  return randomBytes(9).toString('base64url');
}

const TENANT_BASE_SQL = `
  SELECT t.id, t.slug, t.name, t.email AS registration_email, t.status,
         t.created_at, t.updated_at,
         u.email AS client_email,
         a.slug AS agent_slug,
         tp.status AS provisioning_status,
         ev.instance_name AS whatsapp_instance,
         ev.status AS whatsapp_status,
         ev.phone_number AS whatsapp_phone,
         ev.connected_at AS whatsapp_connected_at
  FROM tenants t
  LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'client'
  LEFT JOIN agents a ON a.tenant_id = t.id
  LEFT JOIN tenant_provisioning tp ON tp.tenant_id = t.id
  LEFT JOIN LATERAL (
    SELECT instance_name, status, phone_number, connected_at
    FROM evolution_instances
    WHERE tenant_id = t.id
    ORDER BY id DESC
    LIMIT 1
  ) ev ON true
`;

export async function listAdminTenants(pool) {
  const [rows] = await pool.query(`${TENANT_BASE_SQL} ORDER BY t.created_at DESC`);
  return rows;
}

export async function getAdminTenantDetail(pool, tenantId) {
  const [rows] = await pool.query(`${TENANT_BASE_SQL} WHERE t.id = ?`, [tenantId]);
  const tenant = rows[0];
  if (!tenant) {
    throw validationError('Tenant no encontrado', 404);
  }

  const [faqCount] = await pool.query(
    `SELECT COUNT(*) AS total FROM faq_items WHERE tenant_id = ?`,
    [tenantId]
  );

  const [unansweredCount] = await pool.query(
    `SELECT COUNT(*) AS total FROM unanswered_questions WHERE tenant_id = ?`,
    [tenantId]
  );

  const [settingsRows] = await pool.query(
    `SELECT custom_sprompt, objetivo_slug FROM tenant_settings WHERE tenant_id = ? LIMIT 1`,
    [tenantId]
  );
  const customSprompt = String(settingsRows[0]?.custom_sprompt || '');
  const objetivoSlug = normalizeObjectiveSlug(settingsRows[0]?.objetivo_slug);

  return {
    ...tenant,
    objetivo_slug: objetivoSlug,
    faq_count: Number(faqCount[0]?.total || 0),
    unanswered_count: Number(unansweredCount[0]?.total || 0),
    custom_sprompt: customSprompt,
    custom_sprompt_configured: Boolean(customSprompt.trim()),
  };
}

export async function getAdminTenantCustomSprompt(pool, tenantId) {
  const tenant = await getAdminTenantDetail(pool, tenantId);
  return {
    tenant_id: tenant.id,
    slug: tenant.slug,
    custom_sprompt: tenant.custom_sprompt || '',
    custom_sprompt_configured: Boolean(tenant.custom_sprompt_configured),
  };
}

export async function updateAdminTenantCustomSprompt(pool, tenantId, input = {}) {
  const tenant = await getAdminTenantDetail(pool, tenantId);
  const customSprompt =
    input.custom_sprompt === undefined || input.custom_sprompt === null
      ? ''
      : String(input.custom_sprompt);

  const [settings] = await pool.query(
    `SELECT tenant_id FROM tenant_settings WHERE tenant_id = ?`,
    [tenantId]
  );
  if (!settings.length) {
    await pool.query(
      `INSERT INTO tenant_settings
       (tenant_id, vertical_slug, primary_language, postgres_database, custom_sprompt)
       VALUES (?, 'hotel', 'es', ?, ?)`,
      [tenantId, tenant.slug, customSprompt]
    );
  } else {
    await pool.query(
      `UPDATE tenant_settings
       SET custom_sprompt = ?, updated_at = NOW()
       WHERE tenant_id = ?`,
      [customSprompt, tenantId]
    );
  }

  return getAdminTenantCustomSprompt(pool, tenantId);
}

async function teardownEvolutionInstances(config, instanceNames, logger) {
  if (!config.evolutionApiBaseUrl || !config.evolutionApiKey) {
    return { skipped: true, deleted: [] };
  }

  const evolution = createEvolutionClient(config);
  const prefix = config.evolutionInstancePrefix || 'faqinn_';
  const deleted = [];

  for (const instanceName of instanceNames) {
    if (!instanceName || !isFaqInnInstance(instanceName, prefix)) {
      continue;
    }
    try {
      await evolution.logoutInstance(instanceName);
      await evolution.deleteInstance(instanceName);
      deleted.push(instanceName);
    } catch (error) {
      logger?.warn?.({ err: error, instanceName }, 'admin: evolution delete failed');
    }
  }

  return { skipped: false, deleted };
}

export async function deleteAdminTenant(pool, config, tenantId, confirmSlug, logger) {
  const slug = String(confirmSlug || '').trim();
  if (!slug) {
    throw validationError('confirm_slug es obligatorio');
  }

  const tenant = await getAdminTenantDetail(pool, tenantId);
  if (tenant.slug !== slug) {
    throw validationError('El slug de confirmación no coincide');
  }

  const [evoRows] = await pool.query(
    `SELECT instance_name FROM evolution_instances WHERE tenant_id = ?`,
    [tenantId]
  );
  const instanceNames = evoRows.map((row) => row.instance_name).filter(Boolean);

  const evolutionResult = await teardownEvolutionInstances(
    config,
    instanceNames,
    logger
  );

  let qdrantResult = { deleted: false };
  try {
    qdrantResult = await deleteTenantCollection(config, tenant.slug);
  } catch (error) {
    logger?.warn?.({ err: error, slug: tenant.slug }, 'admin: qdrant cleanup failed');
    qdrantResult = { deleted: false, error: error.message };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM users WHERE tenant_id = ?`, [tenantId]);
    await conn.query(`DELETE FROM tenants WHERE id = ?`, [tenantId]);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  return {
    tenant_id: tenantId,
    slug: tenant.slug,
    evolution: evolutionResult,
    qdrant: qdrantResult,
  };
}

async function ensureClientTenantBootstrap(pool, config, tenant, logger) {
  const tenantId = tenant.id;
  const slug = tenant.slug;

  const [agents] = await pool.query(
    `SELECT id FROM agents WHERE tenant_id = ? LIMIT 1`,
    [tenantId]
  );
  if (!agents.length) {
    await pool.query(
      `INSERT INTO agents (tenant_id, slug, name, channel, status)
       VALUES (?, 'principal', 'Agente', 'whatsapp', 'active')`,
      [tenantId]
    );
  }

  const [settings] = await pool.query(
    `SELECT tenant_id FROM tenant_settings WHERE tenant_id = ?`,
    [tenantId]
  );
  if (!settings.length) {
    await pool.query(
      `INSERT INTO tenant_settings
       (tenant_id, vertical_slug, primary_language, postgres_database)
       VALUES (?, 'hotel', 'es', ?)`,
      [tenantId, slug]
    );
  }

  try {
    await ensureTenantCollection(config, slug);
  } catch (error) {
    logger?.warn?.({ err: error, slug }, 'admin: qdrant bootstrap skipped');
  }
}

async function assertClientEmailAvailable(pool, clientEmail, excludeUserId = null) {
  const [existingEmail] = await pool.query(
    `SELECT id, role FROM users WHERE email = ?`,
    [clientEmail]
  );
  const row = existingEmail[0];
  if (!row || row.id === excludeUserId) {
    return;
  }
  if (row.role === 'admin_global') {
    throw validationError(
      `El email ${clientEmail} ya es admin global. Usa otro email para el login del tenant (por ejemplo un alias +tenant).`,
      409
    );
  }
  throw validationError('email ya registrado', 409);
}

export async function resetAdminTenantPassword(
  pool,
  config,
  tenantId,
  { password: passwordInput, email: emailInput } = {},
  logger
) {
  const tenant = await getAdminTenantDetail(pool, tenantId);
  const tempPassword =
    String(passwordInput || '').trim() || generateTempPassword();

  if (tempPassword.length < 8) {
    throw validationError('La contraseña debe tener al menos 8 caracteres');
  }

  const [userRows] = await pool.query(
    `SELECT id, email FROM users WHERE tenant_id = ? AND role = 'client' LIMIT 1`,
    [tenantId]
  );
  let user = userRows[0];
  let userCreated = false;
  let emailUpdated = false;

  if (!user) {
    const clientEmail = String(
      emailInput || tenant.registration_email || ''
    )
      .trim()
      .toLowerCase();

    if (!clientEmail || !clientEmail.includes('@')) {
      throw validationError(
        'Este tenant no tiene login. Indica un email en la solicitud (body.email).',
        400
      );
    }

    await assertClientEmailAvailable(pool, clientEmail);

    await ensureClientTenantBootstrap(pool, config, tenant, logger);

    const passwordHash = await hashPassword(tempPassword);
    const [, userMeta] = await pool.query(
      `INSERT INTO users (tenant_id, email, password_hash, role, status)
       VALUES (?, ?, ?, 'client', 'active')`,
      [tenantId, clientEmail, passwordHash]
    );

    user = { id: userMeta.insertId, email: clientEmail };
    userCreated = true;
  } else {
    const clientEmail = String(emailInput || user.email)
      .trim()
      .toLowerCase();

    if (!clientEmail || !clientEmail.includes('@')) {
      throw validationError('email inválido');
    }

    if (clientEmail !== user.email) {
      await assertClientEmailAvailable(pool, clientEmail, user.id);
      emailUpdated = true;
    }

    const passwordHash = await hashPassword(tempPassword);
    await pool.query(
      `UPDATE users SET email = ?, password_hash = ? WHERE id = ?`,
      [clientEmail, passwordHash, user.id]
    );
    user = { id: user.id, email: clientEmail };
  }

  return {
    tenant_id: tenantId,
    slug: tenant.slug,
    email: user.email,
    temporary_password: tempPassword,
    user_created: userCreated,
    email_updated: emailUpdated,
  };
}
