import { hashPassword } from './password.js';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tenants (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT '',
  status VARCHAR(16) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
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
}

export async function runMigrations(pool, _config) {
  for (const statement of SCHEMA_SQL.split(';').map((s) => s.trim()).filter(Boolean)) {
    await pool.query(statement);
  }

  await applySchemaPatches(pool);

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return;
  }

  const [existing] = await pool.query(
    "SELECT id FROM users WHERE role = 'admin_global' LIMIT 1"
  );

  if (existing.length > 0) {
    return;
  }

  const passwordHash = await hashPassword(adminPassword);
  await pool.query(
    `INSERT INTO users (tenant_id, email, password_hash, role, status)
     VALUES (NULL, ?, ?, 'admin_global', 'active')`,
    [adminEmail, passwordHash]
  );

  console.log(`[faq-inn-api] Admin global creado: ${adminEmail}`);
}
