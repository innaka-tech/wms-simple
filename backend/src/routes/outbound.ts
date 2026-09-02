import { Hono } from 'hono';
import { query, pool } from '../db.js';
import { recordCheckpoint } from '../services/checkpoint.js';
import { adjustStock } from '../services/stock.js';
import { optionalAuth, UserTokenPayload } from '../middlewares/auth.js';

export const outboundRoutes = new Hono();

// 1. List Outbound Orders
outboundRoutes.get('/', async (c) => {
  const result = await query(`
    SELECT oo.*, 
           c.name AS customer_name,
           w.name AS warehouse_name,
           v.plate_number AS vehicle_plate
    FROM outbound_orders oo
    JOIN customers c ON oo.customer_id = c.id
    JOIN warehouses w ON oo.warehouse_id = w.id
    LEFT JOIN vehicles v ON oo.vehicle_id = v.id
    ORDER BY oo.created_at DESC
  `);
  return c.json({ success: true, data: result.rows });
});

// 2. Get Outbound Order Detail + Items + Packages + POD + Checkpoints
outboundRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const orderRes = await query(
    `SELECT oo.*, 
            c.name AS customer_name,
            w.name AS warehouse_name,
            v.plate_number AS vehicle_plate
     FROM outbound_orders oo
     JOIN customers c ON oo.customer_id = c.id
     JOIN warehouses w ON oo.warehouse_id = w.id
     LEFT JOIN vehicles v ON oo.vehicle_id = v.id
     WHERE oo.id = $1`,
    [id]
  );

  if (orderRes.rows.length === 0) {
    return c.json({ success: false, message: 'Outbound order not found' }, 404);
  }

  const itemsRes = await query(
    `SELECT oi.*, p.sku_code, p.name AS product_name, p.unit, p.weight_kg
     FROM outbound_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.outbound_order_id = $1`,
    [id]
  );

  const pkgRes = await query(`SELECT * FROM packages WHERE outbound_order_id = $1`, [id]);
  const podRes = await query(`SELECT * FROM pod_documents WHERE outbound_order_id = $1`, [id]);
  const checkpointsRes = await query(
    `SELECT * FROM checkpoint_logs
     WHERE entity_type = 'OUTBOUND_ORDER' AND entity_id = $1
     ORDER BY created_at ASC`,
    [id]
  );

  return c.json({
    success: true,
    data: {
      ...orderRes.rows[0],
      items: itemsRes.rows,
      packages: pkgRes.rows,
      pod: podRes.rows.length > 0 ? podRes.rows[0] : null,
      checkpoints: checkpointsRes.rows
    }
  });
});

// 3. Create Outbound Order (Step 1: Order Created)
outboundRoutes.post('/', optionalAuth, async (c) => {
  const user = c.get('user' as any) as UserTokenPayload | undefined;
  const body = await c.req.json();
  const {
    customer_id,
    warehouse_id,
    recipient_name,
    recipient_phone,
    destination_address,
    destination_city,
    scheduled_ship_date,
    items,
    notes,
    actor_name: bodyActorName,
    actor_id: bodyActorId
  } = body;

  const actor_name = user?.full_name || bodyActorName;
  const actor_id = user?.id || bodyActorId;
  const actor_role = user?.role || 'ADMIN_ADM';

  if (!items || !Array.isArray(items) || items.length === 0) {
    return c.json({ success: false, message: 'Minimal 1 item barang pesanan wajib diisi' }, 400);
  }
  if (!actor_name) {
    return c.json({ success: false, message: 'Nama pembuat order wajib diisi' }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;

    const orderRes = await client.query(
      `INSERT INTO outbound_orders (
        order_number, customer_id, warehouse_id, recipient_name, recipient_phone,
        destination_address, destination_city, scheduled_ship_date, notes, status,
        created_by_id, created_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'CREATED', $10, $11)
      RETURNING *`,
      [
        orderNumber, customer_id, warehouse_id, recipient_name, recipient_phone || null,
        destination_address, destination_city || null, scheduled_ship_date || null, notes || null,
        actor_id || null, actor_name.trim()
      ]
    );
    const order = orderRes.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO outbound_items (outbound_order_id, product_id, ordered_qty, picked_qty, packed_qty, delivered_qty)
         VALUES ($1, $2, $3, 0, 0, 0)`,
        [order.id, item.product_id, item.ordered_qty]
      );
    }

    await client.query('COMMIT');

    // Record Checkpoint 1
    await recordCheckpoint({
      entity_type: 'OUTBOUND_ORDER',
      entity_id: order.id,
      entity_number: order.order_number,
      step_code: 'ORDER_CREATED',
      step_label: 'Order Pengiriman Dibuat',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: 'ADMIN_ADM',
      notes: notes || 'Pesanan dibuat dalam sistem'
    });

    return c.json({ success: true, data: order }, 201);
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});

// 4. Picking (Step 2: Pick from storage bin)
outboundRoutes.post('/:id/pick', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { items, photo_url, notes, actor_name, actor_id } = body;

  if (!actor_name) {
    return c.json({ success: false, message: 'Nama petugas picker wajib diisi' }, 400);
  }

  const orderRes = await query(`SELECT * FROM outbound_orders WHERE id = $1`, [id]);
  if (orderRes.rows.length === 0) {
    return c.json({ success: false, message: 'Outbound order not found' }, 404);
  }
  const order = orderRes.rows[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const item of items) {
      await client.query(
        `UPDATE outbound_items 
         SET picked_qty = $2, location_id = $3
         WHERE id = $1`,
        [item.id, item.picked_qty, item.location_id || null]
      );

      // Mutasi OUTBOUND_PICK: reserve stock
      await adjustStock({
        warehouse_id: order.warehouse_id,
        product_id: item.product_id,
        movement_type: 'OUTBOUND_PICK',
        reference_type: 'OUTBOUND_ORDER',
        reference_id: order.id,
        qty_change: -item.picked_qty,
        location_id: item.location_id || null,
        notes: `Picking untuk Outbound ${order.order_number}`,
        performed_by_id: actor_id || null,
        performed_by_name: actor_name
      });
    }

    await client.query(`UPDATE outbound_orders SET status = 'PICKED' WHERE id = $1`, [id]);
    await client.query('COMMIT');

    // Record Checkpoint 2
    await recordCheckpoint({
      entity_type: 'OUTBOUND_ORDER',
      entity_id: id,
      entity_number: order.order_number,
      step_code: 'PICKING_COMPLETED',
      step_label: 'Barang Selesai Diambil dari Rak (Picking)',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: 'WH_STAFF',
      notes: notes || 'Barang siap dikemas di meja packing',
      photo_urls: photo_url ? [photo_url] : []
    });

    return c.json({ success: true, message: 'Picking completed successfully' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});

// 5. Packing (Step 3: Pack into boxes & seal)
outboundRoutes.post('/:id/pack', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { packages, photo_url, notes, actor_name, actor_id } = body;

  if (!actor_name) {
    return c.json({ success: false, message: 'Nama petugas packing wajib diisi' }, 400);
  }

  const orderRes = await query(`SELECT * FROM outbound_orders WHERE id = $1`, [id]);
  if (orderRes.rows.length === 0) {
    return c.json({ success: false, message: 'Outbound order not found' }, 404);
  }
  const order = orderRes.rows[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (packages && Array.isArray(packages)) {
      for (const pkg of packages) {
        await client.query(
          `INSERT INTO packages (outbound_order_id, box_code, weight_kg, dimensions, packed_by_id, packed_by_name)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, pkg.box_code, pkg.weight_kg || 0, pkg.dimensions || null, actor_id || null, actor_name.trim()]
        );
      }
    }

    await client.query(`UPDATE outbound_orders SET status = 'PACKED' WHERE id = $1`, [id]);
    await client.query('COMMIT');

    // Record Checkpoint 3
    await recordCheckpoint({
      entity_type: 'OUTBOUND_ORDER',
      entity_id: id,
      entity_number: order.order_number,
      step_code: 'PACKING_COMPLETED',
      step_label: 'Pengepakan & Penyegelan Kardus Selesai',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: 'WH_STAFF',
      notes: notes || 'Koli tersegel rapi dan siap dimuat ke armada',
      photo_urls: photo_url ? [photo_url] : []
    });

    return c.json({ success: true, message: 'Packing completed successfully' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});

// 6. Submit POD (Step 5: Customer Delivery & POD Signature/Photo)
outboundRoutes.post('/:id/pod', optionalAuth, async (c) => {
  const user = c.get('user' as any) as UserTokenPayload | undefined;
  const id = c.req.param('id');
  const body = await c.req.json();
  const { recipient_name, pod_photo_url, signature_photo_url, delivered_qty, notes, actor_name: bodyActorName, actor_id: bodyActorId } = body;

  const actor_name = (user?.full_name || bodyActorName || 'Driver Ekspedisi').trim();
  const actor_id = user?.id || bodyActorId;
  const actor_role = user?.role || 'DRIVER';

  if (!pod_photo_url || !signature_photo_url) {
    return c.json({ success: false, message: 'Foto serah terima fisik dan TTD penerima wajib diunggah' }, 400);
  }

  const orderRes = await query(`SELECT * FROM outbound_orders WHERE id = $1`, [id]);
  if (orderRes.rows.length === 0) {
    return c.json({ success: false, message: 'Outbound order not found' }, 404);
  }
  const order = orderRes.rows[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const podNumber = `POD-${Date.now().toString().slice(-8)}`;

    await client.query(
      `INSERT INTO pod_documents (
        outbound_order_id, pod_number, recipient_name, pod_photo_url,
        signature_photo_url, delivered_qty, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'ACCEPTED')`,
      [id, podNumber, recipient_name || order.recipient_name, pod_photo_url, signature_photo_url, delivered_qty || 1]
    );

    await client.query(
      `UPDATE outbound_orders SET status = 'DELIVERED', delivered_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    // Record Checkpoint 4 (Delivered)
    await recordCheckpoint({
      entity_type: 'OUTBOUND_ORDER',
      entity_id: id as string,
      entity_number: order.order_number,
      step_code: 'DELIVERED',
      step_label: 'Barang Diterima & Ditandatangani oleh Pelanggan (POD)',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: actor_role,
      notes: notes || `Diterima oleh ${recipient_name || order.recipient_name}`,
      photo_urls: [pod_photo_url, signature_photo_url]
    });

    return c.json({ success: true, message: 'POD submitted successfully' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});

// 7. Verify POD (Step 6: Admin POD Verification)
outboundRoutes.post('/:id/verify-pod', optionalAuth, async (c) => {
  const user = c.get('user' as any) as UserTokenPayload | undefined;
  const id = c.req.param('id');
  const body = await c.req.json();
  const { status, rejection_reason, actor_name: bodyActorName, actor_id: bodyActorId } = body;

  const actor_name = (user?.full_name || bodyActorName || '').trim();
  const actor_id = user?.id || bodyActorId;
  const actor_role = user?.role || 'ADMIN_ADM';

  if (!actor_name) {
    return c.json({ success: false, message: 'Nama admin verifikator wajib diisi' }, 400);
  }

  const orderRes = await query(`SELECT * FROM outbound_orders WHERE id = $1`, [id]);
  if (orderRes.rows.length === 0) {
    return c.json({ success: false, message: 'Outbound order not found' }, 404);
  }
  const order = orderRes.rows[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE pod_documents 
       SET status = $2,
           rejection_reason = $3,
           verified_by_id = $4,
           verified_by_name = $5,
           verified_at = CURRENT_TIMESTAMP
       WHERE outbound_order_id = $1`,
      [id, status || 'ACCEPTED', rejection_reason || null, actor_id || null, actor_name]
    );

    const nextStatus = status === 'REJECTED' ? 'CANCELLED' : 'POD_VERIFIED';
    await client.query(`UPDATE outbound_orders SET status = $2 WHERE id = $1`, [id, nextStatus]);

    await client.query('COMMIT');

    // Record Checkpoint 5 (POD Verified)
    await recordCheckpoint({
      entity_type: 'OUTBOUND_ORDER',
      entity_id: id as string,
      entity_number: order.order_number,
      step_code: 'POD_VERIFIED',
      step_label: status === 'REJECTED' ? 'POD Ditolak oleh Admin' : 'POD Terverifikasi Sah oleh Admin',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: actor_role,
      notes: rejection_reason || 'Dokumen POD lengkap dan terverifikasi'
    });

    return c.json({ success: true, message: 'POD verified successfully' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});
