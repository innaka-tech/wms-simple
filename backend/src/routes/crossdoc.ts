import { Hono } from 'hono';
import { query, pool } from '../db.js';
import { recordCheckpoint } from '../services/checkpoint.js';

export const crossDocRoutes = new Hono();

// 1. List Cross Documents
crossDocRoutes.get('/', async (c) => {
  const result = await query(`
    SELECT cd.*, 
           w.name AS warehouse_name, 
           cust.name AS customer_name,
           sdt.name AS source_doc_type_name,
           tdt.name AS target_doc_type_name
    FROM cross_documents cd
    JOIN warehouses w ON cd.warehouse_id = w.id
    JOIN customers cust ON cd.customer_id = cust.id
    JOIN master_document_types sdt ON cd.source_document_type_id = sdt.id
    JOIN master_document_types tdt ON cd.target_document_type_id = tdt.id
    ORDER BY cd.created_at DESC
  `);
  return c.json({ success: true, data: result.rows });
});

// 2. Get Cross Document Detail + Items + Checkpoints
crossDocRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const docRes = await query(
    `SELECT cd.*, 
            w.name AS warehouse_name, 
            cust.name AS customer_name,
            sdt.name AS source_doc_type_name,
            tdt.name AS target_doc_type_name
     FROM cross_documents cd
     JOIN warehouses w ON cd.warehouse_id = w.id
     JOIN customers cust ON cd.customer_id = cust.id
     JOIN master_document_types sdt ON cd.source_document_type_id = sdt.id
     JOIN master_document_types tdt ON cd.target_document_type_id = tdt.id
     WHERE cd.id = $1`,
    [id]
  );

  if (docRes.rows.length === 0) {
    return c.json({ success: false, message: 'Cross document tidak ditemukan' }, 404);
  }

  const itemsRes = await query(
    `SELECT cdi.*, p.sku_code, p.name AS product_name, u.code AS uom_code
     FROM cross_document_items cdi
     JOIN products p ON cdi.product_id = p.id
     JOIN master_uom u ON cdi.uom_id = u.id
     WHERE cdi.cross_doc_id = $1`,
    [id]
  );

  const checkpointsRes = await query(
    `SELECT * FROM checkpoint_logs
     WHERE entity_type = 'CROSS_DOCUMENT' AND entity_id = $1
     ORDER BY created_at ASC`,
    [id]
  );

  return c.json({
    success: true,
    data: {
      ...docRes.rows[0],
      items: itemsRes.rows,
      checkpoints: checkpointsRes.rows
    }
  });
});

// 3. Issue / Re-issue Cross Document (Surat Jalan Swap / Sub-AWB Creation)
crossDocRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const {
    warehouse_id,
    customer_id,
    cross_doc_type, // SURAT_JALAN_SWAP, AWB_REISSUE, DECONSOLIDATION_SUB_SJ
    reason, // BLIND_SHIPPING, ROUTE_RE_DISPATCH, SUB_DISTRIBUTION
    source_document_type_id,
    source_document_number,
    source_sender_name,
    target_document_type_id,
    target_document_number,
    target_recipient_name,
    target_destination_address,
    items,
    notes,
    actor_name,
    actor_id
  } = body;

  if (!source_document_number || !target_document_number || !items || items.length === 0) {
    return c.json({ success: false, message: 'Nomor dokumen asal, nomor dokumen target, dan daftar item wajib diisi' }, 400);
  }
  if (!actor_name) {
    return c.json({ success: false, message: 'Nama petugas penerbit Cross-Doc wajib diisi' }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const crossDocNumber = `XDOC-${Date.now().toString().slice(-8)}`;

    const insertRes = await client.query(
      `INSERT INTO cross_documents (
        cross_doc_number, warehouse_id, customer_id, cross_doc_type, reason,
        source_document_type_id, source_document_number, source_sender_name,
        target_document_type_id, target_document_number, target_recipient_name,
        target_destination_address, status, issued_by_id, issued_by_name, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ISSUED', $13, $14, $15)
      RETURNING *`,
      [
        crossDocNumber, warehouse_id, customer_id, cross_doc_type || 'SURAT_JALAN_SWAP',
        reason || 'BLIND_SHIPPING', source_document_type_id, source_document_number,
        source_sender_name, target_document_type_id, target_document_number,
        target_recipient_name, target_destination_address,
        actor_id || null, actor_name.trim(), notes || null
      ]
    );
    const crossDoc = insertRes.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO cross_document_items (cross_doc_id, product_id, original_qty, reissued_qty, uom_id, remarks)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crossDoc.id, item.product_id, item.original_qty, item.reissued_qty, item.uom_id, item.remarks || null]
      );
    }

    await client.query('COMMIT');

    // Record Checkpoint
    await recordCheckpoint({
      entity_type: 'CROSS_DOCUMENT',
      entity_id: crossDoc.id,
      entity_number: crossDoc.cross_doc_number,
      step_code: 'CROSS_DOC_ISSUED',
      step_label: 'Dokumen Logistik Diterbitkan Ulang (Cross-Doc Swap)',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: 'ADMIN_ADM',
      notes: `Swap Dokumen: Asal (${source_document_number}) -> Baru (${target_document_number}). Alasan: ${reason}`
    });

    return c.json({ success: true, data: crossDoc }, 201);
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});
