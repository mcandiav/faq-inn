import { formatDateVariants, DISCOVERY_SCENARIO_COUNT } from './bookingScenarios.js';
import { buildUrlFromTemplate, listRequiredFields } from './bookingTemplateBuilder.js';

function normalizeUrl(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}


const PARAM_HINTS = {
  checkin: ['checkin', 'check_in', 'arrival', 'from', 'start', 'entrada'],
  checkout: ['checkout', 'check_out', 'departure', 'to', 'end', 'salida'],
  rooms: ['rooms', 'nrooms', 'numrooms', 'room'],
  adults: ['adults', 'adult', 'ad', 'guests', 'pax'],
  children: ['children', 'child', 'ch', 'kids', 'menor'],
  child_ages: ['ages', 'ag', 'childages', 'child_ages'],
};

function hintPlaceholderForKey(key, scenario) {
  const normalizedKey = String(key || '').toLowerCase();
  const findHint = (names) => names.some((name) => normalizedKey.includes(name));

  if (findHint(PARAM_HINTS.checkin)) {
    return pickDatePlaceholder(scenario.checkin, 'checkin');
  }
  if (findHint(PARAM_HINTS.checkout)) {
    return pickDatePlaceholder(scenario.checkout, 'checkout');
  }
  if (findHint(PARAM_HINTS.rooms)) {
    return '{{rooms}}';
  }
  if (findHint(PARAM_HINTS.adults)) {
    return '{{adults}}';
  }
  if (findHint(PARAM_HINTS.children)) {
    return '{{children}}';
  }
  if (findHint(PARAM_HINTS.child_ages)) {
    return scenario.child_ages.length ? '{{child_ages_csv}}' : null;
  }
  return null;
}

function pickDatePlaceholder(iso, prefix) {
  const variants = formatDateVariants(iso);
  return {
    [variants.yyyy_mm_dd]: `{{${prefix}_yyyy_mm_dd}}`,
    [variants.ddmmyyyy]: `{{${prefix}_ddmmyyyy}}`,
    [variants.yyyymmdd]: `{{${prefix}_yyyymmdd}}`,
    [variants.dd_mm_yyyy]: `{{${prefix}_dd_mm_yyyy}}`,
    [variants.mm_dd_yyyy]: `{{${prefix}_mm_dd_yyyy}}`,
  };
}

function matchPlaceholder(value, scenario, key = '') {
  const normalized = decodeURIComponent(String(value || ''));
  if (!normalized) {
    return null;
  }

  const hinted = hintPlaceholderForKey(key, scenario);
  if (hinted) {
    const dateMap = pickDatePlaceholder(
      key.toLowerCase().includes('out') ? scenario.checkout : scenario.checkin,
      key.toLowerCase().includes('out') ? 'checkout' : 'checkin'
    );
    if (typeof hinted === 'string') {
      if (
        (hinted === '{{rooms}}' && normalized === String(scenario.rooms)) ||
        (hinted === '{{adults}}' && normalized === String(scenario.adults)) ||
        (hinted === '{{children}}' && normalized === String(scenario.children)) ||
        (hinted === '{{child_ages_csv}}' &&
          normalized === scenario.child_ages.join(','))
      ) {
        return hinted;
      }
    }
    if (typeof dateMap === 'object') {
      for (const [formatted, placeholder] of Object.entries(dateMap)) {
        if (normalized === formatted) {
          return placeholder;
        }
      }
    }
  }

  for (const [prefix, iso] of [
    ['checkin', scenario.checkin],
    ['checkout', scenario.checkout],
  ]) {
    const dateMap = pickDatePlaceholder(iso, prefix);
    for (const [formatted, placeholder] of Object.entries(dateMap)) {
      if (normalized === formatted) {
        return placeholder;
      }
    }
  }

  if (normalized === String(scenario.rooms)) {
    return '{{rooms}}';
  }
  if (normalized === String(scenario.adults)) {
    return '{{adults}}';
  }
  if (normalized === String(scenario.children)) {
    return '{{children}}';
  }
  if (normalized === scenario.child_ages.join(',')) {
    return '{{child_ages_csv}}';
  }
  if (normalized === scenario.child_ages.join(';')) {
    return '{{child_ages_semicolon}}';
  }
  if (normalized === scenario.child_ages.join('-')) {
    return '{{child_ages_dash}}';
  }
  if (
    scenario.child_ages.length &&
    normalized === `${scenario.adults}-${scenario.child_ages.join('-')}`
  ) {
    return '{{occupancy_path}}';
  }
  if (scenario.child_ages.length === 0 && normalized === String(scenario.adults)) {
    return '{{occupancy_path}}';
  }

  return null;
}

function extractQueryVariables(parsedUrls, scenarios) {
  const variableParams = {};
  const fixedParams = {};
  const warnings = [];
  const allKeys = new Set();
  const expectedCount = scenarios.length;

  for (const parsed of parsedUrls) {
    for (const key of parsed.searchParams.keys()) {
      allKeys.add(key);
    }
  }

  for (const key of allKeys) {
    const values = parsedUrls.map((parsed) => parsed.searchParams.get(key));
    const placeholders = values.map((value, index) =>
      value === null || value === ''
        ? null
        : matchPlaceholder(value, scenarios[index], key)
    );

    const defined = placeholders.filter(Boolean);
    if (defined.length === expectedCount && new Set(defined).size === 1) {
      variableParams[key] = defined[0];
      continue;
    }

    const nonEmpty = values.filter((v) => v !== null && v !== '');
    const unique = [...new Set(nonEmpty)];
    if (unique.length === 1 && nonEmpty.length === parsedUrls.length) {
      fixedParams[key] = unique[0];
      continue;
    }

    if (defined.length >= 1) {
      variableParams[key] = defined[0];
      warnings.push(`Parámetro ${key} con detección parcial`);
    } else {
      warnings.push(`Parámetro ${key} no pudo mapearse a variables conocidas`);
    }
  }

  return { variableParams, fixedParams, warnings };
}

function extractPathVariables(parsedUrls, scenarios) {
  const paths = parsedUrls.map((parsed) =>
    parsed.pathname.split('/').filter(Boolean)
  );
  const maxLen = Math.max(...paths.map((p) => p.length));
  const variableSegments = {};
  const warnings = [];
  const expectedCount = scenarios.length;

  for (let i = 0; i < maxLen; i += 1) {
    const segments = paths.map((path) => path[i] ?? null);
    const placeholders = segments.map((segment, index) =>
      segment === null ? null : matchPlaceholder(segment, scenarios[index], `path_${i}`)
    );
    const defined = placeholders.filter(Boolean);

    if (defined.length === expectedCount && new Set(defined).size === 1) {
      variableSegments[i] = defined[0];
      continue;
    }

    const nonNull = segments.filter((s) => s !== null);
    const unique = [...new Set(nonNull)];
    if (unique.length === 1 && nonNull.length === parsedUrls.length) {
      continue;
    }

    if (defined.length >= 1) {
      variableSegments[i] = defined[0];
      warnings.push(`Segmento de path ${i + 1} con detección parcial`);
    } else if (unique.length > 1) {
      warnings.push(`Segmento de path ${i + 1} ambiguo`);
    }
  }

  return { variableSegments, warnings };
}

function applyPathTemplate(pathname, variableSegments) {
  const segments = pathname.split('/').filter(Boolean);
  const templated = segments.map((segment, index) => {
    if (variableSegments[index]) {
      return variableSegments[index];
    }
    return segment;
  });
  return `/${templated.join('/')}`;
}

function applyQueryTemplate(searchParams, variableParams, fixedParams) {
  const keys = new Set([
    ...searchParams.keys(),
    ...Object.keys(fixedParams),
    ...Object.keys(variableParams),
  ]);
  const parts = [];

  for (const key of keys) {
    let value;
    if (variableParams[key]) {
      value = variableParams[key];
    } else if (fixedParams[key] !== undefined) {
      value = fixedParams[key];
    } else if (searchParams.has(key)) {
      value = searchParams.get(key);
    } else {
      continue;
    }

    const encodedValue = String(value).includes('{{')
      ? value
      : encodeURIComponent(value);
    parts.push(`${encodeURIComponent(key)}=${encodedValue}`);
  }

  return parts.length ? `?${parts.join('&')}` : '';
}

function detectDateFormat(variableParams, variableSegments) {
  const values = [
    ...Object.values(variableParams),
    ...Object.values(variableSegments),
  ];
  if (values.some((v) => String(v).includes('ddmmyyyy'))) {
    return 'DDMMYYYY';
  }
  if (values.some((v) => String(v).includes('yyyymmdd'))) {
    return 'YYYYMMDD';
  }
  if (values.some((v) => String(v).includes('yyyy_mm_dd'))) {
    return 'YYYY-MM-DD';
  }
  return '';
}

function computeConfidence(scenarios, variableParams, variableSegments, warnings, dateFormat) {
  let score = 0;
  const allValues = [
    ...Object.values(variableParams),
    ...Object.values(variableSegments),
  ];
  const blob = allValues.join(' ');

  const hasCheckin = blob.includes('checkin');
  const hasCheckout = blob.includes('checkout');
  const hasAdults = blob.includes('adults') || blob.includes('occupancy_path');
  const hasChildren = blob.includes('children') || blob.includes('child_ages');

  if (hasCheckin && hasCheckout) score += 0.35;
  if (hasAdults) score += 0.2;
  if (hasChildren) score += 0.1;
  if (blob.includes('rooms')) score += 0.05;
  if (dateFormat) score += 0.2;
  if (warnings.length === 0) score += 0.15;

  if (!hasCheckin || !hasCheckout) {
    score = Math.min(score, 0.35);
  }

  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

function validateRoundTrip(template, scenarios) {
  for (const scenario of scenarios) {
    const built = buildUrlFromTemplate(template, scenario);
    try {
      new URL(built);
    } catch {
      return false;
    }
  }
  return true;
}

export function extractBookingTemplate(scenarios, rawUrls) {
  const warnings = [];

  if (!Array.isArray(scenarios) || scenarios.length < DISCOVERY_SCENARIO_COUNT) {
    return {
      ok: false,
      error: `Se requieren ${DISCOVERY_SCENARIO_COUNT} escenarios de prueba`,
    };
  }

  if (!Array.isArray(rawUrls) || rawUrls.length !== scenarios.length) {
    return {
      ok: false,
      error: `Debe pegar exactamente ${scenarios.length} links de prueba`,
    };
  }

  const parsedUrls = rawUrls.map(normalizeUrl);
  if (parsedUrls.some((url) => !url)) {
    return {
      ok: false,
      error: 'Uno o más links no son URLs válidas (http/https)',
    };
  }

  const hosts = parsedUrls.map((url) => url.hostname);
  if (new Set(hosts).size !== 1) {
    return {
      ok: false,
      error: `Los ${scenarios.length} links deben pertenecer al mismo dominio/motor`,
    };
  }

  const queryResult = extractQueryVariables(parsedUrls, scenarios);
  const pathResult = extractPathVariables(parsedUrls, scenarios);
  warnings.push(...queryResult.warnings, ...pathResult.warnings);

  const baseUrl = parsedUrls[0];
  const templatedPath = applyPathTemplate(
    baseUrl.pathname,
    pathResult.variableSegments
  );
  const templatedQuery = applyQueryTemplate(
    baseUrl.searchParams,
    queryResult.variableParams,
    queryResult.fixedParams
  );
  const bookingUrlTemplate = `${baseUrl.origin}${templatedPath}${templatedQuery}`;

  const variableParams = {
    ...queryResult.variableParams,
    ...Object.fromEntries(
      Object.entries(pathResult.variableSegments).map(([index, value]) => [
        `path_${index}`,
        value,
      ])
    ),
  };

  const dateFormat = detectDateFormat(
    queryResult.variableParams,
    pathResult.variableSegments
  );
  if (!dateFormat) {
    warnings.push('No se pudo detectar el formato de fecha del motor');
  }
  const confidenceScore = computeConfidence(
    scenarios,
    queryResult.variableParams,
    pathResult.variableSegments,
    warnings,
    dateFormat
  );

  const supportsRooms = Object.values(variableParams).some((v) =>
    String(v).includes('rooms')
  );
  const supportsChildren = Object.values(variableParams).some((v) =>
    String(v).includes('children')
  );
  const supportsChildAges = Object.values(variableParams).some((v) =>
    String(v).includes('child_ages')
  );

  const roundTripOk = validateRoundTrip(bookingUrlTemplate, scenarios);
  if (!roundTripOk) {
    warnings.push('La plantilla no pudo reconstruir las URLs de prueba');
  }

  let validationStatus = 'detected';
  if (confidenceScore < 0.5 || !roundTripOk) {
    validationStatus = 'needs_review';
  }

  const requiredFields = listRequiredFields(variableParams);

  return {
    ok: true,
    booking_url_mode: 'discovered_template',
    booking_url_template: bookingUrlTemplate,
    booking_url_base: baseUrl.origin,
    booking_engine_name: hosts[0],
    date_format: dateFormat,
    occupancy_format: Object.values(variableParams).some((v) =>
      String(v).includes('occupancy_path')
    )
      ? 'path_compact'
      : 'query_params',
    required_fields: requiredFields,
    supports_rooms: supportsRooms,
    supports_children: supportsChildren,
    supports_child_ages: supportsChildAges,
    fixed_params: queryResult.fixedParams,
    variable_params: variableParams,
    confidence_score: confidenceScore,
    validation_status: validationStatus,
    warnings,
  };
}
