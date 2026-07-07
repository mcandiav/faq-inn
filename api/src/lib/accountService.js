import { syncWhatsappConnectionStatus } from './provisionService.js';
import { deleteAdminTenant } from './adminService.js';
import { getObjective, isPrimaryObjectiveSlug } from './objectives/index.js';

function validationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function loadEvolutionRow(pool, tenantId) {
  const [evoRows] = await pool.query(
    `SELECT instance_name, status, phone_number, last_qr_base64, last_qr_at, connected_at
     FROM evolution_instances
     WHERE tenant_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [tenantId]
  );
  return evoRows[0] || null;
}

export async function getAccountSettings(pool, config, userId, tenantId) {
  const [userRows] = await pool.query(
    `SELECT u.id, u.email, u.role, u.tenant_id,
            t.slug, t.name, t.email AS tenant_email, t.status AS tenant_status
     FROM users u
     JOIN tenants t ON t.id = u.tenant_id
     WHERE u.id = ? AND u.tenant_id = ?`,
    [userId, tenantId]
  );

  const user = userRows[0];
  if (!user) {
    throw validationError('Usuario no encontrado', 404);
  }

  const [settingsRows] = await pool.query(
    `SELECT vertical_slug, primary_language, booking_url_base, booking_url_template,
            booking_url_mode, validation_status, confidence_score, booking_config,
            booking_approved_at, lodging_type, business_hours, policies, welcome_message, address,
            objetivo_slug, onboarding_completed, destination_url, business_type,
            agenda_url_base, agenda_url_template, agenda_url_mode,
            agenda_validation_status, agenda_confidence_score, agenda_config, agenda_approved_at
     FROM tenant_settings
     WHERE tenant_id = ?`,
    [tenantId]
  );

  const [agentRows] = await pool.query(
    `SELECT id, slug, name, channel, status
     FROM agents
     WHERE tenant_id = ?
     ORDER BY id ASC
     LIMIT 1`,
    [tenantId]
  );

  let evo = await loadEvolutionRow(pool, tenantId);
  if (evo?.instance_name && evo.status === 'connected' && config) {
    await syncWhatsappConnectionStatus(
      pool,
      config,
      tenantId,
      evo.instance_name
    );
    evo = await loadEvolutionRow(pool, tenantId);
  }
  const settings = settingsRows[0] || {};

  return {
    tenant: {
      id: tenantId,
      slug: user.slug,
      name: user.name,
      email: user.tenant_email || user.email,
      status: user.tenant_status,
    },
    settings: {
      vertical_slug: settings.vertical_slug || 'hotel',
      objetivo_slug: settings.objetivo_slug || '',
      onboarding_completed: Boolean(settings.onboarding_completed),
      destination_url: settings.destination_url || '',
      business_type: settings.business_type || settings.vertical_slug || '',
      primary_language: settings.primary_language || 'es',
      booking_url_base: settings.booking_url_base || '',
      booking_url_template:
        settings.validation_status === 'approved'
          ? settings.booking_url_template || ''
          : '',
      booking_url_mode: settings.booking_url_mode || '',
      validation_status: settings.validation_status || 'pending',
      confidence_score: Number(settings.confidence_score || 0),
      booking_approved_at: settings.booking_approved_at || null,
      agenda_url_base: settings.agenda_url_base || '',
      agenda_url_template:
        settings.agenda_validation_status === 'approved'
          ? settings.agenda_url_template || ''
          : '',
      agenda_url_mode: settings.agenda_url_mode || '',
      agenda_validation_status: settings.agenda_validation_status || 'pending',
      agenda_confidence_score: Number(settings.agenda_confidence_score || 0),
      agenda_approved_at: settings.agenda_approved_at || null,
      lodging_type: settings.lodging_type || 'hotel',
      business_hours: settings.business_hours || '',
      policies: settings.policies || '',
      welcome_message: settings.welcome_message || '',
      address: settings.address || '',
    },
    agent: agentRows[0]
      ? {
          id: agentRows[0].id,
          slug: agentRows[0].slug,
          name: agentRows[0].name,
          channel: agentRows[0].channel,
          status: agentRows[0].status,
        }
      : null,
    whatsapp: {
      instance_name: evo?.instance_name || '',
      connection_status: evo?.status || 'none',
      phone_number: evo?.phone_number || '',
      qr_base64:
        evo?.status === 'qr_pending' ? evo?.last_qr_base64 || null : null,
      connected_at: evo?.connected_at || null,
    },
  };
}

export async function updateAccountSettings(pool, config, userId, tenantId, input) {
  const account = await getAccountSettings(pool, config, userId, tenantId);

  const businessName = input.business_name?.trim();
  const address = input.address?.trim();
  const welcomeMessage = input.welcome_message?.trim();
  const agentName = input.agent_name?.trim();
  const primaryLanguage = input.primary_language?.trim();
  const businessHours = input.business_hours?.trim();
  const policies = input.policies?.trim();
  const destinationUrl =
    input.destination_url !== undefined
      ? String(input.destination_url || '').trim()
      : undefined;
  const objetivoSlug =
    input.objetivo_slug !== undefined
      ? String(input.objetivo_slug || '').trim()
      : undefined;

  if (objetivoSlug !== undefined) {
    if (!isPrimaryObjectiveSlug(objetivoSlug)) {
      throw validationError('objetivo_slug inválido');
    }
  }

  const nextObjetivoSlug =
    objetivoSlug !== undefined ? objetivoSlug : account.settings.objetivo_slug;
  const nextDestinationUrl =
    destinationUrl !== undefined
      ? destinationUrl
      : account.settings.destination_url || '';
  const nextObjective = getObjective(nextObjetivoSlug);
  if (
    nextObjective?.needs_destination_url &&
    !nextDestinationUrl &&
    (objetivoSlug !== undefined || destinationUrl !== undefined)
  ) {
    throw validationError('URL destino es obligatoria para este objetivo');
  }

  if (businessName !== undefined) {
    if (businessName.length < 2) {
      throw validationError('nombre comercial es obligatorio');
    }
    await pool.query(
      `UPDATE tenants SET name = ?, updated_at = NOW() WHERE id = ?`,
      [businessName, tenantId]
    );
  }

  const settingsUpdates = [];
  const settingsParams = [];

  if (address !== undefined) {
    settingsUpdates.push('address = ?');
    settingsParams.push(address);
  }
  if (welcomeMessage !== undefined) {
    settingsUpdates.push('welcome_message = ?');
    settingsParams.push(welcomeMessage);
  }
  if (primaryLanguage !== undefined) {
    settingsUpdates.push('primary_language = ?');
    settingsParams.push(primaryLanguage || 'es');
  }
  if (businessHours !== undefined) {
    settingsUpdates.push('business_hours = ?');
    settingsParams.push(businessHours);
  }
  if (policies !== undefined) {
    settingsUpdates.push('policies = ?');
    settingsParams.push(policies);
  }
  if (objetivoSlug !== undefined) {
    settingsUpdates.push('objetivo_slug = ?');
    settingsParams.push(objetivoSlug);
  }
  if (destinationUrl !== undefined) {
    settingsUpdates.push('destination_url = ?');
    settingsParams.push(destinationUrl);
  }

  if (settingsUpdates.length > 0) {
    settingsUpdates.push('updated_at = NOW()');
    await pool.query(
      `UPDATE tenant_settings SET ${settingsUpdates.join(', ')} WHERE tenant_id = ?`,
      [...settingsParams, tenantId]
    );
  }

  if (agentName !== undefined && account.agent?.id) {
    if (agentName.length < 2) {
      throw validationError('nombre del agente es obligatorio');
    }
    await pool.query(
      `UPDATE agents SET name = ?, updated_at = NOW() WHERE id = ?`,
      [agentName, account.agent.id]
    );
  }

  return getAccountSettings(pool, config, userId, tenantId);
}

/**
 * Autoservicio: el cliente elimina su propio tenant.
 * Reutiliza el mismo teardown que el admin (Evolution + Qdrant + DELETE con
 * cascada FK). Exige confirmSlug === slug del propio negocio.
 */
export async function deleteOwnTenant(pool, config, tenantId, confirmSlug, logger) {
  return deleteAdminTenant(pool, config, tenantId, confirmSlug, logger);
}
