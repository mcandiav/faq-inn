import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OBJECTIVES,
  OBJECTIVE_SLUGS,
  getObjective,
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
