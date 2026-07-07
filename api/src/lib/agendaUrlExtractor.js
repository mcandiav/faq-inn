// Extractor de plantilla del MOTOR DE AGENDA (independiente del de reservas).
//
// El motor de reservas descubre noches (check-in/check-out, huéspedes,
// habitaciones). La agenda descubre CITAS: la(s) variable(s) del link son la
// FECHA de la cita y, opcionalmente, la HORA. No maneja ocupación.
//
// Recibe los 2 escenarios de agenda (mañana / pasado mañana) y sus links de
// ejemplo, y deduce qué parte del link es la fecha (y hora) para armar una
// plantilla con {{checkin}} y {{time}}.

import {
  buildUrlFromTemplate,
  inferDateFormatFromLiteral,
  normalizeTemplateToCanonical,
} from './bookingTemplateBuilder.js';

export const AGENDA_DISCOVERY_SCENARIO_COUNT = 2;

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

/** Variantes aceptadas de una hora "HH:MM" en un link. */
function timeVariants(time) {
  const t = String(time || '').trim();
  if (!t) {
    return [];
  }
  const [h, m] = t.split(':');
  if (m === undefined) {
    return [t];
  }
  return [t, `${h}${m}`, `${h}.${m}`, `${h}-${m}`, `${h}h${m}`];
}

function matchPlaceholder(value, scenario) {
  const normalized = decodeURIComponent(String(value || ''));
  if (!normalized) {
    return null;
  }
  if (inferDateFormatFromLiteral(scenario.checkin, normalized)) {
    return '{{checkin}}';
  }
  if (timeVariants(scenario.time).includes(normalized)) {
    return '{{time}}';
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
        : matchPlaceholder(value, scenarios[index])
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
      warnings.push(`Parámetro ${key} no pudo mapearse a fecha/hora de la cita`);
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
      segment === null ? null : matchPlaceholder(segment, scenarios[index])
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
  const templated = segments.map((segment, index) =>
    variableSegments[index] ? variableSegments[index] : segment
  );
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

function detectDateFormat(scenarios, parsedUrls, variableParams, variableSegments) {
  for (const [key, placeholder] of Object.entries(variableParams)) {
    if (placeholder !== '{{checkin}}') {
      continue;
    }
    for (let index = 0; index < scenarios.length; index += 1) {
      const literal = parsedUrls[index].searchParams.get(key);
      const fmt = inferDateFormatFromLiteral(scenarios[index].checkin, literal);
      if (fmt) {
        return fmt;
      }
    }
  }

  for (const [segmentIndex, placeholder] of Object.entries(variableSegments)) {
    if (placeholder !== '{{checkin}}') {
      continue;
    }
    for (let index = 0; index < scenarios.length; index += 1) {
      const segments = parsedUrls[index].pathname.split('/').filter(Boolean);
      const literal = segments[Number(segmentIndex)];
      const fmt = inferDateFormatFromLiteral(scenarios[index].checkin, literal);
      if (fmt) {
        return fmt;
      }
    }
  }

  return '';
}

function computeConfidence(variableParams, variableSegments, warnings, dateFormat) {
  const blob = [
    ...Object.values(variableParams),
    ...Object.values(variableSegments),
  ].join(' ');
  const hasDate = blob.includes('checkin');
  const hasTime = blob.includes('time');

  let score = 0;
  if (hasDate) score += 0.55;
  if (dateFormat) score += 0.2;
  if (hasTime) score += 0.1;
  if (warnings.length === 0) score += 0.15;

  if (!hasDate) {
    score = Math.min(score, 0.3);
  }

  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

function validateRoundTrip(template, scenarios, buildOptions) {
  for (const scenario of scenarios) {
    const built = buildUrlFromTemplate(template, scenario, buildOptions);
    try {
      new URL(built);
    } catch {
      return false;
    }
  }
  return true;
}

export function extractAgendaTemplate(scenarios, rawUrls) {
  const warnings = [];

  if (!Array.isArray(scenarios) || scenarios.length < AGENDA_DISCOVERY_SCENARIO_COUNT) {
    return {
      ok: false,
      error: `Se requieren ${AGENDA_DISCOVERY_SCENARIO_COUNT} horarios de prueba`,
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
      error: `Los ${scenarios.length} links deben pertenecer al mismo dominio/sistema`,
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
  const agendaUrlTemplate = normalizeTemplateToCanonical(
    `${baseUrl.origin}${templatedPath}${templatedQuery}`
  );

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
    scenarios,
    parsedUrls,
    queryResult.variableParams,
    pathResult.variableSegments
  );
  if (!dateFormat) {
    warnings.push('No se pudo detectar el formato de fecha del sistema de agenda');
  }

  const supportsTime = Object.values(variableParams).some((v) =>
    String(v).includes('time')
  );
  const requiredFields = ['checkin', ...(supportsTime ? ['time'] : [])];

  const buildOptions = { date_format: dateFormat };
  const confidenceScore = computeConfidence(
    queryResult.variableParams,
    pathResult.variableSegments,
    warnings,
    dateFormat
  );

  const roundTripOk = validateRoundTrip(agendaUrlTemplate, scenarios, buildOptions);
  if (!roundTripOk) {
    warnings.push('La plantilla no pudo reconstruir los links de prueba');
  }

  let validationStatus = 'detected';
  if (confidenceScore < 0.5 || !roundTripOk) {
    validationStatus = 'needs_review';
  }

  return {
    ok: true,
    agenda_url_mode: 'discovered_template',
    agenda_url_template: agendaUrlTemplate,
    agenda_url_base: baseUrl.origin,
    agenda_engine_name: hosts[0],
    date_format: dateFormat,
    supports_time: supportsTime,
    required_fields: requiredFields,
    fixed_params: queryResult.fixedParams,
    variable_params: variableParams,
    confidence_score: confidenceScore,
    validation_status: validationStatus,
    warnings,
  };
}
