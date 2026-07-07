import test from 'node:test';
import assert from 'node:assert/strict';
import { extractAgendaTemplate } from './agendaUrlExtractor.js';
import { buildDiscoveryScenarios } from './agendaScenarios.js';
import { buildUrlFromTemplate } from './bookingTemplateBuilder.js';

test('extractAgendaTemplate detecta la fecha de la cita como variable', () => {
  const scenarios = buildDiscoveryScenarios();
  const urls = scenarios.map(
    (s) => `https://agenda.example.com/book?date=${s.checkin}&service=corte`
  );

  const result = extractAgendaTemplate(scenarios, urls);

  assert.equal(result.ok, true);
  assert.match(result.agenda_url_template, /date=\{\{checkin\}\}/);
  assert.equal(result.fixed_params.service, 'corte');
  assert.equal(result.date_format, 'YYYY-MM-DD');
  assert.ok(result.required_fields.includes('checkin'));
});

test('extractAgendaTemplate detecta fecha y hora, y reconstruye el link', () => {
  const scenarios = buildDiscoveryScenarios();
  const urls = scenarios.map(
    (s) => `https://cal.example.com/slot?d=${s.checkin}&t=${s.time}`
  );

  const result = extractAgendaTemplate(scenarios, urls);

  assert.equal(result.ok, true);
  assert.equal(result.supports_time, true);
  assert.ok(result.required_fields.includes('time'));

  const rebuilt = buildUrlFromTemplate(result.agenda_url_template, scenarios[0], {
    date_format: result.date_format,
  });
  assert.match(rebuilt, new RegExp(`d=${scenarios[0].checkin}`));
  assert.match(rebuilt, /t=10%3A00|t=10:00/);
});

test('extractAgendaTemplate rechaza dominios distintos', () => {
  const scenarios = buildDiscoveryScenarios();
  const urls = [
    `https://a.example.com/book?date=${scenarios[0].checkin}`,
    `https://b.example.com/book?date=${scenarios[1].checkin}`,
  ];

  const result = extractAgendaTemplate(scenarios, urls);
  assert.equal(result.ok, false);
});
