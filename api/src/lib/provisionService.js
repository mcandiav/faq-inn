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

export async function startWhatsappProvision(pool, config, tenant) {
  const evolution = createEvolutionClient(config);
  const instanceName = evolution.buildInstanceName(tenant.slug);

  const [existing] = await pool.query(
    `SELECT id, instance_name, status, phone_number
     FROM evolution_instances
     WHERE tenant_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [tenant.id]
  );

  if (existing[0]?.status === 'connected' && existing[0].phone_number) {
    return {
      instanceName: existing[0].instance_name,
      status: 'connected',
      phoneNumber: existing[0].phone_number,
      qrBase64: null,
    };
  }

  try {
    await evolution.createInstance(instanceName);
    const { qrBase64 } = await evolution.getQr(instanceName);

    if (existing[0]) {
      await pool.query(
        `UPDATE evolution_instances
         SET instance_name = ?,
             status = 'qr_pending',
             last_qr_at = NOW(),
             last_error = '',
             updated_at = NOW()
         WHERE id = ?`,
        [instanceName, existing[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO evolution_instances
         (tenant_id, instance_name, status, last_qr_at)
         VALUES (?, ?, 'qr_pending', NOW())`,
        [tenant.id, instanceName]
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
    };
  } catch (error) {
    const message = error.message || 'Error al crear instancia Evolution';
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
    `SELECT id, instance_name, status, phone_number, last_qr_at, connected_at
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
    return {
      instanceName: row.instance_name,
      status: 'connected',
      phoneNumber: row.phone_number,
      qrBase64: null,
      tenantStatus: 'connected',
    };
  }

  const evolution = createEvolutionClient(config);
  const connection = await evolution.getConnectionState(instanceName);

  if (connection.connected) {
    const phoneNumber =
      (await evolution.resolvePhoneNumber(instanceName)) || row.phone_number || '';

    await pool.query(
      `UPDATE evolution_instances
       SET status = 'connected',
           phone_number = ?,
           connected_at = COALESCE(connected_at, NOW()),
           last_error = '',
           updated_at = NOW()
       WHERE id = ?`,
      [phoneNumber, row.id]
    );
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

    return {
      instanceName,
      status: 'connected',
      phoneNumber,
      qrBase64: null,
      tenantStatus: 'connected',
      evolutionState: connection.state,
    };
  }

  // Si ya escaneó el QR, Evolution queda en "connecting".
  // NO pedir QR nuevo: /instance/connect regenera el código e interrumpe el emparejamiento.
  if (connection.pairing) {
    return {
      instanceName,
      status: 'qr_pending',
      phoneNumber: null,
      qrBase64: null,
      tenantStatus: 'qr_pending',
      evolutionState: connection.state,
      message: 'WhatsApp está emparejando. Espera unos segundos sin escanear de nuevo.',
    };
  }

  let qrBase64 = null;
  try {
    const qr = await evolution.getQr(instanceName);
    qrBase64 = qr.qrBase64;
    await pool.query(
      `UPDATE evolution_instances
       SET status = 'qr_pending', last_qr_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [row.id]
    );
  } catch {
    /* keep previous QR pending without failing poll */
  }

  return {
    instanceName,
    status: 'qr_pending',
    phoneNumber: null,
    qrBase64,
    tenantStatus: 'qr_pending',
    evolutionState: connection.state,
  };
}
