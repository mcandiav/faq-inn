import { indexFaqItem, removeFaqFromQdrant } from '../lib/indexer.js';
import { createFaqRecord, importFaqRows } from '../lib/faqService.js';
import { parseSpreadsheetBuffer } from '../lib/parseSpreadsheet.js';

const ALLOWED_EXTENSIONS = new Set(['.xlsx', '.xls', '.csv']);

function tenantScope(user) {
  if (user.role === 'client') {
    return user.tenant_id;
  }
  return null;
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

function fileExtension(filename) {
  const lower = String(filename || '').toLowerCase();
  const dot = lower.lastIndexOf('.');
  return dot >= 0 ? lower.slice(dot) : '';
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

    sql += ' ORDER BY f.id ASC';

    const [rows] = await pool.query(sql, params);
    return { status: 'ok', faqs: rows, total: rows.length };
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

    if (!tenantScope(user)) {
      reply.code(403);
      return { status: 'error', error: 'Solo clientes pueden crear FAQs' };
    }

    try {
      const faq = await createFaqRecord(pool, config, user, request.body || {});
      return { status: 'ok', faq };
    } catch (error) {
      const code = error.statusCode || 502;
      app.log.error({ err: error }, 'Crear FAQ falló');
      reply.code(code);
      return {
        status: 'error',
        error: error.message,
        detail: error.detail,
      };
    }
  });

  app.post('/api/faqs/import', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user;

    if (!tenantScope(user)) {
      reply.code(403);
      return { status: 'error', error: 'Solo clientes pueden importar FAQs' };
    }

    let buffer = null;
    let filename = '';
    let replace = false;

    for await (const part of request.parts()) {
      if (part.type === 'file') {
        if (part.fieldname !== 'file') {
          continue;
        }
        filename = part.filename || '';
        buffer = await part.toBuffer();
      } else if (part.fieldname === 'replace') {
        replace = String(part.value).toLowerCase() === 'true';
      }
    }

    if (!buffer || buffer.length === 0) {
      reply.code(400);
      return { status: 'error', error: 'Archivo requerido' };
    }

    const ext = fileExtension(filename);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      reply.code(400);
      return {
        status: 'error',
        error: 'Formato no soportado. Usa Excel (.xlsx, .xls) o CSV',
      };
    }

    let rows;
    try {
      rows = parseSpreadsheetBuffer(buffer, filename);
    } catch (error) {
      reply.code(400);
      return { status: 'error', error: error.message };
    }

    try {
      const result = await importFaqRows(pool, config, user, rows, { replace });
      return {
        status: 'ok',
        import: result,
        message: `${result.created} FAQ(s) importadas e indexadas`,
      };
    } catch (error) {
      const code = error.statusCode || 500;
      app.log.error({ err: error }, 'Importación de FAQs falló');
      reply.code(code);
      return { status: 'error', error: error.message };
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
