import { Hono } from 'hono';
import { query } from '../db.js';

export const masterRoutes = new Hono();

// 1. Cargo Types (Bulky, Curah Kering, Curah Cair, Packaged)
masterRoutes.get('/cargo-types', async (c) => {
  const result = await query(`SELECT * FROM master_cargo_types WHERE is_active = true ORDER BY name ASC`);
  return c.json({ success: true, data: result.rows });
});

masterRoutes.post('/cargo-types', async (c) => {
  const body = await c.req.json();
  const { code, name, category, handling_instructions, requires_weighbridge, requires_temperature_control } = body;
  const result = await query(
    `INSERT INTO master_cargo_types (code, name, category, handling_instructions, requires_weighbridge, requires_temperature_control)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [code, name, category || 'GENERAL', handling_instructions || null, requires_weighbridge || false, requires_temperature_control || false]
  );
  return c.json({ success: true, data: result.rows[0] }, 201);
});

// 2. Packaging Types (Jumbo Bag, Drum, Pallet, Sack, Silo, etc.)
masterRoutes.get('/packaging-types', async (c) => {
  const result = await query(`SELECT * FROM master_packaging_types WHERE is_active = true ORDER BY name ASC`);
  return c.json({ success: true, data: result.rows });
});

// 3. UOM & Conversions
masterRoutes.get('/uoms', async (c) => {
  const uomRes = await query(`SELECT * FROM master_uom WHERE is_active = true ORDER BY base_category, code`);
  const convRes = await query(`
    SELECT c.*, u1.code AS from_code, u2.code AS to_code
    FROM master_uom_conversions c
    JOIN master_uom u1 ON c.from_uom_id = u1.id
    JOIN master_uom u2 ON c.to_uom_id = u2.id
  `);
  return c.json({ success: true, data: { uoms: uomRes.rows, conversions: convRes.rows } });
});

// 4. Vehicle Types (CDE, CDD, Fuso, Wingbox, Dump Truck, Tanker, Trailer)
masterRoutes.get('/vehicle-types', async (c) => {
  const result = await query(`SELECT * FROM master_vehicle_types WHERE is_active = true ORDER BY max_payload_kg ASC`);
  return c.json({ success: true, data: result.rows });
});

// 5. Document Types (SJ Supplier, SJ Pengiriman, Master AWB, House AWB)
masterRoutes.get('/document-types', async (c) => {
  const result = await query(`SELECT * FROM master_document_types WHERE is_active = true ORDER BY category, name`);
  return c.json({ success: true, data: result.rows });
});
