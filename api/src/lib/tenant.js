import { readProductVersion } from './productVersion.js';

export const APP_VERSION = readProductVersion();
export const APP_PRODUCT_NAME = 'FAQ Inn';
export const DEFAULT_TENANT = 'FAQ-INN';
export const DEFAULT_TENANT_SLUG = 'faq-inn';
export const DEFAULT_DB_NAME = 'faq-inn';

export function deriveTenantSlug(tenant) {
  return (
    String(tenant || DEFAULT_TENANT)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || DEFAULT_TENANT_SLUG
  );
}

export function loadTenantConfig(env = process.env) {
  const tenant = env.TENANT || DEFAULT_TENANT;
  const tenantSlug = env.TENANT_SLUG || deriveTenantSlug(tenant);
  const tenantDisplayName = env.TENANT_DISPLAY_NAME || tenant;
  const appTitle = env.APP_TITLE || `${APP_PRODUCT_NAME} ${tenantDisplayName}`;
  const postgresDatabase =
    env.DB_NAME || env.PGDATABASE || DEFAULT_DB_NAME;

  return {
    tenant,
    tenantSlug,
    tenantDisplayName,
    appTitle,
    appProductName: APP_PRODUCT_NAME,
    // Versión desde archivo VERSION (raíz repo); commit-version.ps1 lo actualiza.
    appVersion: APP_VERSION,
    postgresDatabase,
  };
}
