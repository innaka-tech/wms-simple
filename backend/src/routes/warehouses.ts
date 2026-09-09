import { Hono } from 'hono';
import { query } from '../db.js';

export const warehouseRoutes = new Hono();

// List all warehouses
warehouseRoutes.get('/', async (c) => {
  const result = await query(
    `SELECT w.*, wt.name AS type
     FROM warehouses w
     LEFT JOIN master_warehouse_types wt ON w.warehouse_type_id = wt.id
     ORDER BY wt.name ASC, w.name ASC`
  );
  return c.json({ success: true, data: result.rows });
});

// Get warehouse by ID + locations
warehouseRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const whRes = await query(`SELECT * FROM warehouses WHERE id = $1`, [id]);
  if (whRes.rows.length === 0) {
    return c.json({ success: false, message: 'Warehouse not found' }, 404);
  }
  const locRes = await query(`SELECT * FROM warehouse_locations WHERE warehouse_id = $1 ORDER BY zone, aisle, rack, bin`, [id]);
  return c.json({ success: true, data: { ...whRes.rows[0], locations: locRes.rows } });
});

// Create warehouse
warehouseRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const { code, name, type, address, city, contact_name, contact_phone } = body;
  const result = await query(
    `INSERT INTO warehouses (id, code, name, type, address, city, contact_name, contact_phone)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [code, name, type || 'TRANSIT', address, city, contact_name, contact_phone]
  );
  return c.json({ success: true, data: result.rows[0] }, 201);
});
