import 'dotenv/config';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { loadConfig } from './config.js';
import { getPool } from './db.js';
import { runMigrations } from './lib/migrate.js';
import { registerAuth } from './plugins/auth.js';
import { healthRoutes } from './routes/health.js';
import { qdrantRoutes } from './routes/qdrant.js';
import { searchRoutes } from './routes/search.js';
import { authRoutes } from './routes/auth.js';
import { adminRoutes } from './routes/admin.js';
import { faqRoutes } from './routes/faqs.js';

const config = loadConfig();

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

const pool = getPool(config.databaseUrl);
app.decorate('db', { pool });

await runMigrations(pool, config);

await app.register(cookie);
await app.register(jwt, { secret: config.sessionSecret });
await registerAuth(app, config);

await healthRoutes(app, config);
await qdrantRoutes(app, config);
await searchRoutes(app, config);
await authRoutes(app, config);
await adminRoutes(app, config);
await faqRoutes(app, config);

try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info(
    {
      appEnv: config.appEnv,
      appUrl: config.appUrl,
      qdrantUrl: config.qdrantUrl,
      embeddingProvider: config.embeddingProvider,
      embeddingModel:
        config.embeddingProvider === 'nvidia'
          ? config.nvidiaEmbeddingModel
          : config.openaiEmbeddingModel,
      databaseUrl: config.databaseUrl.replace(/:([^:@]+)@/, ':***@'),
    },
    'dfaq-api started'
  );
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
