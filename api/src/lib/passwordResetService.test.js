import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FORGOT_PASSWORD_PUBLIC_MESSAGE,
  isJwtIssuedBeforePasswordChange,
} from './passwordResetService.js';

test('isJwtIssuedBeforePasswordChange rejects older JWT', () => {
  const changedAt = new Date('2026-07-11T20:00:00.000Z');
  const oldIat = Math.floor(changedAt.getTime() / 1000) - 60;
  assert.equal(
    isJwtIssuedBeforePasswordChange({ iat: oldIat }, changedAt),
    true
  );
});

test('isJwtIssuedBeforePasswordChange accepts newer JWT', () => {
  const changedAt = new Date('2026-07-11T20:00:00.000Z');
  const newIat = Math.floor(changedAt.getTime() / 1000) + 60;
  assert.equal(
    isJwtIssuedBeforePasswordChange({ iat: newIat }, changedAt),
    false
  );
});

test('isJwtIssuedBeforePasswordChange allows missing password_changed_at', () => {
  assert.equal(isJwtIssuedBeforePasswordChange({ iat: 1 }, null), false);
});

test('forgot password public message is stable', () => {
  assert.match(FORGOT_PASSWORD_PUBLIC_MESSAGE, /Si existe una cuenta/i);
});
