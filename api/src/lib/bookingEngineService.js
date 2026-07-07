import {
  buildDiscoveryScenarios,
  buildVerificationScenario,
  normalizePreviewScenario,
  refreshDiscoveryScenarios,
  refreshVerificationScenario,
} from './bookingScenarios.js';
import { extractBookingTemplate } from './bookingUrlExtractor.js';
import { buildUrlFromTemplate } from './bookingTemplateBuilder.js';
import { buildApprovedBookingRecord } from './bookingApprovedFormat.js';

function validationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function serializeJson(value) {
  return JSON.stringify(value ?? {});
}

async function loadTenantBooking(pool, tenantId) {
  const [rows] = await pool.query(
    `SELECT tenant_url,
            validation_status, confidence_score, booking_config, booking_approved_at
     FROM tenant_settings
     WHERE tenant_id = ?`,
    [tenantId]
  );
  const row = rows[0] || {};
  return {
    tenant_url: row.tenant_url || '',
    // alias interno: la URL única del tenant hace de plantilla para reservas.
    booking_url_template: row.tenant_url || '',
    validation_status: row.validation_status || 'pending',
    confidence_score: Number(row.confidence_score || 0),
    booking_config: parseJson(row.booking_config, {}),
    booking_approved_at: row.booking_approved_at || null,
  };
}

async function loadActiveSession(pool, tenantId) {
  const [rows] = await pool.query(
    `SELECT id, status, scenarios, sample_urls, candidate_template,
            candidate_config, verification_scenario, verification_url,
            warnings, confidence_score, created_at, updated_at
     FROM booking_discovery_sessions
     WHERE tenant_id = ? AND status IN ('draft', 'detected', 'pending_verification')
     ORDER BY id DESC
     LIMIT 1`,
    [tenantId]
  );
  if (!rows[0]) {
    return null;
  }
  const row = rows[0];
  const storedScenarios = parseJson(row.scenarios, []);
  const scenarios = refreshDiscoveryScenarios(storedScenarios);
  const verificationScenario = refreshVerificationScenario(
    parseJson(row.verification_scenario, {}),
    scenarios[0]?.checkin
  );

  const storedCheckin = storedScenarios[0]?.checkin || '';
  const datesChanged = storedCheckin !== scenarios[0]?.checkin;
  let verificationUrl = row.verification_url || '';

  if (datesChanged) {
    const candidateConfig = parseJson(row.candidate_config, {});
    if (row.candidate_template && candidateConfig.date_format) {
      verificationUrl = buildUrlFromTemplate(
        row.candidate_template,
        verificationScenario,
        {
          date_format: candidateConfig.date_format,
          child_ages_format: candidateConfig.child_ages_format || 'csv',
        }
      );
    }

    await pool.query(
      `UPDATE booking_discovery_sessions
       SET scenarios = ?, verification_scenario = ?, verification_url = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        serializeJson(scenarios),
        serializeJson(verificationScenario),
        verificationUrl,
        row.id,
      ]
    );
  }

  return {
    id: row.id,
    status: row.status,
    scenarios,
    sample_urls: parseJson(row.sample_urls, []),
    candidate_template: row.candidate_template || '',
    candidate_config: parseJson(row.candidate_config, {}),
    verification_scenario: verificationScenario,
    verification_url: verificationUrl,
    warnings: parseJson(row.warnings, []),
    confidence_score: Number(row.confidence_score || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getBookingEngineState(pool, tenantId) {
  const booking = await loadTenantBooking(pool, tenantId);
  const session = await loadActiveSession(pool, tenantId);
  return { booking, session };
}

export async function startDiscoverySession(pool, tenantId) {
  const scenarios = buildDiscoveryScenarios();
  const verificationScenario = buildVerificationScenario(scenarios[0].checkin);

  await pool.query(
    `UPDATE booking_discovery_sessions
     SET status = 'cancelled', updated_at = NOW()
     WHERE tenant_id = ? AND status IN ('draft', 'detected', 'pending_verification')`,
    [tenantId]
  );

  const [, meta] = await pool.query(
    `INSERT INTO booking_discovery_sessions
       (tenant_id, status, scenarios, verification_scenario, sample_urls, warnings, candidate_config)
     VALUES (?, 'draft', ?, ?, '[]', '[]', '{}')
     RETURNING id`,
    [tenantId, serializeJson(scenarios), serializeJson(verificationScenario)]
  );

  return {
    session_id: meta.insertId,
    scenarios,
    verification_scenario: verificationScenario,
  };
}

export async function discoverFromUrls(pool, tenantId, sessionId, urls) {
  const [rows] = await pool.query(
    `SELECT id, scenarios, status
     FROM booking_discovery_sessions
     WHERE id = ? AND tenant_id = ?`,
    [sessionId, tenantId]
  );
  const session = rows[0];
  if (!session) {
    throw validationError('Sesión de descubrimiento no encontrada', 404);
  }

  const scenarios = buildDiscoveryScenarios();
  const result = extractBookingTemplate(scenarios, urls);

  if (!result.ok) {
    throw validationError(result.error);
  }

  const verificationScenario = buildVerificationScenario(scenarios[0]?.checkin);
  const buildOptions = {
    date_format: result.date_format,
    child_ages_format: result.child_ages_format,
  };
  const verificationUrl = buildUrlFromTemplate(
    result.booking_url_template,
    verificationScenario,
    buildOptions
  );

  const candidateConfig = {
    date_format: result.date_format,
    child_ages_format: result.child_ages_format,
    occupancy_format: result.occupancy_format,
    required_fields: result.required_fields,
    defaults: {
      rooms: 1,
      children: 0,
      child_ages: [],
    },
    supports_rooms: result.supports_rooms,
    supports_children: result.supports_children,
    supports_child_ages: result.supports_child_ages,
    fixed_params: result.fixed_params,
    variable_params: result.variable_params,
    booking_engine_name: result.booking_engine_name,
  };

  await pool.query(
    `UPDATE booking_discovery_sessions
     SET status = 'pending_verification',
         scenarios = ?,
         sample_urls = ?,
         candidate_template = ?,
         candidate_config = ?,
         verification_scenario = ?,
         verification_url = ?,
         warnings = ?,
         confidence_score = ?,
         updated_at = NOW()
     WHERE id = ?`,
    [
      serializeJson(scenarios),
      serializeJson(urls),
      result.booking_url_template,
      serializeJson(candidateConfig),
      serializeJson(verificationScenario),
      verificationUrl,
      serializeJson(result.warnings),
      result.confidence_score,
      sessionId,
    ]
  );

  return {
    session_id: sessionId,
    candidate_template: result.booking_url_template,
    confidence_score: result.confidence_score,
    validation_status: result.validation_status,
    date_format: result.date_format,
    warnings: result.warnings,
    variable_params: result.variable_params,
    fixed_params: result.fixed_params,
    verification: {
      scenario: verificationScenario,
      url: verificationUrl,
    },
  };
}

export async function rejectDiscovery(pool, tenantId, sessionId) {
  const [rows] = await pool.query(
    `SELECT id FROM booking_discovery_sessions
     WHERE id = ? AND tenant_id = ?`,
    [sessionId, tenantId]
  );
  if (!rows[0]) {
    throw validationError('Sesión no encontrada', 404);
  }

  await pool.query(
    `UPDATE booking_discovery_sessions
     SET status = 'rejected', updated_at = NOW()
     WHERE id = ?`,
    [sessionId]
  );

  return startDiscoverySession(pool, tenantId);
}

export async function approveDiscovery(pool, tenantId, userId, sessionId) {
  const [rows] = await pool.query(
    `SELECT id, candidate_template, candidate_config, confidence_score, warnings, sample_urls
     FROM booking_discovery_sessions
     WHERE id = ? AND tenant_id = ? AND status = 'pending_verification'`,
    [sessionId, tenantId]
  );
  const session = rows[0];
  if (!session) {
    throw validationError(
      'No hay plantilla pendiente de verificación para aprobar',
      404
    );
  }

  if (!session.candidate_template) {
    throw validationError('La sesión no tiene plantilla candidata');
  }

  const candidateConfig = parseJson(session.candidate_config, {});
  const sampleUrls = parseJson(session.sample_urls, []);
  let bookingUrlBase = '';
  try {
    if (sampleUrls[0]) {
      bookingUrlBase = new URL(sampleUrls[0]).origin;
    }
  } catch {
    bookingUrlBase = '';
  }

  const approved = buildApprovedBookingRecord(
    { ...session, candidate_config: candidateConfig, warnings: parseJson(session.warnings, []) },
    userId,
    bookingUrlBase
  );

  await pool.query(
    `UPDATE tenant_settings
     SET tenant_url = ?,
         validation_status = ?,
         confidence_score = ?,
         booking_config = ?,
         booking_approved_at = NOW(),
         updated_at = NOW()
     WHERE tenant_id = ?`,
    [
      approved.booking_url_template,
      approved.validation_status,
      approved.confidence_score,
      serializeJson(approved.booking_config),
      tenantId,
    ]
  );

  await pool.query(
    `UPDATE booking_discovery_sessions
     SET status = 'approved', updated_at = NOW()
     WHERE id = ?`,
    [sessionId]
  );

  return loadTenantBooking(pool, tenantId);
}

async function resolveTemplateForPreview(pool, tenantId, sessionId) {
  if (sessionId) {
    const [rows] = await pool.query(
      `SELECT candidate_template, status
       FROM booking_discovery_sessions
       WHERE id = ? AND tenant_id = ?`,
      [sessionId, tenantId]
    );
    const session = rows[0];
    if (session?.candidate_template) {
      return session.candidate_template;
    }
  }

  const booking = await loadTenantBooking(pool, tenantId);
  if (booking.validation_status === 'approved' && booking.booking_url_template) {
    return booking.booking_url_template;
  }

  throw validationError('No hay plantilla disponible para generar el link', 404);
}

async function resolveBuildOptions(pool, tenantId, sessionId) {
  if (sessionId) {
    const [rows] = await pool.query(
      `SELECT candidate_config
       FROM booking_discovery_sessions
       WHERE id = ? AND tenant_id = ?`,
      [sessionId, tenantId]
    );
    const config = parseJson(rows[0]?.candidate_config, {});
    return {
      date_format: config.date_format || '',
      child_ages_format: config.child_ages_format || 'csv',
    };
  }

  const booking = await loadTenantBooking(pool, tenantId);
  const config = booking.booking_config || {};
  return {
    date_format: config.date_format || '',
    child_ages_format: config.child_ages_format || 'csv',
  };
}

export async function previewBookingUrl(pool, tenantId, input) {
  const sessionId = Number(input.session_id) || null;
  const template = await resolveTemplateForPreview(pool, tenantId, sessionId);
  const buildOptions = await resolveBuildOptions(pool, tenantId, sessionId);
  let scenario;
  try {
    scenario = normalizePreviewScenario(input);
  } catch (error) {
    throw validationError(error.message || 'Datos de prueba inválidos');
  }
  const url = buildUrlFromTemplate(template, scenario, buildOptions);

  try {
    new URL(url);
  } catch {
    throw validationError('No se pudo construir una URL válida con esos datos');
  }

  return { url, scenario, template };
}

export async function saveFixedLink(pool, tenantId, userId, url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) {
    throw validationError('URL de reservas es obligatoria');
  }
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw validationError('URL inválida');
    }
  } catch {
    throw validationError('URL inválida');
  }

  await pool.query(
    `UPDATE tenant_settings
     SET tenant_url = ?,
         validation_status = 'approved',
         confidence_score = 1,
         booking_config = ?,
         booking_approved_at = NOW(),
         updated_at = NOW()
     WHERE tenant_id = ?`,
    [
      trimmed,
      serializeJson({ approved_by_user_id: userId, mode: 'fixed_link' }),
      tenantId,
    ]
  );

  return loadTenantBooking(pool, tenantId);
}
