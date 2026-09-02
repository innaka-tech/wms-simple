import { Hono } from 'hono';
import { query } from '../db.js';
import { adjustStock } from '../services/stock.js';
import { recordCheckpoint } from '../services/checkpoint.js';
import { optionalAuth, UserTokenPayload } from '../middlewares/auth.js';

export const stockRoutes = new Hono();

// 1. Get Stock Levels Snapshot
stockRoutes.get('/levels', async (c) => {
  const warehouse_id = c.req.query('warehouse_id');
  const product_id = c.req.query('product_id');

  let sql = `
    SELECT sl.*, 
           w.name AS warehouse_name, w.type AS warehouse_type,
           p.sku_code, p.name AS product_name, p.unit, p.min_stock_qty,
           CASE WHEN sl.qty_on_hand <= p.min_stock_qty THEN true ELSE false END AS is_low_stock
    FROM stock_levels sl
    JOIN warehouses w ON sl.warehouse_id = w.id
    JOIN products p ON sl.product_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (warehouse_id) {
    params.push(warehouse_id);
    sql += ` AND sl.warehouse_id = $${params.length}`;
  }
  if (product_id) {
    params.push(product_id);
    sql += ` AND sl.product_id = $${params.length}`;
  }
  sql += ` ORDER BY w.name ASC, p.sku_code ASC`;

  const result = await query(sql, params);
  return c.json({ success: true, data: result.rows });
});

// 2. Get Stock Movements Audit Ledger
stockRoutes.get('/movements', async (c) => {
  const warehouse_id = c.req.query('warehouse_id');
  const product_id = c.req.query('product_id');
  const movement_type = c.req.query('movement_type');

  let sql = `
    SELECT sm.*, 
           w.name AS warehouse_name,
           p.sku_code, p.name AS product_name, p.unit
    FROM stock_movements sm
    JOIN warehouses w ON sm.warehouse_id = w.id
    JOIN products p ON sm.product_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (warehouse_id) {
    params.push(warehouse_id);
    sql += ` AND sm.warehouse_id = $${params.length}`;
  }
  if (product_id) {
    params.push(product_id);
    sql += ` AND sm.product_id = $${params.length}`;
  }
  if (movement_type) {
    params.push(movement_type);
    sql += ` AND sm.movement_type = $${params.length}`;
  }
  sql += ` ORDER BY sm.created_at DESC LIMIT 200`;

  const result = await query(sql, params);
  return c.json({ success: true, data: result.rows });
});

// 3. Perform Manual Stock Adjustment (Opname / Damage)
stockRoutes.post('/adjust', optionalAuth, async (c) => {
  const user = c.get('user' as any) as UserTokenPayload | undefined;
  const body = await c.req.json();
  const { warehouse_id, product_id, qty_change, notes, actor_name: bodyActorName, actor_id: bodyActorId } = body;

  const actor_name = user?.full_name || bodyActorName;
  const actor_id = user?.id || bodyActorId;
  const actor_role = user?.role || 'WH_MANAGER';

  if (!actor_name) {
    return c.json({ success: false, message: 'Nama petugas pelaksana opname wajib diisi' }, 400);
  }

  try {
    const dummyRefId = '00000000-0000-0000-0000-000000000001';
    const movement = await adjustStock({
      warehouse_id,
      product_id,
      movement_type: 'ADJUSTMENT',
      reference_type: 'STOCK_ADJUSTMENT',
      reference_id: dummyRefId,
      qty_change: parseInt(qty_change),
      notes: notes || 'Penyesuaian stok opname manual',
      performed_by_id: actor_id || null,
      performed_by_name: actor_name
    });

    await recordCheckpoint({
      entity_type: 'STOCK_ADJUSTMENT',
      entity_id: movement.id,
      entity_number: `OPNAME-${Date.now().toString().slice(-6)}`,
      step_code: 'STOCK_ADJUSTED',
      step_label: 'Penyesuaian Stok Opname / Rusak Disetujui',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: actor_role,
      notes: `Perubahan stok: ${qty_change}. Alasan: ${notes || '-'}`
    });

    return c.json({ success: true, message: 'Stock adjusted successfully', data: movement });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});
