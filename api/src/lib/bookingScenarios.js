function pad2(n) {
  return String(n).padStart(2, '0');
}

function parseIsoDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d, iso };
}

export function formatDateVariants(iso) {
  const { y, m, d } = parseIsoDate(iso);
  const mm = pad2(m);
  const dd = pad2(d);
  return {
    yyyy_mm_dd: iso,
    yyyymmdd: `${y}${mm}${dd}`,
    ddmmyyyy: `${dd}${mm}${y}`,
    dd_mm_yyyy: `${dd}/${mm}/${y}`,
    mm_dd_yyyy: `${mm}/${dd}/${y}`,
  };
}

function addDays(iso, days) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export const DISCOVERY_SCENARIO_COUNT = 2;

export function buildDiscoveryScenarios(baseDate) {
  const checkin = baseDate || todayIso();
  return [
    {
      id: 'S1',
      checkin,
      checkout: addDays(checkin, 3),
      nights: 3,
      rooms: 1,
      adults: 2,
      children: 0,
      child_ages: [],
    },
    {
      id: 'S2',
      checkin,
      checkout: addDays(checkin, 7),
      nights: 7,
      rooms: 2,
      adults: 3,
      children: 1,
      child_ages: [11],
    },
  ];
}

export function buildVerificationScenario(baseDate) {
  const checkin = baseDate || todayIso();
  return {
    id: 'VERIFY',
    checkin,
    checkout: addDays(checkin, 1),
    nights: 1,
    rooms: 1,
    adults: 1,
    children: 0,
    child_ages: [],
  };
}

function daysBetween(checkin, checkout) {
  const start = new Date(`${checkin}T12:00:00Z`);
  const end = new Date(`${checkout}T12:00:00Z`);
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

function parseChildAges(raw) {
  if (Array.isArray(raw)) {
    return raw.map(Number).filter((n) => !Number.isNaN(n));
  }
  const text = String(raw ?? '').trim();
  if (!text) {
    return [];
  }
  return text
    .split(/[,;]+/)
    .map((part) => Number(part.trim()))
    .filter((n) => !Number.isNaN(n));
}

export function normalizePreviewScenario(input = {}) {
  const checkin = String(input.checkin || '').trim();
  const checkout = String(input.checkout || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkin)) {
    throw new Error('check-in inválido');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkout)) {
    throw new Error('check-out inválido');
  }
  if (checkout <= checkin) {
    throw new Error('check-out debe ser posterior al check-in');
  }

  const childAges = parseChildAges(input.child_ages ?? input.child_age);
  const children =
    input.children !== undefined && input.children !== ''
      ? Math.max(0, Number(input.children) || 0)
      : childAges.length > 0
        ? childAges.length
        : 0;

  return {
    checkin,
    checkout,
    nights: daysBetween(checkin, checkout),
    adults: Math.max(1, Number(input.adults) || 1),
    children,
    child_ages: childAges,
    rooms: Math.max(1, Number(input.rooms) || 1),
  };
}

export function describeScenario(scenario, locale = 'es') {
  const ages =
    scenario.child_ages?.length > 0
      ? scenario.child_ages.join(', ')
      : locale === 'en'
        ? 'none'
        : locale === 'pt'
          ? 'nenhum'
          : 'ninguno';
  return {
    rooms: scenario.rooms,
    checkin: scenario.checkin,
    checkout: scenario.checkout,
    adults: scenario.adults,
    children: scenario.children,
    child_ages: scenario.child_ages,
    agesLabel: ages,
  };
}
