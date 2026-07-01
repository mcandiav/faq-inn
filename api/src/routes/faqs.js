import { indexFaqItem, newFaqUid, removeFaqFromQdrant } from '../lib/indexer.js';

function tenantScope(user) {
  if (user.role === 'client') {
    return user.tenant_id;
  }
  return null;
}

async function getDefaultAgent(pool, tenantId) {
  const [rows] = await pool.query(
    `SELECT id, slug, name FROM agents
     WHERE tenant_id = ? AND status = 'active'
     ORDER BY id ASC LIMIT 1`,
    [tenantId]
  );
  return rows[0] || null;
}

async function getFaqForUser(pool, faqId, user) {
  const tenantId = tenantScope(user);
  const params = [faqId];
  let sql = `
    SELECT f.*, t.slug AS tenant_slug, a.slug AS agent_slug
    FROM faq_items f
    JOIN tenants t ON t.id = f.tenant_id
    JOIN agents a ON a.id = f.agent_id
    WHERE f.id = ?
  `;

  if (tenantId) {
    sql += ' AND f.tenant_id = ?';
    params.push(tenantId);
  }

  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

export async function faqRoutes(app, config) {
  const pool = app.db.pool;

  app.get('/api/faqs', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user;
    const tenantId = tenantScope(user);

    if (!tenantId && user.role !== 'admin_global') {
      reply.code(403);
      return { status: 'error', error: 'Sin negocio asignado' };
    }

    const params = [];
    let sql = `
      SELECT f.id, f.faq_uid, f.question, f.answer, f.category, f.keywords,
             f.language, f.active, f.indexed_at, f.updated_at,
             a.slug AS agent_slug, a.name AS agent_name
      FROM faq_items f
      JOIN agents a ON a.id = f.agent_id
    `;

    if (tenantId) {
      sql += ' WHERE f.tenant_id = ?';
      params.push(tenantId);
    } else {
      sql += ' WHERE 1=1';
    }

    if (request.query?.agent_id) {
      sql += ' AND a.slug = ?';
      params.push(request.query.agent_id);
    }

    sql += ' ORDER BY f.updated_at DESC';

    const [rows] = await pool.query(sql, params);
    return { status: 'ok', faqs: rows };
  });

  app.get('/api/faqs/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const faq = await getFaqForUser(pool, request.params.id, request.user);
    if (!faq) {
      reply.code(404);
      return { status: 'error', error: 'FAQ no encontrada' };
    }

    return { status: 'ok', faq };
  });

  app.post('/api/faqs', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user;
    const tenantId = tenantScope(user);

    if (!tenantId) {
      reply.code(403);
      return { status: 'error', error: 'Solo clientes pueden crear FAQs' };
    }

    const question = request.body?.question?.trim();
    const answer = request.body?.answer?.trim();
    const category = request.body?.category?.trim() || '';
    const keywords = request.body?.keywords?.trim() || '';
    const language = request.body?.language?.trim() || 'es';
    const active = request.body?.active !== false;

    if (!question || !answer) {
      reply.code(400);
      return { status: 'error', error: 'question y answer son obligatorios' };
    }

    let agent = null;
    if (request.body?.agent_slug) {
      const [rows] = await pool.query(
        `SELECT id, slug FROM agents
         WHERE tenant_id = ? AND slug = ? AND status = 'active'`,
        [tenantId, request.body.agent_slug]
      );
      agent = rows[0] || null;
    } else {
      agent = await getDefaultAgent(pool, tenantId);
    }

    if (!agent) {
      reply.code(400);
      return { status: 'error', error: 'agente no encontrado' };
    }

    const faqUid = newFaqUid();

    const [result] = await pool.query(
      `INSERT INTO faq_items
       (tenant_id, agent_id, faq_uid, question, answer, category, keywords, language, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, agent.id, faqUid, question, answer, category, keywords, language, active ? 1 : 0]
    );

    const faqRow = {
      faq_uid: faqUid,
      question,
      answer,
      category,
      keywords,
      active,
      agent_slug: agent.slug,
    };

    try {
      const indexed = await indexFaqItem(
        config,
        faqRow,
        request.user.tenant_slug
      );

      await pool.query(
        `UPDATE faq_items
         SET qdrant_point_id = ?, embedding_hash = ?, indexed_at = ?
         WHERE id = ?`,
        [indexed.point_id, indexed.embedding_hash, indexed.indexed_at, result.insertId]
      );

      return {
        status: 'ok',
        faq: {
          id: result.insertId,
          faq_uid: faqUid,
          indexed: true,
          collection: indexed.collection,
        },
      };
    } catch (error) {
      app.log.error({ err: error }, 'Indexación fallida tras crear FAQ');
      reply.code(502);
      return {
        status: 'error',
        error: 'FAQ guardada en BD pero falló indexación Qdrant',
        faq_id: result.insertId,
        detail: error.message,
      };
    }
  });

  app.patch('/api/faqs/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const faq = await getFaqForUser(pool, request.params.id, request.user);
    if (!faq) {
      reply.code(404);
      return { status: 'error', error: 'FAQ no encontrada' };
    }

    const question =
      request.body?.question !== undefined
        ? request.body.question.trim()
        : faq.question;
    const answer =
      request.body?.answer !== undefined
        ? request.body.answer.trim()
        : faq.answer;
    const category =
      request.body?.category !== undefined
        ? request.body.category.trim()
        : faq.category;
    const keywords =
      request.body?.keywords !== undefined
        ? request.body.keywords.trim()
        : faq.keywords;
    const active =
      request.body?.active !== undefined ? Boolean(request.body.active) : Boolean(faq.active);

    if (!question || !answer) {
      reply.code(400);
      return { status: 'error', error: 'question y answer no pueden quedar vacíos' };
    }

    await pool.query(
      `UPDATE faq_items
       SET question = ?, answer = ?, category = ?, keywords = ?, active = ?
       WHERE id = ?`,
      [question, answer, category, keywords, active ? 1 : 0, faq.id]
    );

    const faqRow = {
      faq_uid: faq.faq_uid,
      question,
      answer,
      category,
      keywords,
      active,
      agent_slug: faq.agent_slug,
    };

    try {
      const indexed = await indexFaqItem(config, faqRow, faq.tenant_slug);

      await pool.query(
        `UPDATE faq_items
         SET qdrant_point_id = ?, embedding_hash = ?, indexed_at = ?
         WHERE id = ?`,
        [indexed.point_id, indexed.embedding_hash, indexed.indexed_at, faq.id]
      );

      return {
        status: 'ok',
        faq: {
          id: faq.id,
          indexed: true,
          collection: indexed.collection,
        },
      };
    } catch (error) {
      app.log.error({ err: error }, 'Reindexación fallida');
      reply.code(502);
      return {
        status: 'error',
        error: 'Cambios guardados pero falló reindexación Qdrant',
        detail: error.message,
      };
    }
  });

  app.delete('/api/faqs/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const faq = await getFaqForUser(pool, request.params.id, request.user);
    if (!faq) {
      reply.code(404);
      return { status: 'error', error: 'FAQ no encontrada' };
    }

    await pool.query('DELETE FROM faq_items WHERE id = ?', [faq.id]);

    try {
      await removeFaqFromQdrant(config, faq.tenant_slug, faq.faq_uid);
    } catch (error) {
      app.log.warn({ err: error }, 'No se pudo borrar punto Qdrant');
    }

    return { status: 'ok', deleted: faq.id };
  });
}
