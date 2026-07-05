function validationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizePrefix(prefix) {
  return String(prefix || 'faqinn_').replace(/_+$/, '_') || 'faqinn_';
}

function slugFromInstanceName(instanceName, prefix) {
  const name = String(instanceName || '').trim();
  const p = normalizePrefix(prefix);
  if (!name.startsWith(p) || name.length <= p.length) {
    return null;
  }
  return name.slice(p.length);
}

function mapRuntimeRow(row, config) {
  const agentSlug = row.agent_slug || 'principal';
  const evolutionApiKey = config.evolutionApiKey || '';
  return {
    tenant_id: String(row.tenant_id),
    tenant_slug: row.tenant_slug,
    tenant_name: row.tenant_name || '',
    tenant_status: row.tenant_status,
    agent_id: agentSlug,
    agent_slug: agentSlug,
    agent_name: row.agent_name || 'Agente',
    vertical: row.vertical_slug || 'hotel',
    primary_language: row.primary_language || 'es',
    initial_greeting: row.initial_greeting || '',
    booking_url_base: row.booking_url_base || '',
    booking_url_template: row.booking_url_template || '',
    business_hours: row.business_hours || '',
    policies: row.policies || '',
    evolution_instance_name: row.evolution_instance_name || '',
    evolution_api_url:
      config.evolutionApiPublicUrl || config.evolutionApiBaseUrl || '',
    evolution_api_key: evolutionApiKey,
    whatsapp_phone: row.whatsapp_phone || '',
    whatsapp_status: row.whatsapp_status || 'none',
    pause_enabled: true,
    pause_trigger: '**',
    pause_ttl_seconds: 300,
    pause_scope: 'chat',
    search_limit: 2,
    unanswered_limit: 1,
    faq_search_endpoint: '/api/search',
    unanswered_endpoint: '/api/unanswered',
  };
}

const TENANT_RUNTIME_SQL = `
  SELECT t.id AS tenant_id, t.slug AS tenant_slug, t.name AS tenant_name, t.status AS tenant_status,
         a.id AS agent_row_id, a.slug AS agent_slug, a.name AS agent_name,
         ts.vertical_slug, ts.primary_language, ts.welcome_message AS initial_greeting,
         ts.booking_url_base, ts.booking_url_template, ts.business_hours, ts.policies,
         ev.instance_name AS evolution_instance_name, ev.phone_number AS whatsapp_phone,
         ev.status AS whatsapp_status
  FROM tenants t
  LEFT JOIN agents a ON a.tenant_id = t.id AND a.status = 'active'
  LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
  LEFT JOIN LATERAL (
    SELECT instance_name, status, phone_number
    FROM evolution_instances
    WHERE tenant_id = t.id
    ORDER BY id DESC
    LIMIT 1
  ) ev ON true
`;

async function loadByInstanceName(pool, instanceName) {
  const [rows] = await pool.query(
    `${TENANT_RUNTIME_SQL}
     WHERE ev.instance_name = ?
     ORDER BY a.id ASC
     LIMIT 1`,
    [instanceName]
  );
  return rows[0] || null;
}

async function loadByTenantSlug(pool, slug) {
  const [rows] = await pool.query(
    `${TENANT_RUNTIME_SQL}
     WHERE t.slug = ?
     ORDER BY a.id ASC
     LIMIT 1`,
    [slug]
  );
  return rows[0] || null;
}

export async function getRuntimeTenantConfig(pool, config, instanceName) {
  const name = String(instanceName || '').trim();
  if (!name) {
    throw validationError('instance_name es obligatorio');
  }

  let row = await loadByInstanceName(pool, name);

  if (!row) {
    const slug = slugFromInstanceName(name, config.evolutionInstancePrefix);
    if (slug) {
      row = await loadByTenantSlug(pool, slug);
      if (row) {
        row.evolution_instance_name = name;
      }
    }
  }

  if (!row) {
    throw validationError(`Instancia no registrada: ${name}`, 404);
  }

  const allowedStatuses = new Set(['active', 'connected', 'qr_pending']);
  if (!allowedStatuses.has(row.tenant_status)) {
    throw validationError(
      `Tenant ${row.tenant_slug} no está activo (status=${row.tenant_status})`,
      403
    );
  }

  return mapRuntimeRow(row, config);
}
