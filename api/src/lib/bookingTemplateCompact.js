/** Parámetros de tracking/redundantes que Booking.com no necesita en el deep link. */
export const BOOKING_COM_DROP_PARAMS = new Set([
  'aid',
  'label',
  'sid',
  'all_sr_blocks',
  'highlighted_blocks',
  'hpos',
  'matching_block_id',
  'sb_price_type',
  'sr_order',
  'sr_pri_blocks',
  'srepoch',
  'srpvid',
  'type',
  'ucfs',
  'efdco',
  'sb',
  'room1',
  'req_adults',
  'req_children',
  'hapos',
  'dist',
  'highlighted_hotels',
  'ss',
  'ssne',
  'ssne_untouched',
  'lang',
  'src_elem',
  'src',
  'age',
]);

const BOOKING_COM_FIXED_KEEP = new Set(['dest_id', 'dest_type']);

function isBookingComHost(hostname) {
  return String(hostname || '').includes('booking.com');
}

function hasPlaceholder(variableParams, placeholder) {
  return Object.values(variableParams).includes(placeholder);
}

/**
 * Reduce plantilla Booking.com a parámetros esenciales (checkin, checkout, huéspedes, destino).
 */
export function compactBookingComDiscoveryParams(hostname, variableParams = {}, fixedParams = {}) {
  if (!isBookingComHost(hostname)) {
    return { variableParams, fixedParams };
  }

  const compactVariable = {
    checkin: '{{checkin}}',
    checkout: '{{checkout}}',
    group_adults: '{{adults}}',
  };

  if (hasPlaceholder(variableParams, '{{children}}')) {
    compactVariable.group_children = '{{children}}';
  }

  if (hasPlaceholder(variableParams, '{{rooms}}')) {
    compactVariable.no_rooms = '{{rooms}}';
  }

  if (hasPlaceholder(variableParams, '{{child_ages}}')) {
    compactVariable.age = '{{child_ages}}';
  }

  const compactFixed = {};
  for (const key of BOOKING_COM_FIXED_KEEP) {
    if (fixedParams[key] !== undefined && fixedParams[key] !== '') {
      compactFixed[key] = fixedParams[key];
    }
  }

  if (
    !compactVariable.group_children &&
    fixedParams.group_children === '0'
  ) {
    compactFixed.group_children = '0';
  }

  if (!compactVariable.no_rooms && fixedParams.no_rooms !== undefined) {
    compactFixed.no_rooms = fixedParams.no_rooms;
  }

  return {
    variableParams: compactVariable,
    fixedParams: compactFixed,
  };
}

/** Quita tracking de una URL Booking.com ya construida (plantillas legacy). */
export function stripBookingComTracking(url) {
  try {
    const parsed = new URL(url);
    if (!isBookingComHost(parsed.hostname)) {
      return url;
    }

    for (const key of BOOKING_COM_DROP_PARAMS) {
      parsed.searchParams.delete(key);
    }

    if (parsed.searchParams.has('group_adults')) {
      parsed.searchParams.delete('req_adults');
    }
    if (parsed.searchParams.has('group_children')) {
      parsed.searchParams.delete('req_children');
      parsed.searchParams.delete('dist');
    }
    if (parsed.searchParams.has('no_rooms')) {
      parsed.searchParams.delete('hapos');
      parsed.searchParams.delete('hpos');
      parsed.searchParams.delete('ucfs');
    }

    return parsed.toString();
  } catch {
    return url;
  }
}
