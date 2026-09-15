import { Hono } from 'hono';
import { query } from '../db.js';
import { generateDocumentNumber } from '../utils/waybill.js';

export const weighbridgeRoutes = new Hono();

// 1. List Weighbridge Tickets with optional status & warehouse filter
weighbridgeRoutes.get('/', async (c) => {
  const warehouseId = c.req.query('warehouse_id');
  const status = c.req.query('status'); // 'OPEN' or 'COMPLETED'

  let sql = `
    SELECT wb.*, w.name AS warehouse_name, v.plate_number AS vehicle_plate
    FROM weighbridge_logs wb
    JOIN warehouses w ON wb.warehouse_id = w.id
    LEFT JOIN vehicles v ON wb.vehicle_id = v.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (warehouseId) {
    params.push(warehouseId);
    sql += ` AND wb.warehouse_id = $${params.length}`;
  }

  if (status === 'OPEN') {
    sql += ` AND wb.second_weight_tare_kg IS NULL`;
  } else if (status === 'COMPLETED') {
    sql += ` AND wb.second_weight_tare_kg IS NOT NULL`;
  }

  sql += ` ORDER BY wb.created_at DESC`;

  const result = await query(sql, params);
  return c.json({ success: true, data: result.rows });
});

// 2. Get Single Weighbridge Ticket Detail
weighbridgeRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await query(
    `SELECT wb.*, w.name AS warehouse_name, v.plate_number AS vehicle_plate
     FROM weighbridge_logs wb
     JOIN warehouses w ON wb.warehouse_id = w.id
     LEFT JOIN vehicles v ON wb.vehicle_id = v.id
     WHERE wb.id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    return c.json({ success: false, message: 'Tiket jembatan timbang tidak ditemukan' }, 404);
  }
  return c.json({ success: true, data: result.rows[0] });
});

// 3. Submit Initial Weighbridge Ticket (First Weight / Gross)
weighbridgeRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const {
    warehouse_id,
    vehicle_id,
    truck_plate,
    driver_name,
    reference_type, // INBOUND_ORDER, OUTBOUND_ORDER, CROSS_DOCK_MANIFEST, VENDOR_TRUCK
    reference_id,
    first_weight_gross_kg,
    second_weight_tare_kg,
    weighbridge_operator,
    photo_url
  } = body;

  if (!warehouse_id || !truck_plate || !first_weight_gross_kg || !weighbridge_operator) {
    return c.json({ success: false, message: 'Gudang, nomor plat truk, berat pertama (gross), dan nama operator timbangan wajib diisi' }, 400);
  }

  const gross = Number(first_weight_gross_kg);
  if (isNaN(gross) || gross <= 0) {
    return c.json({ success: false, message: 'Berat pertama (gross) harus berupa angka positif' }, 400);
  }

  const tare = second_weight_tare_kg ? Number(second_weight_tare_kg) : null;
  const netCargo = tare !== null && !isNaN(tare) ? Math.abs(gross - tare) : null;

  const ticketNumber = generateDocumentNumber('WB', 8);

  const result = await query(
    `INSERT INTO weighbridge_logs (
      id, ticket_number, warehouse_id, vehicle_id, truck_plate, driver_name,
      reference_type, reference_id, first_weight_gross_kg, second_weight_tare_kg,
      net_weight_cargo_kg, weighbridge_operator, photo_url
    ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      ticketNumber,
      warehouse_id,
      vehicle_id || null,
      truck_plate.trim().toUpperCase(),
      driver_name?.trim() || null,
      reference_type || 'INBOUND_ORDER',
      reference_id || 'GENERAL',
      gross,
      tare,
      netCargo,
      weighbridge_operator.trim(),
      photo_url || null
    ]
  );

  return c.json({ success: true, data: result.rows[0], message: `Tiket ${ticketNumber} berhasil dibuat` }, 201);
});

// 4. Record Second Weight (Tare / Outbound Empty) & Calculate Net Weight Cargo
weighbridgeRoutes.put('/:id/second-weight', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { second_weight_tare_kg, weighbridge_operator, photo_url } = body;

  const tare = Number(second_weight_tare_kg);
  if (isNaN(tare) || tare <= 0) {
    return c.json({ success: false, message: 'Berat kedua (tare) harus berupa angka positif' }, 400);
  }

  const check = await query(`SELECT * FROM weighbridge_logs WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    return c.json({ success: false, message: 'Tiket jembatan timbang tidak ditemukan' }, 404);
  }

  const currentTicket = check.rows[0];
  if (currentTicket.second_weight_tare_kg !== null) {
    return c.json({ success: false, message: 'Penimbangan kedua sudah tercatat untuk tiket ini' }, 409);
  }

  const gross = Number(currentTicket.first_weight_gross_kg);
  const netCargo = Math.abs(gross - tare);

  const operator = weighbridge_operator?.trim() || currentTicket.weighbridge_operator;

  const updateRes = await query(
    `UPDATE weighbridge_logs
     SET second_weight_tare_kg = $1,
         net_weight_cargo_kg = $2,
         weighbridge_operator = $3,
         photo_url = COALESCE($4, photo_url)
     WHERE id = $5
     RETURNING *`,
    [tare, netCargo, operator, photo_url || null, id]
  );

  return c.json({
    success: true,
    data: updateRes.rows[0],
    message: `Timbang kedua selesai. Muatan bersih (Net Cargo): ${netCargo.toLocaleString()} KG`
  });
});

