import { Pool, QueryResult, QueryResultRow } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __db_pool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL || 'postgresql://bozkurt:maktabim123@localhost:5432/maktabim_db';
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

export const pool: Pool =
  global.__db_pool ||
  new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__db_pool = pool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 500) {
      console.warn(`[DB Slow Query] ${duration}ms: ${text.slice(0, 80)}...`);
    }
    return res;
  } catch (err: any) {
    console.error(`[DB Error]: ${err.message} in query: ${text.slice(0, 100)}`);
    throw err;
  }
}
