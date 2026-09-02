import { Hono } from 'hono';
import { query, pool } from '../db.js';
import { recordCheckpoint } from '../services/checkpoint.js';
import { adjustStock } from '../services/stock.js';
import { optionalAuth, UserTokenPayload } from '../middlewares/auth.js';

export const inboundRoutes = new Hono();

// 1. List Inbound Orders
inboundRoutes.get('/', async (c) => {
  const status = c.req.query('status');
  const warehouse_id = c.req.query('warehouse_id');

  let sql = `
    SELECT io.*, c.name AS customer_name, w.name AS warehouse_name
    FROM inbound_orders io
    JOIN customers c ON io.customer_id = c.id
    JOIN warehouses w ON io.warehouse_id = w.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (status) {
    params.push(status);
    sql += ` AND io.status = $${params.length}`;
  }
  if (warehouse_id) {
    params.push(warehouse_id);
    sql += ` AND io.warehouse_id = $${params.length}`;
  }
  sql += ` ORDER BY io.created_at DESC`;

  const result = await query(sql, params);
  return c.json({ success: true, data: result.rows });
});

// 2. Get Inbound Order Detail with Items & Checkpoints
inboundRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const orderRes = await query(
    `SELECT io.*, c.name AS customer_name, w.name AS warehouse_name
     FROM inbound_orders io
     JOIN customers c ON io.customer_id = c.id
     JOIN warehouses w ON io.warehouse_id = w.id
     WHERE io.id = $1`,
    [id]
  );

  if (orderRes.rows.length === 0) {
    return c.json({ success: false, message: 'Inbound order not found' }, 404);
  }

  const itemsRes = await query(
    `SELECT ii.*, p.sku_code, p.name AS product_name, p.unit
     FROM inbound_items ii
     JOIN products p ON ii.product_id = p.id
     WHERE ii.inbound_order_id = $1`,
    [id]
  );

  const checkpointsRes = await query(
    `SELECT * FROM checkpoint_logs
     WHERE entity_type = 'INBOUND_ORDER' AND entity_id = $1
     ORDER BY created_at ASC`,
    [id]
  );

  return c.json({
    success: true,
    data: {
      ...orderRes.rows[0],
      items: itemsRes.rows,
      checkpoints: checkpointsRes.rows
    }
  });
});

// 3. Create PO (Inbound Order Creation)
inboundRoutes.post('/', optionalAuth, async (c) => {
  const user = c.get('user' as any) as UserTokenPayload | undefined;
  const body = await c.req.json();
  const { customer_id, warehouse_id, eta, sender_info, notes, items, actor_name: bodyActorName, actor_id: bodyActorId } = body;

  const actor_name = user?.full_name || bodyActorName;
  const actor_id = user?.id || bodyActorId;
  const actor_role = user?.role || 'ADMIN_ADM';

  if (!items || !Array.isArray(items) || items.length === 0) {
    return c.json({ success: false, message: 'Minimal 1 item barang wajib diisi' }, 400);
  }
  if (!actor_name) {
    return c.json({ success: false, message: 'Nama petugas pembuat PO wajib diisi' }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const poNumber = `PO-${Date.now().toString().slice(-8)}`;

    const orderRes = await client.query(
      `INSERT INTO inbound_orders (po_number, customer_id, warehouse_id, status, eta, sender_info, notes, created_by_id, created_by_name)
       VALUES ($1, $2, $3, 'CREATED', $4, $5, $6, $7, $8) RETURNING *`,
      [poNumber, customer_id, warehouse_id, eta || null, sender_info || null, notes || null, actor_id || null, actor_name.trim()]
    );
    const order = orderRes.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO inbound_items (inbound_order_id, product_id, ordered_qty, received_qty, cross_dock_qty, storage_qty)
         VALUES ($1, $2, $3, 0, 0, 0)`,
        [order.id, item.product_id, item.ordered_qty]
      );
    }

    await client.query('COMMIT');

    // Record Checkpoint 1
    await recordCheckpoint({
      entity_type: 'INBOUND_ORDER',
      entity_id: order.id,
      entity_number: order.po_number,
      step_code: 'PO_CREATED',
      step_label: 'PO Dibuat oleh Admin',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: actor_role,
      notes: notes || 'PO dibuat dalam sistem'
    });

    return c.json({ success: true, data: order }, 201);
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});

// 4. Physical Receive (Step 2: Checkpoint PO Received)
inboundRoutes.post('/:id/receive', optionalAuth, async (c) => {
  const user = c.get('user' as any) as UserTokenPayload | undefined;
  const id = c.req.param('id');
  const body = await c.req.json();
  const { truck_plate, driver_name, items, photo_url, notes, actor_name: bodyActorName, actor_id: bodyActorId } = body;

  const actor_name = (user?.full_name || bodyActorName || '').trim();
  const actor_id = user?.id || bodyActorId;
  const actor_role = user?.role || 'WH_STAFF';

  if (!actor_name) {
    return c.json({ success: false, message: 'Nama petugas pemeriksa fisik wajib diisi' }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE inbound_orders 
       SET status = 'RECEIVED',
           actual_received_at = CURRENT_TIMESTAMP,
           truck_plate = $2,
           driver_name = $3
       WHERE id = $1`,
      [id, truck_plate || null, driver_name || null]
    );

    if (items && Array.isArray(items)) {
      for (const item of items) {
        await client.query(
          `UPDATE inbound_items 
           SET received_qty = $2, item_condition = $3
           WHERE id = $1`,
          [item.id, item.received_qty, item.item_condition || 'GOOD']
        );
      }
    }

    const orderRes = await client.query(`SELECT * FROM inbound_orders WHERE id = $1`, [id]);
    await client.query('COMMIT');

    // Record Checkpoint 2
    await recordCheckpoint({
      entity_type: 'INBOUND_ORDER',
      entity_id: id as string,
      entity_number: orderRes.rows[0].po_number,
      step_code: 'PO_RECEIVED',
      step_label: 'Barang Diterima Fisik di Area Staging',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: actor_role,
      notes: notes || `Penerimaan fisik oleh ${actor_name}. Plat truk: ${truck_plate || '-'}`,
      photo_urls: photo_url ? [photo_url] : []
    });

    return c.json({ success: true, message: 'Inbound physical receive recorded successfully' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});

// 5. Sorting Decision & Putaway Complete (Step 3 & 4: Sort -> Putaway -> Stock Update)
inboundRoutes.post('/:id/putaway', optionalAuth, async (c) => {
  const user = c.get('user' as any) as UserTokenPayload | undefined;
  const id = c.req.param('id');
  const body = await c.req.json();
  const { items, photo_url, notes, actor_name: bodyActorName, actor_id: bodyActorId } = body;

  const actor_name = (user?.full_name || bodyActorName || '').trim();
  const actor_id = user?.id || bodyActorId;
  const actor_role = user?.role || 'WH_STAFF';

  if (!actor_name) {
    return c.json({ success: false, message: 'Nama petugas putaway wajib diisi' }, 400);
  }

  const orderRes = await query(`SELECT * FROM inbound_orders WHERE id = $1`, [id]);
  if (orderRes.rows.length === 0) {
    return c.json({ success: false, message: 'Inbound order not found' }, 404);
  }
  const order = orderRes.rows[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const item of items) {
      // Validate cross_dock + storage = received
      if (item.cross_dock_qty + item.storage_qty !== item.received_qty) {
        throw new Error(`Total Cross-Dock (${item.cross_dock_qty}) + Storage (${item.storage_qty}) harus sama dengan Received Qty (${item.received_qty})`);
      }

      await client.query(
        `UPDATE inbound_items 
         SET cross_dock_qty = $2,
             storage_qty = $3,
             location_id = $4
         WHERE id = $1`,
        [item.id, item.cross_dock_qty, item.storage_qty, item.location_id || null]
      );

      // Increase on-hand stock for storage putaway
      if (item.storage_qty > 0) {
        await adjustStock({
          warehouse_id: order.warehouse_id,
          product_id: item.product_id,
          movement_type: 'INBOUND_PUTAWAY',
          reference_type: 'INBOUND_ORDER',
          reference_id: order.id,
          qty_change: item.storage_qty,
          location_id: item.location_id || null,
          notes: `Putaway dari Inbound PO ${order.po_number}`,
          performed_by_id: actor_id || null,
          performed_by_name: actor_name
        });
      }
    }

    await client.query(
      `UPDATE inbound_orders SET status = 'PUTAWAY_COMPLETED' WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    // Record Checkpoint 3 (Putaway Complete)
    await recordCheckpoint({
      entity_type: 'INBOUND_ORDER',
      entity_id: id as string,
      entity_number: order.po_number,
      step_code: 'PUTAWAY_COMPLETED',
      step_label: 'Sortir Selesai & Putaway Masuk Rak / Staging Cross-Dock',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: actor_role,
      notes: notes || 'Barang selesai dialokasikan',
      photo_urls: photo_url ? [photo_url] : []
    });

    return c.json({ success: true, message: 'Inbound sorting & putaway completed successfully' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});
