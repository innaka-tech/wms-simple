import { Hono } from 'hono';
import { z } from 'zod';
import { query, pool } from '../db.js';
import { recordCheckpoint } from '../services/checkpoint.js';
import { adjustStock } from '../services/stock.js';
import { optionalAuth, UserTokenPayload } from '../middlewares/auth.js';
import { generateWaybillNumber, generateDocumentNumber } from '../utils/waybill.js';

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
    `SELECT oi.*, p.sku_code, p.name AS product_name, p.default_uom_id AS unit, p.weight_kg_per_unit AS weight_kg
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

    // Nomor order unik (acak + cek database) — bukan timestamp yang collision-prone
    let orderNumber = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateDocumentNumber('ORD');
      const dup = await client.query(`SELECT 1 FROM outbound_orders WHERE order_number = $1`, [candidate]);
      if (dup.rows.length === 0) {
        orderNumber = candidate;
        break;
      }
    }
    if (!orderNumber) throw new Error('Gagal generate nomor order unik');

    const orderRes = await client.query(
      `INSERT INTO outbound_orders (
        id, order_number, customer_id, warehouse_id, recipient_name, recipient_phone,
        destination_address, destination_city, scheduled_ship_date, notes, status,
        created_by_id, created_by_name
      ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, 'CREATED', $10, $11)
      RETURNING *`,
      [
        orderNumber, customer_id, warehouse_id, recipient_name, recipient_phone || null,
        destination_address, destination_city || null, scheduled_ship_date || null, notes || null,
        actor_id || null, actor_name.trim()
      ]
    );
    const order = orderRes.rows[0];

    for (const item of items) {
      // uom_id wajib (schema): pakai payload atau UOM default produk
      const uomRes = await client.query(`SELECT default_uom_id FROM products WHERE id = $1`, [item.product_id]);
      const uomId = item.uom_id || uomRes.rows[0]?.default_uom_id;
      if (!uomId) throw new Error(`Produk ${item.product_id} tidak memiliki UOM default`);
      await client.query(
        `INSERT INTO outbound_items (id, outbound_order_id, product_id, ordered_qty, picked_qty, packed_qty, delivered_qty, uom_id)
         VALUES (uuid_generate_v4(), $1, $2, $3, 0, 0, 0, $4)`,
        [order.id, item.product_id, item.ordered_qty, uomId]
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
        txClient: client,
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
          `INSERT INTO packages (id, outbound_order_id, box_code, weight_kg, dimensions, packed_by_id, packed_by_name)
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6)`,
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

    // Nomor POD unik (acak + cek database) — bukan timestamp yang collision-prone
    let podNumber = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateDocumentNumber('POD');
      const dup = await client.query(`SELECT 1 FROM pod_documents WHERE pod_number = $1`, [candidate]);
      if (dup.rows.length === 0) {
        podNumber = candidate;
        break;
      }
    }
    if (!podNumber) throw new Error('Gagal generate nomor POD unik');

    await client.query(
      `INSERT INTO pod_documents (
        id, outbound_order_id, pod_number, recipient_name, pod_photo_url,
        signature_photo_url, delivered_qty, status
      ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, 'ACCEPTED')`,
      [id, podNumber, recipient_name || order.recipient_name, pod_photo_url, signature_photo_url, delivered_qty || 1]
    );

    // docs/09 v3.2.0 FASE 3: kartu stok jadi DALAM PERJALANAN saat barang berangkat.
    // Ledger: OUTBOUND_SHIP memindahkan saldo dari qty_reserved ke in-transit (barang
    // sudah keluar rak sejak picking, sekarang resmi dalam pengiriman).
    const itemsShipRes = await client.query(`SELECT product_id, packed_qty FROM outbound_items WHERE outbound_order_id = $1`, [id]);
    for (const item of itemsShipRes.rows) {
      const shipQty = Number(item.packed_qty) > 0 ? Number(item.packed_qty) : null;
      if (!shipQty) continue;
      await adjustStock({
        warehouse_id: order.warehouse_id,
        product_id: item.product_id,
        movement_type: 'OUTBOUND_SHIP',
        txClient: client,
        reference_type: 'OUTBOUND_ORDER',
        reference_id: id as string,
        qty_change: -shipQty,
        notes: `Barang berangkat (DELIVERED) untuk Outbound ${order.order_number}`,
        performed_by_id: actor_id || null,
        performed_by_name: actor_name
      });
    }

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
  // Zod (OWASP LLM05): validasi ketat payload verifikasi POD
  const verifyPodSchema = z.object({
    status: z.enum(['ACCEPTED', 'REJECTED']).optional(),
    rejection_reason: z.string().max(500).optional(),
    actor_name: z.string().trim().min(2, 'Nama admin verifikator wajib diisi (min 2 karakter)').optional(),
    actor_id: z.string().optional()
  });
  const parsedBody = verifyPodSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsedBody.success) {
    return c.json({ success: false, message: parsedBody.error.issues[0]?.message || 'Payload tidak valid' }, 400);
  }
  const body = parsedBody.data;
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
    // billing_ready = penanda tunggal modul penagihan (true saat POD_VERIFIED)
    await client.query(`UPDATE outbound_orders SET status = $2, billing_ready = $3 WHERE id = $1`, [
      id,
      nextStatus,
      nextStatus === 'POD_VERIFIED'
    ]);

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

// 8. Issue Waybill (Step 4: Terbitkan Surat Jalan Baru + Nomor Resi Otomatis)
// Satu titik penerbitan untuk SEMUA jenis pengiriman (stok, repacking, cross-dock, KDMP).
const issueWaybillSchema = z.object({
  actor_name: z.string().trim().min(2, 'Nama petugas penerbit wajib diisi (min 2 karakter)').optional(),
  actor_id: z.string().optional(),
  reference_type: z.enum(['OUTBOUND_ORDER', 'CROSS_DOCK_MANIFEST']).default('OUTBOUND_ORDER'),
  notes: z.string().max(500).optional()
});

outboundRoutes.post('/:id/issue-waybill', optionalAuth, async (c) => {
  const user = c.get('user' as any) as UserTokenPayload | undefined;
  const id = c.req.param('id');

  const parsed = issueWaybillSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ success: false, message: parsed.error.issues[0]?.message || 'Payload tidak valid' }, 400);
  }
  const body = parsed.data;

  const actor_name = (user?.full_name || body.actor_name || '').trim();
  const actor_id = user?.id || body.actor_id;
  const actor_role = user?.role || 'WH_STAFF';

  if (!actor_name || actor_name.length < 2) {
    return c.json({ success: false, message: 'Nama petugas penerbit wajib diisi (Mandatory petugas_name)' }, 400);
  }

  const orderRes = await query(`SELECT * FROM outbound_orders WHERE id = $1`, [id]);
  if (orderRes.rows.length === 0) {
    return c.json({ success: false, message: 'Outbound order not found' }, 404);
  }
  const order = orderRes.rows[0];

  // Waybill tidak boleh diterbitkan setelah barang terkirim / dibatalkan
  const blockedStatuses = ['DELIVERED', 'POD_VERIFIED', 'CANCELLED'];
  if (blockedStatuses.includes(order.status)) {
    return c.json(
      { success: false, message: `Waybill tidak dapat diterbitkan pada status ${order.status}` },
      409
    );
  }

  // Satu waybill aktif per order (idempoten)
  const dupRes = await query(
    `SELECT id, sj_number FROM waybills
     WHERE reference_type = $1 AND reference_id = $2 AND status != 'VOID'`,
    [body.reference_type, id]
  );
  if (dupRes.rows.length > 0) {
    return c.json(
      { success: false, message: `Waybill sudah diterbitkan untuk order ini (SJ: ${dupRes.rows[0].sj_number})` },
      409
    );
  }

  // Generate nomor unik (cek database, maksimal 5 percobaan)
  let sjNumber = '';
  let resiNumber = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    const sj = generateWaybillNumber('SJ');
    const resi = generateWaybillNumber('RESI');
    const sjExists = await query(`SELECT 1 FROM waybills WHERE sj_number = $1`, [sj]);
    const resiExists = await query(`SELECT 1 FROM waybills WHERE resi_number = $1`, [resi]);
    if (sjExists.rows.length === 0 && resiExists.rows.length === 0) {
      sjNumber = sj;
      resiNumber = resi;
      break;
    }
  }
  if (!sjNumber || !resiNumber) {
    return c.json({ success: false, message: 'Gagal generate nomor SJ/Resi unik, coba lagi' }, 500);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const waybillRes = await client.query(
      `INSERT INTO waybills (
        id, sj_number, resi_number, reference_type, reference_id,
        issued_by_id, issued_by_name, status, notes
      ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, 'ISSUED', $7)
      RETURNING *`,
      [sjNumber, resiNumber, body.reference_type, id, actor_id || null, actor_name, body.notes || null]
    );
    const waybill = waybillRes.rows[0];
    await client.query('COMMIT');

    // Record Checkpoint: WAYBILL_ISSUED (rantai audit tetap tersambung)
    await recordCheckpoint({
      entity_type: 'OUTBOUND_ORDER',
      entity_id: id as string,
      entity_number: order.order_number,
      step_code: 'WAYBILL_ISSUED',
      step_label: 'Surat Jalan Baru & Nomor Resi Diterbitkan Otomatis',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: actor_role,
      notes: body.notes || `SJ: ${sjNumber} / Resi: ${resiNumber} diserahkan ke sopir saat loading`,
      metadata: { sj_number: sjNumber, resi_number: resiNumber, waybill_id: waybill.id }
    });

    return c.json({ success: true, data: waybill }, 201);
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});
