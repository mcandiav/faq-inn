import { isValidTenantSlug, normalizeTenantSlug } from './tenantSlug.js';
import { createEvolutionClient } from './evolutionClient.js';

function validationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function allocateUniqueSlug(pool, commercialName) {
  const base =
    normalizeTenantSlug(commercialName) ||
    `hotel-${Date.now().toString(36)}`;

  let candidate = base.slice(0, 48);
  let attempt = 0;

  while (attempt < 20) {
    if (!isValidTenantSlug(candidate)) {
      candidate = `hotel-${Date.now().toString(36)}`.slice(0, 48);
    }

    const [rows] = await pool.query('SELECT id FROM tenants WHERE slug = ?', [
      candidate,
    ]);
    if (rows.length === 0) {
      return candidate;
    }

    attempt += 1;
    candidate = `${base.slice(0, 40)}-${attempt}`;
  }

  throw validationError('No se pudo generar un tenant_slug único', 500);
}

export async function registerProvisionTenant(pool, input) {
  const commercialName = input.commercial_name?.trim();
  const email = input.email?.trim().toLowerCase();

  if (!commercialName || commercialName.length < 2) {
    throw validationError('nombre comercial es obligatorio');
  }

  if (!email || !email.includes('@')) {
    throw validationError('email inválido');
  }

  const slug = await allocateUniqueSlug(pool, commercialName);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [, meta] = await connection.query(
      `INSERT INTO tenants (slug, name, email, status)
       VALUES (?, ?, ?, 'draft')`,
      [slug, commercialName, email]
    );

    const tenantId = meta.insertId;
    if (!tenantId) {
      throw validationError('No se pudo crear el tenant', 500);
    }

    await connection.query(
      `INSERT INTO tenant_provisioning (tenant_id, status, last_error)
       VALUES (?, 'draft', '')`,
      [tenantId]
    );

    await connection.commit();

    return {
      tenantId,
      slug,
      commercialName,
      email,
      status: 'draft',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function markInstanceDisconnected(pool, tenantId, instanceRow, evolutionState) {
  const reason = `evolution:${String(evolutionState || 'disconnected')}`.slice(0, 500);
  if (instanceRow?.id) {
    await pool.query(
      `UPDATE evolution_instances
       SET status = 'disconnected',
           last_error = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [reason, instanceRow.id]
    );
  }
  await pool.query(
    `UPDATE tenants
     SET status = CASE WHEN status = 'connected' THEN 'disconnected' ELSE status END,
         updated_at = NOW()
     WHERE id = ?`,
    [tenantId]
  );
  await pool.query(
    `UPDATE tenant_provisioning
     SET last_error = 'whatsapp_disconnected',
         updated_at = NOW()
     WHERE tenant_id = ?`,
    [tenantId]
  );
}

/**
 * Provisioner: si PostgreSQL dice connected pero Evolution no, actualiza a disconnected.
 * No usar en runtime n8n (path conversacional).
 */
export async function syncWhatsappConnectionStatus(pool, config, tenantId, instanceName) {
  const name = String(instanceName || '').trim();
  if (!name) {
    return { status: 'none', changed: false };
  }

  const [rows] = await pool.query(
    `SELECT id, instance_name, status, phone_number
     FROM evolution_instances
     WHERE tenant_id = ? AND instance_name = ?
     LIMIT 1`,
    [tenantId, name]
  );
  const row = rows[0];
  if (!row || row.status !== 'connected') {
    return { status: row?.status || 'none', changed: false };
  }

  if (!config.evolutionApiBaseUrl || !config.evolutionApiKey) {
    return { status: 'connected', changed: false };
  }

  const evolution = createEvolutionClient(config);
  let connection;
  try {
    connection = await evolution.getConnectionState(name);
  } catch {
    return { status: 'connected', changed: false, evolutionUnreachable: true };
  }

  if (connection.connected) {
    return {
      status: 'connected',
      changed: false,
      evolutionState: connection.state,
    };
  }

  await markInstanceDisconnected(pool, tenantId, row, connection.state);
  return {
    status: 'disconnected',
    changed: true,
    evolutionState: connection.state,
  };
}

/**
 * Autoservicio: el cliente desconecta su WhatsApp desde Mi cuenta.
 * Hace logout en Evolution (best-effort, solo instancias faqinn_) y marca
 * la instancia como disconnected en la base. No borra la instancia: permite
 * reconectar/reescanear el QR después.
 */
export async function disconnectWhatsapp(pool, config, tenant) {
  const [rows] = await pool.query(
    `SELECT id, instance_name, status, phone_number
     FROM evolution_instances
     WHERE tenant_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [tenant.id]
  );
  const row = rows[0];
  if (!row || !row.instance_name) {
    return { status: 'none', instanceName: '' };
  }

  const prefix = (config.evolutionInstancePrefix || 'faqinn_').replace(/_+$/, '_');
  if (!row.instance_name.startsWith(prefix)) {
    throw validationError('instance_name inválido', 400);
  }

  if (config.evolutionApiBaseUrl && config.evolutionApiKey) {
    const evolution = createEvolutionClient(config);
    try {
      await evolution.logoutInstance(row.instance_name);
    } catch {
      /* best-effort: igual marcamos disconnected en la base */
    }
  }

  await markInstanceDisconnected(pool, tenant.id, row, 'manual_disconnect');

  return { status: 'disconnected', instanceName: row.instance_name };
}

async function markTenantConnected(pool, tenant, instanceRow, instanceName, phoneNumber) {
  if (instanceRow?.id) {
    await pool.query(
      `UPDATE evolution_instances
       SET status = 'connected',
           phone_number = ?,
           last_qr_base64 = '',
           connected_at = COALESCE(connected_at, NOW()),
           last_error = '',
           updated_at = NOW()
       WHERE id = ?`,
      [phoneNumber || '', instanceRow.id]
    );
  } else {
    await pool.query(
      `INSERT INTO evolution_instances
       (tenant_id, instance_name, status, phone_number, connected_at)
       VALUES (?, ?, 'connected', ?, NOW())`,
      [tenant.id, instanceName, phoneNumber || '']
    );
  }

  await pool.query(
    `UPDATE tenants SET status = 'connected', updated_at = NOW() WHERE id = ?`,
    [tenant.id]
  );
  await pool.query(
    `UPDATE tenant_provisioning
     SET status = 'connected', last_error = '', updated_at = NOW()
     WHERE tenant_id = ?`,
    [tenant.id]
  );
}

export async function startWhatsappProvision(pool, config, tenant) {
  const evolution = createEvolutionClient(config);
  const instanceName = evolution.buildInstanceName(tenant.slug);

  const [existing] = await pool.query(
    `SELECT id, instance_name, status, phone_number, last_qr_base64
     FROM evolution_instances
     WHERE tenant_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [tenant.id]
  );

  if (existing[0]?.status === 'connected' && existing[0].phone_number) {
    const synced = await syncWhatsappConnectionStatus(
      pool,
      config,
      tenant.id,
      existing[0].instance_name
    );
    if (synced.status === 'connected') {
      return {
        instanceName: existing[0].instance_name,
        status: 'connected',
        phoneNumber: existing[0].phone_number,
        qrBase64: null,
        message: 'WhatsApp ya está vinculado.',
      };
    }
  }

  // Si Evolution ya está open (p. ej. se vinculó y se cerró la pestaña),
  // sincronizar DB, aplicar webhook/settings y NO borrar la instancia.
  try {
    const connection = await evolution.getConnectionState(instanceName);
    if (connection.connected) {
      const phoneNumber =
        (await evolution.resolvePhoneNumber(instanceName)) ||
        existing[0]?.phone_number ||
        '';
      await markTenantConnected(
        pool,
        tenant,
        existing[0],
        instanceName,
        phoneNumber
      );
      const integrations = await evolution.ensureIntegrations(instanceName);
      return {
        instanceName,
        status: 'connected',
        phoneNumber,
        qrBase64: null,
        webhookUrl: config.evolutionWebhookUrl || '',
        integrations,
        message: 'WhatsApp vinculado correctamente.',
      };
    }
  } catch {
    /* instancia puede no existir aún */
  }

  try {
    // Sesión limpia solo si aún no está conectada.
    const { qrBase64, webhookUrl } =
      await evolution.createFreshQrSession(instanceName);

    if (existing[0]) {
      await pool.query(
        `UPDATE evolution_instances
         SET instance_name = ?,
             status = 'qr_pending',
             phone_number = '',
             last_qr_base64 = ?,
             webhook_url = ?,
             last_qr_at = NOW(),
             connected_at = NULL,
             last_error = '',
             updated_at = NOW()
         WHERE id = ?`,
        [instanceName, qrBase64, webhookUrl || '', existing[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO evolution_instances
         (tenant_id, instance_name, status, last_qr_base64, webhook_url, last_qr_at)
         VALUES (?, ?, 'qr_pending', ?, ?, NOW())`,
        [tenant.id, instanceName, qrBase64, webhookUrl || '']
      );
    }

    await pool.query(
      `UPDATE tenants SET status = 'qr_pending', updated_at = NOW() WHERE id = ?`,
      [tenant.id]
    );
    await pool.query(
      `UPDATE tenant_provisioning
       SET status = 'waiting_qr_scan', last_error = '', updated_at = NOW()
       WHERE tenant_id = ?`,
      [tenant.id]
    );

    return {
      instanceName,
      status: 'qr_pending',
      phoneNumber: null,
      qrBase64,
      webhookUrl: webhookUrl || '',
      message:
        'Escanea el QR una sola vez (válido ~40s). Si falla, pulsa Actualizar QR.',
    };
  } catch (error) {
    const message = error.message || 'Error al crear la conexión WhatsApp Web';
    await pool.query(
      `UPDATE tenants SET status = 'error', updated_at = NOW() WHERE id = ?`,
      [tenant.id]
    );
    await pool.query(
      `UPDATE tenant_provisioning
       SET status = 'error', last_error = ?, updated_at = NOW()
       WHERE tenant_id = ?`,
      [message.slice(0, 1000), tenant.id]
    );

    if (existing[0]) {
      await pool.query(
        `UPDATE evolution_instances
         SET status = 'error', last_error = ?, updated_at = NOW()
         WHERE id = ?`,
        [message.slice(0, 1000), existing[0].id]
      );
    }

    throw error;
  }
}

export async function getProvisionStatus(pool, config, tenant, instanceName) {
  const [rows] = await pool.query(
    `SELECT id, instance_name, status, phone_number, last_qr_base64, last_qr_at, connected_at
     FROM evolution_instances
     WHERE tenant_id = ? AND instance_name = ?
     LIMIT 1`,
    [tenant.id, instanceName]
  );

  const row = rows[0];
  if (!row) {
    throw validationError('instancia no encontrada', 404);
  }

  if (row.status === 'connected' && row.phone_number) {
    const synced = await syncWhatsappConnectionStatus(
      pool,
      config,
      tenant.id,
      instanceName
    );
    if (synced.status === 'connected') {
      return {
        instanceName: row.instance_name,
        status: 'connected',
        phoneNumber: row.phone_number,
        qrBase64: null,
        tenantStatus: 'connected',
        evolutionState: synced.evolutionState || null,
      };
    }
    return {
      instanceName: row.instance_name,
      status: 'disconnected',
      phoneNumber: row.phone_number,
      qrBase64: null,
      tenantStatus: 'disconnected',
      evolutionState: synced.evolutionState || null,
      message:
        'WhatsApp fue desvinculado desde el teléfono. Pulsa Reconectar para escanear un nuevo QR.',
    };
  }

  if (row.status === 'disconnected') {
    return {
      instanceName: row.instance_name,
      status: 'disconnected',
      phoneNumber: row.phone_number || null,
      qrBase64: null,
      tenantStatus: 'disconnected',
      message:
        'WhatsApp fue desvinculado desde el teléfono. Pulsa Reconectar para escanear un nuevo QR.',
    };
  }

  const evolution = createEvolutionClient(config);
  let connection;
  try {
    connection = await evolution.getConnectionState(instanceName);
  } catch (error) {
    return {
      instanceName,
      status: 'qr_pending',
      phoneNumber: null,
      qrBase64: row.last_qr_base64 || null,
      tenantStatus: 'qr_pending',
      evolutionState: null,
      message:
        error.message ||
        'No se pudo consultar WhatsApp Web. Pulsa Actualizar QR para reintentar.',
    };
  }

  if (connection.connected) {
    const phoneNumber =
      (await evolution.resolvePhoneNumber(instanceName)) || row.phone_number || '';

    await markTenantConnected(pool, tenant, row, instanceName, phoneNumber);
    await evolution.ensureIntegrations(instanceName);

    return {
      instanceName,
      status: 'connected',
      phoneNumber,
      qrBase64: null,
      tenantStatus: 'connected',
      evolutionState: connection.state,
      message: 'WhatsApp vinculado correctamente.',
    };
  }

  // Nunca llamar /instance/connect en polling: regenera QR e impide vincular.
  // Devolvemos el QR cacheado en PostgreSQL.
  const qrAgeMs = row.last_qr_at
    ? Date.now() - new Date(row.last_qr_at).getTime()
    : Number.POSITIVE_INFINITY;
  const qrExpired = qrAgeMs > 45_000;

  return {
    instanceName,
    status: 'qr_pending',
    phoneNumber: null,
    qrBase64: row.last_qr_base64 || null,
    tenantStatus: 'qr_pending',
    evolutionState: connection.state,
    message: qrExpired
      ? 'El QR expiró. Pulsa Actualizar QR y escanea el nuevo código de inmediato.'
      : 'Escanea el QR una sola vez. Si WhatsApp dice que no pudo vincular, pulsa Actualizar QR.',
  };
}
