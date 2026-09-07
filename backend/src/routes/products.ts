import { Hono } from 'hono';
import { query } from '../db.js';

export const productRoutes = new Hono();

// List all products / SKUs with total stock on hand across all warehouses
productRoutes.get('/', async (c) => {
  const result = await query(`
    SELECT p.*, 
           COALESCE(SUM(s.qty_on_hand), 0) AS total_on_hand,
           COALESCE(SUM(s.qty_in_transit), 0) AS total_in_transit
    FROM products p
    LEFT JOIN stock_levels s ON p.id = s.product_id
    GROUP BY p.id
    ORDER BY p.sku_code ASC
  `);
  return c.json({ success: true, data: result.rows });
});

// Create new product / SKU
productRoutes.post('/', async (c) => {
  const body = await c.req.json();
  // Kolom sesuai schema products: default_uom_id, weight_kg_per_unit, volume_m3_per_unit
  const { sku_code, name, description, default_uom_id, weight_kg_per_unit, volume_m3_per_unit, min_stock_qty } = body;
  const result = await query(
    `INSERT INTO products (id, sku_code, name, description, default_uom_id, weight_kg_per_unit, volume_m3_per_unit, min_stock_qty)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [sku_code, name, description, default_uom_id || '30000000-0000-0000-0000-000000000009', weight_kg_per_unit || 0, volume_m3_per_unit || 0, min_stock_qty || 10]
  );
  return c.json({ success: true, data: result.rows[0] }, 201);
});
