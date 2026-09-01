import { Hono } from 'hono';
import { query } from '../db.js';

export const weighbridgeRoutes = new Hono();

// 1. List Weighbridge Tickets
weighbridgeRoutes.get('/', async (c) => {
  const result = await query(`
    SELECT wb.*, w.name AS warehouse_name
    FROM weighbridge_logs wb
    JOIN warehouses w ON wb.warehouse_id = w.id
    ORDER BY wb.created_at DESC
  `);
  return c.json({ success: true, data: result.rows });
});

// 2. Submit Weighbridge Ticket (Gross & Tare Weight)
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
      ticket_number, warehouse_id, vehicle_id, truck_plate, driver_name,
      reference_type, reference_id, first_weight_gross_kg, second_weight_tare_kg,
      weighbridge_operator, photo_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
