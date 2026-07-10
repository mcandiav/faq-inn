import 'dotenv/config';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { loadConfig } from './config.js';
import { getPool } from './db.js';
import { ensureDatabase } from './lib/bootstrapDb.js';
import { runMigrations } from './lib/migrate.js';
import { registerAuth } from './plugins/auth.js';
import { healthRoutes } from './routes/health.js';
import { qdrantRoutes } from './routes/qdrant.js';
import { searchRoutes } from './routes/search.js';
import { authRoutes } from './routes/auth.js';
import { adminRoutes } from './routes/admin.js';
import { faqRoutes } from './routes/faqs.js';
import { categoryRoutes } from './routes/categories.js';
import { unansweredRoutes } from './routes/unanswered.js';
import { onboardingRoutes } from './routes/onboarding.js';
import { provisionRoutes } from './routes/provision.js';
import { accountRoutes } from './routes/account.js';
import { whatsappRoutes } from './routes/whatsapp.js';
import { runtimeRoutes } from './routes/runtime.js';
import { bookingEngineRoutes } from './routes/bookingEngine.js';
import { agendaEngineRoutes } from './routes/agendaEngine.js';
import { startEvolutionCleanupScheduler } from './lib/evolutionCleanup.js';

const config = loadConfig();

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

await ensureDatabase(config);

const pool = getPool(config.databaseUrl);
app.decorate('db', { pool });

await runMigrations(pool, config);

await app.register(cookie);
await app.register(jwt, { secret: config.sessionSecret });
await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});
await registerAuth(app, config);

await healthRoutes(app, config);
await qdrantRoutes(app, config);
await searchRoutes(app, config);
await authRoutes(app, config);
await adminRoutes(app, config);
await faqRoutes(app, config);
await categoryRoutes(app);
await unansweredRoutes(app, config);
await onboardingRoutes(app, config);
await provisionRoutes(app, config);
await accountRoutes(app, config);
await whatsappRoutes(app, config);
await runtimeRoutes(app, config);
await bookingEngineRoutes(app);
await agendaEngineRoutes(app);

const stopEvolutionCleanup = startEvolutionCleanupScheduler(
  pool,
  config,
  app.log
);

try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info(
    {
      appEnv: config.appEnv,
      appUrl: config.appUrl,
      qdrantUrl: config.qdrantUrl,
      embeddingProvider: config.embeddingProvider,
      embeddingModel:
        config.embeddingProvider === 'ollama'
          ? config.ollamaEmbeddingModel
          : config.embeddingProvider === 'nvidia'
            ? config.nvidiaEmbeddingModel
            : config.openaiEmbeddingModel,
      ollamaApiBase:
        config.embeddingProvider === 'ollama' ? config.ollamaApiBase : undefined,
      evolutionApiBaseUrl: config.evolutionApiBaseUrl || undefined,
      evolutionConfigured: Boolean(
        config.evolutionApiBaseUrl && config.evolutionApiKey
      ),
      evolutionStaleMinutes: config.evolutionStaleMinutes,
      evolutionCleanupIntervalMinutes: config.evolutionCleanupIntervalMinutes,
      databaseUrl: config.databaseUrl.replace(/:([^:@]+)@/, ':***@'),
    },
    'faq-inn-api started'
  );
} catch (error) {
  stopEvolutionCleanup();
  app.log.error(error);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopEvolutionCleanup();
    app.close().finally(() => process.exit(0));
  });
}
