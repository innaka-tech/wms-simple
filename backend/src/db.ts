import { sqliteDb } from './sqlite-db.js';
import crypto from 'node:crypto';

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
 * Normalizes SQL queries from PostgreSQL syntax to SQLite syntax
 */
function normalizeSql(sql: string): string {
  return sql
    .replace(/\$([0-9]+)/g, '?') // replace $1, $2 with ?
    .replace(/uuid_generate_v4\(\)/gi, `'${crypto.randomUUID()}'`)
    .replace(/FOR\s+UPDATE/gi, '') // SQLite transactions are serialized
    .replace(/::jsonb/gi, '')
    .replace(/::text/gi, '')
    .replace(/::int/gi, '')
    .replace(/NOW\(\)/gi, "datetime('now')")
    .replace(/CURRENT_TIMESTAMP/gi, "datetime('now')");
}

/**
 * Executes a parameterized SQL query on SQLite
 */
export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  const normalizedSql = normalizeSql(text.trim());
  const normalizedParams = params ? params.map(p => {
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (typeof p === 'object' && p !== null) return JSON.stringify(p);
    return p;
  }) : [];

  try {
    const isSelect = /^\s*(SELECT|WITH|PRAGMA)/i.test(normalizedSql);
    const hasReturning = /RETURNING/i.test(normalizedSql);

    if (isSelect || hasReturning) {
      const stmt = sqliteDb.prepare(normalizedSql);
      const rows = stmt.all(...normalizedParams) as T[];
      const duration = Date.now() - start;
      if (process.env.NODE_ENV !== 'production' && duration > 200) {
        console.log('[SQLite Query]', { text: text.substring(0, 80), duration, rows: rows.length });
      }
      return { rows, rowCount: rows.length };
    } else {
      const stmt = sqliteDb.prepare(normalizedSql);
      const info = stmt.run(...normalizedParams);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV !== 'production' && duration > 200) {
        console.log('[SQLite Exec]', { text: text.substring(0, 80), duration, changes: info.changes });
      }
      return { rows: [] as T[], rowCount: Number(info.changes) };
    }
  } catch (err: any) {
    console.error('[SQLite Query Error]', { sql: normalizedSql, params: normalizedParams, error: err.message });
    throw err;
  }
}

/**
 * Mock/Compatible Pool object to support client.query(...) and transactions
 */
export const pool = {
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    return query<T>(text, params);
  },
  async connect(): Promise<DatabaseClient> {
    return {
      async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
        const trimmed = text.trim();
        if (trimmed === 'BEGIN' || trimmed === 'BEGIN TRANSACTION') {
          sqliteDb.exec('BEGIN TRANSACTION;');
          return { rows: [] as T[], rowCount: 0 };
        }
        if (trimmed === 'COMMIT') {
          try {
            sqliteDb.exec('COMMIT;');
          } catch {
            // ignore if no transaction active
          }
          return { rows: [] as T[], rowCount: 0 };
        }
        if (trimmed === 'ROLLBACK') {
          try {
            sqliteDb.exec('ROLLBACK;');
          } catch {
            // ignore if no transaction active
          }
          return { rows: [] as T[], rowCount: 0 };
        }
        return query<T>(text, params);
      },
      release() {
        // No-op for SQLite synchronous connection
      }
    };
  }
};
