import { checkDatabase } from '../db.js';

export async function ensureDatabase(config) {
  try {
    await checkDatabase(config.databaseUrl);
    console.log(
      `[faq-inn-api] PostgreSQL listo: ${config.dbName} en ${config.dbHost}:${config.dbPort}`
    );
  } catch (error) {
    throw new Error(
      `No se pudo conectar a PostgreSQL (${config.dbHost}:${config.dbPort}/${config.dbName}). ` +
        'Verifique DB_HOST, credenciales y que el servicio faq-inn_postgres esté activo en la red interna. ' +
        `Detalle: ${error.message}`
    );
  }
}
