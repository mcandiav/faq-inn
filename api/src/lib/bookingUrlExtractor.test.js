import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBookingTemplate } from './bookingUrlExtractor.js';
import { buildDiscoveryScenarios } from './bookingScenarios.js';
import {
  buildUrlFromTemplate,
  formatDateForTenant,
  normalizeTemplateToCanonical,
} from './bookingTemplateBuilder.js';

const scenarios = buildDiscoveryScenarios('2026-07-05');

test('query params omnibees-like with canonical template tokens', () => {
  const urls = [
    'https://book.omnibees.com/hotelresults?c=1374&q=2166&NRooms=1&CheckIn=05072026&CheckOut=08072026&ad=2&ch=0&ag=',
    'https://book.omnibees.com/hotelresults?c=1374&q=2166&NRooms=2&CheckIn=05072026&CheckOut=12072026&ad=3&ch=1&ag=11',
  ];

  const result = extractBookingTemplate(scenarios, urls);
  assert.equal(result.ok, true);
  assert.ok(result.booking_url_template.includes('CheckIn={{checkin}}'));
  assert.ok(result.booking_url_template.includes('CheckOut={{checkout}}'));
  assert.ok(result.booking_url_template.includes('{{adults}}'));
  assert.ok(result.booking_url_template.includes('{{children}}'));
  assert.ok(result.booking_url_template.includes('{{rooms}}'));
  assert.equal(result.date_format, 'DDMMYYYY');
  assert.equal(result.child_ages_format, 'csv');
  assert.ok(result.required_fields.includes('children'));
  assert.ok(result.required_fields.includes('rooms'));
  assert.ok(result.confidence_score >= 0.5);
});

test('path params compact occupancy with canonical date tokens', () => {
  const urls = [
    'https://www.pousadamichele.com/search/2026-07-05/2026-07-08/2',
    'https://www.pousadamichele.com/search/2026-07-05/2026-07-12/3-11',
  ];

  const result = extractBookingTemplate(scenarios, urls);
  assert.equal(result.ok, true);
  assert.ok(result.booking_url_template.includes('{{checkin}}'));
  assert.equal(result.date_format, 'YYYY-MM-DD');
});

test('buildUrlFromTemplate formats canonical checkin using tenant date_format', () => {
  const template =
    'https://book.example.com/?in={{checkin}}&out={{checkout}}&ad={{adults}}';
  const built = buildUrlFromTemplate(template, scenarios[0], {
    date_format: 'DDMMYYYY',
  });
  assert.ok(built.includes('in=05072026'));
  assert.ok(built.includes('out=08072026'));
});

test('normalizeTemplateToCanonical upgrades legacy tokens', () => {
  const normalized = normalizeTemplateToCanonical(
    'https://x/?a={{checkin_ddmmyyyy}}&b={{child_ages_csv}}'
  );
  assert.equal(normalized, 'https://x/?a={{checkin}}&b={{child_ages}}');
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

test('formatDateForTenant supports DDMMYYYY', () => {
  assert.equal(formatDateForTenant('2026-07-05', 'DDMMYYYY'), '05072026');
});

test('booking.com discovery compacts tracking params from template', () => {
  const tracking =
    'aid=304142&label=gen173&sid=dd1dda38&all_sr_blocks=x&highlighted_blocks=x&hpos=1&matching_block_id=x&sb_price_type=total&sr_order=popularity&sr_pri_blocks=x&srepoch=1783307970&srpvid=79a117603e030266&type=total&ucfs=1&efdco=0&sb=0';
  const urls = [
    `https://www.booking.com/hotel/br/o-dante.es.html?${tracking}&checkin=2026-07-05&checkout=2026-07-08&dest_id=600421&dest_type=hotel&group_adults=2&group_children=0&no_rooms=1&req_adults=2&req_children=0&hapos=1&dist=0`,
    `https://www.booking.com/hotel/br/o-dante.es.html?${tracking}&checkin=2026-07-05&checkout=2026-07-12&dest_id=600421&dest_type=hotel&group_adults=3&group_children=1&no_rooms=2&req_adults=3&req_children=1&hapos=2&dist=1&age=11`,
  ];

  const result = extractBookingTemplate(scenarios, urls);
  assert.equal(result.ok, true);
  assert.ok(!result.booking_url_template.includes('aid='));
  assert.ok(!result.booking_url_template.includes('sid='));
  assert.ok(!result.booking_url_template.includes('srepoch='));
  assert.ok(result.booking_url_template.includes('checkin={{checkin}}'));
  assert.ok(result.booking_url_template.includes('checkout={{checkout}}'));
  assert.ok(result.booking_url_template.includes('group_adults={{adults}}'));
  assert.ok(result.booking_url_template.includes('dest_id=600421'));

  const built = buildUrlFromTemplate(result.booking_url_template, {
    checkin: '2026-12-02',
    checkout: '2026-12-05',
    adults: 3,
    rooms: 1,
    children: 0,
    child_ages: [],
  });
  assert.ok(!built.includes('aid='));
  assert.ok(built.includes('checkin=2026-12-02'));
  assert.ok(built.includes('group_adults=3'));
});
