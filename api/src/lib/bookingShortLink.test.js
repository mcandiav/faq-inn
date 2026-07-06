import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPublicShortUrl,
  createBookingShortLink,
  resolveBookingShortLink,
} from './bookingShortLink.js';

test('buildPublicShortUrl builds redirect under /api/r/', () => {
  const url = buildPublicShortUrl({ appUrl: 'https://inn.at-once.cl' }, 'Ab12Cd34');
  assert.equal(url, 'https://inn.at-once.cl/api/r/Ab12Cd34');
});

test('createBookingShortLink and resolve round-trip', async () => {
  const queries = [];
  const pool = {
    async query(sql, params) {
      queries.push({ sql, params });
      if (/INSERT INTO booking_short_links/i.test(sql)) {
        return [[], { insertId: null }];
      }
      if (/SELECT target_url/i.test(sql)) {
        return [[{ target_url: params[0] === 'saved1' ? 'https://book.example.com/x' : null }]];
      }
      return [[], {}];
    },
  };

  const code = await createBookingShortLink(pool, 'https://book.example.com/x', 9);
  assert.ok(code.length >= 4);

  const resolved = await resolveBookingShortLink(pool, 'saved1');
  assert.equal(resolved, 'https://book.example.com/x');
});
