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

import { buildPlaceholderMap, buildRequiredFields } from './bookingApprovedFormat.js';

function parseBookingConfig(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function enrichBookingConfig(rawConfig = {}) {
  const config = { ...parseBookingConfig(rawConfig) };
  if (!config.placeholder_map || Object.keys(config.placeholder_map).length === 0) {
    config.placeholder_map = buildPlaceholderMap(config.variable_params || {});
  }
  if (!Array.isArray(config.required_fields) || config.required_fields.length === 0) {
    config.required_fields = buildRequiredFields(config);
  }
  return config;
}

function mapRuntimeRow(row, config) {
  const agentSlug = row.agent_slug || 'principal';
  const evolutionApiKey = config.evolutionApiKey || '';
  const tenantSlug = row.tenant_slug || '';
  const bookingApproved = row.validation_status === 'approved';
  const bookingConfig = bookingApproved ? enrichBookingConfig(row.booking_config) : {};
  return {
    // Slug técnico (filtro Qdrant, SemResposta, clave Redis). No es el id numérico de PostgreSQL.
    tenant_id: tenantSlug,
    tenant_slug: tenantSlug,
    tenant_db_id: String(row.tenant_id),
    tenant_name: row.tenant_name || '',
    tenant_display_name: row.tenant_name || '',
    business_type: row.vertical_slug || 'hotel',
    agent_id: agentSlug,
    agent_slug: agentSlug,
    agent_name: row.agent_name || 'Agente',
    vertical: row.vertical_slug || 'hotel',
    primary_language: row.primary_language || 'es',
    initial_greeting: row.initial_greeting || '',
    booking_url_base: bookingApproved ? row.booking_url_base || '' : '',
    booking_url_template: bookingApproved ? row.booking_url_template || '' : '',
    booking_url_mode: bookingApproved ? row.booking_url_mode || '' : '',
    validation_status: row.validation_status || 'pending',
    confidence_score: bookingApproved ? Number(row.confidence_score || 0) : 0,
    booking_config: bookingApproved ? bookingConfig : {},
    booking_config_json: bookingApproved ? JSON.stringify(bookingConfig) : '{}',
    placeholder_map: bookingApproved ? bookingConfig.placeholder_map || {} : {},
    required_fields: bookingApproved ? bookingConfig.required_fields || [] : [],
    date_format: bookingApproved ? bookingConfig.date_format || '' : '',
    supports_rooms: bookingApproved ? Boolean(bookingConfig.supports_rooms) : false,
    supports_children: bookingApproved ? Boolean(bookingConfig.supports_children) : false,
    supports_child_ages: bookingApproved ? Boolean(bookingConfig.supports_child_ages) : false,
    business_hours: row.business_hours || '',
    policies: row.policies || '',
    evolution_instance_name: row.evolution_instance_name || '',
    // URL alcanzable desde n8n (red interna EasyPanel), no la pública del navegador.
    evolution_api_url:
      config.evolutionApiBaseUrl || config.evolutionApiPublicUrl || '',
    evolution_api_key: evolutionApiKey,
    whatsapp_phone: row.whatsapp_phone || '',
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
  SELECT t.id AS tenant_id, t.slug AS tenant_slug, t.name AS tenant_name,
         a.id AS agent_row_id, a.slug AS agent_slug, a.name AS agent_name,
         ts.vertical_slug, ts.primary_language, ts.welcome_message AS initial_greeting,
         ts.booking_url_base, ts.booking_url_template, ts.booking_url_mode,
         ts.validation_status, ts.confidence_score, ts.booking_config,
         ts.business_hours, ts.policies,
         ev.instance_name AS evolution_instance_name, ev.phone_number AS whatsapp_phone
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

  return mapRuntimeRow(row, config);
}
