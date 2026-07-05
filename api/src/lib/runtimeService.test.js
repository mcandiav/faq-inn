import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichBookingConfig } from './runtimeService.js';

test('enrichBookingConfig derives placeholder_map from variable_params', () => {
  const config = enrichBookingConfig({
    variable_params: {
      CheckIn: '{{checkin_ddmmyyyy}}',
      CheckOut: '{{checkout_ddmmyyyy}}',
      ad: '{{adults}}',
      NRooms: '{{rooms}}',
    },
    date_format: 'DDMMYYYY',
    supports_rooms: true,
  });

  assert.equal(config.placeholder_map.checkin, '{{checkin_ddmmyyyy}}');
  assert.equal(config.placeholder_map.checkout, '{{checkout_ddmmyyyy}}');
  assert.equal(config.placeholder_map.adults, '{{adults}}');
  assert.equal(config.placeholder_map.rooms, '{{rooms}}');
  assert.ok(Array.isArray(config.required_fields));
  assert.ok(config.required_fields.includes('checkin'));
});

test('enrichBookingConfig parses JSON string input', () => {
  const raw = JSON.stringify({
    variable_params: { ad: '{{adults}}' },
    supports_children: true,
  });
  const config = enrichBookingConfig(raw);
  assert.equal(config.placeholder_map.adults, '{{adults}}');
  assert.equal(config.supports_children, true);
});
