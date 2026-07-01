function required(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

export function loadConfig() {
  const qdrantUrl = normalizeBaseUrl(
    required('QDRANT_URL', process.env.QDRANT_URL)
  );

  const databaseUrl =
    process.env.DATABASE_URL ||
    'mysql://dfaq:dfaq@127.0.0.1:3306/dfaq';

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

  return {
    appEnv: process.env.APP_ENV || 'development',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || '0.0.0.0',
    databaseUrl,
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
  };
}
