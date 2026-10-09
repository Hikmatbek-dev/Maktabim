import { Pool, QueryResult, QueryResultRow } from 'pg';
import dns from 'dns';

// AWS / Neon DNS ba'zan tashqi tarmoqqa yopiq bo'lgan 100.64.0.0/10 (CGNAT) ichki IP va
// marshrutlanmagan IPv6 manzillarni qaytarishi sababli ETIMEDOUT yuzaga keladi.
// Ushbu filtr faqat haqiqiy ochiq IPv4 manzillar orqali ulanishni ta'minlaydi (1 soniyadan kam vaqtda ulanadi).
const origLookup = dns.lookup;
dns.lookup = function (hostname: any, options: any, callback: any) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  return origLookup(hostname, { ...options, all: true }, (err: any, addresses: any) => {
    if (err) return callback(err);
    if (Array.isArray(addresses)) {
      const publicIpv4 = addresses.filter((a: any) => {
        if (a.family !== 4) return false;
        if (a.address.startsWith('100.')) {
          const second = parseInt(a.address.split('.')[1] || '0', 10);
          if (second >= 64 && second <= 127) return false;
        }
        return true;
      });
      const chosen = publicIpv4.length > 0 ? publicIpv4 : addresses;
      if (options && options.all) {
        return callback(null, chosen);
      } else {
        return callback(null, chosen[0].address, chosen[0].family);
      }
    }
    return callback(null, addresses);
  });
};

declare global {
  // eslint-disable-next-line no-var
  var __db_pool: Pool | undefined;
}

const connectionString =
  process.env.DATABASE_URL || 'postgresql://bozkurt:maktabim123@localhost:5432/maktabim_db';
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

export const pool: Pool =
  global.__db_pool ||
  new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
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
    console.error(`[DB Error]: ${err.message || err} in query: ${text.slice(0, 100)}`);
    throw err;
  }
}
