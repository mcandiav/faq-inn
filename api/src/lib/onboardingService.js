import { indexFaqItem } from './indexer.js';
import { OBJECTIVES, getObjective, isValidObjectiveSlug } from './objectives/index.js';
import { syncWhatsappConnectionStatus } from './provisionService.js';
import { seedStarterFaqs } from './seedStarterFaqs.js';
import { getStarterFaqs } from './faqTemplates/index.js';

function validationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isValidTimezone(tz) {
  if (!tz || typeof tz !== 'string') {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

async function loadEvolutionRow(pool, tenantId) {
  const [rows] = await pool.query(
    `SELECT instance_name, status, phone_number, connected_at
     FROM evolution_instances
     WHERE tenant_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [tenantId]
  );
  return rows[0] || null;
}

async function loadStarterFaqs(pool, tenantId) {
  const [rows] = await pool.query(
    `SELECT f.id, f.faq_uid, f.question, f.answer, f.category, f.keywords,
            f.is_starter_template, f.starter_key, a.slug AS agent_slug
     FROM faq_items f
     JOIN agents a ON a.id = f.agent_id
     WHERE f.tenant_id = ?
       AND (f.is_starter_template = TRUE OR f.faq_uid LIKE 'starter:%')
     ORDER BY f.is_starter_template DESC, f.id ASC`,
    [tenantId]
  );
  return rows.slice(0, 3);
}

async function ensureStarterFaqs(pool, config, tenantId, tenantSlug, primaryLanguage, logger = null) {
  let starterFaqs = await loadStarterFaqs(pool, tenantId);
  if (starterFaqs.length >= 3 || !tenantSlug) {
    return starterFaqs;
  }

  try {
    const result = await seedStarterFaqs(
      pool,
      config,
      {
        tenantId,
        tenantSlug,
        primaryLanguage: primaryLanguage || 'es',
      },
      { logger }
    );
    if (result.errors?.length) {
      logger?.warn({ tenantId, errors: result.errors }, 'Errores al sembrar FAQs plantilla');
    }
    starterFaqs = await loadStarterFaqs(pool, tenantId);
  } catch (error) {
    logger?.warn({ err: error, tenantId }, 'No se pudieron sembrar FAQs plantilla');
  }

  return starterFaqs;
}

export async function seedOnboardingStarterFaqs(pool, config, userId, tenantId, logger = null) {
  const [userRows] = await pool.query(
    `SELECT t.slug
     FROM users u
     JOIN tenants t ON t.id = u.tenant_id
     WHERE u.id = ? AND u.tenant_id = ?`,
    [userId, tenantId]
  );
  const user = userRows[0];
  if (!user) {
    throw validationError('Usuario no encontrado', 404);
  }

  const [settingsRows] = await pool.query(
    `SELECT primary_language FROM tenant_settings WHERE tenant_id = ?`,
    [tenantId]
  );
  const primaryLanguage = settingsRows[0]?.primary_language || 'es';

  const starterFaqs = await ensureStarterFaqs(
    pool,
    config,
    tenantId,
    user.slug,
    primaryLanguage,
    logger
  );

  if (starterFaqs.length < 3) {
    throw validationError('No se pudieron crear las FAQs plantilla del onboarding', 500);
  }

  return starterFaqs;
}

function mapObjectiveForClient(objective) {
  return {
    slug: objective.slug,
    name: objective.name,
    description: objective.description,
    examples: objective.examples,
    motor: objective.motor,
    needs_destination_url: objective.needs_destination_url,
    needs_booking_motor: objective.needs_booking_motor,
  };
}

export async function getOnboardingStatus(pool, config, userId, tenantId) {
  const [userRows] = await pool.query(
    `SELECT t.slug, t.name, t.status AS tenant_status
     FROM users u
     JOIN tenants t ON t.id = u.tenant_id
     WHERE u.id = ? AND u.tenant_id = ?`,
    [userId, tenantId]
  );
  const user = userRows[0];
  if (!user) {
    throw validationError('Usuario no encontrado', 404);
  }

  const [settingsRows] = await pool.query(
    `SELECT objetivo_slug, onboarding_completed, tenant_url, welcome_message,
            primary_language, validation_status, agenda_validation_status, business_type
     FROM tenant_settings
     WHERE tenant_id = ?`,
    [tenantId]
  );
  const settings = settingsRows[0] || {};

  let evo = await loadEvolutionRow(pool, tenantId);
  if (evo?.instance_name && evo.status === 'connected' && config) {
    await syncWhatsappConnectionStatus(pool, config, tenantId, evo.instance_name);
    evo = await loadEvolutionRow(pool, tenantId);
  }

  const whatsappConnected = evo?.status === 'connected';
  const objective = getObjective(settings.objetivo_slug);
  const starterFaqs = await ensureStarterFaqs(
    pool,
    config,
    tenantId,
    user.slug,
    settings.primary_language,
    null
  );

  return {
    onboarding_completed: Boolean(settings.onboarding_completed),
    objetivo_slug: settings.objetivo_slug || '',
    objective: objective ? mapObjectiveForClient(objective) : null,
    business_name: user.name || '',
    welcome_message: settings.welcome_message || '',
    primary_language: settings.primary_language || 'es',
    tenant_url: settings.tenant_url || '',
    booking_approved: settings.validation_status === 'approved',
    agenda_approved: settings.agenda_validation_status === 'approved',
    whatsapp: {
      connected: whatsappConnected,
      phone_number: evo?.phone_number || '',
      instance_name: evo?.instance_name || '',
    },
    starter_faqs: starterFaqs,
    objectives: OBJECTIVES.map(mapObjectiveForClient),
    agent_control: {
      agent_off_trigger: '**',
      agent_on_trigger: '##',
    },
    ready_to_complete:
      whatsappConnected &&
      Boolean(settings.objetivo_slug) &&
      (user.name || '').trim().length >= 2 &&
      starterFaqs.length >= 3,
  };
}

export async function updateOnboardingSetup(
  pool,
  config,
  userId,
  tenantId,
  input
) {
  const status = await getOnboardingStatus(pool, config, userId, tenantId);

  if (status.onboarding_completed) {
    throw validationError('El onboarding ya fue completado');
  }

  if (input.objetivo_slug !== undefined) {
    const slug = String(input.objetivo_slug || '').trim();
    if (!isValidObjectiveSlug(slug)) {
      throw validationError('objetivo_slug inválido');
    }
    await pool.query(
      `UPDATE tenant_settings SET objetivo_slug = ?, updated_at = NOW() WHERE tenant_id = ?`,
      [slug, tenantId]
    );
  }

  const businessName = input.business_name?.trim();
  if (businessName !== undefined) {
    if (businessName.length < 2) {
      throw validationError('nombre comercial debe tener al menos 2 caracteres');
    }
    await pool.query(
      `UPDATE tenants SET name = ?, updated_at = NOW() WHERE id = ?`,
      [businessName, tenantId]
    );
  }

  const settingsUpdates = [];
  const settingsParams = [];

  if (input.welcome_message !== undefined) {
    settingsUpdates.push('welcome_message = ?');
    settingsParams.push(String(input.welcome_message || '').trim());
  }
  if (input.primary_language !== undefined) {
    settingsUpdates.push('primary_language = ?');
    settingsParams.push(String(input.primary_language || 'es').trim() || 'es');
  }
  const onboardingUrl =
    input.tenant_url !== undefined
      ? input.tenant_url
      : input.destination_url;
  if (onboardingUrl !== undefined) {
    settingsUpdates.push('tenant_url = ?');
    settingsParams.push(String(onboardingUrl || '').trim());
  }
  if (input.business_type !== undefined) {
    settingsUpdates.push('business_type = ?');
    settingsParams.push(String(input.business_type || '').trim());
  }
  if (input.timezone !== undefined) {
    const tz = String(input.timezone || '').trim();
    if (tz && isValidTimezone(tz)) {
      settingsUpdates.push('timezone = ?');
      settingsParams.push(tz);
    }
  }

  if (settingsUpdates.length > 0) {
    settingsUpdates.push('updated_at = NOW()');
    await pool.query(
      `UPDATE tenant_settings SET ${settingsUpdates.join(', ')} WHERE tenant_id = ?`,
      [...settingsParams, tenantId]
    );
  }

  if (Array.isArray(input.starter_faqs)) {
    await updateStarterFaqs(pool, config, tenantId, status, input.starter_faqs);
  }

  return getOnboardingStatus(pool, config, userId, tenantId);
}

async function updateStarterFaqs(pool, config, tenantId, status, items) {
  const [tenantRows] = await pool.query(
    'SELECT slug FROM tenants WHERE id = ?',
    [tenantId]
  );
  const tenantSlug = tenantRows[0]?.slug;
  if (!tenantSlug) {
    throw validationError('Tenant no encontrado', 404);
  }

  for (const item of items) {
    const faqId = Number(item.id);
    if (!faqId) continue;

    const [rows] = await pool.query(
      `SELECT f.id, f.faq_uid, f.question, f.answer, f.category, f.keywords, f.active,
              f.is_starter_template, a.slug AS agent_slug
       FROM faq_items f
       JOIN agents a ON a.id = f.agent_id
       WHERE f.id = ? AND f.tenant_id = ?
         AND (f.is_starter_template = TRUE OR f.faq_uid LIKE 'starter:%')`,
      [faqId, tenantId]
    );
    const row = rows[0];
    if (!row) continue;

    const question = item.question?.trim() ?? row.question;
    const answer = item.answer?.trim() ?? row.answer;
    const keywords = item.keywords?.trim() ?? row.keywords;
    const category = item.category?.trim() ?? row.category;

    const edited =
      question !== row.question ||
      answer !== row.answer ||
      keywords !== row.keywords ||
      category !== row.category;

    await pool.query(
      `UPDATE faq_items
       SET question = ?, answer = ?, keywords = ?, category = ?,
           is_starter_template = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        question,
        answer,
        keywords,
        category,
        edited ? false : true,
        faqId,
      ]
    );

    const faqRow = {
      id: faqId,
      faq_uid: row.faq_uid,
      question,
      answer,
      category,
      keywords,
      active: row.active,
      agent_slug: row.agent_slug,
    };

    try {
      const indexed = await indexFaqItem(config, faqRow, tenantSlug);
      await pool.query(
        `UPDATE faq_items
         SET qdrant_point_id = ?, embedding_hash = ?, indexed_at = ?
         WHERE id = ?`,
        [indexed.point_id, indexed.embedding_hash, indexed.indexed_at, faqId]
      );
    } catch {
      /* indexación best-effort en onboarding */
    }
  }
}

export async function completeOnboarding(pool, config, userId, tenantId, input) {
  const status = await getOnboardingStatus(pool, config, userId, tenantId);

  if (status.onboarding_completed) {
    return status;
  }

  if (!status.whatsapp.connected) {
    throw validationError('Conecta WhatsApp antes de completar el onboarding');
  }

  if (!status.objetivo_slug) {
    throw validationError('Elige un objetivo de negocio');
  }

  if ((status.business_name || '').trim().length < 2) {
    throw validationError('Indica el nombre comercial');
  }

  const objective = getObjective(status.objetivo_slug);
  if (objective?.needs_destination_url && !status.tenant_url?.trim()) {
    throw validationError('Indica la URL destino de tu sitio web');
  }

  if (status.starter_faqs.length < 3) {
    throw validationError('Faltan las FAQs plantilla del onboarding');
  }

  const acknowledged =
    input?.suspension_acknowledged ?? input?.pause_acknowledged;
  if (!acknowledged) {
    throw validationError(
      'Confirma que entendiste la suspensión del agente con ** y su reactivación con ##'
    );
  }

  await pool.query(
    `UPDATE tenant_settings
     SET onboarding_completed = TRUE, updated_at = NOW()
     WHERE tenant_id = ?`,
    [tenantId]
  );

  return getOnboardingStatus(pool, config, userId, tenantId);
}
