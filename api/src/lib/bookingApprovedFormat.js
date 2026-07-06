import { normalizeTemplateToCanonical } from './bookingTemplateBuilder.js';

const CANONICAL_FIELDS = [
  'checkin',
  'checkout',
  'nights',
  'adults',
  'children',
  'child_ages',
  'rooms',
];

const PLACEHOLDER_TO_CANONICAL = {
  checkin: 'checkin',
  checkin_yyyy_mm_dd: 'checkin',
  checkin_ddmmyyyy: 'checkin',
  checkin_yyyymmdd: 'checkin',
  checkout: 'checkout',
  checkout_yyyy_mm_dd: 'checkout',
  checkout_ddmmyyyy: 'checkout',
  checkout_yyyymmdd: 'checkout',
  nights: 'nights',
  adults: 'adults',
  children: 'children',
  child_ages: 'child_ages',
  child_ages_csv: 'child_ages',
  child_ages_semicolon: 'child_ages',
  child_ages_dash: 'child_ages',
  rooms: 'rooms',
  occupancy_path: 'adults',
};

function extractPlaceholderName(token) {
  return String(token || '')
    .replace(/^\{\{|\}\}$/g, '')
    .trim();
}

export function buildPlaceholderMap(variableParams = {}) {
  const map = {};
  for (const token of Object.values(variableParams)) {
    const name = extractPlaceholderName(token);
    const canonical = PLACEHOLDER_TO_CANONICAL[name] || name;
    if (canonical === 'occupancy_path') {
      map.occupancy_path = '{{occupancy_path}}';
      continue;
    }
    if (CANONICAL_FIELDS.includes(canonical) && !map[canonical]) {
      map[canonical] = `{{${canonical}}}`;
    }
  }
  return map;
}

export function buildRequiredFields(candidateConfig = {}) {
  const fromConfig = Array.isArray(candidateConfig.required_fields)
    ? candidateConfig.required_fields
    : [];
  const fromParams = Object.values(buildPlaceholderMap(candidateConfig.variable_params || {})).map(
    extractPlaceholderName
  );
  const canonical = new Set(['checkin', 'checkout', 'adults']);
  for (const field of [...fromConfig, ...fromParams]) {
    const name = extractPlaceholderName(field);
    const mapped = PLACEHOLDER_TO_CANONICAL[name] || name;
    if (CANONICAL_FIELDS.includes(mapped)) {
      canonical.add(mapped);
    }
  }
  return CANONICAL_FIELDS.filter((field) => canonical.has(field));
}

export function buildApprovedBookingRecord(session, userId, bookingUrlBase) {
  const candidateConfig =
    typeof session.candidate_config === 'string'
      ? JSON.parse(session.candidate_config || '{}')
      : session.candidate_config || {};

  const placeholderMap = buildPlaceholderMap(candidateConfig.variable_params || {});
  const requiredFields = buildRequiredFields(candidateConfig);

  const bookingConfig = {
    required_fields: requiredFields,
    defaults: candidateConfig.defaults || {
      rooms: 1,
      children: 0,
      child_ages: [],
    },
    placeholder_map: placeholderMap,
    date_format: candidateConfig.date_format || '',
    child_ages_format: candidateConfig.child_ages_format || 'csv',
    occupancy_format: candidateConfig.occupancy_format || '',
    supports_rooms: Boolean(candidateConfig.supports_rooms),
    supports_children: Boolean(candidateConfig.supports_children),
    supports_child_ages: Boolean(candidateConfig.supports_child_ages),
    fixed_params: candidateConfig.fixed_params || {},
    variable_params: candidateConfig.variable_params || {},
    booking_engine_name: candidateConfig.booking_engine_name || '',
    warnings: Array.isArray(session.warnings)
      ? session.warnings
      : JSON.parse(session.warnings || '[]'),
    approved_by_user_id: userId,
  };

  return {
    booking_url_template: normalizeTemplateToCanonical(session.candidate_template),
    booking_url_base: bookingUrlBase,
    booking_url_mode: 'discovered_template',
    validation_status: 'approved',
    confidence_score: Number(session.confidence_score || 0),
    booking_config: bookingConfig,
  };
}
