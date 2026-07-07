import { hashPassword } from './password.js';
import { seedObjectiveTemplates } from './promptTemplateService.js';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tenants (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL DEFAULT '',
  status VARCHAR(16) NOT NULL DEFAULT 'active'
    CHECK (status IN (
      'active',
      'inactive',
      'draft',
      'qr_pending',
      'connected',
      'error'
    )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NULL REFERENCES tenants (id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'client'
    CHECK (role IN ('admin_global', 'client')),
  status VARCHAR(16) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS agents (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  slug VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(64) NOT NULL DEFAULT 'default',
  status VARCHAR(16) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS faq_items (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  agent_id BIGINT NOT NULL REFERENCES agents (id) ON DELETE CASCADE,
  faq_uid VARCHAR(64) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(128) NOT NULL DEFAULT '',
  keywords TEXT NOT NULL DEFAULT '',
  language VARCHAR(16) NOT NULL DEFAULT 'es',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  qdrant_point_id VARCHAR(64) NULL,
  embedding_hash VARCHAR(64) NULL,
  indexed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, faq_uid)
);

CREATE TABLE IF NOT EXISTS unanswered_questions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  agent_id BIGINT NOT NULL REFERENCES agents (id) ON DELETE CASCADE,
  tenant_slug VARCHAR(64) NOT NULL,
  channel VARCHAR(64) NOT NULL DEFAULT '',
  remote_id VARCHAR(255) NOT NULL DEFAULT '',
  contact_name VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(64) NOT NULL DEFAULT '',
  question TEXT NOT NULL,
  language VARCHAR(16) NOT NULL DEFAULT 'es',
  score DECIMAL(10, 8) NULL,
  suggested_faq_id VARCHAR(64) NULL,
  suggested_faq_question TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'converted_to_faq',
      'ignored',
      'duplicate',
      'resolved_manually'
    )),
  converted_faq_id BIGINT NULL REFERENCES faq_items (id) ON DELETE SET NULL,
  resolved_by BIGINT NULL REFERENCES users (id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unanswered_tenant_status
  ON unanswered_questions (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_unanswered_agent
  ON unanswered_questions (agent_id);

CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id BIGINT PRIMARY KEY REFERENCES tenants (id) ON DELETE CASCADE,
  vertical_slug VARCHAR(64) NOT NULL DEFAULT 'hotel',
  primary_language VARCHAR(16) NOT NULL DEFAULT 'es',
  booking_url_base TEXT NOT NULL DEFAULT '',
  booking_url_template TEXT NOT NULL DEFAULT '',
  lodging_type VARCHAR(64) NOT NULL DEFAULT 'hotel',
  business_hours TEXT NOT NULL DEFAULT '',
  policies TEXT NOT NULL DEFAULT '',
  welcome_message TEXT NOT NULL DEFAULT '',
  postgres_database VARCHAR(128) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_provisioning (
  tenant_id BIGINT PRIMARY KEY REFERENCES tenants (id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',
      'provisioning',
      'waiting_qr_scan',
      'connected',
      'workflow_created',
      'testing',
      'active',
      'error',
      'suspended',
      'cancelled'
    )),
  last_error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evolution_instances (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  instance_name VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'qr_pending', 'connected', 'error')),
  phone_number VARCHAR(64) NOT NULL DEFAULT '',
  webhook_url TEXT NOT NULL DEFAULT '',
  last_qr_base64 TEXT NOT NULL DEFAULT '',
  last_qr_at TIMESTAMPTZ NULL,
  connected_at TIMESTAMPTZ NULL,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (instance_name)
);

CREATE INDEX IF NOT EXISTS idx_evolution_instances_tenant
  ON evolution_instances (tenant_id);
`;

async function applySchemaPatches(pool) {
  const [phoneCol] = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'unanswered_questions'
       AND column_name = 'phone'`
  );

  if (phoneCol.length === 0) {
    await pool.query(
      `ALTER TABLE unanswered_questions
       ADD COLUMN phone VARCHAR(64) NOT NULL DEFAULT ''`
    );
  }

  const [emailCol] = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'tenants'
       AND column_name = 'email'`
  );

  if (emailCol.length === 0) {
    await pool.query(
      `ALTER TABLE tenants
       ADD COLUMN email VARCHAR(255) NOT NULL DEFAULT ''`
    );
  }

  await pool.query(
    `ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_status_check`
  );
  await pool.query(
    `ALTER TABLE tenants
     ADD CONSTRAINT tenants_status_check
     CHECK (status IN (
       'active',
       'inactive',
       'draft',
       'qr_pending',
       'connected',
       'disconnected',
       'error'
     ))`
  );

  await pool.query(
    `ALTER TABLE evolution_instances DROP CONSTRAINT IF EXISTS evolution_instances_status_check`
  );
  await pool.query(
    `ALTER TABLE evolution_instances
     ADD CONSTRAINT evolution_instances_status_check
     CHECK (status IN ('draft', 'qr_pending', 'connected', 'disconnected', 'error'))`
  );

  const [qrCol] = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'evolution_instances'
       AND column_name = 'last_qr_base64'`
  );

  if (qrCol.length === 0) {
    await pool.query(
      `ALTER TABLE evolution_instances
       ADD COLUMN last_qr_base64 TEXT NOT NULL DEFAULT ''`
    );
  }

  const [webhookCol] = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'evolution_instances'
       AND column_name = 'webhook_url'`
  );

  if (webhookCol.length === 0) {
    await pool.query(
      `ALTER TABLE evolution_instances
       ADD COLUMN webhook_url TEXT NOT NULL DEFAULT ''`
    );
  }

  const [addressCol] = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'tenant_settings'
       AND column_name = 'address'`
  );

  if (addressCol.length === 0) {
    await pool.query(
      `ALTER TABLE tenant_settings
       ADD COLUMN address TEXT NOT NULL DEFAULT ''`
    );
  }

  const bookingSettingsColumns = [
    ['booking_url_mode', "VARCHAR(32) NOT NULL DEFAULT ''"],
    ['validation_status', "VARCHAR(32) NOT NULL DEFAULT 'pending'"],
    ['confidence_score', 'DECIMAL(5,2) NOT NULL DEFAULT 0'],
    ['booking_config', "TEXT NOT NULL DEFAULT '{}'"],
    ['booking_approved_at', 'TIMESTAMPTZ NULL'],
  ];

  for (const [columnName, columnDef] of bookingSettingsColumns) {
    const [exists] = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'tenant_settings'
         AND column_name = ?`,
      [columnName]
    );
    if (exists.length === 0) {
      await pool.query(
        `ALTER TABLE tenant_settings ADD COLUMN ${columnName} ${columnDef}`
      );
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS booking_discovery_sessions (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
      status VARCHAR(32) NOT NULL DEFAULT 'draft'
        CHECK (status IN (
          'draft',
          'detected',
          'pending_verification',
          'approved',
          'rejected',
          'cancelled'
        )),
      scenarios TEXT NOT NULL DEFAULT '[]',
      sample_urls TEXT NOT NULL DEFAULT '[]',
      candidate_template TEXT NOT NULL DEFAULT '',
      candidate_config TEXT NOT NULL DEFAULT '{}',
      verification_scenario TEXT NOT NULL DEFAULT '{}',
      verification_url TEXT NOT NULL DEFAULT '',
      warnings TEXT NOT NULL DEFAULT '[]',
      confidence_score DECIMAL(5,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_booking_discovery_tenant
      ON booking_discovery_sessions (tenant_id, status)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS booking_short_links (
      code VARCHAR(16) PRIMARY KEY,
      target_url TEXT NOT NULL,
      tenant_id BIGINT REFERENCES tenants (id) ON DELETE SET NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_booking_short_links_expires
      ON booking_short_links (expires_at)
  `);

  const faqStarterColumns = [
    ['is_starter_template', 'BOOLEAN NOT NULL DEFAULT FALSE'],
    ['starter_key', "VARCHAR(64) NOT NULL DEFAULT ''"],
  ];

  for (const [columnName, columnDef] of faqStarterColumns) {
    const [exists] = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'faq_items'
         AND column_name = ?`,
      [columnName]
    );
    if (exists.length === 0) {
      await pool.query(`ALTER TABLE faq_items ADD COLUMN ${columnName} ${columnDef}`);
    }
  }

  const onboardingSettingsColumns = [
    ['objetivo_slug', "VARCHAR(64) NOT NULL DEFAULT ''"],
    ['onboarding_completed', 'BOOLEAN NOT NULL DEFAULT FALSE'],
    ['destination_url', "TEXT NOT NULL DEFAULT ''"],
    ['business_type', "VARCHAR(64) NOT NULL DEFAULT ''"],
    ['timezone', "VARCHAR(64) NOT NULL DEFAULT 'America/Santiago'"],
    // URL única del tenant (lo que el agente entrega en la respuesta). El modo
    // (plantilla vs link fijo) lo decide el system prompt según el objetivo.
    ['tenant_url', "TEXT NOT NULL DEFAULT ''"],
  ];

  for (const [columnName, columnDef] of onboardingSettingsColumns) {
    const [exists] = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'tenant_settings'
         AND column_name = ?`,
      [columnName]
    );
    if (exists.length === 0) {
      await pool.query(
        `ALTER TABLE tenant_settings ADD COLUMN ${columnName} ${columnDef}`
      );
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS agenda_discovery_sessions (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
      status VARCHAR(32) NOT NULL DEFAULT 'draft'
        CHECK (status IN (
          'draft',
          'detected',
          'pending_verification',
          'approved',
          'rejected',
          'cancelled'
        )),
      scenarios TEXT NOT NULL DEFAULT '[]',
      sample_urls TEXT NOT NULL DEFAULT '[]',
      candidate_template TEXT NOT NULL DEFAULT '',
      candidate_config TEXT NOT NULL DEFAULT '{}',
      verification_scenario TEXT NOT NULL DEFAULT '{}',
      verification_url TEXT NOT NULL DEFAULT '',
      warnings TEXT NOT NULL DEFAULT '[]',
      confidence_score DECIMAL(5,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_agenda_discovery_tenant
      ON agenda_discovery_sessions (tenant_id, status)
  `);

  const agendaSettingsColumns = [
    ['agenda_url_base', "TEXT NOT NULL DEFAULT ''"],
    ['agenda_url_template', "TEXT NOT NULL DEFAULT ''"],
    ['agenda_url_mode', "VARCHAR(32) NOT NULL DEFAULT ''"],
    ['agenda_validation_status', "VARCHAR(32) NOT NULL DEFAULT 'pending'"],
    ['agenda_confidence_score', 'DECIMAL(5,2) NOT NULL DEFAULT 0'],
    ['agenda_config', "TEXT NOT NULL DEFAULT '{}'"],
    ['agenda_approved_at', 'TIMESTAMPTZ NULL'],
  ];

  for (const [columnName, columnDef] of agendaSettingsColumns) {
    const [exists] = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'tenant_settings'
         AND column_name = ?`,
      [columnName]
    );
    if (exists.length === 0) {
      await pool.query(
        `ALTER TABLE tenant_settings ADD COLUMN ${columnName} ${columnDef}`
      );
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_prompt_objective_templates (
      id BIGSERIAL PRIMARY KEY,
      objective_slug VARCHAR(64) NOT NULL,
      objective_name VARCHAR(255) NOT NULL DEFAULT '',
      role_template TEXT NOT NULL DEFAULT '',
      limits_template TEXT NOT NULL DEFAULT '',
      tools_template TEXT NOT NULL DEFAULT '',
      date_interpretation_template TEXT NOT NULL DEFAULT '',
      data_collection_template TEXT NOT NULL DEFAULT '',
      links_template TEXT NOT NULL DEFAULT '',
      status VARCHAR(16) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'archived')),
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (objective_slug)
    )
  `);

  await seedObjectiveTemplates(pool);

  // Consolidación a una sola URL por tenant (tenant_url). El modo (plantilla vs
  // link fijo) lo decide el system prompt según el objetivo. Backfill único
  // desde las columnas antiguas y luego se eliminan.
  const legacyUrlColumns = [
    'booking_url_base',
    'booking_url_template',
    'booking_url_mode',
    'agenda_url_base',
    'agenda_url_template',
    'agenda_url_mode',
    'destination_url',
  ];
  const [tenantUrlExists] = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'tenant_settings'
       AND column_name = 'tenant_url'`
  );
  if (tenantUrlExists.length > 0) {
    try {
      await pool.query(`
        UPDATE tenant_settings
        SET tenant_url = COALESCE(
          NULLIF(booking_url_template, ''),
          NULLIF(agenda_url_template, ''),
          NULLIF(destination_url, ''),
          ''
        )
        WHERE tenant_url = ''
      `);
    } catch {
      /* columnas antiguas ya eliminadas: no hay nada que respaldar */
    }
  }
  for (const col of legacyUrlColumns) {
    await pool.query(`ALTER TABLE tenant_settings DROP COLUMN IF EXISTS ${col}`);
  }
}

export async function runMigrations(pool, _config) {
  for (const statement of SCHEMA_SQL.split(';').map((s) => s.trim()).filter(Boolean)) {
    await pool.query(statement);
  }

  await applySchemaPatches(pool);

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();

  if (!adminEmail || !adminPassword) {
    return;
  }

  const passwordHash = await hashPassword(adminPassword);

  const [existing] = await pool.query(
    "SELECT id, email FROM users WHERE role = 'admin_global' LIMIT 1"
  );

  if (existing.length > 0) {
    const adminId = existing[0].id;

    const [emailTaken] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [adminEmail, adminId]
    );

    if (emailTaken.length > 0) {
      console.error(
        `[faq-inn-api] ADMIN_EMAIL ${adminEmail} ya está en uso por otro usuario`
      );
      return;
    }

    await pool.query(
      'UPDATE users SET email = ?, password_hash = ? WHERE id = ?',
      [adminEmail, passwordHash, adminId]
    );
    console.log(`[faq-inn-api] Admin global sincronizado: ${adminEmail}`);
    return;
  }

  await pool.query(
    `INSERT INTO users (tenant_id, email, password_hash, role, status)
     VALUES (NULL, ?, ?, 'admin_global', 'active')`,
    [adminEmail, passwordHash]
  );

  console.log(`[faq-inn-api] Admin global creado: ${adminEmail}`);
}
