import { hashPassword } from './password.js';
import { ensureTenantCollection } from './indexer.js';
import { seedStarterFaqs } from './seedStarterFaqs.js';
import { isValidTenantSlug, normalizeTenantSlug } from './tenantSlug.js';
import { seedDefaultFaqCategories } from './faqCategories.js';

function validationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function allocateUniqueSlug(pool, seed) {
  const base =
    normalizeTenantSlug(seed) || `hotel-${Date.now().toString(36)}`;

  let candidate = base.slice(0, 48);
  let attempt = 0;

  while (attempt < 20) {
    if (!isValidTenantSlug(candidate)) {
      candidate = `hotel-${Date.now().toString(36)}`.slice(0, 48);
    }

    const [rows] = await pool.query('SELECT id FROM tenants WHERE slug = ?', [
      candidate,
    ]);
    if (rows.length === 0) {
      return candidate;
    }

    attempt += 1;
    candidate = `${base.slice(0, 40)}-${attempt}`;
  }

  throw validationError('No se pudo generar un tenant_slug único', 500);
}

/** Registro rápido: email + contraseña; datos del negocio se completan en Mi cuenta. */
export async function registerQuickSignup(pool, config, input, { logger } = {}) {
  const email = input.email?.trim().toLowerCase();
  const password = input.password || '';

  if (!email || !email.includes('@')) {
    throw validationError('email inválido');
  }

  if (password.length < 8) {
    throw validationError('password debe tener al menos 8 caracteres');
  }

  const [existingEmail] = await pool.query(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );
  if (existingEmail.length > 0) {
    throw validationError('email ya registrado', 409);
  }

  const slug = await allocateUniqueSlug(pool, email.split('@')[0] || email);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [, tenantMeta] = await connection.query(
      `INSERT INTO tenants (slug, name, email, status)
       VALUES (?, ?, ?, 'draft')`,
      [slug, '', email]
    );
    const tenantId = tenantMeta.insertId;

    await connection.query(
      `INSERT INTO tenant_settings
       (tenant_id, vertical_slug, primary_language, postgres_database)
       VALUES (?, 'hotel', 'es', ?)`,
      [tenantId, slug]
    );

    await connection.query(
      `INSERT INTO tenant_provisioning (tenant_id, status, last_error)
       VALUES (?, 'draft', '')`,
      [tenantId]
    );

    const passwordHash = await hashPassword(password);
    const [, userMeta] = await connection.query(
      `INSERT INTO users (tenant_id, email, password_hash, role, status)
       VALUES (?, ?, ?, 'client', 'active')`,
      [tenantId, email, passwordHash]
    );

    const [, agentMeta] = await connection.query(
      `INSERT INTO agents (tenant_id, slug, name, channel, status)
       VALUES (?, 'principal', 'Agente', 'whatsapp', 'active')`,
      [tenantId]
    );

    await connection.commit();

    try {
      await seedDefaultFaqCategories(pool, tenantId);
    } catch (error) {
      logger?.warn({ err: error, tenantSlug: slug }, 'Categorías FAQ no sembradas al signup');
    }

    try {
      await ensureTenantCollection(config, slug);
    } catch (error) {
      logger?.warn({ err: error }, 'Colección Qdrant no creada al signup');
    }

    try {
      await seedStarterFaqs(
        pool,
        config,
        {
          tenantId,
          tenantSlug: slug,
          agentId: agentMeta.insertId,
          agentSlug: 'principal',
          primaryLanguage: 'es',
        },
        { logger }
      );
    } catch (error) {
      logger?.warn({ err: error, tenantSlug: slug }, 'FAQs plantilla no sembradas al signup');
    }

    return {
      tenantId,
      userId: userMeta.insertId,
      slug,
      email,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createHotelTenant(pool, config, input, { logger } = {}) {
  const businessName = input.business_name?.trim();
  const slug =
    normalizeTenantSlug(input.tenant_slug) ||
    normalizeTenantSlug(businessName);
  const email = input.email?.trim().toLowerCase();
  const password = input.password || '';
  const primaryLanguage = input.primary_language?.trim() || 'es';
  // URL única del tenant: acepta tenant_url o las claves legadas booking_url_*.
  const tenantUrl =
    input.tenant_url?.trim() ||
    input.booking_url_template?.trim() ||
    input.booking_url_base?.trim() ||
    '';
  const lodgingType = input.lodging_type?.trim() || 'hotel';
  const businessHours = input.business_hours?.trim() || '';
  const policies = input.policies?.trim() || '';
  const welcomeMessage = input.welcome_message?.trim() || '';
  const agentSlug = input.agent_slug?.trim().toLowerCase() || 'principal';
  const agentName = input.agent_name?.trim() || 'Agente principal';

  if (!businessName || businessName.length < 2) {
    throw validationError('nombre comercial es obligatorio');
  }

  if (!isValidTenantSlug(slug)) {
    throw validationError(
      'slug inválido (mínimo 2 caracteres, solo a-z, 0-9 y guiones)'
    );
  }

  if (!email || !email.includes('@')) {
    throw validationError('email inválido');
  }

  if (password.length < 8) {
    throw validationError('password debe tener al menos 8 caracteres');
  }

  if (!tenantUrl) {
    throw validationError('URL de reservas es obligatoria');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingSlug] = await connection.query(
      'SELECT id FROM tenants WHERE slug = ?',
      [slug]
    );
    if (existingSlug.length > 0) {
      throw validationError('ese identificador ya está en uso', 409);
    }

    const [existingEmail] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existingEmail.length > 0) {
      throw validationError('email ya registrado', 409);
    }

    const [, tenantMeta] = await connection.query(
      `INSERT INTO tenants (slug, name, status) VALUES (?, ?, 'active')`,
      [slug, businessName]
    );
    const tenantId = tenantMeta.insertId;

    await connection.query(
      `INSERT INTO tenant_settings
       (tenant_id, vertical_slug, primary_language, tenant_url,
        lodging_type, business_hours, policies,
        welcome_message, postgres_database)
       VALUES (?, 'hotel', ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        primaryLanguage,
        tenantUrl,
        lodgingType,
        businessHours,
        policies,
        welcomeMessage,
        slug,
      ]
    );

    await connection.query(
      `INSERT INTO tenant_provisioning (tenant_id, status, last_error)
       VALUES (?, 'active', '')`,
      [tenantId]
    );

    const passwordHash = await hashPassword(password);
    const [, userMeta] = await connection.query(
      `INSERT INTO users (tenant_id, email, password_hash, role, status)
       VALUES (?, ?, ?, 'client', 'active')`,
      [tenantId, email, passwordHash]
    );

    const [, agentMeta] = await connection.query(
      `INSERT INTO agents (tenant_id, slug, name, channel, status)
       VALUES (?, ?, ?, 'whatsapp', 'active')`,
      [tenantId, agentSlug, agentName]
    );

    await connection.commit();

    try {
      await seedDefaultFaqCategories(pool, tenantId);
    } catch (error) {
      logger?.warn({ err: error, tenantSlug: slug }, 'Categorías FAQ no sembradas al onboarding');
    }

    let qdrantCollection = config.qdrantCollectionTemplate.replace(
      '<tenant_slug>',
      slug
    );

    try {
      await ensureTenantCollection(config, slug);
    } catch (error) {
      logger?.warn({ err: error }, 'Colección Qdrant no creada al onboarding');
      qdrantCollection = null;
    }

    try {
      await seedStarterFaqs(
        pool,
        config,
        {
          tenantId,
          tenantSlug: slug,
          agentId: agentMeta.insertId,
          agentSlug,
          primaryLanguage,
        },
        { logger }
      );
    } catch (error) {
      logger?.warn({ err: error, tenantSlug: slug }, 'FAQs plantilla no sembradas al onboarding');
    }

    return {
      tenantId,
      userId: userMeta.insertId,
      slug,
      businessName,
      email,
      agentSlug,
      qdrantCollection,
      provisioningStatus: 'active',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createAdminTenant(pool, config, input, { logger } = {}) {
  const slug = normalizeTenantSlug(input.slug);
  const email = input.email?.trim().toLowerCase();
  const password = input.password || '';
  const agentSlug = input.agent_slug?.trim().toLowerCase() || 'principal';
  const agentName = input.agent_name?.trim() || 'Agente principal';
  const businessName = input.name?.trim() || '';

  if (!isValidTenantSlug(slug)) {
    throw validationError('slug inválido (solo a-z, 0-9, _ y -)');
  }

  if (!email || !email.includes('@')) {
    throw validationError('email inválido');
  }

  if (password.length < 8) {
    throw validationError('password debe tener al menos 8 caracteres');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingSlug] = await connection.query(
      'SELECT id FROM tenants WHERE slug = ?',
      [slug]
    );
    if (existingSlug.length > 0) {
      throw validationError('slug ya existe', 409);
    }

    const [existingEmail] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existingEmail.length > 0) {
      throw validationError('email ya registrado', 409);
    }

    const [, tenantMeta] = await connection.query(
      `INSERT INTO tenants (slug, name, status) VALUES (?, ?, 'active')`,
      [slug, businessName]
    );
    const tenantId = tenantMeta.insertId;

    await connection.query(
      `INSERT INTO tenant_settings
       (tenant_id, vertical_slug, postgres_database)
       VALUES (?, 'hotel', ?)`,
      [tenantId, slug]
    );

    await connection.query(
      `INSERT INTO tenant_provisioning (tenant_id, status) VALUES (?, 'active')`,
      [tenantId]
    );

    const passwordHash = await hashPassword(password);
    await connection.query(
      `INSERT INTO users (tenant_id, email, password_hash, role, status)
       VALUES (?, ?, ?, 'client', 'active')`,
      [tenantId, email, passwordHash]
    );

    const [, agentMeta] = await connection.query(
      `INSERT INTO agents (tenant_id, slug, name, channel, status)
       VALUES (?, ?, ?, 'default', 'active')`,
      [tenantId, agentSlug, agentName]
    );

    await connection.commit();

    try {
      await seedDefaultFaqCategories(pool, tenantId);
    } catch (error) {
      logger?.warn({ err: error, tenantSlug: slug }, 'Categorías FAQ no sembradas al alta');
    }

    try {
      await ensureTenantCollection(config, slug);
    } catch (error) {
      logger?.warn({ err: error }, 'Colección Qdrant no creada al alta');
    }

    try {
      await seedStarterFaqs(
        pool,
        config,
        {
          tenantId,
          tenantSlug: slug,
          agentId: agentMeta.insertId,
          agentSlug,
          primaryLanguage: 'es',
        },
        { logger }
      );
    } catch (error) {
      logger?.warn({ err: error, tenantSlug: slug }, 'FAQs plantilla no sembradas al alta admin');
    }

    return {
      tenantId,
      slug,
      email,
      agentSlug,
      qdrantCollection: config.qdrantCollectionTemplate.replace(
        '<tenant_slug>',
        slug
      ),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
