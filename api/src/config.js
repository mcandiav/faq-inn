function required(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT || 3306);
  const database =
    process.env.DB_NAME || process.env.MYSQL_DATABASE || 'dfaq';
  const user = process.env.DB_USER || process.env.MYSQL_USER || 'dfaq';
  const password =
    process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || 'dfaq';

  if (process.env.APP_ENV === 'production') {
    required('DB_HOST', host);
    required('DB_USER', user);
    required(
      'DB_PASSWORD',
      process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD
    );
  }

  const dbHost = host || '127.0.0.1';

  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${dbHost}:${port}/${database}`;
}

function loadDatabaseConfig() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT || 3306);
  const database =
    process.env.DB_NAME || process.env.MYSQL_DATABASE || 'dfaq';
  const user = process.env.DB_USER || process.env.MYSQL_USER || 'dfaq';
  const password =
    process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || 'dfaq';

  return {
    dbHost: host,
    dbPort: port,
    dbName: database,
    dbUser: user,
    dbPassword: password,
    dbAdminUser: process.env.DB_ADMIN_USER || 'root',
    dbAdminPassword:
      process.env.DB_ADMIN_PASSWORD || process.env.MYSQL_ROOT_PASSWORD || '',
  };
}

export function loadConfig() {
  const qdrantUrl = normalizeBaseUrl(
    required('QDRANT_URL', process.env.QDRANT_URL)
  );

  const databaseUrl = buildDatabaseUrl();

  const embeddingProvider = (
    process.env.EMBEDDING_PROVIDER || 'nvidia'
  ).toLowerCase();

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

  const isNvidia = embeddingProvider === 'nvidia';

  const databaseConfig = loadDatabaseConfig();

  return {
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
      (isNvidia
        ? nvidiaDefaults.collectionTemplate
        : openaiDefaults.collectionTemplate),
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
      process.env.EMBEDDING_DIMENSION ||
        (isNvidia ? nvidiaDefaults.dimension : openaiDefaults.dimension)
    ),
    sessionSecret:
      process.env.SESSION_SECRET ||
      (process.env.APP_ENV === 'production'
        ? required('SESSION_SECRET', process.env.SESSION_SECRET)
        : 'dfaq-dev-session-secret'),
    n8nAllowedToken: process.env.N8N_ALLOWED_TOKEN || '',
  };
}
