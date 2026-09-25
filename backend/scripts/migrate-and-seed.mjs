import pg from 'pg';
import { initPgSchema } from '../dist/pg-schema.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const { Pool } = pg;

async function migrateDb(dbName) {
  console.log(`\n=== Migrating and Seeding: ${dbName} ===`);
  const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'fadh',
    database: dbName
  });

  try {
    await initPgSchema(pool);
    console.log(`✓ Schema & Seeder successfully initialized on ${dbName}!`);

    // Update existing products to non-hyphen standard
    await pool.query(`
      UPDATE products SET sku_code = 'BULKSUGAR1T' WHERE sku_code = 'BULK-SUGAR-1T' OR id = 'e0000000-0000-0000-0000-000000000001';
      UPDATE products SET sku_code = 'SUGARSACK25KG' WHERE sku_code = 'SUGAR-SACK-25KG' OR id = 'e0000000-0000-0000-0000-000000000002';
      UPDATE products SET sku_code = 'KDMPCHILLER300L' WHERE sku_code = 'KDMP-CHILLER-300L' OR id = 'e0000000-0000-0000-0000-000000000003';
      UPDATE products SET sku_code = 'ELECTV43' WHERE sku_code = 'ELEC-TV-43' OR id = 'e0000000-0000-0000-0000-000000000004';
    `);

    // Seed default warehouse locations for Main Hub Jakarta
    await pool.query(`
      INSERT INTO warehouse_locations (id, warehouse_id, zone, aisle, rack, bin, location_type, max_weight_capacity_kg, max_volume_capacity_cbm) VALUES
      ('l0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'A', '01', '01', 'A', 'STANDARD_RACK', 2000.0, 5.0),
      ('l0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'A', '01', '01', 'B', 'STANDARD_RACK', 2000.0, 5.0),
      ('l0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'B', '02', '01', 'A', 'HEAVY_DUTY_BULK', 5000.0, 15.0),
      ('l0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'C', '01', '01', 'A', 'COLD_STORAGE', 3000.0, 8.0)
      ON CONFLICT DO NOTHING;
    `);
    console.log(`✓ Product SKUs normalized to non-hyphen & warehouse locations verified on ${dbName}!`);

    // Verify tables
    const res = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log(`Total public tables in ${dbName}: ${res.rows.length}`);

    // Print all created tables
    console.log('Tables:', res.rows.map(r => r.table_name).join(', '));

    // Sample counts on standard tables
    const counts = {};
    for (const tbl of ['warehouses', 'products', 'customers', 'users', 'master_uom', 'master_cargo_types']) {
      if (res.rows.some(r => r.table_name === tbl)) {
        const c = await pool.query(`SELECT count(*) as cnt FROM ${tbl}`);
        counts[tbl] = c.rows[0].cnt;
      }
    }
    console.log('Sample table counts:', counts);
  } catch (err) {
    console.error(`✗ Error on ${dbName}:`, err);
    throw err;
  } finally {
    await pool.end();
  }
}

async function main() {
  await migrateDb('wms_simple_db');
  await migrateDb('wms_simple_test_db');
  console.log('\n🎉 ALL DATABASES MIGRATED AND SEEDED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
