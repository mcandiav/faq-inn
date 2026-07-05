import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildApprovedBookingRecord,
  buildPlaceholderMap,
  buildRequiredFields,
} from './bookingApprovedFormat.js';

test('buildPlaceholderMap maps engine tokens to canonical fields', () => {
  const map = buildPlaceholderMap({
    CheckIn: '{{checkin_ddmmyyyy}}',
    CheckOut: '{{checkout_ddmmyyyy}}',
    ad: '{{adults}}',
    ag: '{{child_ages_semicolon}}',
  });
  assert.equal(map.checkin, '{{checkin_ddmmyyyy}}');
  assert.equal(map.checkout, '{{checkout_ddmmyyyy}}');
  assert.equal(map.adults, '{{adults}}');
  assert.equal(map.child_ages, '{{child_ages_semicolon}}');
});

test('buildApprovedBookingRecord only on approve payload shape', () => {
  const record = buildApprovedBookingRecord(
    {
      candidate_template:
        'https://book.example.com/?in={{checkin_ddmmyyyy}}&ad={{adults}}',
      candidate_config: {
        date_format: 'DDMMYYYY',
        variable_params: {
          CheckIn: '{{checkin_ddmmyyyy}}',
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
  assert.ok(record.booking_url_template.includes('{{checkin_ddmmyyyy}}'));
  assert.deepEqual(record.booking_config.required_fields, [
    'checkin',
    'checkout',
    'adults',
  ]);
  assert.equal(record.booking_config.approved_by_user_id, 42);
  assert.equal(record.booking_config.placeholder_map.checkin, '{{checkin_ddmmyyyy}}');
});

test('buildRequiredFields deduplicates canonical names', () => {
  const fields = buildRequiredFields({
    required_fields: ['checkin', 'checkout', 'adults', 'rooms'],
    variable_params: {
      CheckIn: '{{checkin_ddmmyyyy}}',
      NRooms: '{{rooms}}',
    },
  });
  assert.deepEqual(fields, ['checkin', 'checkout', 'adults', 'rooms']);
});
