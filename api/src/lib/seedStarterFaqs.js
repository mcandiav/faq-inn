import { indexFaqItem } from './indexer.js';
import { getDefaultAgent } from './faqService.js';
import { getStarterFaqs } from './faqTemplates/index.js';

export async function seedStarterFaqs(
  pool,
  config,
  { tenantId, tenantSlug, agentId, agentSlug, primaryLanguage },
  { logger } = null
) {
  const templates = getStarterFaqs();
  if (!templates.length) {
    return { created: 0, skipped: 0, errors: [] };
  }

  let resolvedAgentId = agentId;
  let resolvedAgentSlug = agentSlug || 'principal';

  if (!resolvedAgentId) {
    const agent = await getDefaultAgent(pool, tenantId);
    if (!agent) {
      return { created: 0, skipped: templates.length, errors: [] };
    }
    resolvedAgentId = agent.id;
    resolvedAgentSlug = agent.slug;
  }

  const language = String(primaryLanguage || 'es').trim() || 'es';
  let created = 0;
  let skipped = 0;
  const errors = [];

  for (const tmpl of templates) {
    const [existing] = await pool.query(
      `SELECT id FROM faq_items WHERE tenant_id = ? AND faq_uid = ? LIMIT 1`,
      [tenantId, tmpl.faq_uid]
    );
    if (existing.length > 0) {
      skipped += 1;
      continue;
    }

    try {
      const [result] = await pool.query(
        `INSERT INTO faq_items
         (tenant_id, agent_id, faq_uid, question, answer, category, keywords, language, active, is_starter_template, starter_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE, ?)`,
        [
          tenantId,
          resolvedAgentId,
          tmpl.faq_uid,
          tmpl.question,
          tmpl.answer,
          tmpl.category || '',
          tmpl.keywords || '',
          language,
          tmpl.starter_key || '',
        ]
      );

      const faqRow = {
        id: result.insertId,
        faq_uid: tmpl.faq_uid,
        question: tmpl.question,
        answer: tmpl.answer,
        category: tmpl.category || '',
        keywords: tmpl.keywords || '',
        active: true,
        agent_slug: resolvedAgentSlug,
      };

      try {
        const indexed = await indexFaqItem(config, faqRow, tenantSlug);
        await pool.query(
          `UPDATE faq_items
           SET qdrant_point_id = ?, embedding_hash = ?, indexed_at = ?
           WHERE id = ?`,
          [indexed.point_id, indexed.embedding_hash, indexed.indexed_at, result.insertId]
        );
      } catch (indexError) {
        logger?.warn(
          { err: indexError, faq_uid: tmpl.faq_uid, tenantSlug },
          'FAQ plantilla creada sin indexar en Qdrant'
        );
        errors.push({ faq_uid: tmpl.faq_uid, error: indexError.message });
      }

      created += 1;
    } catch (error) {
      logger?.warn({ err: error, faq_uid: tmpl.faq_uid }, 'No se pudo crear FAQ plantilla');
      errors.push({ faq_uid: tmpl.faq_uid, error: error.message });
    }
  }

  return { created, skipped, errors };
}
