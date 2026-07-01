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

  return {
    appEnv: process.env.APP_ENV || 'development',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || '0.0.0.0',
    databaseUrl,
    qdrantUrl,
    qdrantApiKey: process.env.QDRANT_API_KEY || '',
    qdrantCollectionTemplate:
      process.env.QDRANT_COLLECTION_TEMPLATE || 'kb_<tenant_slug>_openai_1536',
  };
}
