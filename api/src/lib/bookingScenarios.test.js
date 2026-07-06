import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDiscoveryScenarios,
  refreshDiscoveryScenarios,
  refreshVerificationScenario,
} from './bookingScenarios.js';

test('refreshDiscoveryScenarios replaces stale stored checkin with fresh today', () => {
  const stale = buildDiscoveryScenarios('2020-01-01');
  const fresh = refreshDiscoveryScenarios(stale);

  assert.notEqual(fresh[0].checkin, '2020-01-01');
  assert.equal(fresh[0].checkin, buildDiscoveryScenarios()[0].checkin);
  assert.equal(fresh[0].nights, 3);
  assert.equal(fresh[1].nights, 7);
  assert.equal(fresh[0].id, 'S1');
  assert.equal(fresh[1].id, 'S2');
});

test('refreshVerificationScenario uses provided checkin', () => {
  const scenario = refreshVerificationScenario({ id: 'VERIFY' }, '2026-12-25');
  assert.equal(scenario.checkin, '2026-12-25');
  assert.equal(scenario.checkout, '2026-12-26');
});
