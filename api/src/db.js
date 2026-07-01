import mysql from 'mysql2/promise';

let pool = null;

export function getPool(databaseUrl) {
  if (!pool) {
    pool = mysql.createPool({
      uri: databaseUrl,
      waitForConnections: true,
      connectionLimit: 5,
    });
  }
  return pool;
}

export async function checkDatabase(databaseUrl) {
  const connection = await mysql.createConnection(databaseUrl);
  try {
    const [rows] = await connection.query('SELECT 1 AS ok');
    return { healthy: true, result: rows[0] };
  } finally {
    await connection.end();
  }
}
