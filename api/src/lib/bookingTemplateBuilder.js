import { formatDateVariants } from './bookingScenarios.js';

export function formatDateForTenant(iso, dateFormat) {
  const variants = formatDateVariants(iso);
  switch (String(dateFormat || '').toUpperCase()) {
    case 'DDMMYYYY':
      return variants.ddmmyyyy;
    case 'YYYYMMDD':
      return variants.yyyymmdd;
    case 'DD/MM/YYYY':
      return variants.dd_mm_yyyy;
    case 'MM/DD/YYYY':
      return variants.mm_dd_yyyy;
    case 'YYYY-MM-DD':
      return variants.yyyy_mm_dd;
    default:
      return iso;
  }
}

export function formatChildAgesForTenant(childAges, childAgesFormat) {
  const ages = Array.isArray(childAges) ? childAges : [];
  if (ages.length === 0) {
    return '';
  }
  switch (childAgesFormat) {
    case 'semicolon':
      return ages.join(';');
    case 'dash':
      return ages.join('-');
    default:
      return ages.join(',');
  }
}

export function inferDateFormatFromLiteral(iso, literal) {
  const normalized = decodeURIComponent(String(literal || ''));
  if (!normalized || !iso) {
    return '';
  }
  const variants = formatDateVariants(iso);
  if (normalized === variants.ddmmyyyy) return 'DDMMYYYY';
  if (normalized === variants.yyyymmdd) return 'YYYYMMDD';
  if (normalized === variants.yyyy_mm_dd) return 'YYYY-MM-DD';
  if (normalized === variants.dd_mm_yyyy) return 'DD/MM/YYYY';
  if (normalized === variants.mm_dd_yyyy) return 'MM/DD/YYYY';
  return '';
}

function buildResolvers(options = {}) {
  const dateFormat = options.date_format || '';
  const childAgesFormat = options.child_ages_format || 'csv';

  return {
    checkin: (s) => formatDateForTenant(s.checkin, dateFormat),
    checkout: (s) => formatDateForTenant(s.checkout, dateFormat),
    checkin_yyyy_mm_dd: (s) => formatDateVariants(s.checkin).yyyy_mm_dd,
    checkout_yyyy_mm_dd: (s) => formatDateVariants(s.checkout).yyyy_mm_dd,
    checkin_ddmmyyyy: (s) => formatDateVariants(s.checkin).ddmmyyyy,
    checkout_ddmmyyyy: (s) => formatDateVariants(s.checkout).ddmmyyyy,
    checkin_yyyymmdd: (s) => formatDateVariants(s.checkin).yyyymmdd,
    checkout_yyyymmdd: (s) => formatDateVariants(s.checkout).yyyymmdd,
    nights: (s) => String(s.nights),
    adults: (s) => String(s.adults),
    children: (s) => String(s.children),
    rooms: (s) => String(s.rooms),
    child_ages: (s) => formatChildAgesForTenant(s.child_ages, childAgesFormat),
    child_ages_csv: (s) => s.child_ages.join(','),
    child_ages_semicolon: (s) => s.child_ages.join(';'),
    child_ages_dash: (s) => s.child_ages.join('-'),
    occupancy_path: (s) => {
      if (s.child_ages.length === 0) {
        return String(s.adults);
      }
      return `${s.adults}-${s.child_ages.join('-')}`;
    },
  };
}

export function normalizeTemplateToCanonical(template) {
  return String(template || '')
    .replace(/\{\{checkin_[^}]+\}\}/g, '{{checkin}}')
    .replace(/\{\{checkout_[^}]+\}\}/g, '{{checkout}}')
    .replace(/\{\{child_ages_(csv|semicolon|dash)\}\}/g, '{{child_ages}}');
}

export function buildUrlFromTemplate(template, scenario, options = {}) {
  const resolvers = buildResolvers(options);
  let url = normalizeTemplateToCanonical(String(template || ''));
  for (const [key, resolver] of Object.entries(resolvers)) {
    const token = `{{${key}}}`;
    if (url.includes(token)) {
      url = url.split(token).join(resolver(scenario));
    }
  }
  return url;
}

export function listRequiredFields(variableParams) {
  const fields = new Set(['checkin', 'checkout', 'adults']);
  for (const placeholder of Object.values(variableParams || {})) {
    const name = String(placeholder).replace(/^\{\{|\}\}$/g, '');
    if (name === 'checkin' || name.startsWith('checkin_')) fields.add('checkin');
    if (name === 'checkout' || name.startsWith('checkout_')) fields.add('checkout');
    if (name === 'adults') fields.add('adults');
    if (name === 'children') fields.add('children');
    if (name === 'child_ages' || name.startsWith('child_ages')) fields.add('child_ages');
    if (name === 'rooms') fields.add('rooms');
    if (name === 'occupancy_path') {
      fields.add('adults');
      fields.add('child_ages');
    }
  }
  return [...fields];
}
