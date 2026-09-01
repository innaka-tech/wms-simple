import { Hono } from 'hono';
import { query, pool } from '../db.js';
import { recordCheckpoint } from '../services/checkpoint.js';
import { adjustStock } from '../services/stock.js';

export const debulkingRoutes = new Hono();

// 1. List De-bulking & Conversion Work Orders
debulkingRoutes.get('/', async (c) => {
  const warehouse_id = c.req.query('warehouse_id');
  let sql = `
    SELECT sc.*, w.name AS warehouse_name
    FROM stock_conversions sc
    JOIN warehouses w ON sc.warehouse_id = w.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (warehouse_id) {
    params.push(warehouse_id);
    sql += ` AND sc.warehouse_id = $${params.length}`;
  }
  sql += ` ORDER BY sc.created_at DESC`;

  const result = await query(sql, params);
  return c.json({ success: true, data: result.rows });
});

// 2. Get De-bulking Work Order Detail (Inputs, Outputs, Shrinkage)
debulkingRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const convRes = await query(
    `SELECT sc.*, w.name AS warehouse_name
     FROM stock_conversions sc
     JOIN warehouses w ON sc.warehouse_id = w.id
     WHERE sc.id = $1`,
    [id]
  );

  if (convRes.rows.length === 0) {
    return c.json({ success: false, message: 'Work order de-bulking tidak ditemukan' }, 404);
  }

  const inRes = await query(
    `SELECT sci.*, p.sku_code, p.name AS product_name, u.code AS uom_code
     FROM stock_conversion_items_in sci
     JOIN products p ON sci.product_id = p.id
     JOIN master_uom u ON sci.uom_id = u.id
     WHERE sci.conversion_id = $1`,
    [id]
  );

  const outRes = await query(
    `SELECT sco.*, p.sku_code, p.name AS product_name, u.code AS uom_code
     FROM stock_conversion_items_out sco
     JOIN products p ON sco.product_id = p.id
     JOIN master_uom u ON sco.uom_id = u.id
     WHERE sco.conversion_id = $1`,
    [id]
  );

  const checkpointsRes = await query(
    `SELECT * FROM checkpoint_logs
     WHERE entity_type = 'STOCK_CONVERSION' AND entity_id = $1
     ORDER BY created_at ASC`,
    [id]
  );

  return c.json({
    success: true,
    data: {
      ...convRes.rows[0],
      inputs: inRes.rows,
      outputs: outRes.rows,
      checkpoints: checkpointsRes.rows
    }
  });
});

// 3. Create & Execute De-bulking Work Order (Bulky -> Curah / Bagging)
debulkingRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const {
    warehouse_id,
    conversion_type, // BULKY_TO_BULK_DRY, BULKY_TO_PACKAGED, TANK_DECANTING
    inputs, // [{ product_id, qty_used, uom_id, weight_kg, location_id }]
    outputs, // [{ product_id, qty_produced, uom_id, weight_kg, destination_location_id }]
    allowable_shrinkage_percentage,
    notes,
    actor_name,
    actor_id
  } = body;

  if (!inputs || !outputs || inputs.length === 0 || outputs.length === 0) {
    return c.json({ success: false, message: 'Input bulky dan output curah wajib diisi' }, 400);
  }
  if (!actor_name) {
    return c.json({ success: false, message: 'Nama petugas pengawas de-bulking wajib diisi' }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const conversionNumber = `DEBULK-${Date.now().toString().slice(-8)}`;
    const totalInWeight = inputs.reduce((sum: number, item: any) => sum + parseFloat(item.weight_kg), 0);
    const totalOutWeight = outputs.reduce((sum: number, item: any) => sum + parseFloat(item.weight_kg), 0);
    const shrinkageLossKg = totalInWeight - totalOutWeight;
    const shrinkagePct = totalInWeight > 0 ? (shrinkageLossKg / totalInWeight) * 100 : 0;

    const convRes = await client.query(
      `INSERT INTO stock_conversions (
        conversion_number, warehouse_id, conversion_type, status, started_at, completed_at,
        total_input_weight_kg, total_output_weight_kg, shrinkage_percentage,
        allowable_shrinkage_percentage, notes, supervised_by_id, supervised_by_name
      ) VALUES ($1, $2, $3, 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        conversionNumber, warehouse_id, conversion_type || 'DEBULKING_BREAKDOWN',
        totalInWeight, totalOutWeight, shrinkagePct.toFixed(2),
        allowable_shrinkage_percentage || 1.0, notes || null,
        actor_id || null, actor_name.trim()
      ]
    );
    const conv = convRes.rows[0];

    // 1. Process Bulky Inputs (Deduct from Stock)
    for (const inItem of inputs) {
      await client.query(
        `INSERT INTO stock_conversion_items_in (conversion_id, product_id, location_id, qty_used, uom_id, weight_kg)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [conv.id, inItem.product_id, inItem.location_id || null, inItem.qty_used, inItem.uom_id, inItem.weight_kg]
      );

      await adjustStock({
        warehouse_id,
        product_id: inItem.product_id,
        movement_type: 'DEBULKING_INPUT',
        reference_type: 'STOCK_CONVERSION',
        reference_id: conv.id,
        qty_change: -parseFloat(inItem.qty_used),
        location_id: inItem.location_id || null,
        notes: `Input De-bulking ${conv.conversion_number}`,
        performed_by_id: actor_id || null,
        performed_by_name: actor_name
      });
    }

    // 2. Process Curah / Child Outputs (Add to Stock)
    for (const outItem of outputs) {
      await client.query(
        `INSERT INTO stock_conversion_items_out (conversion_id, product_id, destination_location_id, qty_produced, uom_id, weight_kg)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [conv.id, outItem.product_id, outItem.destination_location_id || null, outItem.qty_produced, outItem.uom_id, outItem.weight_kg]
      );

      await adjustStock({
        warehouse_id,
        product_id: outItem.product_id,
        movement_type: 'DEBULKING_OUTPUT',
        reference_type: 'STOCK_CONVERSION',
        reference_id: conv.id,
        qty_change: parseFloat(outItem.qty_produced),
        location_id: outItem.destination_location_id || null,
        notes: `Output Hasil De-bulking ${conv.conversion_number}`,
        performed_by_id: actor_id || null,
        performed_by_name: actor_name
      });
    }

    // 3. If shrinkage exceeds allowable, create alert
    if (shrinkagePct > (allowable_shrinkage_percentage || 1.0)) {
      await client.query(
        `INSERT INTO alerts (alert_type, entity_type, entity_id, warehouse_id, title, message, severity)
         VALUES ('DEBULKING_SHRINKAGE_HIGH', 'STOCK_CONVERSION', $1, $2, 'Susut De-bulking Melebihi Toleransi', $3, 'WARNING')`,
        [
          conv.id, warehouse_id,
          `De-bulking ${conv.conversion_number} mengalami susut ${shrinkagePct.toFixed(2)}% (${shrinkageLossKg.toFixed(1)} kg), di atas batas ${allowable_shrinkage_percentage || 1.0}%.`
        ]
      );
    }

    await client.query('COMMIT');

    // Record Checkpoint
    await recordCheckpoint({
      entity_type: 'STOCK_CONVERSION',
      entity_id: conv.id,
      entity_number: conv.conversion_number,
      step_code: 'DEBULKING_COMPLETED',
      step_label: 'Proses De-bulking / Pencurahan Barang Bulky Selesai',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: 'WH_STAFF',
      notes: `Total Input: ${totalInWeight} kg, Output: ${totalOutWeight} kg, Susut: ${shrinkageLossKg.toFixed(1)} kg (${shrinkagePct.toFixed(2)}%)`
    });

    return c.json({ success: true, message: 'De-bulking completed successfully', data: conv }, 201);
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});
