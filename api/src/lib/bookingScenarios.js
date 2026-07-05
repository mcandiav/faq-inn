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
      children: 1,
      child_ages: [10],
    },
    {
      id: 'S2',
      checkin,
      checkout: addDays(checkin, 7),
      nights: 7,
      rooms: 1,
      adults: 3,
      children: 2,
      child_ages: [10, 11],
    },
    {
      id: 'S3',
      checkin,
      checkout: addDays(checkin, 3),
      nights: 3,
      rooms: 2,
      adults: 2,
      children: 0,
      child_ages: [],
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
    children: 1,
    child_ages: [8],
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
