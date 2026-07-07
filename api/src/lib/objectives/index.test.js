import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OBJECTIVES,
  OBJECTIVE_SLUGS,
  PRIMARY_OBJECTIVE_SLUGS,
  getObjective,
  isPrimaryObjectiveSlug,
  isValidObjectiveSlug,
} from './index.js';

test('lists four objectives', () => {
  assert.equal(OBJECTIVES.length, 4);
  assert.deepEqual(OBJECTIVE_SLUGS, [
    'reservar_horarios',
    'reservar_noches',
    'enviar_a_sitio_web',
    'responder_preguntas',
  ]);
});

test('getObjective returns motor for reservar_noches', () => {
  const o = getObjective('reservar_noches');
  assert.equal(o.motor, 'reservas');
  assert.equal(o.needs_booking_motor, true);
});

test('isValidObjectiveSlug rejects unknown', () => {
  assert.equal(isValidObjectiveSlug('hotel'), false);
  assert.equal(isValidObjectiveSlug('responder_preguntas'), true);
});

test('primary objectives exclude responder_preguntas', () => {
  assert.equal(PRIMARY_OBJECTIVE_SLUGS.length, 3);
  assert.equal(isPrimaryObjectiveSlug('reservar_noches'), true);
  assert.equal(isPrimaryObjectiveSlug('responder_preguntas'), false);
});
