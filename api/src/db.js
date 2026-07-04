import pg from 'pg';

let pool = null;

function toPgParams(sql, params = []) {
  let index = 0;
  const text = sql.replace(/\?/g, () => `$${++index}`);
  return { text, values: params };
}

function withReturningId(sql) {
  const trimmed = sql.trim().replace(/;+\s*$/, '');
  // Solo tablas con columna id; evita fallar en INSERT ... ON CONFLICT
  // sobre tablas con PK distinta (ej. tenant_provisioning.tenant_id).
  if (
    /^\s*INSERT\s/i.test(trimmed) &&
    !/\bRETURNING\b/i.test(trimmed) &&
    !/\bON\s+CONFLICT\b/i.test(trimmed)
  ) {
    return `${trimmed} RETURNING id`;
  }
  return trimmed;
}

async function runQuery(client, sql, params = []) {
  const { text, values } = toPgParams(withReturningId(sql), params);
  const result = await client.query(text, values);
  const meta = {
    insertId: result.rows[0]?.id ?? null,
    affectedRows: result.rowCount,
  };
  return [result.rows, meta];
}

export function getPool(databaseUrl) {
  if (!pool) {
    const pgPool = new pg.Pool({
      connectionString: databaseUrl,
      max: 5,
    });

    pool = {
      query: (sql, params) => runQuery(pgPool, sql, params),
      getConnection: async () => {
        const client = await pgPool.connect();
        return {
          query: (sql, params) => runQuery(client, sql, params),
          beginTransaction: () => client.query('BEGIN'),
          commit: () => client.query('COMMIT'),
          rollback: () => client.query('ROLLBACK'),
          release: () => client.release(),
        };
      },
    };
  }

  return pool;
}

export async function checkDatabase(databaseUrl) {
  const client = new pg.Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    const result = await client.query('SELECT 1 AS ok');
    return { healthy: true, result: result.rows[0] };
  } finally {
    await client.end();
  }
}
