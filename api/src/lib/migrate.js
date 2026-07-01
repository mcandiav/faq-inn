import { hashPassword } from './password.js';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tenants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT '',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tenants_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin_global', 'client') NOT NULL DEFAULT 'client',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(64) NOT NULL DEFAULT 'default',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_agents_tenant_slug (tenant_id, slug),
  CONSTRAINT fk_agents_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS faq_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  agent_id BIGINT UNSIGNED NOT NULL,
  faq_uid VARCHAR(64) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(128) NOT NULL DEFAULT '',
  keywords TEXT NOT NULL,
  language VARCHAR(16) NOT NULL DEFAULT 'es',
  active TINYINT(1) NOT NULL DEFAULT 1,
  qdrant_point_id VARCHAR(64) NULL,
  embedding_hash VARCHAR(64) NULL,
  indexed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_faq_tenant_uid (tenant_id, faq_uid),
  CONSTRAINT fk_faq_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  CONSTRAINT fk_faq_agent FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS unanswered_questions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  agent_id BIGINT UNSIGNED NOT NULL,
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
  status ENUM(
    'pending',
    'converted_to_faq',
    'ignored',
    'duplicate',
    'resolved_manually'
  ) NOT NULL DEFAULT 'pending',
  converted_faq_id BIGINT UNSIGNED NULL,
  resolved_by BIGINT UNSIGNED NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_unanswered_tenant_status (tenant_id, status),
  KEY idx_unanswered_agent (agent_id),
  CONSTRAINT fk_unanswered_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  CONSTRAINT fk_unanswered_agent FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE CASCADE,
  CONSTRAINT fk_unanswered_faq FOREIGN KEY (converted_faq_id) REFERENCES faq_items (id) ON DELETE SET NULL,
  CONSTRAINT fk_unanswered_resolver FOREIGN KEY (resolved_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function applySchemaPatches(pool) {
  const [phoneCol] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'unanswered_questions'
       AND COLUMN_NAME = 'phone'`
  );

  if (phoneCol.length === 0) {
    await pool.query(
      `ALTER TABLE unanswered_questions
       ADD COLUMN phone VARCHAR(64) NOT NULL DEFAULT '' AFTER contact_name`
    );
  }
}

export async function runMigrations(pool, config) {
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

  console.log(`[dfaq-api] Admin global creado: ${adminEmail}`);
}
