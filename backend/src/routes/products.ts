import { Hono } from 'hono';
import { z } from 'zod';
import { query } from '../db.js';
import { authenticate, requireRole, UserTokenPayload } from '../middlewares/auth.js';
import { recordCheckpoint } from '../services/checkpoint.js';

export const productRoutes = new Hono();

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN_ADM'];

const productSchema = z.object({
  sku_code: z.string().min(2).max(64),
  name: z.string().min(3).max(200),
  description: z.string().max(500).nullish(),
  cargo_type_id: z.string().uuid(),
  default_packaging_type_id: z.string().uuid().nullish(),
  default_uom_id: z.string().uuid(),
  weight_kg_per_unit: z.number().positive().max(100000).default(1),
  volume_m3_per_unit: z.number().nonnegative().max(1000).default(0.001),
  is_debulking_target: z.boolean().default(false),
  parent_bulky_product_id: z.string().uuid().nullish(),
  min_stock_qty: z.number().nonnegative().default(10)
});

// List all products / SKUs with total stock on hand across all warehouses
productRoutes.get('/', async (c) => {
  const result = await query(`
    SELECT p.*,
           ct.name AS cargo_type_name,
           u.code AS uom_code,
           COALESCE(SUM(s.qty_on_hand), 0) AS total_on_hand,
           COALESCE(SUM(s.qty_in_transit), 0) AS total_in_transit
    FROM products p
    LEFT JOIN master_cargo_types ct ON p.cargo_type_id = ct.id
    LEFT JOIN master_uom u ON p.default_uom_id = u.id
    LEFT JOIN stock_levels s ON p.id = s.product_id
    GROUP BY p.id, ct.name, u.code
    ORDER BY p.sku_code ASC
  `);
  return c.json({ success: true, data: result.rows });
});

// Create new product / SKU (admin only)
productRoutes.post('/', authenticate, requireRole(ADMIN_ROLES), async (c) => {
  const user = c.get('user' as any) as UserTokenPayload;
  const parsed = productSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ success: false, message: 'Data tidak valid', details: parsed.error.flatten().fieldErrors }, 400);
  }
  const d = parsed.data;

  const dupRes = await query(`SELECT id FROM products WHERE sku_code = $1 LIMIT 1`, [d.sku_code]);
  if (dupRes.rows.length > 0) {
    return c.json({ success: false, message: `SKU '${d.sku_code}' sudah terdaftar` }, 409);
  }

  const result = await query(
    `INSERT INTO products (id, sku_code, name, description, cargo_type_id, default_packaging_type_id, default_uom_id,
                           weight_kg_per_unit, volume_m3_per_unit, is_debulking_target, parent_bulky_product_id, min_stock_qty)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [d.sku_code, d.name, d.description || null, d.cargo_type_id, d.default_packaging_type_id || null, d.default_uom_id,
     d.weight_kg_per_unit, d.volume_m3_per_unit, d.is_debulking_target, d.parent_bulky_product_id || null, d.min_stock_qty]
  );
  const created = result.rows[0];

  await recordCheckpoint({
    entity_type: 'PRODUCT',
    entity_id: created.id,
    entity_number: created.sku_code,
    step_code: 'PRODUCT_CREATED',
    step_label: 'Master barang dibuat',
    actor_id: user.id,
    actor_name: user.full_name,
    actor_role: user.role,
    notes: `SKU ${created.sku_code} — ${created.name}`
  });

  return c.json({ success: true, data: created }, 201);
});

// Update product (admin only)
productRoutes.put('/:id', authenticate, requireRole(ADMIN_ROLES), async (c) => {
  const user = c.get('user' as any) as UserTokenPayload;
  const id = c.req.param('id');
  const parsed = productSchema.partial().safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ success: false, message: 'Data tidak valid', details: parsed.error.flatten().fieldErrors }, 400);
  }
  const d = parsed.data;

  const exists = await query(`SELECT id, sku_code FROM products WHERE id = $1`, [id]);
  if (exists.rows.length === 0) {
    return c.json({ success: false, message: 'Barang tidak ditemukan' }, 404);
  }

  const sets: string[] = [];
  const params: any[] = [];
  const push = (col: string, val: any) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  if (d.sku_code !== undefined) push('sku_code', d.sku_code);
  if (d.name !== undefined) push('name', d.name);
  if (d.description !== undefined) push('description', d.description || null);
  if (d.cargo_type_id !== undefined) push('cargo_type_id', d.cargo_type_id);
  if (d.default_packaging_type_id !== undefined) push('default_packaging_type_id', d.default_packaging_type_id || null);
  if (d.default_uom_id !== undefined) push('default_uom_id', d.default_uom_id);
  if (d.weight_kg_per_unit !== undefined) push('weight_kg_per_unit', d.weight_kg_per_unit);
  if (d.volume_m3_per_unit !== undefined) push('volume_m3_per_unit', d.volume_m3_per_unit);
  if (d.is_debulking_target !== undefined) push('is_debulking_target', d.is_debulking_target);
  if (d.parent_bulky_product_id !== undefined) push('parent_bulky_product_id', d.parent_bulky_product_id || null);
  if (d.min_stock_qty !== undefined) push('min_stock_qty', d.min_stock_qty);
  if (sets.length === 0) {
    return c.json({ success: false, message: 'Tidak ada perubahan yang dikirim' }, 400);
  }
  params.push(id);
  sets.push(`updated_at = CURRENT_TIMESTAMP`);

  const result = await query(
    `UPDATE products SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );

  await recordCheckpoint({
    entity_type: 'PRODUCT',
    entity_id: id!,
    entity_number: exists.rows[0]!.sku_code,
    step_code: 'PRODUCT_UPDATED',
    step_label: 'Master barang diperbarui',
    actor_id: user.id,
    actor_name: user.full_name,
    actor_role: user.role,
    notes: `Perubahan: ${Object.keys(d).join(', ')}`
  });

  return c.json({ success: true, data: result.rows[0] });
});
