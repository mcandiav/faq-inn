import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBookingTemplate } from './bookingUrlExtractor.js';
import { buildDiscoveryScenarios } from './bookingScenarios.js';
import { buildUrlFromTemplate } from './bookingTemplateBuilder.js';

const scenarios = buildDiscoveryScenarios('2026-07-05');

test('query params omnibees-like with 2 discovery links', () => {
  const urls = [
    'https://book.omnibees.com/hotelresults?c=1374&q=2166&NRooms=1&CheckIn=05072026&CheckOut=08072026&ad=2&ch=0&ag=',
    'https://book.omnibees.com/hotelresults?c=1374&q=2166&NRooms=2&CheckIn=05072026&CheckOut=12072026&ad=3&ch=1&ag=11',
  ];

  const result = extractBookingTemplate(scenarios, urls);
  assert.equal(result.ok, true);
  assert.ok(result.booking_url_template.includes('{{checkin_ddmmyyyy}}'));
  assert.ok(result.booking_url_template.includes('{{adults}}'));
  assert.ok(result.booking_url_template.includes('{{children}}'));
  assert.ok(result.booking_url_template.includes('{{rooms}}'));
  assert.equal(result.date_format, 'DDMMYYYY');
  assert.ok(result.required_fields.includes('children'));
  assert.ok(result.required_fields.includes('rooms'));
  assert.ok(result.confidence_score >= 0.5);
});

test('path params compact occupancy with 2 discovery links', () => {
  const urls = [
    'https://www.pousadamichele.com/search/2026-07-05/2026-07-08/2',
    'https://www.pousadamichele.com/search/2026-07-05/2026-07-12/3-11',
  ];

  const result = extractBookingTemplate(scenarios, urls);
  assert.equal(result.ok, true);
  assert.ok(result.booking_url_template.includes('{{checkin_yyyy_mm_dd}}'));
  assert.equal(result.date_format, 'YYYY-MM-DD');
});

test('rejects different domains', () => {
  const urls = [
    'https://a.example.com/r?d=05072026',
    'https://b.example.com/r?d=05072026',
  ];
  const result = extractBookingTemplate(scenarios, urls);
  assert.equal(result.ok, false);
});

test('rejects wrong link count', () => {
  const result = extractBookingTemplate(scenarios, [scenarios[0]]);
  assert.equal(result.ok, false);
});

test('round trip builds url', () => {
  const template =
    'https://book.example.com/?in={{checkin_ddmmyyyy}}&out={{checkout_ddmmyyyy}}&ad={{adults}}';
  const built = buildUrlFromTemplate(template, scenarios[0]);
  assert.ok(built.includes('05072026'));
  assert.ok(built.includes('08072026'));
  assert.ok(built.includes('ad=2'));
});
