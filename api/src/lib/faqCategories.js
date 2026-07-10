export const DEFAULT_FAQ_CATEGORIES = [
  'Sin categoría',
  'Pregunta sin respuesta',
  'Respuesta interna',
  'Responsable 1',
  'Responsable 2',
];

export const DEFAULT_FAQ_CATEGORY_NAME = DEFAULT_FAQ_CATEGORIES[0];

function normalizeCategoryName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 128);
}

/** Vacío → «Sin categoría»; si hay texto, lo normaliza. */
export function resolveFaqCategoryInput(name) {
  const normalized = normalizeCategoryName(name);
  return normalized || DEFAULT_FAQ_CATEGORY_NAME;
}

export async function listFaqCategories(pool, tenantId, { includeInactive = false } = {}) {
  const where = ['tenant_id = ?'];
  const params = [tenantId];

  if (!includeInactive) {
    where.push('active = TRUE');
  }

  const [rows] = await pool.query(
    `SELECT id, tenant_id, name, active, sort_order, created_at, updated_at
     FROM faq_categories
     WHERE ${where.join(' AND ')}
     ORDER BY active DESC, sort_order ASC, name ASC, id ASC`,
    params
  );

  return rows;
}

export async function seedDefaultFaqCategories(pool, tenantId) {
  for (let i = 0; i < DEFAULT_FAQ_CATEGORIES.length; i += 1) {
    const name = DEFAULT_FAQ_CATEGORIES[i];
    await pool.query(
      `INSERT INTO faq_categories (tenant_id, name, active, sort_order)
       SELECT ?, ?, TRUE, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM faq_categories WHERE tenant_id = ? AND name = ?
       )`,
      [tenantId, name, i + 1, tenantId, name]
    );
  }

  return listFaqCategories(pool, tenantId, { includeInactive: true });
}

/** Asegura que el nombre exista en el catálogo del tenant y lo devuelve. */
export async function ensureFaqCategory(pool, tenantId, name) {
  const normalized = resolveFaqCategoryInput(name);

  const [rows] = await pool.query(
    `SELECT id, name, active
     FROM faq_categories
     WHERE tenant_id = ? AND name = ?
     LIMIT 1`,
    [tenantId, normalized]
  );

  if (rows[0]) {
    if (!rows[0].active) {
      await pool.query(
        `UPDATE faq_categories
         SET active = TRUE, updated_at = NOW()
         WHERE id = ?`,
        [rows[0].id]
      );
    }
    return rows[0].name;
  }

  const [maxRows] = await pool.query(
    `SELECT COALESCE(MAX(sort_order), 0) AS max_sort
     FROM faq_categories
     WHERE tenant_id = ?`,
    [tenantId]
  );
  const nextSort = Number(maxRows[0]?.max_sort || 0) + 1;

  await pool.query(
    `INSERT INTO faq_categories (tenant_id, name, active, sort_order)
     VALUES (?, ?, TRUE, ?)`,
    [tenantId, normalized, nextSort]
  );

  return normalized;
}

function validationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseCategoryId(raw) {
  const categoryId = Number(raw);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return null;
  }
  return categoryId;
}

export async function updateFaqCategoryName(pool, tenantId, categoryId, nextName) {
  const id = parseCategoryId(categoryId);
  if (!id) {
    throw validationError('id inválido');
  }

  const normalized = normalizeCategoryName(nextName);
  if (!normalized) {
    throw validationError('El nombre de la categoría no puede quedar vacío');
  }

  const [rows] = await pool.query(
    `SELECT id, name
     FROM faq_categories
     WHERE id = ? AND tenant_id = ?
     LIMIT 1`,
    [id, tenantId]
  );

  const current = rows[0];
  if (!current) {
    throw validationError('Categoría no encontrada', 404);
  }

  if (current.name === normalized) {
    return { id, name: normalized };
  }

  const [taken] = await pool.query(
    `SELECT id
     FROM faq_categories
     WHERE tenant_id = ? AND name = ? AND id != ?
     LIMIT 1`,
    [tenantId, normalized, id]
  );
  if (taken.length > 0) {
    throw validationError('Ya existe una categoría con ese nombre', 409);
  }

  await pool.query(
    `UPDATE faq_categories
     SET name = ?, updated_at = NOW()
     WHERE id = ?`,
    [normalized, id]
  );

  await pool.query(
    `UPDATE faq_items
     SET category = ?, updated_at = NOW()
     WHERE tenant_id = ? AND category = ?`,
    [normalized, tenantId, current.name]
  );

  return { id, name: normalized };
}

export async function setFaqCategoryActive(pool, tenantId, categoryId, active) {
  const id = parseCategoryId(categoryId);
  if (!id) {
    throw validationError('id inválido');
  }

  const [rows] = await pool.query(
    `SELECT id, name
     FROM faq_categories
     WHERE id = ? AND tenant_id = ?
     LIMIT 1`,
    [id, tenantId]
  );

  if (!rows[0]) {
    throw validationError('Categoría no encontrada', 404);
  }

  if (rows[0].name === DEFAULT_FAQ_CATEGORY_NAME && active === false) {
    throw validationError('No se puede desactivar «Sin categoría»');
  }

  await pool.query(
    `UPDATE faq_categories
     SET active = ?, updated_at = NOW()
     WHERE id = ?`,
    [Boolean(active), id]
  );

  return { id, name: rows[0].name, active: Boolean(active) };
}

export async function deactivateFaqCategory(pool, tenantId, categoryId) {
  return setFaqCategoryActive(pool, tenantId, categoryId, false);
}
