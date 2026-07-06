import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compactBookingComDiscoveryParams,
  stripBookingComTracking,
} from './bookingTemplateCompact.js';
import { buildUrlFromTemplate } from './bookingTemplateBuilder.js';

test('compactBookingComDiscoveryParams keeps essentials only', () => {
  const { variableParams, fixedParams } = compactBookingComDiscoveryParams(
    'www.booking.com',
    {
      checkin: '{{checkin}}',
      checkout: '{{checkout}}',
      group_adults: '{{adults}}',
      no_rooms: '{{rooms}}',
      hapos: '{{rooms}}',
      dist: '{{children}}',
      aid: '304142',
    },
    {
      aid: '304142',
      label: 'gen173nr',
      sid: 'dd1dda38',
      dest_id: '600421',
      dest_type: 'hotel',
      group_children: '0',
      no_rooms: '1',
    }
  );

  assert.equal(variableParams.checkin, '{{checkin}}');
  assert.equal(variableParams.checkout, '{{checkout}}');
  assert.equal(variableParams.group_adults, '{{adults}}');
  assert.equal(variableParams.no_rooms, '{{rooms}}');
  assert.equal(variableParams.hapos, undefined);
  assert.equal(variableParams.dist, undefined);
  assert.equal(variableParams.group_children, '{{children}}');
  assert.equal(variableParams.aid, undefined);
  assert.equal(fixedParams.dest_id, '600421');
  assert.equal(fixedParams.dest_type, 'hotel');
  assert.equal(fixedParams.aid, undefined);
  assert.equal(fixedParams.label, undefined);
});

test('stripBookingComTracking removes tracking from built URL', () => {
  const long =
    'https://www.booking.com/hotel/br/o-dante.es.html?aid=304142&label=gen173&checkin=2026-12-02&checkout=2026-12-05&group_adults=3&group_children=0&no_rooms=1&dest_id=600421&dest_type=hotel&sid=abc&srepoch=123';
  const short = stripBookingComTracking(long);
  assert.ok(short.includes('checkin=2026-12-02'));
  assert.ok(short.includes('group_adults=3'));
  assert.ok(!short.includes('aid='));
  assert.ok(!short.includes('sid='));
  assert.ok(!short.includes('srepoch='));
});

test('buildUrlFromTemplate strips booking.com tracking on output', () => {
  const template =
    'https://www.booking.com/hotel/br/o-dante.es.html?aid=304142&checkin={{checkin}}&checkout={{checkout}}&group_adults={{adults}}&group_children=0&no_rooms=1&dest_id=600421&dest_type=hotel&sid=xyz';
  const built = buildUrlFromTemplate(template, {
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
