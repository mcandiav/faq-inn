export async function healthRoutes(app, config) {
  app.get('/health', async () => ({
    status: 'ok',
    service: 'faq-api',
    env: config.appEnv,
    timestamp: new Date().toISOString(),
  }));
}
