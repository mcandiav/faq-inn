import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildApprovedBookingRecord,
  buildPlaceholderMap,
  buildRequiredFields,
} from './bookingApprovedFormat.js';

test('buildPlaceholderMap maps engine tokens to canonical fields', () => {
  const map = buildPlaceholderMap({
    CheckIn: '{{checkin}}',
    CheckOut: '{{checkout}}',
    ad: '{{adults}}',
    ag: '{{child_ages}}',
  });
  assert.equal(map.checkin, '{{checkin}}');
  assert.equal(map.checkout, '{{checkout}}');
  assert.equal(map.adults, '{{adults}}');
  assert.equal(map.child_ages, '{{child_ages}}');
});

test('buildApprovedBookingRecord only on approve payload shape', () => {
  const record = buildApprovedBookingRecord(
    {
      candidate_template:
        'https://book.example.com/?in={{checkin}}&ad={{adults}}',
      candidate_config: {
        date_format: 'DDMMYYYY',
        child_ages_format: 'csv',
        variable_params: {
          CheckIn: '{{checkin}}',
          ad: '{{adults}}',
        },
        required_fields: ['checkin', 'checkout', 'adults'],
        supports_rooms: true,
        supports_children: false,
        supports_child_ages: false,
        fixed_params: { c: '1374' },
        booking_engine_name: 'book.example.com',
      },
      confidence_score: 0.9,
      warnings: [],
    },
    42,
    'https://book.example.com'
  );

  assert.equal(record.validation_status, 'approved');
  assert.equal(record.booking_url_mode, 'discovered_template');
  assert.ok(record.booking_url_template.includes('{{checkin}}'));
  assert.deepEqual(record.booking_config.required_fields, [
    'checkin',
    'checkout',
    'adults',
  ]);
  assert.equal(record.booking_config.approved_by_user_id, 42);
  assert.equal(record.booking_config.placeholder_map.checkin, '{{checkin}}');
});

test('buildPlaceholderMap ignores malformed brace tokens', () => {
  const map = buildPlaceholderMap({
    ok: '{{checkin}}',
    halfOpen: '{{checkout',
    halfClose: 'adults}}',
    plain: 'rooms',
  });
  assert.equal(map.checkin, '{{checkin}}');
  assert.equal(map.checkout, undefined);
  assert.equal(map.adults, undefined);
  assert.equal(map.rooms, '{{rooms}}');
});

test('buildRequiredFields accepts plain canonical names without braces', () => {
  const fields = buildRequiredFields({
    required_fields: ['checkin', 'checkout', 'adults'],
    variable_params: {},
  });
  assert.deepEqual(fields, ['checkin', 'checkout', 'adults']);
});

test('buildRequiredFields deduplicates canonical names', () => {
  const fields = buildRequiredFields({
    required_fields: ['checkin', 'checkout', 'adults', 'rooms'],
    variable_params: {
      CheckIn: '{{checkin}}',
      NRooms: '{{rooms}}',
    },
  });
  assert.deepEqual(fields, ['checkin', 'checkout', 'adults', 'rooms']);
});
