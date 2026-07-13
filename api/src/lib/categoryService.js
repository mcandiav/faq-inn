function validationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export const DEFAULT_FAQ_CATEGORY = 'Sin categoría';

function serializeFaqCategory(row) {
  return {
    id: row.id,
    name: row.name,
    active: Boolean(row.active),
    is_default: Boolean(row.is_default),
  };
}

async function loadFaqCategory(pool, tenantId, categoryId) {
  const [rows] = await pool.query(
    `SELECT id, tenant_id, name, active, is_default
     FROM faq_categories
     WHERE tenant_id = ? AND id = ?
     LIMIT 1`,
    [tenantId, categoryId]
  );
  return rows[0] || null;
}

export async function ensureDefaultFaqCategory(pool, tenantId) {
  await pool.query(
    `INSERT INTO faq_categories (tenant_id, name, active, is_default)
     SELECT ?, ?, TRUE, TRUE
     WHERE NOT EXISTS (
       SELECT 1 FROM faq_categories
       WHERE tenant_id = ? AND is_default = TRUE
     )`,
    [tenantId, DEFAULT_FAQ_CATEGORY, tenantId]
  );

  const [rows] = await pool.query(
    `SELECT id, tenant_id, name, active, is_default
     FROM faq_categories
     WHERE tenant_id = ? AND is_default = TRUE
     ORDER BY id ASC
     LIMIT 1`,
    [tenantId]
  );

  return rows[0] || null;
}

export async function listFaqCategories(pool, tenantId, { includeInactive = false } = {}) {
  await ensureDefaultFaqCategory(pool, tenantId);
  const params = [tenantId];
  let sql = `
    SELECT id, tenant_id, name, active, is_default
    FROM faq_categories
    WHERE tenant_id = ?
  `;
  if (!includeInactive) {
    sql += ' AND active = TRUE';
  }
  sql += ' ORDER BY is_default DESC, name ASC, id ASC';

  const [rows] = await pool.query(sql, params);
  return rows.map(serializeFaqCategory);
}

export async function createFaqCategory(pool, tenantId, input) {
  const name = input.name?.trim();
  if (!name) {
    throw validationError('nombre de categoría es obligatorio');
  }

  await ensureDefaultFaqCategory(pool, tenantId);

  const [existing] = await pool.query(
    `SELECT id
     FROM faq_categories
     WHERE tenant_id = ? AND LOWER(name) = LOWER(?)
     LIMIT 1`,
    [tenantId, name]
  );
  if (existing.length > 0) {
    throw validationError('la categoría ya existe', 409);
  }

  const [result] = await pool.query(
    `INSERT INTO faq_categories (tenant_id, name, active, is_default)
     VALUES (?, ?, TRUE, FALSE)`,
    [tenantId, name]
  );

  return loadFaqCategory(pool, tenantId, result.insertId);
}

export async function updateFaqCategory(pool, tenantId, categoryId, input) {
  const category = await loadFaqCategory(pool, tenantId, categoryId);
  if (!category) {
    throw validationError('categoría no encontrada', 404);
  }

  const nextName = input.name !== undefined ? input.name.trim() : undefined;
  const nextActive = input.active !== undefined ? Boolean(input.active) : undefined;

  if (nextName !== undefined && !nextName) {
    throw validationError('nombre de categoría es obligatorio');
  }

  const updates = [];
  const params = [];

  if (nextName !== undefined && nextName !== category.name) {
    const [duplicate] = await pool.query(
      `SELECT id
       FROM faq_categories
       WHERE tenant_id = ? AND LOWER(name) = LOWER(?) AND id != ?
       LIMIT 1`,
      [tenantId, nextName, category.id]
    );
    if (duplicate.length > 0) {
      throw validationError('la categoría ya existe', 409);
    }

    await pool.query(
      `UPDATE faq_items
       SET category = ?, updated_at = NOW()
       WHERE tenant_id = ? AND category = ?`,
      [nextName, tenantId, category.name]
    );

    updates.push('name = ?');
    params.push(nextName);
  }

  if (nextActive !== undefined && !category.is_default) {
    updates.push('active = ?');
    params.push(nextActive);
  }

  if (category.is_default) {
    updates.push('active = TRUE');
  }

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    await pool.query(
      `UPDATE faq_categories SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
      [...params, category.id, tenantId]
    );
  }

  return loadFaqCategory(pool, tenantId, category.id);
}

export async function deleteFaqCategory(pool, tenantId, categoryId) {
  const category = await loadFaqCategory(pool, tenantId, categoryId);
  if (!category) {
    throw validationError('categoría no encontrada', 404);
  }
  if (category.is_default) {
    throw validationError('«Sin categoría» no se puede eliminar.');
  }

  const defaultCategory = await ensureDefaultFaqCategory(pool, tenantId);

  await pool.query('DELETE FROM faq_categories WHERE id = ? AND tenant_id = ?', [
    category.id,
    tenantId,
  ]);

  await pool.query(
    `UPDATE faq_items
     SET category = ?, updated_at = NOW()
     WHERE tenant_id = ? AND category = ?`,
    [defaultCategory?.name || DEFAULT_FAQ_CATEGORY, tenantId, category.name]
  );

  return { id: category.id };
}
