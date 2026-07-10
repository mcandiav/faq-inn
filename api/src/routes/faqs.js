import { indexFaqItem, removeFaqFromQdrant } from '../lib/indexer.js';
import { createFaqRecord, importFaqRows, reindexTenantFaqs } from '../lib/faqService.js';
import { parseSpreadsheetBuffer } from '../lib/parseSpreadsheet.js';
import { ensureFaqCategory, resolveFaqCategoryInput } from '../lib/faqCategories.js';

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
             f.is_starter_template, f.starter_key,
             fc.id AS category_id,
             a.slug AS agent_slug, a.name AS agent_name
      FROM faq_items f
      JOIN agents a ON a.id = f.agent_id
      LEFT JOIN faq_categories fc
        ON fc.tenant_id = f.tenant_id
       AND fc.name = CASE
         WHEN TRIM(COALESCE(f.category, '')) = '' THEN 'Sin categoría'
         ELSE TRIM(f.category)
       END
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
        message: `${result.created} FAQ(s) importadas`,
      };
    } catch (error) {
      const code = error.statusCode || 500;
      app.log.error({ err: error }, 'Importación de FAQs falló');
      reply.code(code);
      return { status: 'error', error: error.message };
    }
  });

  app.post('/api/faqs/reindex', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user;

    if (!tenantScope(user)) {
      reply.code(403);
      return { status: 'error', error: 'Solo clientes pueden reindexar FAQs' };
    }

    try {
      const result = await reindexTenantFaqs(pool, config, user);
      return {
        status: 'ok',
        reindex: result,
        message: `${result.reindexed} FAQ(s) sincronizadas`,
      };
    } catch (error) {
      const code = error.statusCode || 500;
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

    const normalizedCategory = await ensureFaqCategory(
      pool,
      faq.tenant_id,
      resolveFaqCategoryInput(category)
    );

    const clearStarterTemplate =
      Boolean(faq.is_starter_template) &&
      (question !== faq.question ||
        answer !== faq.answer ||
        normalizedCategory !== faq.category ||
        keywords !== faq.keywords);

    // Mantener consistente DB + Qdrant: si indexar falla, no guardar la edición.
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `UPDATE faq_items
         SET question = ?, answer = ?, category = ?, keywords = ?, active = ?,
             is_starter_template = ?
         WHERE id = ?`,
        [
          question,
          answer,
          normalizedCategory,
          keywords,
          active,
          clearStarterTemplate ? false : Boolean(faq.is_starter_template),
          faq.id,
        ]
      );

      const faqRow = {
        id: faq.id,
        faq_uid: faq.faq_uid,
        qdrant_point_id: faq.qdrant_point_id,
        question,
        answer,
        category: normalizedCategory,
        keywords,
        active,
        agent_slug: faq.agent_slug,
      };

      const indexed = await indexFaqItem(config, faqRow, faq.tenant_slug);

      await conn.query(
        `UPDATE faq_items
         SET qdrant_point_id = ?, embedding_hash = ?, indexed_at = ?
         WHERE id = ?`,
        [indexed.point_id, indexed.embedding_hash, indexed.indexed_at, faq.id]
      );

      await conn.commit();

      return {
        status: 'ok',
        faq: {
          id: faq.id,
          indexed: true,
          collection: indexed.collection,
          is_starter_template: clearStarterTemplate ? false : Boolean(faq.is_starter_template),
        },
      };
    } catch (error) {
      await conn.rollback();
      app.log.error({ err: error }, 'Reindexación fallida');
      reply.code(502);
      return {
        status: 'error',
        error: 'No se guardó la FAQ porque falló la sincronización con el asistente',
        detail: error.message,
      };
    } finally {
      conn.release();
    }
  });

  app.delete('/api/faqs/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const faq = await getFaqForUser(pool, request.params.id, request.user);
    if (!faq) {
      reply.code(404);
      return { status: 'error', error: 'FAQ no encontrada' };
    }

    await pool.query('DELETE FROM faq_items WHERE id = ?', [faq.id]);

    let qdrant_cleaned = true;
    try {
      qdrant_cleaned = await removeFaqFromQdrant(config, faq.tenant_slug, faq.faq_uid, [
        faq.id,
        faq.qdrant_point_id,
      ]);
    } catch (error) {
      qdrant_cleaned = false;
      app.log.warn({ err: error }, 'No se pudo borrar punto Qdrant');
    }

    return {
      status: 'ok',
      deleted: faq.id,
      qdrant_cleaned,
      ...(qdrant_cleaned
        ? {}
        : {
            warning:
              'FAQ borrada pero quedaron restos en el índice de búsqueda. Usa «Sincronizar respuestas».',
          }),
    };
  });
}
