import { Hono } from 'hono';
import { query } from '../db.js';

/**
 * Weighbridge (Jembatan Timbang) — DEPRECATED untuk alur umum sejak docs/09 v3.2.0.
 *
 * Flow v3.2.0 menghapus tahap "timbang truk" dari rantai utama Inbound/Outbound.
 * Modul ini dipertahankan NOLAKTIF (read-only list + pencatatan manual) untuk
 * kebutuhan kargo Curah/Bulky (docs/02 masih merujuk jembatan timbang) dan audit
 * historis. TIDAK terhubung ke UI — pemakaian hanya via API oleh petugas timbang.
 *
 * Jangan tambahkan endpoint baru di sini tanpa keputusan arsitektur terkait.
 */
export const weighbridgeRoutes = new Hono();

// 1. List Weighbridge Tickets (read-only)
weighbridgeRoutes.get('/', async (c) => {
  const result = await query(`
    SELECT wb.*, w.name AS warehouse_name
    FROM weighbridge_logs wb
    JOIN warehouses w ON wb.warehouse_id = w.id
    ORDER BY wb.created_at DESC
  `);
  return c.json({ success: true, data: result.rows });
});

// 2. Submit Weighbridge Ticket (Gross & Tare Weight) — pencatatan manual kargo curah/bulky
weighbridgeRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const {
    warehouse_id,
    vehicle_id,
    truck_plate,
    driver_name,
    reference_type, // INBOUND_ORDER, OUTBOUND_ORDER, CROSS_DOCK_MANIFEST
    reference_id,
    first_weight_gross_kg,
    second_weight_tare_kg,
    weighbridge_operator,
    photo_url
  } = body;

  if (!truck_plate || !first_weight_gross_kg || !weighbridge_operator) {
    return c.json({ success: false, message: 'Nomor plat truk, berat kotor (gross), dan nama operator timbangan wajib diisi' }, 400);
  }

  const ticketNumber = `WB-${Date.now().toString().slice(-8)}`;

  const result = await query(
    `INSERT INTO weighbridge_logs (
      id, ticket_number, warehouse_id, vehicle_id, truck_plate, driver_name,
      reference_type, reference_id, first_weight_gross_kg, second_weight_tare_kg,
      weighbridge_operator, photo_url
    ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      ticketNumber, warehouse_id, vehicle_id || null, truck_plate.trim(),
      driver_name || null, reference_type || 'INBOUND_ORDER', reference_id,
      first_weight_gross_kg, second_weight_tare_kg || null,
      weighbridge_operator.trim(), photo_url || null
    ]
  );

  return c.json({ success: true, data: result.rows[0] }, 201);
});
