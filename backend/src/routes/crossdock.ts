import { Hono } from 'hono';
import { query, pool } from '../db.js';
import { recordCheckpoint } from '../services/checkpoint.js';
import { adjustStock } from '../services/stock.js';

export const crossdockRoutes = new Hono();

// 1. List Cross-Dock Manifests
crossdockRoutes.get('/', async (c) => {
  const result = await query(`
    SELECT cdm.*, 
           w_src.name AS source_warehouse_name,
           w_dst.name AS destination_warehouse_name,
           cust.name AS customer_name,
           v.plate_number AS vehicle_plate
    FROM cross_dock_manifests cdm
    JOIN warehouses w_src ON cdm.source_warehouse_id = w_src.id
    JOIN warehouses w_dst ON cdm.destination_warehouse_id = w_dst.id
    JOIN customers cust ON cdm.customer_id = cust.id
    LEFT JOIN vehicles v ON cdm.vehicle_id = v.id
    ORDER BY cdm.created_at DESC
  `);
  return c.json({ success: true, data: result.rows });
});

// 2. Get Manifest Detail + Items + Checkpoints
crossdockRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const manifestRes = await query(
    `SELECT cdm.*, 
            w_src.name AS source_warehouse_name,
            w_dst.name AS destination_warehouse_name,
            cust.name AS customer_name,
            v.plate_number AS vehicle_plate
     FROM cross_dock_manifests cdm
     JOIN warehouses w_src ON cdm.source_warehouse_id = w_src.id
     JOIN warehouses w_dst ON cdm.destination_warehouse_id = w_dst.id
     JOIN customers cust ON cdm.customer_id = cust.id
     LEFT JOIN vehicles v ON cdm.vehicle_id = v.id
     WHERE cdm.id = $1`,
    [id]
  );

  if (manifestRes.rows.length === 0) {
    return c.json({ success: false, message: 'Manifest not found' }, 404);
  }

  const itemsRes = await query(
    `SELECT cdi.*, p.sku_code, p.name AS product_name, p.unit, p.weight_kg
     FROM cross_dock_items cdi
     JOIN products p ON cdi.product_id = p.id
     WHERE cdi.manifest_id = $1`,
    [id]
  );

  const checkpointsRes = await query(
    `SELECT * FROM checkpoint_logs
     WHERE entity_type = 'CROSS_DOCK_MANIFEST' AND entity_id = $1
     ORDER BY created_at ASC`,
    [id]
  );

  return c.json({
    success: true,
    data: {
      ...manifestRes.rows[0],
      items: itemsRes.rows,
      checkpoints: checkpointsRes.rows
    }
  });
});

// 3. Create Manifest (Step 1: Manifest Created)
crossdockRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const { 
    source_warehouse_id, 
    destination_warehouse_id, 
    customer_id, 
    vehicle_id, 
    driver_name, 
    truck_plate,
    scheduled_departure,
    eta_arrival,
    items,
    notes,
    actor_name, 
    actor_id 
  } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return c.json({ success: false, message: 'Minimal 1 item manifest wajib diisi' }, 400);
  }
  if (!actor_name) {
    return c.json({ success: false, message: 'Nama petugas pembuat manifest wajib diisi' }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const manifestNumber = `MNF-${Date.now().toString().slice(-8)}`;

    const manifestRes = await client.query(
      `INSERT INTO cross_dock_manifests (
        manifest_number, source_warehouse_id, destination_warehouse_id, customer_id,
        vehicle_id, driver_name, truck_plate, scheduled_departure, eta_arrival,
        notes, status, created_by_id, created_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'CREATED', $11, $12)
      RETURNING *`,
      [
        manifestNumber, source_warehouse_id, destination_warehouse_id, customer_id,
        vehicle_id || null, driver_name || null, truck_plate || null,
        scheduled_departure || null, eta_arrival || null, notes || null,
        actor_id || null, actor_name.trim()
      ]
    );
    const manifest = manifestRes.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO cross_dock_items (manifest_id, product_id, planned_qty, loaded_qty, received_qty)
         VALUES ($1, $2, $3, 0, 0)`,
        [manifest.id, item.product_id, item.planned_qty]
      );
    }

    await client.query('COMMIT');

    // Record Checkpoint 1
    await recordCheckpoint({
      entity_type: 'CROSS_DOCK_MANIFEST',
      entity_id: manifest.id,
      entity_number: manifest.manifest_number,
      step_code: 'MANIFEST_CREATED',
      step_label: 'Manifest Cross-Dock Dibuat oleh Admin',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: 'ADMIN_ADM',
      notes: notes || 'Manifest transfer siap dimuat'
    });

    return c.json({ success: true, data: manifest }, 201);
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});

// 4. Loading to Truck (Step 2: Loaded & Stock Movement CROSS_DOCK_OUT)
crossdockRoutes.post('/:id/load', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { items, photo_url, notes, actor_name, actor_id } = body;

  if (!actor_name) {
    return c.json({ success: false, message: 'Nama petugas pemuatan (loading) wajib diisi' }, 400);
  }

  const manifestRes = await query(`SELECT * FROM cross_dock_manifests WHERE id = $1`, [id]);
  if (manifestRes.rows.length === 0) {
    return c.json({ success: false, message: 'Manifest not found' }, 404);
  }
  const manifest = manifestRes.rows[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const item of items) {
      await client.query(
        `UPDATE cross_dock_items SET loaded_qty = $2 WHERE id = $1`,
        [item.id, item.loaded_qty]
      );

      // Deduct on_hand from source warehouse and add to in_transit
      await adjustStock({
        warehouse_id: manifest.source_warehouse_id,
        product_id: item.product_id,
        movement_type: 'CROSS_DOCK_OUT',
        reference_type: 'CROSS_DOCK_MANIFEST',
        reference_id: manifest.id,
        qty_change: -item.loaded_qty,
        notes: `Dimuat ke Truk Manifest ${manifest.manifest_number}`,
        performed_by_id: actor_id || null,
        performed_by_name: actor_name
      });
    }

    await client.query(
      `UPDATE cross_dock_manifests SET status = 'LOADED' WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    // Record Checkpoint 2
    await recordCheckpoint({
      entity_type: 'CROSS_DOCK_MANIFEST',
      entity_id: id,
      entity_number: manifest.manifest_number,
      step_code: 'MANIFEST_LOADED',
      step_label: 'Barang Selesai Dimuat ke Truk',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: 'WH_STAFF',
      notes: notes || 'Pemuatan selesai, menunggu pengecekan pos satpam keluar',
      photo_urls: photo_url ? [photo_url] : []
    });

    return c.json({ success: true, message: 'Manifest loaded successfully' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});

// 5. Receive at Destination Warehouse (Step 4: Received at Dest & Stock Movement CROSS_DOCK_IN)
crossdockRoutes.post('/:id/receive-dest', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { items, photo_url, notes, actor_name, actor_id } = body;

  if (!actor_name) {
    return c.json({ success: false, message: 'Nama petugas penerima di cabang tujuan wajib diisi' }, 400);
  }

  const manifestRes = await query(`SELECT * FROM cross_dock_manifests WHERE id = $1`, [id]);
  if (manifestRes.rows.length === 0) {
    return c.json({ success: false, message: 'Manifest not found' }, 404);
  }
  const manifest = manifestRes.rows[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const item of items) {
      await client.query(
        `UPDATE cross_dock_items SET received_qty = $2 WHERE id = $1`,
        [item.id, item.received_qty]
      );

      // Increase on_hand at destination warehouse and clear in_transit
      await adjustStock({
        warehouse_id: manifest.destination_warehouse_id,
        product_id: item.product_id,
        movement_type: 'CROSS_DOCK_IN',
        reference_type: 'CROSS_DOCK_MANIFEST',
        reference_id: manifest.id,
        qty_change: item.received_qty,
        notes: `Diterima di Gudang Transit dari Manifest ${manifest.manifest_number}`,
        performed_by_id: actor_id || null,
        performed_by_name: actor_name
      });
    }

    await client.query(
      `UPDATE cross_dock_manifests 
       SET status = 'RECEIVED_DEST', actual_arrival = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    // Record Checkpoint
    await recordCheckpoint({
      entity_type: 'CROSS_DOCK_MANIFEST',
      entity_id: id,
      entity_number: manifest.manifest_number,
      step_code: 'RECEIVED_AT_DEST',
      step_label: 'Barang Diterima & Dibongkar di Gudang Transit Tujuan',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: 'WH_STAFF',
      notes: notes || 'Penerimaan fisik di spoke transit selesai',
      photo_urls: photo_url ? [photo_url] : []
    });

    return c.json({ success: true, message: 'Cross-dock receive completed at destination' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});
