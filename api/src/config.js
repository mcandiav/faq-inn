import { DEFAULT_DB_NAME, loadTenantConfig } from './lib/tenant.js';

function required(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

function buildDatabaseUrl(tenantConfig) {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host =
    process.env.DB_HOST || process.env.PGHOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT || process.env.PGPORT || 5432);
  const database =
    process.env.DB_NAME ||
    process.env.PGDATABASE ||
    tenantConfig.postgresDatabase;
  const user = process.env.DB_USER || process.env.PGUSER || 'postgres';
  const password =
    process.env.DB_PASSWORD || process.env.PGPASSWORD || '';

  if (process.env.APP_ENV === 'production') {
    required('DB_HOST', process.env.DB_HOST || process.env.PGHOST);
    required('DB_USER', user);
    required(
      'DB_PASSWORD',
      process.env.DB_PASSWORD || process.env.PGPASSWORD
    );
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

function loadDatabaseConfig(tenantConfig) {
  const host =
    process.env.DB_HOST || process.env.PGHOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT || process.env.PGPORT || 5432);
  const database =
    process.env.DB_NAME ||
    process.env.PGDATABASE ||
    tenantConfig.postgresDatabase;
  const user = process.env.DB_USER || process.env.PGUSER || 'postgres';
  const password =
    process.env.DB_PASSWORD || process.env.PGPASSWORD || '';

  return {
    dbHost: host,
    dbPort: port,
    dbName: database,
    dbUser: user,
    dbPassword: password,
  };
}

export function loadConfig() {
  const tenantConfig = loadTenantConfig();
  const qdrantUrl = normalizeBaseUrl(
    required('QDRANT_URL', process.env.QDRANT_URL)
  );

  const databaseUrl = buildDatabaseUrl(tenantConfig);

  const embeddingProvider = (
    process.env.EMBEDDING_PROVIDER || 'ollama'
  ).toLowerCase();

  const ollamaDefaults = {
    apiBase: 'http://127.0.0.1:11434',
    model: 'mxbai-embed-large:latest',
    dimension: 1024,
    collectionTemplate: 'kb_<tenant_slug>_mxbai_1024',
  };

  const nvidiaDefaults = {
    apiBase: 'https://integrate.api.nvidia.com/v1',
    model: 'baai/bge-m3',
    dimension: 1024,
    collectionTemplate: 'kb_<tenant_slug>_nvidia_1024',
  };

  const openaiDefaults = {
    model: 'text-embedding-3-small',
    dimension: 1536,
    collectionTemplate: 'kb_<tenant_slug>_openai_1536',
  };

  const providerDefaults = {
    ollama: ollamaDefaults,
    nvidia: nvidiaDefaults,
    openai: openaiDefaults,
  };
  const activeDefaults =
    providerDefaults[embeddingProvider] || ollamaDefaults;
  const databaseConfig = loadDatabaseConfig(tenantConfig);

  return {
    ...tenantConfig,
    appEnv: process.env.APP_ENV || 'development',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || '0.0.0.0',
    databaseUrl,
    ...databaseConfig,
    qdrantUrl,
    qdrantApiKey: process.env.QDRANT_API_KEY || '',
    embeddingProvider,
    qdrantCollectionTemplate:
      process.env.QDRANT_COLLECTION_TEMPLATE ||
      activeDefaults.collectionTemplate,
    ollamaApiBase: normalizeBaseUrl(
      process.env.OLLAMA_API_BASE || ollamaDefaults.apiBase
    ),
    ollamaEmbeddingModel:
      process.env.OLLAMA_EMBEDDING_MODEL || ollamaDefaults.model,
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiEmbeddingModel:
      process.env.OPENAI_EMBEDDING_MODEL || openaiDefaults.model,
    nvidiaApiKey: process.env.NVIDIA_API_KEY || '',
    nvidiaApiBase: normalizeBaseUrl(
      process.env.NVIDIA_API_BASE || nvidiaDefaults.apiBase
    ),
    nvidiaEmbeddingModel:
      process.env.NVIDIA_EMBEDDING_MODEL || nvidiaDefaults.model,
    nvidiaUseInputType: process.env.NVIDIA_USE_INPUT_TYPE === 'true',
    embeddingDimension: Number(
      process.env.EMBEDDING_DIMENSION || activeDefaults.dimension
    ),
    sessionSecret:
      process.env.SESSION_SECRET ||
      (process.env.APP_ENV === 'production'
        ? required('SESSION_SECRET', process.env.SESSION_SECRET)
        : 'faq-inn-dev-session-secret'),
    n8nAllowedToken: process.env.N8N_ALLOWED_TOKEN || '',
    postgresDatabase: tenantConfig.postgresDatabase || DEFAULT_DB_NAME,
    evolutionApiBaseUrl: normalizeBaseUrl(
      process.env.EVOLUTION_API_BASE_URL || ''
    ),
    evolutionApiPublicUrl: normalizeBaseUrl(
      process.env.EVOLUTION_API_PUBLIC_URL || ''
    ),
    evolutionApiKey: process.env.EVOLUTION_API_KEY || '',
    evolutionInstancePrefix: process.env.EVOLUTION_INSTANCE_PREFIX || 'faqinn_',
    evolutionQrPollIntervalSeconds: Number(
      process.env.EVOLUTION_QR_POLL_INTERVAL_SECONDS || 3
    ),
    evolutionQrTimeoutSeconds: Number(
      process.env.EVOLUTION_QR_TIMEOUT_SECONDS || 180
    ),
    evolutionConnectedState: (
      process.env.EVOLUTION_CONNECTED_STATE || 'open'
    ).toLowerCase(),
    // Webhook n8n/runtime (MESSAGES_UPSERT debe estar activo).
    evolutionWebhookUrl: normalizeBaseUrl(
      process.env.EVOLUTION_WEBHOOK_URL || ''
    ),
    // Minutos sin conexión exitosa antes de borrar instancia basura.
    evolutionStaleMinutes: Number(process.env.EVOLUTION_STALE_MINUTES || 10),
    // Cada cuántos minutos corre el limpiador.
    evolutionCleanupIntervalMinutes: Number(
      process.env.EVOLUTION_CLEANUP_INTERVAL_MINUTES || 5
    ),
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '',
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || '',
    turnstileEnabled: Boolean(
      process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY
    ),
  };
}
