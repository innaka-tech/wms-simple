import { Hono } from 'hono';
import { z } from 'zod';
import { query, pool } from '../db.js';
import { adjustStock } from '../services/stock.js';
import { recordCheckpoint } from '../services/checkpoint.js';
import { optionalAuth, UserTokenPayload } from '../middlewares/auth.js';
import { generateDocumentNumber } from '../utils/waybill.js';

export const stockRoutes = new Hono();

// 1. Get Stock Levels Snapshot
stockRoutes.get('/levels', async (c) => {
  const warehouse_id = c.req.query('warehouse_id');
  const product_id = c.req.query('product_id');

  let sql = `
    SELECT sl.*, 
           w.name AS warehouse_name, wt.name AS warehouse_type,
           p.sku_code, p.name AS product_name, COALESCE(u.code, 'PCS') AS unit, p.min_stock_qty,
           CASE WHEN sl.qty_on_hand <= p.min_stock_qty THEN true ELSE false END AS is_low_stock
    FROM stock_levels sl
    JOIN warehouses w ON sl.warehouse_id = w.id
    LEFT JOIN master_warehouse_types wt ON w.warehouse_type_id = wt.id
    JOIN products p ON sl.product_id = p.id
    LEFT JOIN master_uom u ON sl.uom_id = u.id
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
           w.name AS warehouse_name,            p.sku_code, p.name AS product_name, p.default_uom_id AS unit
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
    const adjustmentRefId = crypto.randomUUID();
    const movement = await adjustStock({
      warehouse_id,
      product_id,
      movement_type: 'ADJUSTMENT',
      reference_type: 'STOCK_ADJUSTMENT',
      reference_id: adjustmentRefId,
      qty_change: parseInt(qty_change),
      notes: notes || 'Penyesuaian stok opname manual',
      performed_by_id: actor_id || null,
      performed_by_name: actor_name
    });

    await recordCheckpoint({
      entity_type: 'STOCK_ADJUSTMENT',
      entity_id: movement.id,
      entity_number: `OPNAME${Date.now().toString().slice(-6)}`,
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

// ═══ 4. QUARANTINE & RETURN MANAGEMENT ═══

// GET /api/stock/quarantine
stockRoutes.get('/quarantine', optionalAuth, async (c) => {
  const warehouse_id = c.req.query('warehouse_id');
  const status = c.req.query('status');

  let sql = `
    SELECT q.*, 
           w.name AS warehouse_name,
           p.sku_code, p.name AS product_name,
           u.code AS unit
    FROM quarantine_records q
    JOIN warehouses w ON q.warehouse_id = w.id
    JOIN products p ON q.product_id = p.id
    JOIN master_uom u ON q.uom_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (warehouse_id) {
    params.push(warehouse_id);
    sql += ` AND q.warehouse_id = $${params.length}`;
  }
  if (status) {
    params.push(status);
    sql += ` AND q.inspection_status = $${params.length}`;
  }
  sql += ` ORDER BY q.created_at DESC`;

  const result = await query(sql, params);
  return c.json({ success: true, data: result.rows });
});

const quarantineSchema = z.object({
  warehouse_id: z.string().min(1),
  product_id: z.string().min(1),
  qty: z.number().positive('Jumlah barang karantina harus lebih dari 0'),
  reason: z.string().min(3, 'Alasan penahanan karantina wajib diisi'),
  source_type: z.enum(['DAMAGE_FOUND', 'POD_RETURN', 'INBOUND_REJECT', 'EXPIRED']).default('DAMAGE_FOUND'),
  source_reference: z.string().optional().nullable(),
  actor_name: z.string().optional()
});

// POST /api/stock/quarantine - Hold item into quarantine
stockRoutes.post('/quarantine', optionalAuth, async (c) => {
  const user = c.get('user' as any) as UserTokenPayload | undefined;
  const body = await c.req.json();
  const parsed = quarantineSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, message: 'Validasi form gagal', errors: parsed.error.format() }, 400);
  }
  const d = parsed.data;
  const actor_name = user?.full_name || d.actor_name || 'Petugas Gudang';
  const actor_id = user?.id || null;
  const actor_role = user?.role || 'WH_STAFF';

  // Get product UOM
  const prodRes = await query(`SELECT default_uom_id, sku_code, name FROM products WHERE id = $1`, [d.product_id]);
  if (prodRes.rows.length === 0) {
    return c.json({ success: false, message: 'Produk tidak ditemukan' }, 404);
  }
  const prod = prodRes.rows[0];

  const recordNumber = generateDocumentNumber('QRN', 8);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Deduct from on_hand into quarantine hold
    await adjustStock({
      warehouse_id: d.warehouse_id,
      product_id: d.product_id,
      movement_type: 'QUARANTINE_HOLD',
      reference_type: 'QUARANTINE_RECORD',
      reference_id: recordNumber,
      qty_change: -d.qty,
      notes: `Dipindahkan ke karantina: ${d.reason}`,
      performed_by_id: actor_id,
      performed_by_name: actor_name,
      txClient: client
    });

    const insRes = await client.query(
      `INSERT INTO quarantine_records (
        id, record_number, warehouse_id, product_id, qty, uom_id,
        source_type, source_reference, reason, inspection_status,
        created_by_id, created_by_name
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5,
        $6, $7, $8, 'PENDING',
        $9, $10
      ) RETURNING *`,
      [
        recordNumber,
        d.warehouse_id,
        d.product_id,
        d.qty,
        prod.default_uom_id,
        d.source_type,
        d.source_reference || null,
        d.reason,
        actor_id,
        actor_name
      ]
    );

    await client.query('COMMIT');

    await recordCheckpoint({
      entity_type: 'QUARANTINE_RECORD',
      entity_id: insRes.rows[0].id,
      entity_number: recordNumber,
      step_code: 'QUARANTINE_HELD',
      step_label: 'Barang Ditahan di Area Karantina',
      actor_id,
      actor_name,
      actor_role,
      notes: `${d.qty} unit ${prod.sku_code} ditahan karena: ${d.reason}`
    });

    return c.json({ success: true, message: `Barang berhasil ditahan ke karantina (${recordNumber})`, data: insRes.rows[0] }, 201);
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: 'Gagal memproses karantina: ' + err.message }, 500);
  } finally {
    client.release();
  }
});

// POST /api/stock/quarantine/:id/inspect - Inspect & release or scrap
stockRoutes.post('/quarantine/:id/inspect', optionalAuth, async (c) => {
  const id = c.req.param('id');
  const user = c.get('user' as any) as UserTokenPayload | undefined;
  const body = await c.req.json();

  const { disposition, inspection_notes, actor_name: bodyActorName } = body;
  if (!disposition || !['RETURN_TO_STOCK', 'RETURN_TO_VENDOR', 'DISPOSE_SCRAP'].includes(disposition)) {
    return c.json({ success: false, message: 'Disposisi pemeriksaan tidak valid' }, 400);
  }

  const qRes = await query(`SELECT * FROM quarantine_records WHERE id = $1`, [id]);
  if (qRes.rows.length === 0) {
    return c.json({ success: false, message: 'Catatan karantina tidak ditemukan' }, 404);
  }
  const qRecord = qRes.rows[0];

  const actor_name = user?.full_name || bodyActorName || 'Petugas QC';
  const actor_id = user?.id || null;
  const actor_role = user?.role || 'WH_MANAGER';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // If RETURN_TO_STOCK: replenish back to on_hand
    if (disposition === 'RETURN_TO_STOCK') {
      await adjustStock({
        warehouse_id: qRecord.warehouse_id,
        product_id: qRecord.product_id,
        movement_type: 'QUARANTINE_RELEASE',
        reference_type: 'QUARANTINE_RECORD',
        reference_id: qRecord.record_number,
        qty_change: Number(qRecord.qty),
        notes: `Rilis dari karantina kembali ke rak layak jual: ${inspection_notes || '-'}`,
        performed_by_id: actor_id,
        performed_by_name: actor_name,
        txClient: client
      });
    }

    await client.query(
      `UPDATE quarantine_records 
       SET inspection_status = 'INSPECTED', disposition = $1, inspection_notes = $2,
           inspector_id = $3, inspector_name = $4, updated_at = now()
       WHERE id = $5`,
      [disposition, inspection_notes || null, actor_id, actor_name, id]
    );

    await client.query('COMMIT');

    await recordCheckpoint({
      entity_type: 'QUARANTINE_RECORD',
      entity_id: id as string,
      entity_number: qRecord.record_number,
      step_code: 'QUARANTINE_INSPECTED',
      step_label: `Pemeriksaan Karantina Selesai: ${disposition}`,
      actor_id,
      actor_name,
      actor_role,
      notes: `Disposisi: ${disposition}. Catatan: ${inspection_notes || '-'}`
    });

    return c.json({ success: true, message: `Pemeriksaan selesai. Disposisi: ${disposition}` });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: 'Gagal memproses pemeriksaan: ' + err.message }, 500);
  } finally {
    client.release();
  }
});

// ═══ 5. STOCK OPNAME (CYCLE COUNT) ═══

// GET /api/stock/opname - List opname sessions
stockRoutes.get('/opname', optionalAuth, async (c) => {
  const warehouse_id = c.req.query('warehouse_id');

  let sql = `
    SELECT s.*, 
           w.name AS warehouse_name,
           COUNT(i.id) AS total_items,
           COUNT(i.id) FILTER (WHERE i.difference_qty != 0) AS discrepancy_items
    FROM stock_opname_sessions s
    JOIN warehouses w ON s.warehouse_id = w.id
    LEFT JOIN stock_opname_items i ON s.id = i.session_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (warehouse_id) {
    params.push(warehouse_id);
    sql += ` AND s.warehouse_id = $${params.length}`;
  }
  sql += ` GROUP BY s.id, w.name ORDER BY s.created_at DESC`;

  const result = await query(sql, params);
  return c.json({ success: true, data: result.rows });
});

// GET /api/stock/opname/:id - Detail opname session with items
stockRoutes.get('/opname/:id', optionalAuth, async (c) => {
  const id = c.req.param('id');
  const sessRes = await query(
    `SELECT s.*, w.name AS warehouse_name FROM stock_opname_sessions s JOIN warehouses w ON s.warehouse_id = w.id WHERE s.id = $1`,
    [id]
  );
  if (sessRes.rows.length === 0) {
    return c.json({ success: false, message: 'Sesi opname tidak ditemukan' }, 404);
  }
  const session = sessRes.rows[0];

  const itemsRes = await query(
    `SELECT i.*, p.sku_code, p.name AS product_name, u.code AS unit,
            loc.zone, loc.aisle, loc.rack, loc.bin
     FROM stock_opname_items i
     JOIN products p ON i.product_id = p.id
     JOIN master_uom u ON i.uom_id = u.id
     LEFT JOIN warehouse_locations loc ON i.location_id = loc.id
     WHERE i.session_id = $1
     ORDER BY p.sku_code ASC`,
    [id]
  );

  session.items = itemsRes.rows;
  return c.json({ success: true, data: session });
});

// POST /api/stock/opname - Start new opname session & snapshot system qty
stockRoutes.post('/opname', optionalAuth, async (c) => {
  const user = c.get('user' as any) as UserTokenPayload | undefined;
  const body = await c.req.json();
  const { warehouse_id, zone, notes, actor_name: bodyActorName } = body;

  if (!warehouse_id) {
    return c.json({ success: false, message: 'Gudang wajib dipilih' }, 400);
  }

  const actor_name = user?.full_name || bodyActorName || 'Petugas Opname';
  const actor_id = user?.id || null;
  const actor_role = user?.role || 'WH_STAFF';

  // Format penomoran berurut: OPNAME + KODE_GUDANG + YYYYMMDD + SEQ (Contoh: OPNAMEWHJKT0120260918001)
  let whCode = 'WH';
  try {
    const whRes = await query(`SELECT code FROM warehouses WHERE id = $1`, [warehouse_id]);
    if (whRes?.rows?.[0]?.code) {
      whCode = whRes.rows[0].code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    }
  } catch {
    whCode = 'WH';
  }
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  let nextSeq = '001';
  try {
    const countRes = await query(
      `SELECT COUNT(*) as count FROM stock_opname_sessions 
       WHERE warehouse_id = $1 AND opname_number LIKE $2`,
      [warehouse_id, `OPNAME${whCode}${dateStr}%`]
    );
    if (countRes?.rows?.[0]?.count != null) {
      nextSeq = String(Number(countRes.rows[0].count) + 1).padStart(3, '0');
    }
  } catch {
    nextSeq = '001';
  }
  let opnameNumber = `OPNAME${whCode}${dateStr}${nextSeq}`;

  // Pastikan unik jika ada collision
  try {
    for (let i = 1; i <= 5; i++) {
      const dup = await query(`SELECT 1 FROM stock_opname_sessions WHERE opname_number = $1`, [opnameNumber]);
      if (!dup?.rows || dup.rows.length === 0) break;
      opnameNumber = `OPNAME${whCode}${dateStr}${String(Number(nextSeq) + i).padStart(3, '0')}`;
    }
  } catch {
    // fallback
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sessRes = await client.query(
      `INSERT INTO stock_opname_sessions (
        id, opname_number, warehouse_id, zone, status, notes,
        created_by_id, created_by_name
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, 'IN_PROGRESS', $4,
        $5, $6
      ) RETURNING *`,
      [opnameNumber, warehouse_id, zone || null, notes || null, actor_id, actor_name]
    );
    const session = sessRes.rows[0];

    // Snapshot current stock levels into session items
    const stockLevels = await client.query(
      `SELECT sl.product_id, sl.qty_on_hand, sl.uom_id 
       FROM stock_levels sl 
       WHERE sl.warehouse_id = $1`,
      [warehouse_id]
    );

    for (const row of stockLevels.rows) {
      await client.query(
        `INSERT INTO stock_opname_items (
          id, session_id, product_id, system_qty, physical_qty, difference_qty,
          uom_id, status, counted_by_id, counted_by_name
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $3, 0,
          $4, 'COUNTED', $5, $6
        )`,
        [session.id, row.product_id, row.qty_on_hand, row.uom_id, actor_id, actor_name]
      );
    }

    await client.query('COMMIT');

    await recordCheckpoint({
      entity_type: 'STOCK_OPNAME',
      entity_id: session.id,
      entity_number: opnameNumber,
      step_code: 'OPNAME_STARTED',
      step_label: 'Sesi Stock Opname Dimulai',
      actor_id,
      actor_name,
      actor_role,
      notes: `Sesi opname ${opnameNumber} dibuat dengan ${stockLevels.rows.length} item tersimpan.`
    });

    return c.json({ success: true, message: `Sesi opname ${opnameNumber} berhasil dibuat`, data: session }, 201);
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: 'Gagal membuat sesi opname: ' + err.message }, 500);
  } finally {
    client.release();
  }
});

// POST /api/stock/opname/:id/count - Update physical count for an item
stockRoutes.post('/opname/:id/count', optionalAuth, async (c) => {
  const id = c.req.param('id');
  const user = c.get('user' as any) as UserTokenPayload | undefined;
  const body = await c.req.json();
  const { item_id, physical_qty, notes, actor_name: bodyActorName } = body;

  if (!item_id || physical_qty === undefined || physical_qty === null) {
    return c.json({ success: false, message: 'Item ID dan jumlah fisik wajib diisi' }, 400);
  }

  const actor_name = user?.full_name || bodyActorName || 'Checker Opname';
  const actor_id = user?.id || null;

  const itemRes = await query(`SELECT * FROM stock_opname_items WHERE id = $1 AND session_id = $2`, [item_id, id]);
  if (itemRes.rows.length === 0) {
    return c.json({ success: false, message: 'Item opname tidak ditemukan' }, 404);
  }
  const item = itemRes.rows[0];

  const physQty = Number(physical_qty);
  const diffQty = physQty - Number(item.system_qty);

  await query(
    `UPDATE stock_opname_items 
     SET physical_qty = $1, difference_qty = $2, notes = $3,
         counted_by_id = $4, counted_by_name = $5
     WHERE id = $6`,
    [physQty, diffQty, notes || null, actor_id, actor_name, item_id]
  );

  return c.json({
    success: true,
    message: 'Hasil hitung fisik berhasil disimpan',
    difference_qty: diffQty
  });
});

// POST /api/stock/opname/:id/reconcile - Reconcile differences into double-entry ledger
stockRoutes.post('/opname/:id/reconcile', optionalAuth, async (c) => {
  const id = c.req.param('id');
  const user = c.get('user' as any) as UserTokenPayload | undefined;
  const body = await c.req.json().catch(() => ({}));

  const sessRes = await query(`SELECT * FROM stock_opname_sessions WHERE id = $1`, [id]);
  if (sessRes.rows.length === 0) {
    return c.json({ success: false, message: 'Sesi opname tidak ditemukan' }, 404);
  }
  const session = sessRes.rows[0];

  if (session.status === 'RECONCILED') {
    return c.json({ success: false, message: 'Sesi opname ini sudah direkonsiliasi' }, 400);
  }

  const actor_name = user?.full_name || body.actor_name || 'Manajer Gudang';
  const actor_id = user?.id || null;
  const actor_role = user?.role || 'WH_MANAGER';

  // Get items with discrepancy
  const diffItems = await query(
    `SELECT i.*, p.sku_code 
     FROM stock_opname_items i
     JOIN products p ON i.product_id = p.id
     WHERE i.session_id = $1 AND i.difference_qty != 0`,
    [id]
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const item of diffItems.rows) {
      await adjustStock({
        warehouse_id: session.warehouse_id,
        product_id: item.product_id,
        movement_type: 'STOCK_OPNAME_RECONCILE',
        reference_type: 'STOCK_OPNAME',
        reference_id: session.opname_number,
        qty_change: Number(item.difference_qty),
        notes: `Rekonsiliasi Opname ${session.opname_number}: Selisih ${item.difference_qty} (${item.notes || 'Penyamaan fisik'})`,
        performed_by_id: actor_id,
        performed_by_name: actor_name,
        txClient: client
      });

      await client.query(`UPDATE stock_opname_items SET status = 'ADJUSTED' WHERE id = $1`, [item.id]);
    }

    await client.query(
      `UPDATE stock_opname_sessions SET status = 'RECONCILED', reconciled_at = now() WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    await recordCheckpoint({
      entity_type: 'STOCK_OPNAME',
      entity_id: id as string,
      entity_number: session.opname_number,
      step_code: 'OPNAME_RECONCILED',
      step_label: 'Rekonsiliasi Buku Besar Stok Opname Selesai',
      actor_id,
      actor_name,
      actor_role,
      notes: `Rekonsiliasi berhasil untuk ${diffItems.rows.length} barang berselisih.`
    });

    return c.json({
      success: true,
      message: `Rekonsiliasi sesi opname ${session.opname_number} berhasil diselesaikan. Buku besar telah diperbarui.`,
      adjusted_items_count: diffItems.rows.length
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: 'Gagal merekonsiliasi opname: ' + err.message }, 500);
  } finally {
    client.release();
  }
});

