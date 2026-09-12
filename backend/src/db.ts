import { Pool, PoolClient } from 'pg';
import { initPgSchema } from './pg-schema.js';

// Type definitions matching pg.QueryResult
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DatabaseClient {
  query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  release(): void;
}

/**
 * Koneksi PostgreSQL resmi (global DB stack — postgres:16-alpine di 127.0.0.1:5432).
 * Konfigurasi via environment: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.
 * Schema + seed diinisialisasi otomatis (idempotent) sebelum query pertama.
 */
const pgPool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'wms_simple_db',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

/**
 * Normalisasi kecil SQL: fungsi/dialek yang tidak tersedia di PostgreSQL
 * dipetakan ke padanan resminya. Placeholder $n dipertahankan native.
 */
function normalizeSql(sql: string): string {
  return sql
    .replace(/uuid_generate_v4\(\)/gi, 'gen_random_uuid()') // core PG13+, tanpa extension
    .replace(/datetime\('now'\)/gi, 'now()')
    .replace(/\browid\b/gi, 'ctid'); // padanan fisik insert-order di PostgreSQL
}

/**
 * Normalisasi parameter: boolean → 1/0 (kolom INTEGER), object → JSON string.
 */
function normalizeParams(params?: any[]): any[] | undefined {
  return params
    ? params.map((p) => {
        if (typeof p === 'boolean') return p ? 1 : 0;
        if (typeof p === 'object' && p !== null && !(p instanceof Date)) return JSON.stringify(p);
        return p;
      })
    : undefined;
}

// Inisialisasi schema + seed sekali, memakai raw pool (tanpa wrapper) agar bebas deadlock
const schemaReady: Promise<void> = initPgSchema(pgPool).catch((err) => {
  console.error('[PostgreSQL] Gagal inisialisasi schema:', err.message);
  throw err;
});

/**
 * Executes a parameterized SQL query on PostgreSQL (OWASP A03: selalu parameterized).
 */
export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  await schemaReady;
  const start = Date.now();
  try {
    const result: any = await pgPool.query(normalizeSql(text.trim()), normalizeParams(params));
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production' && duration > 200) {
      console.log('[PostgreSQL Query]', { text: text.substring(0, 80), duration, rows: result.rows.length });
    }
    return { rows: result.rows as T[], rowCount: result.rowCount ?? result.rows.length };
  } catch (err: any) {
    console.error('[PostgreSQL Query Error]', { sql: text.substring(0, 120), params, error: err.message });
    throw err;
  }
}

/**
 * Client transaksi asli PostgreSQL (BEGIN/COMMIT/ROLLBACK + FOR UPDATE berfungsi penuh).
 */
export async function connect(): Promise<DatabaseClient> {
  await schemaReady;
  const client: PoolClient = await pgPool.connect();
  return {
    async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
      const result: any = await client.query(normalizeSql(text.trim()), normalizeParams(params));
      return { rows: result.rows as T[], rowCount: result.rowCount ?? result.rows.length };
    },
    release() {
      client.release();
    }
  };
}

/**
 * Pool object kompatibel dengan pemakaian route lama: pool.query(...) & pool.connect(...).
 */
export const pool = {
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    return query<T>(text, params);
  },
  connect
};

/** Tutup semua koneksi pool (dipakai graceful shutdown & test teardown). */
export async function closePool(): Promise<void> {
  await pgPool.end();
}

// Graceful shutdown
process.on('SIGINT', () => {
  pgPool.end().finally(() => process.exit(0));
});
process.on('SIGTERM', () => {
  pgPool.end().finally(() => process.exit(0));
});
