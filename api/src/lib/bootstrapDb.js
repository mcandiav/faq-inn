import mysql from 'mysql2/promise';

function quoteIdent(name) {
  return `\`${String(name).replace(/`/g, '``')}\``;
}

async function canConnectAsApp(config) {
  try {
    const connection = await mysql.createConnection({
      host: config.dbHost,
      port: config.dbPort,
      user: config.dbUser,
      password: config.dbPassword,
      database: config.dbName,
    });
    await connection.query('SELECT 1');
    await connection.end();
    return true;
  } catch (error) {
    if (
      error.code === 'ER_BAD_DB_ERROR' ||
      error.code === 'ER_ACCESS_DENIED_ERROR' ||
      error.code === 'ER_DBACCESS_DENIED_ERROR'
    ) {
      return false;
    }
    throw error;
  }
}

export async function ensureDatabase(config) {
  if (await canConnectAsApp(config)) {
    console.log(
      `[dfaq-api] MariaDB listo: ${config.dbName} en ${config.dbHost}:${config.dbPort}`
    );
    return;
  }

  const adminPassword =
    config.dbAdminPassword || process.env.MYSQL_ROOT_PASSWORD || '';

  if (!adminPassword) {
    throw new Error(
      'No se pudo conectar a MariaDB con el usuario de la app. ' +
        'Configure DB_ADMIN_PASSWORD (password root de bignotti_mariadb) ' +
        'para que el primer deploy cree la base y el usuario automaticamente.'
    );
  }

  const adminUser = config.dbAdminUser || 'root';
  console.log(
    `[dfaq-api] Bootstrap MariaDB: creando ${config.dbName} y usuario ${config.dbUser}...`
  );

  const admin = await mysql.createConnection({
    host: config.dbHost,
    port: config.dbPort,
    user: adminUser,
    password: adminPassword,
  });

  try {
    await admin.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdent(config.dbName)} ` +
        'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
    await admin.query(`CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ?`, [
      config.dbUser,
      config.dbPassword,
    ]);
    await admin.query(
      `GRANT ALL PRIVILEGES ON ${quoteIdent(config.dbName)}.* TO ?@'%'`,
      [config.dbUser]
    );
    await admin.query('FLUSH PRIVILEGES');
  } finally {
    await admin.end();
  }

  if (!(await canConnectAsApp(config))) {
    throw new Error(
      `Bootstrap MariaDB terminó pero ${config.dbUser} no puede acceder a ${config.dbName}`
    );
  }

  console.log(
    `[dfaq-api] Bootstrap MariaDB OK: ${config.dbName} + ${config.dbUser}`
  );
}
