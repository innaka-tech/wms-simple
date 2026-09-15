import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

async function migrate(dbName) {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'fadh',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 5432,
    database: dbName
  });
  console.log(`Connecting to ${dbName}...`);
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_print_templates (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'WAYBILL',
        paper_size TEXT NOT NULL,
        printer_type TEXT NOT NULL,
        description TEXT,
        is_default BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TEXT DEFAULT now(),
        updated_at TEXT DEFAULT now()
      );

      INSERT INTO master_print_templates (id, code, name, category, paper_size, printer_type, description, is_default) VALUES
      ('70000000-0000-0000-0000-000000000001', 'A4_PORTRAIT', 'A4 Portrait Standar (Laser / Inkjet)', 'WAYBILL', '210 x 297 mm (A4)', 'LASER_INKJET', 'Lembar Manifest Logistik Resmi Standar A4 4-Ply dengan Barcode, Rincian Muatan & 4 Tanda Tangan', TRUE),
      ('70000000-0000-0000-0000-000000000002', 'CONTINUOUS_3PLY', 'Continuous Form 3-Ply Matrix (9.5 x 11 in)', 'WAYBILL', '9.5 x 11 in (241 x 279 mm)', 'DOT_MATRIX', 'Continuous Form Kertas Karbon NCR 3-Ply Pin-Feed Epson LX/LQ 80 Kolom dengan Lubang Pin Tractor Feed', FALSE),
      ('70000000-0000-0000-0000-000000000003', 'CONTINUOUS_WARTEL', 'Continuous Form Wartel 9.5 x 5.5 in (Bagi 2)', 'WAYBILL', '9.5 x 5.5 in (241 x 140 mm)', 'DOT_MATRIX', 'Continuous Form Wartel Bagi 2 Kertas Kompak Half-Letter Epson 80 Kolom untuk Ritase Cepat', FALSE),
      ('70000000-0000-0000-0000-000000000004', 'THERMAL_BLUETOOTH', 'Thermal Bluetooth (58mm / 80mm)', 'WAYBILL', '58mm / 80mm Roll', 'THERMAL', 'Struk Kertas Roll Thermal Portable Bluetooth Mobile Driver Fleet & Gate Out Pos Satpam', FALSE)
      ON CONFLICT (code) DO UPDATE SET 
        name = EXCLUDED.name, 
        paper_size = EXCLUDED.paper_size, 
        printer_type = EXCLUDED.printer_type, 
        description = EXCLUDED.description;
    `);
    console.log(`✓ master_print_templates migrated on ${dbName}`);
  } finally {
    await pool.end();
  }
}

async function run() {
  await migrate('wms_simple_db');
  await migrate('wms_simple_test_db');
  console.log('All migrations completed successfully!');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
