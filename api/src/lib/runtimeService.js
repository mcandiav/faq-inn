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
import {
  buildObjetivoDirective,
  normalizeObjectiveSlug,
} from './objectives/index.js';
import { getRuntimeTemplateColumns } from './promptTemplateService.js';
import { normalizePreviewScenario } from './bookingScenarios.js';
import { buildUrlFromTemplate } from './bookingTemplateBuilder.js';
import {
  buildPublicShortUrl,
  createBookingShortLink,
} from './bookingShortLink.js';

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
  const agendaApproved = row.agenda_validation_status === 'approved';
  const bookingConfig = bookingApproved ? enrichBookingConfig(row.booking_config) : {};
  const agendaConfig = agendaApproved ? enrichBookingConfig(row.agenda_config) : {};
  // Objetivo canónico: vacío / inválido / "faq" => responder_preguntas (FAQ transversal).
  const objetivoSlug = normalizeObjectiveSlug(row.objetivo_slug);
  let objetivoUrl = '';
  if (objetivoSlug === 'reservar_noches') {
    objetivoUrl = bookingApproved ? row.booking_url_template || '' : '';
  } else if (objetivoSlug === 'reservar_horarios') {
    objetivoUrl = agendaApproved ? row.agenda_url_template || '' : '';
  } else if (objetivoSlug === 'enviar_a_sitio_web') {
    objetivoUrl = row.destination_url || '';
  }
  // Frase natural para el prompt "Tu objetivo es {{objetivo}}".
  const objetivo = buildObjetivoDirective(objetivoSlug, objetivoUrl);
  return {
    // Slug técnico (filtro Qdrant, SemResposta, clave Redis). No es el id numérico de PostgreSQL.
    tenant_id: tenantSlug,
    tenant_slug: tenantSlug,
    tenant_db_id: String(row.tenant_id),
    tenant_name: row.tenant_name || '',
    tenant_display_name: row.tenant_name || '',
    business_type: row.business_type || row.vertical_slug || 'hotel',
    vertical: row.vertical_slug || 'hotel',
    objetivo_slug: objetivoSlug,
    objetivo,
    url: objetivoUrl,
    destination_url: row.destination_url || '',
    timezone: row.timezone || 'America/Santiago',
    onboarding_completed: Boolean(row.onboarding_completed),
    agent_id: agentSlug,
    agent_slug: agentSlug,
    agent_name: row.agent_name || 'Agente',
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
    agenda_url_base: agendaApproved ? row.agenda_url_base || '' : '',
    agenda_url_template: agendaApproved ? row.agenda_url_template || '' : '',
    agenda_url_mode: agendaApproved ? row.agenda_url_mode || '' : '',
    agenda_validation_status: row.agenda_validation_status || 'pending',
    agenda_confidence_score: agendaApproved ? Number(row.agenda_confidence_score || 0) : 0,
    agenda_config: agendaApproved ? agendaConfig : {},
    agenda_config_json: agendaApproved ? JSON.stringify(agendaConfig) : '{}',
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
         ts.objetivo_slug, ts.destination_url, ts.onboarding_completed, ts.business_type,
         ts.timezone,
         ts.booking_url_base, ts.booking_url_template, ts.booking_url_mode,
         ts.validation_status, ts.confidence_score, ts.booking_config,
         ts.agenda_url_base, ts.agenda_url_template, ts.agenda_url_mode,
         ts.agenda_validation_status, ts.agenda_confidence_score, ts.agenda_config,
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

  const tenant = mapRuntimeRow(row, config);
  // Columnas crudas del system prompt (con tokens neutros sin resolver).
  // n8n las arma en el nodo Code "Armar SPrompt".
  tenant.sprompt = await getRuntimeTemplateColumns(pool, tenant.objetivo_slug);
  return tenant;
}

export function buildRuntimeBookingUrl(tenant, input = {}) {
  if (tenant.validation_status !== 'approved' || !tenant.booking_url_template) {
    throw validationError('Motor de reservas no aprobado para este tenant', 400);
  }

  let scenario;
  try {
    scenario = normalizePreviewScenario(input);
  } catch (error) {
    throw validationError(error.message || 'Datos de reserva inválidos');
  }

  const bookingConfig = enrichBookingConfig(tenant.booking_config);
  const url = buildUrlFromTemplate(tenant.booking_url_template, scenario, {
    date_format: bookingConfig.date_format || tenant.date_format,
    child_ages_format: bookingConfig.child_ages_format || 'csv',
  });

  try {
    new URL(url);
  } catch {
    throw validationError('No se pudo construir una URL válida con esos datos');
  }

  return {
    status: 'ok',
    url,
    scenario,
    date_format: bookingConfig.date_format || tenant.date_format || '',
  };
}

export async function generateRuntimeBookingLink(pool, config, instanceName, input = {}) {
  const tenant = await getRuntimeTenantConfig(pool, config, instanceName);
  const result = buildRuntimeBookingUrl(tenant, input);
  const code = await createBookingShortLink(pool, result.url, tenant.tenant_db_id);
  const short_url = buildPublicShortUrl(config, code);

  return {
    ...result,
    short_url,
  };
}

export function buildRuntimeAgendaUrl(tenant, input = {}) {
  if (tenant.agenda_validation_status !== 'approved' || !tenant.agenda_url_template) {
    throw validationError('Motor de agenda no aprobado para este tenant', 400);
  }

  let scenario;
  try {
    scenario = normalizePreviewScenario(input);
  } catch (error) {
    throw validationError(error.message || 'Datos de agenda inválidos');
  }

  const agendaConfig = enrichBookingConfig(tenant.agenda_config);
  const url = buildUrlFromTemplate(tenant.agenda_url_template, scenario, {
    date_format: agendaConfig.date_format || tenant.date_format,
    child_ages_format: agendaConfig.child_ages_format || 'csv',
  });

  try {
    new URL(url);
  } catch {
    throw validationError('No se pudo construir una URL válida con esos datos');
  }

  return {
    status: 'ok',
    url,
    scenario,
    date_format: agendaConfig.date_format || tenant.date_format || '',
  };
}

export async function generateRuntimeAgendaLink(pool, config, instanceName, input = {}) {
  const tenant = await getRuntimeTenantConfig(pool, config, instanceName);
  const result = buildRuntimeAgendaUrl(tenant, input);
  const code = await createBookingShortLink(pool, result.url, tenant.tenant_db_id);
  const short_url = buildPublicShortUrl(config, code);

  return {
    ...result,
    short_url,
  };
}

/** Item plano de tenant listo para n8n (sin mensaje WhatsApp; eso viene del webhook). */
export function buildRuntimeWorkflowItem(tenant) {
  return {
    status: 'ok',
    tenant_id: tenant.tenant_id,
    tenant_slug: tenant.tenant_slug,
    tenant_db_id: tenant.tenant_db_id,
    tenant_name: tenant.tenant_name,
    tenant_display_name: tenant.tenant_display_name || tenant.tenant_name || '',
    business_type: tenant.business_type || tenant.vertical || 'hotel',
    vertical: tenant.vertical,
    objetivo_slug: tenant.objetivo_slug || '',
    objetivo: tenant.objetivo || 'responder preguntas',
    url: tenant.url || '',
    destination_url: tenant.destination_url || '',
    timezone: tenant.timezone || 'America/Santiago',
    onboarding_completed: Boolean(tenant.onboarding_completed),
    primary_language: tenant.primary_language,
    agent_id: tenant.agent_id,
    agent_name: tenant.agent_name,
    initial_greeting: tenant.initial_greeting,
    booking_url_base: tenant.booking_url_base,
    booking_url_template: tenant.booking_url_template,
    booking_url_mode: tenant.booking_url_mode,
    agenda_url_base: tenant.agenda_url_base,
    agenda_url_template: tenant.agenda_url_template,
    agenda_url_mode: tenant.agenda_url_mode,
    agenda_validation_status: tenant.agenda_validation_status,
    agenda_confidence_score: tenant.agenda_confidence_score,
    agenda_config_json: tenant.agenda_config_json,
    validation_status: tenant.validation_status,
    confidence_score: tenant.confidence_score,
    booking_config_json: tenant.booking_config_json,
    placeholder_map_json: JSON.stringify(tenant.placeholder_map || {}),
    required_fields_json: JSON.stringify(tenant.required_fields || []),
    date_format: tenant.date_format,
    supports_rooms: tenant.supports_rooms,
    supports_children: tenant.supports_children,
    supports_child_ages: tenant.supports_child_ages,
    business_hours: tenant.business_hours,
    policies: tenant.policies,
    whatsapp_phone: tenant.whatsapp_phone,
    pause_trigger: tenant.pause_trigger,
    pause_ttl_seconds: tenant.pause_ttl_seconds,
    search_limit: tenant.search_limit,
    unanswered_limit: tenant.unanswered_limit,
    faq_search_endpoint: tenant.faq_search_endpoint || '/api/search',
    unanswered_endpoint: tenant.unanswered_endpoint || '/api/unanswered',
    evolution_instance_name: tenant.evolution_instance_name,
    evolution_api_url: tenant.evolution_api_url,
    evolution_api_key: tenant.evolution_api_key,
    // Columnas crudas del system prompt del objetivo activo (tokens neutros
    // sin resolver). n8n las compone en el nodo Code "Armar SPrompt".
    sprompt: tenant.sprompt || {
      role_template: '',
      limits_template: '',
      tools_template: '',
      date_interpretation_template: '',
      data_collection_template: '',
      links_template: '',
    },
  };
}
