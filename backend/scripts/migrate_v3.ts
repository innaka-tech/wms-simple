import { Pool } from 'pg';
import { initPgSchema } from '../src/pg-schema.js';

async function run() {
  const dbs = ['wms_simple_db', 'wms_simple_test_db'];
  for (const dbName of dbs) {
    console.log(`Running migration on ${dbName}...`);
    const pool = new Pool({
      host: '127.0.0.1',
      port: 5432,
      user: 'postgres',
      password: 'fadh',
      database: dbName
    });
    try {
      await initPgSchema(pool);
      console.log(`Successfully migrated ${dbName}`);
      const res = await pool.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('trips', 'trip_stops', 'quarantine_records', 'stock_opname_sessions', 'stock_opname_items') ORDER BY table_name`
      );
      console.log(`${dbName} tables found:`, res.rows.map(r => r.table_name));
    } catch (err: any) {
      console.error(`Error migrating ${dbName}:`, err.message);
    } finally {
      await pool.end();
    }
  }
}

run();
