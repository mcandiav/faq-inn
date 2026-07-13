import { indexFaqItem, newFaqUid } from './indexer.js';
import { ensureFaqCategory, resolveFaqCategoryInput } from './faqCategories.js';

export async function resolveTenantAndAgent(pool, tenantRef, agentRef) {
  const tenantKey = String(tenantRef || '').trim();
  const agentKey = String(agentRef || '').trim();

  if (!tenantKey || !agentKey) {
    const error = new Error('tenant_id y agent_id son obligatorios');
    error.statusCode = 400;
    throw error;
  }

  const [tenants] = await pool.query(
    `SELECT id, slug, status FROM tenants
     WHERE slug = ? OR id = ?
     LIMIT 1`,
    [tenantKey, Number.isNaN(Number(tenantKey)) ? 0 : Number(tenantKey)]
  );

  const tenant = tenants[0];
  if (!tenant) {
    const error = new Error('tenant no encontrado');
    error.statusCode = 404;
    throw error;
  }

  const [agents] = await pool.query(
    `SELECT id, slug, status FROM agents
     WHERE tenant_id = ? AND (slug = ? OR id = ?)
     LIMIT 1`,
    [
      tenant.id,
      agentKey,
      Number.isNaN(Number(agentKey)) ? 0 : Number(agentKey),
    ]
  );

  const agent = agents[0];
  if (!agent || agent.status !== 'active') {
    const error = new Error('agente no encontrado o inactivo');
    error.statusCode = 404;
    throw error;
  }

  return { tenant, agent };
}

export async function findPendingDuplicate(pool, tenantId, agentId, question) {
  const normalized = question.trim().toLowerCase();
  const [rows] = await pool.query(
    `SELECT id, status FROM unanswered_questions
     WHERE tenant_id = ? AND agent_id = ? AND status = 'pending'
       AND LOWER(TRIM(question)) = ?
     ORDER BY id ASC LIMIT 1`,
    [tenantId, agentId, normalized]
  );
  return rows[0] || null;
}

export async function registerUnanswered(pool, body) {
  const question = (body.question || body.consulta)?.trim();
  if (!question) {
    const error = new Error('question es obligatoria');
    error.statusCode = 400;
    throw error;
  }

  const phone = String(body.phone || body.telefono || body.remote_id || '').trim();

  const { tenant, agent } = await resolveTenantAndAgent(
    pool,
    body.tenant_slug || body.tenant_id,
    body.agent_id
  );

  const tenantSlug =
    body.tenant_slug?.trim().toLowerCase() || tenant.slug;

  const duplicate = await findPendingDuplicate(
    pool,
    tenant.id,
    agent.id,
    question
  );

  if (duplicate) {
    return {
      ok: true,
      id: duplicate.id,
      status: 'duplicate',
      duplicate: true,
    };
  }

  const [result] = await pool.query(
    `INSERT INTO unanswered_questions
     (tenant_id, agent_id, tenant_slug, channel, remote_id, contact_name, phone,
      question, language, score, suggested_faq_id, suggested_faq_question, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      tenant.id,
      agent.id,
      tenantSlug,
      body.channel?.trim() || '',
      body.remote_id?.trim() || phone,
      body.contact_name?.trim() || '',
      phone,
      question,
      body.language?.trim() || 'es',
      body.score != null ? Number(body.score) : null,
      body.suggested_faq_id?.trim() || null,
      body.suggested_faq_question?.trim() || null,
    ]
  );

  return {
    ok: true,
    id: result.insertId,
    status: 'pending',
    duplicate: false,
  };
}

export async function listUnansweredForUser(pool, user, query = {}) {
  const params = [];
  let sql = `
    SELECT u.id, u.tenant_slug, u.channel, u.remote_id, u.contact_name, u.phone,
           u.question, u.language, u.score, u.suggested_faq_id,
           u.suggested_faq_question, u.status, u.converted_faq_id,
           u.created_at, u.updated_at, u.resolved_at,
           a.slug AS agent_slug, a.name AS agent_name
    FROM unanswered_questions u
    JOIN agents a ON a.id = u.agent_id
    WHERE 1=1
  `;

  if (user.role === 'client') {
    sql += ' AND u.tenant_id = ?';
    params.push(user.tenant_id);
  }

  if (query.status) {
    sql += ' AND u.status = ?';
    params.push(query.status);
  }

  if (query.agent_id) {
    sql += ' AND a.slug = ?';
    params.push(query.agent_id);
  }

  sql += ' ORDER BY u.created_at DESC';

  const limit = Math.min(Number(query.limit) || 200, 500);
  sql += ' LIMIT ?';
  params.push(limit);

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function getUnansweredForUser(pool, id, user) {
  const params = [id];
  let sql = `
    SELECT u.*, t.slug AS tenant_slug_resolved, a.slug AS agent_slug
    FROM unanswered_questions u
    JOIN tenants t ON t.id = u.tenant_id
    JOIN agents a ON a.id = u.agent_id
    WHERE u.id = ?
  `;

  if (user.role === 'client') {
    sql += ' AND u.tenant_id = ?';
    params.push(user.tenant_id);
  }

  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

export async function updateUnansweredStatus(pool, id, user, status) {
  const allowed = new Set(['ignored', 'resolved_manually', 'pending']);
  if (!allowed.has(status)) {
    const error = new Error('status no permitido');
    error.statusCode = 400;
    throw error;
  }

  const row = await getUnansweredForUser(pool, id, user);
  if (!row) {
    const error = new Error('Pregunta no encontrada');
    error.statusCode = 404;
    throw error;
  }

  if (row.status === 'converted_to_faq') {
    const error = new Error('Ya fue convertida en FAQ');
    error.statusCode = 409;
    throw error;
  }

  const resolvedBy = ['ignored', 'resolved_manually'].includes(status)
    ? user.id
    : null;
  const resolvedAt = resolvedBy ? new Date() : null;

  await pool.query(
    `UPDATE unanswered_questions
     SET status = ?, resolved_by = ?, resolved_at = ?
     WHERE id = ?`,
    [status, resolvedBy, resolvedAt, id]
  );

  return { id: Number(id), status };
}

export async function updateUnansweredQuestion(pool, id, user, input = {}) {
  const question = (input.question || input.consulta)?.trim();
  if (!question) {
    const error = new Error('question es obligatoria');
    error.statusCode = 400;
    throw error;
  }

  const row = await getUnansweredForUser(pool, id, user);
  if (!row) {
    const error = new Error('Pregunta no encontrada');
    error.statusCode = 404;
    throw error;
  }

  if (row.status !== 'pending') {
    const error = new Error('Solo se pueden editar preguntas pendientes');
    error.statusCode = 409;
    throw error;
  }

  await pool.query('UPDATE unanswered_questions SET question = ? WHERE id = ?', [
    question,
    id,
  ]);

  return { id: Number(id), question };
}

export async function updateUnanswered(pool, id, user, body = {}) {
  const hasQuestion = body.question !== undefined || body.consulta !== undefined;
  const hasStatus = body.status !== undefined;

  if (!hasQuestion && !hasStatus) {
    const error = new Error('question o status es obligatorio');
    error.statusCode = 400;
    throw error;
  }

  if (hasStatus) {
    return updateUnansweredStatus(pool, id, user, body.status);
  }

  return updateUnansweredQuestion(pool, id, user, body);
}

export async function deleteUnanswered(pool, id, user) {
  const row = await getUnansweredForUser(pool, id, user);
  if (!row) {
    const error = new Error('Pregunta no encontrada');
    error.statusCode = 404;
    throw error;
  }

  await pool.query('DELETE FROM unanswered_questions WHERE id = ?', [id]);

  return { id: Number(id), deleted: true };
}

export async function markUnansweredAsConverted(pool, id, user, faqId) {
  const row = await getUnansweredForUser(pool, id, user);
  if (!row) {
    const error = new Error('Pregunta no encontrada');
    error.statusCode = 404;
    throw error;
  }

  if (row.status === 'converted_to_faq') {
    const error = new Error('Ya fue convertida en FAQ');
    error.statusCode = 409;
    throw error;
  }

  await pool.query(
    `UPDATE unanswered_questions
     SET status = 'converted_to_faq',
         converted_faq_id = ?,
         resolved_by = ?,
         resolved_at = ?
     WHERE id = ?`,
    [faqId, user.id, new Date(), id]
  );

  return { id: Number(id), converted_faq_id: Number(faqId) };
}

export async function convertUnansweredToFaq(pool, config, id, user, input = {}) {
  const row = await getUnansweredForUser(pool, id, user);
  if (!row) {
    const error = new Error('Pregunta no encontrada');
    error.statusCode = 404;
    throw error;
  }

  if (row.status === 'converted_to_faq') {
    const error = new Error('Ya fue convertida en FAQ');
    error.statusCode = 409;
    throw error;
  }

  const question = input.question?.trim() || row.question.trim();
  const answer = input.answer?.trim();
  const keywords = input.keywords?.trim() || '';
  const language = input.language?.trim() || row.language || 'es';
  const active = input.active !== false;

  if (!question || !answer) {
    const error = new Error('question y answer son obligatorios para convertir');
    error.statusCode = 400;
    throw error;
  }

  const category = await ensureFaqCategory(
    pool,
    row.tenant_id,
    resolveFaqCategoryInput(input.category)
  );
  const faqUid = newFaqUid();
  const tenantSlug = row.tenant_slug_resolved || row.tenant_slug;
  // Mantener consistente DB + Qdrant: si indexar falla, no dejar una FAQ "sin indexar".
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO faq_items
       (tenant_id, agent_id, faq_uid, question, answer, category, keywords, language, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.tenant_id,
        row.agent_id,
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
      agent_slug: row.agent_slug,
    };

    const indexed = await indexFaqItem(config, faqRow, tenantSlug);

    await conn.query(
      `UPDATE faq_items
       SET qdrant_point_id = ?, embedding_hash = ?, indexed_at = ?
       WHERE id = ?`,
      [indexed.point_id, indexed.embedding_hash, indexed.indexed_at, result.insertId]
    );

    await markUnansweredAsConverted(conn, id, user, result.insertId);

    await conn.commit();

    return {
      unanswered_id: Number(id),
      faq: {
        id: result.insertId,
        faq_uid: faqUid,
        indexed: true,
        collection: indexed.collection,
      },
    };
  } catch (error) {
    await conn.rollback();
    const wrapped = new Error(
      'No se guardó la FAQ porque falló la sincronización con el asistente'
    );
    wrapped.statusCode = error.statusCode || 502;
    wrapped.detail = error.detail || error.message;
    throw wrapped;
  } finally {
    conn.release();
  }
}
