import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OBJECTIVES,
  OBJECTIVE_SLUGS,
  PRIMARY_OBJECTIVE_SLUGS,
  DEFAULT_OBJECTIVE_SLUG,
  getObjective,
  isPrimaryObjectiveSlug,
  isValidObjectiveSlug,
  normalizeObjectiveSlug,
  buildObjetivoDirective,
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

test('normalizeObjectiveSlug falls back to responder_preguntas', () => {
  assert.equal(DEFAULT_OBJECTIVE_SLUG, 'responder_preguntas');
  assert.equal(normalizeObjectiveSlug(''), 'responder_preguntas');
  assert.equal(normalizeObjectiveSlug('FAQ'), 'responder_preguntas');
  assert.equal(normalizeObjectiveSlug('faq'), 'responder_preguntas');
  assert.equal(normalizeObjectiveSlug('desconocido'), 'responder_preguntas');
  assert.equal(normalizeObjectiveSlug('reservar_noches'), 'reservar_noches');
});

test('buildObjetivoDirective renders natural-language directive', () => {
  assert.equal(buildObjetivoDirective('responder_preguntas'), 'responder preguntas');
  assert.equal(buildObjetivoDirective('', ''), 'responder preguntas');
  assert.equal(
    buildObjetivoDirective('enviar_a_sitio_web', 'https://ej.com'),
    'llevar al cliente a https://ej.com'
  );
  assert.equal(
    buildObjetivoDirective('reservar_noches', 'https://l/{{x}}'),
    'reservar usando el link https://l/{{x}}'
  );
  assert.equal(
    buildObjetivoDirective('reservar_horarios', 'https://a/{{x}}'),
    'agendar usando el link https://a/{{x}}'
  );
});
