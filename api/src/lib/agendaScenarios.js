// Escenarios de descubrimiento del MOTOR DE AGENDA.
//
// A diferencia del motor de reservas (noches: check-in/check-out, huéspedes,
// habitaciones), la agenda descubre el link a partir de DOS horarios/citas
// específicos: mañana y pasado mañana. La variable a detectar en el link es la
// FECHA de la cita. La ocupación no aplica, por eso va en valores neutros para
// que el extractor compartido no la mapee.

export { formatDateVariants } from './bookingScenarios.js';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function todayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function addDays(iso, days) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const DISCOVERY_SCENARIO_COUNT = 2;

/** Cita de un solo momento: la fecha es la variable; la hora es referencial. */
function agendaScenario(id, iso, time) {
  return {
    id,
    // La cita es un único momento: checkin = checkout = fecha de la cita.
    checkin: iso,
    checkout: iso,
    time,
    // Ocupación no aplica en agenda (valores neutros para el extractor).
    nights: 0,
    rooms: 0,
    adults: 0,
    children: 0,
    child_ages: [],
  };
}

/** Dos horarios específicos: mañana y pasado mañana. */
export function buildDiscoveryScenarios(baseDate) {
  const today = baseDate || todayIso();
  return [
    agendaScenario('S1', addDays(today, 1), '10:00'),
    agendaScenario('S2', addDays(today, 2), '15:00'),
  ];
}

/** Reemplaza fechas almacenadas por mañana / pasado mañana (S1/S2). */
export function refreshDiscoveryScenarios(storedScenarios = []) {
  const fresh = buildDiscoveryScenarios();
  return fresh.map((scenario, index) => ({
    ...scenario,
    id: storedScenarios[index]?.id || scenario.id,
  }));
}

export function buildVerificationScenario(baseDate) {
  const date = baseDate || addDays(todayIso(), 1);
  return agendaScenario('VERIFY', date, '12:00');
}

export function refreshVerificationScenario(storedScenario = {}, checkin) {
  const fresh = buildVerificationScenario(checkin);
  return {
    ...fresh,
    id: storedScenario.id || fresh.id,
  };
}

export function normalizePreviewScenario(input = {}) {
  const date = String(input.checkin || input.date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('fecha de cita inválida');
  }
  const time = String(input.time || '').trim();
  return {
    checkin: date,
    checkout: date,
    time,
    nights: 0,
    rooms: 0,
    adults: 0,
    children: 0,
    child_ages: [],
  };
}

export function describeScenario(scenario) {
  return {
    checkin: scenario.checkin,
    checkout: scenario.checkout,
    time: scenario.time || '',
  };
}
