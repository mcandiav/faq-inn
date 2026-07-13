import test from 'node:test';
import assert from 'node:assert/strict';
import { createFaqRecord, saveAndIndexFaqRecord } from './faqService.js';

test('createFaqRecord saves and indexes the new FAQ', async () => {
  const queries = [];
  const pool = {
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.includes('FROM agents')) {
        return [[{ id: 7, slug: 'faq-main' }]];
      }
      if (sql.startsWith('INSERT INTO faq_items')) {
        return [{ insertId: 42 }];
      }
      if (sql.startsWith('UPDATE faq_items')) {
        return [[{ affectedRows: 1 }]];
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };

  const indexCalls = [];
  const indexedAt = new Date('2026-07-13T12:00:00.000Z');
  const fakeIndexFn = async (config, faq, tenantSlug) => {
    indexCalls.push({ config, faq, tenantSlug });
    return {
      collection: 'faq-inn-faq-main',
      point_id: 42,
      embedding_hash: 'hash-123',
      indexed_at: indexedAt,
    };
  };

  const result = await createFaqRecord(
    pool,
    {},
    { tenant_id: 1, tenant_slug: 'faq-inn', role: 'client' },
    {
      question: '¿Hay wifi?',
      answer: 'Sí',
      category: 'General',
      keywords: 'wifi,internet',
      active: true,
    },
    { indexFn: fakeIndexFn }
  );

  assert.equal(result.id, 42);
  assert.equal(result.faq_uid.length > 0, true);
  assert.equal(result.indexed, true);
  assert.equal(result.collection, 'faq-inn-faq-main');
  assert.equal(result.point_id, 42);
  assert.equal(result.embedding_hash, 'hash-123');
  assert.equal(result.indexed_at, indexedAt);
  assert.equal(indexCalls.length, 1);
  assert.equal(indexCalls[0].tenantSlug, 'faq-inn');
  assert.equal(indexCalls[0].faq.id, 42);
  assert.equal(indexCalls[0].faq.agent_slug, 'faq-main');
  assert.equal(queries.length, 3);
  assert.match(queries[2].sql, /UPDATE faq_items/);
  assert.deepEqual(queries[2].params, [42, 'hash-123', indexedAt, 42]);
});

test('saveAndIndexFaqRecord persists the indexed metadata for edits', async () => {
  const queries = [];
  const pool = {
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.startsWith('UPDATE faq_items')) {
        return [[{ affectedRows: 1 }]];
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };

  const indexedAt = new Date('2026-07-13T12:30:00.000Z');
  const fakeIndexFn = async () => ({
    collection: 'faq-inn-faq-main',
    point_id: 84,
    embedding_hash: 'hash-456',
    indexed_at: indexedAt,
  });

  const indexed = await saveAndIndexFaqRecord(
    pool,
    {},
    'faq-inn',
    {
      id: 19,
      faq_uid: 'faq-uid-19',
      qdrant_point_id: 7,
      question: '¿Check-in?',
      answer: 'Desde las 15:00',
      category: 'General',
      keywords: 'checkin',
      active: true,
      agent_slug: 'faq-main',
    },
    { indexFn: fakeIndexFn }
  );

  assert.equal(indexed.point_id, 84);
  assert.equal(indexed.embedding_hash, 'hash-456');
  assert.equal(indexed.indexed_at, indexedAt);
  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /UPDATE faq_items/);
  assert.deepEqual(queries[0].params, [84, 'hash-456', indexedAt, 19]);
});
