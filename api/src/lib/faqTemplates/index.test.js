import test from 'node:test';
import assert from 'node:assert/strict';
import { getStarterFaqs, getStarterFaqsForVertical } from './index.js';

test('getStarterFaqs returns transversal pack', () => {
  const faqs = getStarterFaqs();
  assert.equal(faqs.length, 3);
  assert.equal(faqs[0].starter_key, 'location');
  assert.match(faqs[0].faq_uid, /starter:transversal:/);
  assert.match(faqs[0].answer, /Avenida San Martin 180/);
});

test('getStarterFaqsForVertical returns same transversal pack', () => {
  const faqs = getStarterFaqsForVertical('ferreteria');
  assert.equal(faqs.length, 3);
  assert.equal(faqs[2].starter_key, 'human');
});
