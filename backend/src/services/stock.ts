import { query, pool } from '../db.js';

export interface RecordStockMovementParams {
  warehouse_id: string;
  product_id: string;
  movement_type: 
    | 'INBOUND_RECEIVE'
    | 'INBOUND_PUTAWAY'
    | 'CROSS_DOCK_OUT'
    | 'CROSS_DOCK_IN'
    | 'OUTBOUND_PICK'
    | 'OUTBOUND_SHIP'
    | 'ADJUSTMENT'
    | 'TRANSFER';
  reference_type: 'INBOUND_ORDER' | 'CROSS_DOCK_MANIFEST' | 'OUTBOUND_ORDER' | 'STOCK_ADJUSTMENT';
  reference_id: string;
  qty_change: number; // positive or negative
  location_id?: string | null;
  notes?: string;
  performed_by_id?: string | null;
  performed_by_name: string; // Mandatory Petugas Name
}

export async function adjustStock(params: RecordStockMovementParams) {
  if (!params.performed_by_name || params.performed_by_name.trim().length < 2) {
    throw new Error('Nama petugas mutasi stok wajib diisi (Mandatory petugas_name)');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get or create current stock level row
    let stockRes = await client.query(
      `SELECT * FROM stock_levels WHERE warehouse_id = $1 AND product_id = $2 FOR UPDATE`,
      [params.warehouse_id, params.product_id]
    );

    let qtyBefore = 0;
    if (stockRes.rows.length === 0) {
      const initRes = await client.query(
        `INSERT INTO stock_levels (warehouse_id, product_id, qty_on_hand, qty_reserved, qty_in_transit)
         VALUES ($1, $2, 0, 0, 0) RETURNING *`,
        [params.warehouse_id, params.product_id]
      );
      qtyBefore = 0;
    } else {
      qtyBefore = stockRes.rows[0].qty_on_hand;
    }

    const qtyAfter = qtyBefore + params.qty_change;
    if (qtyAfter < 0 && params.movement_type !== 'ADJUSTMENT') {
      throw new Error(`Stok tidak mencukupi untuk SKU ${params.product_id}. Saldo saat ini: ${qtyBefore}, pengurangan: ${Math.abs(params.qty_change)}`);
    }

    // 2. Update stock level depending on movement type
    if (params.movement_type === 'CROSS_DOCK_OUT') {
      await client.query(
        `UPDATE stock_levels 
         SET qty_on_hand = qty_on_hand + $3,
             qty_in_transit = qty_in_transit + $4,
             last_updated = CURRENT_TIMESTAMP
         WHERE warehouse_id = $1 AND product_id = $2`,
        [params.warehouse_id, params.product_id, params.qty_change, Math.abs(params.qty_change)]
      );
    } else if (params.movement_type === 'CROSS_DOCK_IN') {
      await client.query(
        `UPDATE stock_levels 
         SET qty_on_hand = qty_on_hand + $3,
             last_updated = CURRENT_TIMESTAMP
         WHERE warehouse_id = $1 AND product_id = $2`,
        [params.warehouse_id, params.product_id, params.qty_change]
      );
    } else {
      await client.query(
        `UPDATE stock_levels 
         SET qty_on_hand = qty_on_hand + $3,
             last_updated = CURRENT_TIMESTAMP
         WHERE warehouse_id = $1 AND product_id = $2`,
        [params.warehouse_id, params.product_id, params.qty_change]
      );
    }

    // 3. Write immutable log into stock_movements
    const logRes = await client.query(
      `INSERT INTO stock_movements (
        warehouse_id, product_id, movement_type, reference_type, reference_id,
        qty_change, qty_before, qty_after, location_id, notes,
        performed_by_id, performed_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        params.warehouse_id,
        params.product_id,
        params.movement_type,
        params.reference_type,
        params.reference_id,
        params.qty_change,
        qtyBefore,
        qtyAfter,
        params.location_id || null,
        params.notes || null,
        params.performed_by_id || null,
        params.performed_by_name.trim()
      ]
    );

    await client.query('COMMIT');
    return logRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
