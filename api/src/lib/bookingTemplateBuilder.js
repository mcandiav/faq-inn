import { formatDateVariants } from './bookingScenarios.js';

const PLACEHOLDER_RESOLVERS = {
  checkin: (s) => s.checkin,
  checkout: (s) => s.checkout,
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
  child_ages_csv: (s) => s.child_ages.join(','),
  child_ages_dash: (s) => s.child_ages.join('-'),
  occupancy_path: (s) => {
    if (s.child_ages.length === 0) {
      return String(s.adults);
    }
    return `${s.adults}-${s.child_ages.join('-')}`;
  },
};

export function buildUrlFromTemplate(template, scenario) {
  let url = String(template || '');
  for (const [key, resolver] of Object.entries(PLACEHOLDER_RESOLVERS)) {
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
    if (name.startsWith('checkin')) fields.add('checkin');
    if (name.startsWith('checkout')) fields.add('checkout');
    if (name === 'adults') fields.add('adults');
    if (name === 'children') fields.add('children');
    if (name.startsWith('child_ages')) fields.add('child_ages');
    if (name === 'rooms') fields.add('rooms');
    if (name === 'occupancy_path') {
      fields.add('adults');
      fields.add('child_ages');
    }
  }
  return [...fields];
}
