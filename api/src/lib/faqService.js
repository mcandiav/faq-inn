import {
  deleteAllTenantPoints,
  indexFaqItem,
  newFaqUid,
  removeFaqFromQdrant,
} from './indexer.js';
import { ensureFaqCategory, resolveFaqCategoryInput } from './faqCategories.js';

export async function getDefaultAgent(pool, tenantId) {
  const [rows] = await pool.query(
    `SELECT id, slug, name FROM agents
     WHERE tenant_id = ? AND status = 'active'
     ORDER BY id ASC LIMIT 1`,
    [tenantId]
  );
  return rows[0] || null;
}

export async function createFaqRecord(pool, config, user, faqInput) {
  const tenantId = user.tenant_id;
  const tenantSlug = user.tenant_slug;

  if (!tenantId || !tenantSlug) {
    const error = new Error('Solo clientes pueden crear FAQs');
    error.statusCode = 403;
    throw error;
  }

  const question = faqInput.question?.trim();
  const answer = faqInput.answer?.trim();
  const keywords = faqInput.keywords?.trim() || '';
  const language = faqInput.language?.trim() || 'es';
  const active = faqInput.active !== false;

  if (!question || !answer) {
    const error = new Error('question y answer son obligatorios');
    error.statusCode = 400;
    throw error;
  }

  let agent = null;
  if (faqInput.agent_slug) {
    const [rows] = await pool.query(
      `SELECT id, slug FROM agents
       WHERE tenant_id = ? AND slug = ? AND status = 'active'`,
      [tenantId, faqInput.agent_slug]
    );
    agent = rows[0] || null;
  } else {
    agent = await getDefaultAgent(pool, tenantId);
  }

  if (!agent) {
    const error = new Error('agente no encontrado');
    error.statusCode = 400;
    throw error;
  }

  const category = await ensureFaqCategory(
    pool,
    tenantId,
    resolveFaqCategoryInput(faqInput.category)
  );
  const faqUid = newFaqUid();

  // Mantener consistente DB + Qdrant: si indexar falla, no guardar la edición/creación.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO faq_items
       (tenant_id, agent_id, faq_uid, question, answer, category, keywords, language, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        agent.id,
        faqUid,
        question,
        answer,
        category,
        keywords,
        language,
        active,
      ]
    );

    const faqRow = {
      id: result.insertId,
      faq_uid: faqUid,
      question,
      answer,
      category,
      keywords,
      active,
      agent_slug: agent.slug,
    };

    const indexed = await indexFaqItem(config, faqRow, tenantSlug);

    await conn.query(
      `UPDATE faq_items
       SET qdrant_point_id = ?, embedding_hash = ?, indexed_at = ?
       WHERE id = ?`,
      [indexed.point_id, indexed.embedding_hash, indexed.indexed_at, result.insertId]
    );

    await conn.commit();

    return {
      id: result.insertId,
      faq_uid: faqUid,
      indexed: true,
      collection: indexed.collection,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function reindexFaqRecord(pool, config, faq) {
  const indexed = await indexFaqItem(
    config,
    {
      id: faq.id,
      faq_uid: faq.faq_uid,
      qdrant_point_id: faq.qdrant_point_id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      keywords: faq.keywords,
      active: Boolean(faq.active),
      agent_slug: faq.agent_slug,
    },
    faq.tenant_slug
  );

  await pool.query(
    `UPDATE faq_items
     SET qdrant_point_id = ?, embedding_hash = ?, indexed_at = ?
     WHERE id = ?`,
    [indexed.point_id, indexed.embedding_hash, indexed.indexed_at, faq.id]
  );

  return indexed;
}

export async function reindexTenantFaqs(pool, config, user) {
  const tenantId = user.tenant_id;
  const tenantSlug = user.tenant_slug;
  if (!tenantId || !tenantSlug) {
    const error = new Error('Solo clientes pueden reindexar');
    error.statusCode = 403;
    throw error;
  }

  const purge = await deleteAllTenantPoints(config, tenantSlug);

  const [rows] = await pool.query(
    `SELECT f.id, f.faq_uid, f.question, f.answer, f.category, f.keywords,
            f.active, f.qdrant_point_id, t.slug AS tenant_slug, a.slug AS agent_slug
     FROM faq_items f
     JOIN tenants t ON t.id = f.tenant_id
     JOIN agents a ON a.id = f.agent_id
     WHERE f.tenant_id = ?
     ORDER BY f.id ASC`,
    [tenantId]
  );

  const errors = [];
  let reindexed = 0;

  for (const faq of rows) {
    try {
      await reindexFaqRecord(pool, config, faq);
      reindexed += 1;
    } catch (error) {
      errors.push({ id: faq.id, error: error.message });
    }
  }

  return { total: rows.length, reindexed, errors, purge };
}

export async function deleteTenantFaqs(pool, config, tenantId, tenantSlug) {
  const [rows] = await pool.query(
    `SELECT id, faq_uid, qdrant_point_id FROM faq_items WHERE tenant_id = ?`,
    [tenantId]
  );

  if (rows.length === 0) {
    return 0;
  }

  await pool.query('DELETE FROM faq_items WHERE tenant_id = ?', [tenantId]);

  try {
    await deleteAllTenantPoints(config, tenantSlug);
  } catch {
    for (const faq of rows) {
      try {
        await removeFaqFromQdrant(config, tenantSlug, faq.faq_uid, [
          faq.id,
          faq.qdrant_point_id,
        ]);
      } catch {
        /* ignore qdrant cleanup errors */
      }
    }
  }

  return rows.length;
}

export async function importFaqRows(pool, config, user, rows, options = {}) {
  const maxRows = options.maxRows ?? 300;

  if (rows.length === 0) {
    const error = new Error(
      'El archivo no tiene filas válidas (columna A: pregunta, B: respuesta; C: keywords opcional)'
    );
    error.statusCode = 400;
    throw error;
  }

  if (rows.length > maxRows) {
    const error = new Error(`Máximo ${maxRows} filas por importación`);
    error.statusCode = 400;
    throw error;
  }

  let deleted = 0;
  if (options.replace) {
    deleted = await deleteTenantFaqs(pool, config, user.tenant_id, user.tenant_slug);
  }

  const created = [];
  const errors = [];

  for (const row of rows) {
    try {
      const faq = await createFaqRecord(pool, config, user, {
        question: row.question,
        answer: row.answer,
        keywords: row.keywords,
        category: row.category,
      });
      created.push({ id: faq.id, row: row.row });
    } catch (error) {
      errors.push({
        row: row.row,
        error: error.message,
      });
    }
  }

  return {
    total_rows: rows.length,
    created: created.length,
    deleted,
    errors,
    faq_ids: created.map((item) => item.id),
  };
}
