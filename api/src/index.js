import 'dotenv/config';
import Fastify from 'fastify';
import { loadConfig } from './config.js';
import { healthRoutes } from './routes/health.js';
import { qdrantRoutes } from './routes/qdrant.js';

const config = loadConfig();

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

await healthRoutes(app, config);
await qdrantRoutes(app, config);

try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info(
    {
      appEnv: config.appEnv,
      appUrl: config.appUrl,
      qdrantUrl: config.qdrantUrl,
      databaseUrl: config.databaseUrl.replace(/:([^:@]+)@/, ':***@'),
    },
    'dfaq-api started'
  );
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
