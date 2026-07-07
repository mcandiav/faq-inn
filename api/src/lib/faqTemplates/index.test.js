import test from 'node:test';
import assert from 'node:assert/strict';
import { getStarterFaqsForVertical } from './index.js';

test('getStarterFaqsForVertical returns hotel pack by default', () => {
  const faqs = getStarterFaqsForVertical('hotel');
  assert.equal(faqs.length, 3);
  assert.equal(faqs[0].starter_key, 'location');
  assert.match(faqs[0].answer, /Avenida San Martin 180/);
});

test('getStarterFaqsForVertical falls back to hotel for unknown vertical', () => {
  const faqs = getStarterFaqsForVertical('ferreteria');
  assert.equal(faqs.length, 3);
  assert.equal(faqs[2].starter_key, 'human');
});
