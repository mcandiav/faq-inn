export function normalizeTenantSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function isValidTenantSlug(slug) {
  return /^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(slug) && slug.length >= 2;
}
