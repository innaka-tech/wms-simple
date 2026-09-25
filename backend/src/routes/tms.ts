import { Hono } from 'hono';
import { z } from 'zod';
import { query, pool } from '../db.js';
import { optionalAuth, UserTokenPayload } from '../middlewares/auth.js';
import { generateDocumentNumber } from '../utils/waybill.js';
import { recordCheckpoint } from '../services/checkpoint.js';

export const tmsRoutes = new Hono();

// Helper actor extractor
function getActor(c: any, fallbackName = 'Petugas TMS'): { id: string | null; name: string; role: string } {
  const user = c.get('user') as UserTokenPayload | undefined;
  if (user) {
    return { id: user.id, name: user.full_name || user.username, role: user.role };
  }
  return { id: null, name: fallbackName, role: 'TMS_DISPATCHER' };
}

// 1. GET /available-orders - Outbound orders & manifests ready for trip consolidation
tmsRoutes.get('/available-orders', optionalAuth, async (c) => {
  const warehouseId = c.req.query('warehouse_id');

  let sql = `
    SELECT 
      o.id,
      o.order_number,
      o.warehouse_id,
      w.name AS warehouse_name,
      o.customer_id,
      c.name AS customer_name,
      o.recipient_name,
      o.recipient_phone,
      o.destination_address,
      o.destination_city,
      o.status,
      o.scheduled_ship_date,
      COALESCE(SUM(oi.ordered_qty * p.weight_kg_per_unit), 0) AS total_weight_kg,
      COALESCE(SUM(oi.ordered_qty * p.volume_m3_per_unit), 0) AS total_volume_cbm,
      COUNT(oi.id) AS total_items
    FROM outbound_orders o
    JOIN warehouses w ON o.warehouse_id = w.id
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN outbound_items oi ON o.id = oi.outbound_order_id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE (o.trip_id IS NULL OR o.trip_id = '')
      AND o.status IN ('CREATED', 'CONFIRMED', 'PICKED', 'PACKED')
  `;

  const params: any[] = [];
  if (warehouseId) {
    params.push(warehouseId);
    sql += ` AND o.warehouse_id = $${params.length}`;
  }

  sql += `
    GROUP BY o.id, o.order_number, o.warehouse_id, w.name, o.customer_id, c.name, 
             o.recipient_name, o.recipient_phone, o.destination_address, o.destination_city, 
             o.status, o.scheduled_ship_date
    ORDER BY o.created_at ASC
  `;

  const result = await query(sql, params);
  return c.json({ success: true, data: result.rows });
});

// 2. GET /trips - List all trips with vehicle spec and progress
tmsRoutes.get('/trips', optionalAuth, async (c) => {
  const warehouseId = c.req.query('warehouse_id');
  const status = c.req.query('status');

  let sql = `
    SELECT 
      t.*,
      w.name AS warehouse_name,
      v.plate_number,
      vt.name AS vehicle_type_name,
      vt.max_payload_kg,
      vt.max_volume_cbm,
      COUNT(ts.id) AS total_stops,
      COUNT(ts.id) FILTER (WHERE ts.status = 'DELIVERED') AS delivered_stops
    FROM trips t
    JOIN warehouses w ON t.warehouse_id = w.id
    JOIN vehicles v ON t.vehicle_id = v.id
    JOIN master_vehicle_types vt ON v.vehicle_type_id = vt.id
    LEFT JOIN trip_stops ts ON t.id = ts.trip_id
    WHERE 1=1
  `;

  const params: any[] = [];
  if (warehouseId) {
    params.push(warehouseId);
    sql += ` AND t.warehouse_id = $${params.length}`;
  }
  if (status) {
    params.push(status);
    sql += ` AND t.status = $${params.length}`;
  }

  sql += `
    GROUP BY t.id, w.name, v.plate_number, vt.name, vt.max_payload_kg, vt.max_volume_cbm
    ORDER BY t.created_at DESC
  `;

  const result = await query(sql, params);
  return c.json({ success: true, data: result.rows });
});

// 3. GET /trips/:id - Detail trip along with all stops and delivery status
tmsRoutes.get('/trips/:id', optionalAuth, async (c) => {
  const id = c.req.param('id');

  const tripRes = await query(
    `SELECT 
       t.*,
       w.name AS warehouse_name,
       v.plate_number,
       v.brand,
       v.model,
       vt.name AS vehicle_type_name,
       vt.max_payload_kg,
       vt.max_volume_cbm
     FROM trips t
     JOIN warehouses w ON t.warehouse_id = w.id
     JOIN vehicles v ON t.vehicle_id = v.id
     JOIN master_vehicle_types vt ON v.vehicle_type_id = vt.id
     WHERE t.id = $1`,
    [id]
  );

  if (tripRes.rows.length === 0) {
    return c.json({ success: false, message: 'Trip tidak ditemukan' }, 404);
  }

  const trip = tripRes.rows[0];

  const stopsRes = await query(
    `SELECT * FROM trip_stops WHERE trip_id = $1 ORDER BY stop_sequence ASC`,
    [id]
  );

  trip.stops = stopsRes.rows;
  return c.json({ success: true, data: trip });
});

const createTripSchema = z.object({
  warehouse_id: z.string().min(1, 'Gudang asal wajib dipilih'),
  vehicle_id: z.string().min(1, 'Armada wajib dipilih'),
  driver_name: z.string().min(1, 'Nama driver wajib diisi'),
  driver_id: z.string().optional().nullable(),
  odometer_start: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  stops: z.array(z.object({
    reference_type: z.enum(['OUTBOUND_ORDER', 'CROSS_DOCK_MANIFEST']).default('OUTBOUND_ORDER'),
    reference_id: z.string().min(1),
    reference_number: z.string().min(1),
    recipient_name: z.string().min(1),
    destination_address: z.string().min(1),
    destination_city: z.string().optional().nullable(),
    weight_kg: z.number().min(0).default(0),
    volume_cbm: z.number().min(0).default(0),
    stop_sequence: z.number().int().min(1).optional()
  })).min(1, 'Minimal sertakan 1 titik drop pengiriman')
});

// 4. POST /trips - Plan & create new Trip with Overload Guard
tmsRoutes.post('/trips', optionalAuth, async (c) => {
  const body = await c.req.json();
  const parsed = createTripSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ 
      success: false, 
      message: 'Validasi form gagal', 
      errors: parsed.error.format() 
    }, 400);
  }

  const d = parsed.data;
  const actor = getActor(c, d.driver_name || 'Dispatcher TMS');

  // Verify Vehicle and its specs
  const vehRes = await query(
    `SELECT v.id, v.plate_number, v.status, v.last_odometer_km, vt.name AS type_name, vt.max_payload_kg, vt.max_volume_cbm
     FROM vehicles v
     JOIN master_vehicle_types vt ON v.vehicle_type_id = vt.id
     WHERE v.id = $1`,
    [d.vehicle_id]
  );

  if (vehRes.rows.length === 0) {
    return c.json({ success: false, message: 'Armada tidak ditemukan' }, 404);
  }

  const vehicle = vehRes.rows[0];

  // Calculate totals
  const totalWeightKg = d.stops.reduce((acc, s) => acc + (Number(s.weight_kg) || 0), 0);
  const totalVolumeCbm = d.stops.reduce((acc, s) => acc + (Number(s.volume_cbm) || 0), 0);

  // ═══ OVERLOAD GUARD (ODOL Protection) ═══
  const maxPayload = Number(vehicle.max_payload_kg) || 0;
  const maxVolume = Number(vehicle.max_volume_cbm) || 0;

  if (maxPayload > 0 && totalWeightKg > maxPayload) {
    return c.json({
      success: false,
      code: 'OVERLOAD_PAYLOAD_EXCEEDED',
      message: `Overload Guard Terpicu: Total berat muatan (${totalWeightKg.toLocaleString('id-ID')} kg) melebihi kapasitas muatan ${vehicle.type_name} (${maxPayload.toLocaleString('id-ID')} kg). Kurangi muatan demi keselamatan regulasi jalan raya (ODOL).`
    }, 422);
  }

  if (maxVolume > 0 && totalVolumeCbm > maxVolume) {
    return c.json({
      success: false,
      code: 'OVERLOAD_VOLUME_EXCEEDED',
      message: `Overload Guard Terpicu: Total volume muatan (${totalVolumeCbm.toFixed(2)} CBM) melebihi kapasitas kubikasi ${vehicle.type_name} (${maxVolume.toFixed(2)} CBM).`
    }, 422);
  }

  // Generate Seamless Alphanumeric Trip Number (No hyphens!)
  const tripNumber = generateDocumentNumber('TRIP', 8);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const odoStart = d.odometer_start !== undefined && d.odometer_start !== null 
      ? d.odometer_start 
      : (vehicle.last_odometer_km || 0);

    const tripInsert = await client.query(
      `INSERT INTO trips (
        id, trip_number, warehouse_id, vehicle_id, driver_id, driver_name,
        truck_plate, status, total_weight_kg, total_volume_cbm,
        max_payload_kg, max_volume_cbm, odometer_start, notes,
        created_by_id, created_by_name
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5,
        $6, 'PLANNED', $7, $8,
        $9, $10, $11, $12,
        $13, $14
      ) RETURNING *`,
      [
        tripNumber,
        d.warehouse_id,
        d.vehicle_id,
        d.driver_id || null,
        d.driver_name,
        vehicle.plate_number,
        totalWeightKg,
        totalVolumeCbm,
        maxPayload,
        maxVolume,
        odoStart,
        d.notes || null,
        actor.id,
        actor.name
      ]
    );

    const trip = tripInsert.rows[0];

    // Insert stops and link outbound orders
    for (let i = 0; i < d.stops.length; i++) {
      const stop = d.stops[i]!;
      const seq = stop.stop_sequence || (i + 1);

      await client.query(
        `INSERT INTO trip_stops (
          id, trip_id, stop_sequence, reference_type, reference_id,
          reference_number, recipient_name, destination_address,
          destination_city, weight_kg, volume_cbm, status
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4,
          $5, $6, $7,
          $8, $9, $10, 'PENDING'
        )`,
        [
          trip.id,
          seq,
          stop.reference_type,
          stop.reference_id,
          stop.reference_number,
          stop.recipient_name,
          stop.destination_address,
          stop.destination_city || null,
          stop.weight_kg,
          stop.volume_cbm
        ]
      );

      // Link order if reference_type is OUTBOUND_ORDER
      if (stop.reference_type === 'OUTBOUND_ORDER') {
        await client.query(
          `UPDATE outbound_orders SET trip_id = $1 WHERE id = $2`,
          [trip.id, stop.reference_id]
        );
      }
    }

    await client.query('COMMIT');

    // Immutable Checkpoint Chain
    await recordCheckpoint({
      entity_type: 'TRIP',
      entity_id: trip.id,
      entity_number: tripNumber,
      step_code: 'TRIP_PLANNED',
      step_label: 'Surat Tugas / Rencana Perjalanan TMS Diterbitkan',
      actor_id: actor.id,
      actor_name: actor.name,
      actor_role: actor.role,
      notes: `Trip ${tripNumber} direncanakan untuk armada ${vehicle.plate_number} dengan ${d.stops.length} titik drop. Beban: ${totalWeightKg} kg / ${maxPayload} kg.`
    });

    return c.json({
      success: true,
      message: `Surat Tugas Perjalanan ${tripNumber} berhasil diterbitkan`,
      data: trip
    }, 201);
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: 'Gagal merencanakan trip: ' + err.message }, 500);
  } finally {
    client.release();
  }
});

// 5. POST /trips/:id/dispatch - Dispatch Trip (Armada berangkat)
tmsRoutes.post('/trips/:id/dispatch', optionalAuth, async (c) => {
  const id = c.req.param('id');
  const actor = getActor(c, 'Dispatcher TMS');

  const tripRes = await query(`SELECT * FROM trips WHERE id = $1`, [id]);
  if (tripRes.rows.length === 0) {
    return c.json({ success: false, message: 'Trip tidak ditemukan' }, 404);
  }
  const trip = tripRes.rows[0];

  if (trip.status !== 'PLANNED') {
    return c.json({ success: false, message: `Trip berstatus ${trip.status}, tidak dapat diberangkatkan` }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE trips SET status = 'IN_TRANSIT', departure_time = now(), updated_at = now() WHERE id = $1`,
      [id]
    );

    // Update vehicle to IN_USE
    await client.query(
      `UPDATE vehicles SET status = 'IN_USE', updated_at = now() WHERE id = $1`,
      [trip.vehicle_id]
    );

    // Update associated orders to SHIPPED
    await client.query(
      `UPDATE outbound_orders SET status = 'SHIPPED', shipped_at = now(), updated_at = now() WHERE trip_id = $1`,
      [id]
    );

    await client.query('COMMIT');

    await recordCheckpoint({
      entity_type: 'TRIP',
      entity_id: trip.id,
      entity_number: trip.trip_number,
      step_code: 'TRIP_DEPARTED',
      step_label: 'Armada Berangkat Menuju Titik Pengiriman',
      actor_id: actor.id,
      actor_name: actor.name,
      actor_role: actor.role,
      notes: `Armada ${trip.truck_plate} diberangkatkan oleh driver ${trip.driver_name}.`
    });

    return c.json({ success: true, message: `Trip ${trip.trip_number} telah diberangkatkan (IN_TRANSIT)` });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: 'Gagal memberangkatkan trip: ' + err.message }, 500);
  } finally {
    client.release();
  }
});

// 6. POST /trips/:id/stops/:stopId/complete - Complete a drop stop
tmsRoutes.post('/trips/:id/stops/:stopId/complete', optionalAuth, async (c) => {
  const { id, stopId } = c.req.param();
  const body = await c.req.json().catch(() => ({}));
  const actor = getActor(c, 'Driver/Petugas POD');

  const stopRes = await query(`SELECT * FROM trip_stops WHERE id = $1 AND trip_id = $2`, [stopId, id]);
  if (stopRes.rows.length === 0) {
    return c.json({ success: false, message: 'Titik stop tidak ditemukan' }, 404);
  }
  const stop = stopRes.rows[0];

  const tripRes = await query(`SELECT * FROM trips WHERE id = $1`, [id]);
  const trip = tripRes.rows[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE trip_stops 
       SET status = 'DELIVERED', completed_at = now(), pod_notes = $1 
       WHERE id = $2`,
      [body.pod_notes || 'Serah terima barang selesai', stopId]
    );

    // Update outbound order if applicable
    if (stop.reference_type === 'OUTBOUND_ORDER') {
      await client.query(
        `UPDATE outbound_orders SET status = 'DELIVERED', delivered_at = now(), updated_at = now() WHERE id = $1`,
        [stop.reference_id]
      );
    }

    // Check if all stops are finished
    const remRes = await client.query(
      `SELECT COUNT(*) AS remaining 
       FROM trip_stops 
       WHERE trip_id = $1 AND status NOT IN ('DELIVERED', 'FAILED', 'SKIPPED')`,
      [id]
    );

    const remaining = parseInt(remRes.rows[0]?.remaining || '0');
    let tripCompleted = false;

    if (remaining === 0) {
      tripCompleted = true;
      await client.query(
        `UPDATE trips SET status = 'COMPLETED', completed_time = now(), updated_at = now() WHERE id = $1`,
        [id]
      );
      await client.query(
        `UPDATE vehicles SET status = 'AVAILABLE', updated_at = now() WHERE id = $1`,
        [trip.vehicle_id]
      );
    }

    await client.query('COMMIT');

    await recordCheckpoint({
      entity_type: 'TRIP',
      entity_id: trip.id,
      entity_number: trip.trip_number,
      step_code: tripCompleted ? 'TRIP_ALL_STOPS_COMPLETED' : 'TRIP_STOP_DELIVERED',
      step_label: tripCompleted ? 'Semua Titik Pengiriman Selesai' : `Drop Stop #${stop.stop_sequence} Selesai Diterima`,
      actor_id: actor.id,
      actor_name: actor.name,
      actor_role: actor.role,
      notes: `Stop #${stop.stop_sequence} (${stop.recipient_name} - ${stop.reference_number}) berhasil diserahkan.`
    });

    return c.json({
      success: true,
      message: tripCompleted 
        ? `Seluruh titik pengiriman telah selesai! Trip ${trip.trip_number} ditandai SELESAI.`
        : `Titik pengiriman #${stop.stop_sequence} selesai diverifikasi.`,
      trip_completed: tripCompleted
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: 'Gagal menyelesaikan stop: ' + err.message }, 500);
  } finally {
    client.release();
  }
});
