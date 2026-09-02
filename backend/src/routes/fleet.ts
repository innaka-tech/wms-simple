import { Hono } from 'hono';
import { query, pool } from '../db.js';
import { recordCheckpoint } from '../services/checkpoint.js';
import { optionalAuth, UserTokenPayload } from '../middlewares/auth.js';

export const fleetRoutes = new Hono();

// 1. List Vehicles Master
fleetRoutes.get('/vehicles', async (c) => {
  const result = await query(`
    SELECT v.*, u.full_name AS driver_name, w.name AS assigned_warehouse_name
    FROM vehicles v
    LEFT JOIN users u ON v.current_driver_id = u.id
    LEFT JOIN warehouses w ON v.assigned_warehouse_id = w.id
    ORDER BY v.plate_number ASC
  `);
  return c.json({ success: true, data: result.rows });
});

// 2. List Fleet Exit Logs (Pencatatan Armada Keluar-Masuk)
fleetRoutes.get('/logs', async (c) => {
  const status = c.req.query('status');
  const warehouse_id = c.req.query('warehouse_id');

  let sql = `
    SELECT fel.*, 
           v.plate_number, v.type AS vehicle_type,
           w.name AS warehouse_name
    FROM fleet_exit_logs fel
    JOIN vehicles v ON fel.vehicle_id = v.id
    JOIN warehouses w ON fel.warehouse_id = w.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (status) {
    params.push(status);
    sql += ` AND fel.status = $${params.length}`;
  }
  if (warehouse_id) {
    params.push(warehouse_id);
    sql += ` AND fel.warehouse_id = $${params.length}`;
  }
  sql += ` ORDER BY fel.departure_time DESC`;

  const result = await query(sql, params);
  return c.json({ success: true, data: result.rows });
});

// 3. Get Fleet Exit Log Detail + Checkpoints
fleetRoutes.get('/logs/:id', async (c) => {
  const id = c.req.param('id');
  const logRes = await query(
    `SELECT fel.*, 
            v.plate_number, v.type AS vehicle_type, v.brand, v.model,
            w.name AS warehouse_name
     FROM fleet_exit_logs fel
     JOIN vehicles v ON fel.vehicle_id = v.id
     JOIN warehouses w ON fel.warehouse_id = w.id
     WHERE fel.id = $1`,
    [id]
  );

  if (logRes.rows.length === 0) {
    return c.json({ success: false, message: 'Log gate pass not found' }, 404);
  }

  const checkpointsRes = await query(
    `SELECT * FROM checkpoint_logs
     WHERE entity_type = 'FLEET_EXIT_LOG' AND entity_id = $1
     ORDER BY created_at ASC`,
    [id]
  );

  return c.json({
    success: true,
    data: {
      ...logRes.rows[0],
      checkpoints: checkpointsRes.rows
    }
  });
});

// 4. Record Fleet Departure (Pencatatan Armada Keluar Pos Satpam)
fleetRoutes.post('/departure', optionalAuth, async (c) => {
  const user = c.get('user' as any) as UserTokenPayload | undefined;
  const body = await c.req.json();
  const {
    vehicle_id,
    driver_id,
    driver_name,
    warehouse_id,
    purpose,
    reference_type,
    reference_id,
    reference_number,
    expected_return_time,
    odometer_out,
    fuel_level_out,
    departure_security_officer: bodySecurityOfficer,
    departure_photo_url,
    departure_notes,
    actor_name: bodyActorName,
    actor_id: bodyActorId
  } = body;

  const departure_security_officer = user?.full_name || bodySecurityOfficer || bodyActorName;
  const actor_name = user?.full_name || bodyActorName || departure_security_officer;
  const actor_id = user?.id || bodyActorId;
  const actor_role = user?.role || 'GATE_OFFICER';

  if (!vehicle_id || !driver_name || !odometer_out || !departure_security_officer) {
    return c.json({ 
      success: false, 
      message: 'Kendaraan, nama driver, kilometer awal (odometer), dan nama petugas satpam wajib diisi' 
    }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check vehicle availability
    const vehRes = await client.query(`SELECT * FROM vehicles WHERE id = $1 FOR UPDATE`, [vehicle_id]);
    if (vehRes.rows.length === 0) {
      throw new Error('Kendaraan tidak ditemukan');
    }
    if (vehRes.rows[0].status === 'IN_USE') {
      throw new Error(`Kendaraan plat ${vehRes.rows[0].plate_number} sedang berstatus IN_USE (belum tercatat kembali)`);
    }

    const logNumber = `GATE-OUT-${Date.now().toString().slice(-8)}`;

    // 2. Insert Fleet Exit Log
    const insertRes = await client.query(
      `INSERT INTO fleet_exit_logs (
        log_number, vehicle_id, driver_id, driver_name, warehouse_id,
        purpose, reference_type, reference_id, reference_number,
        expected_return_time, odometer_out, fuel_level_out,
        departure_security_officer, departure_photo_url, departure_notes,
        status, approved_by_id, approved_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'DEPARTED', $16, $17)
      RETURNING *`,
      [
        logNumber, vehicle_id, driver_id || null, driver_name.trim(), warehouse_id,
        purpose || 'OUTBOUND_DELIVERY', reference_type || 'NONE', reference_id || null, reference_number || null,
        expected_return_time || null, odometer_out, fuel_level_out || 'FULL',
        departure_security_officer.trim(), departure_photo_url || null, departure_notes || null,
        actor_id || null, actor_name.trim()
      ]
    );
    const exitLog = insertRes.rows[0];

    // 3. Update Vehicle Status to IN_USE and Last Odometer
    await client.query(
      `UPDATE vehicles 
       SET status = 'IN_USE',
           last_odometer_km = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [vehicle_id, odometer_out]
    );

    // 4. If linked to manifest or outbound, update status
    if (reference_type === 'CROSS_DOCK_MANIFEST' && reference_id) {
      await client.query(
        `UPDATE cross_dock_manifests 
         SET status = 'IN_TRANSIT', actual_departure = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [reference_id]
      );
    } else if (reference_type === 'OUTBOUND_ORDER' && reference_id) {
      await client.query(
        `UPDATE outbound_orders 
         SET status = 'SHIPPED', shipped_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [reference_id]
      );
    }

    await client.query('COMMIT');

    // Record Checkpoint
    await recordCheckpoint({
      entity_type: 'FLEET_EXIT_LOG',
      entity_id: exitLog.id,
      entity_number: exitLog.log_number,
      step_code: 'FLEET_DEPARTED',
      step_label: 'Pemeriksaan Pos Satpam (Gate-Out Selesai)',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: actor_role,
      notes: departure_notes || `Armada keluar dikendarai ${driver_name}. Odometer: ${odometer_out} km, BBM: ${fuel_level_out || 'FULL'}`,
      photo_urls: departure_photo_url ? [departure_photo_url] : []
    });

    return c.json({ success: true, data: exitLog }, 201);
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});

// 5. Record Fleet Return (Pencatatan Armada Kembali / Gate-In Pos Satpam)
fleetRoutes.post('/logs/:id/return', optionalAuth, async (c) => {
  const user = c.get('user' as any) as UserTokenPayload | undefined;
  const id = c.req.param('id');
  const body = await c.req.json();
  const {
    odometer_in,
    fuel_level_in,
    return_security_officer: bodySecurityOfficer,
    return_photo_url,
    return_notes,
    actor_name: bodyActorName,
    actor_id: bodyActorId
  } = body;

  const return_security_officer = (user?.full_name || bodySecurityOfficer || bodyActorName || '').trim();
  const actor_name = user?.full_name || bodyActorName || return_security_officer || 'Petugas Satpam';
  const actor_id = user?.id || bodyActorId;
  const actor_role = user?.role || 'GATE_OFFICER';

  if (!odometer_in || !return_security_officer) {
    return c.json({ 
      success: false, 
      message: 'Kilometer kembali (odometer in) dan nama petugas satpam pemeriksa wajib diisi' 
    }, 400);
  }

  const logRes = await query(`SELECT * FROM fleet_exit_logs WHERE id = $1`, [id]);
  if (logRes.rows.length === 0) {
    return c.json({ success: false, message: 'Log gate pass tidak ditemukan' }, 404);
  }
  const exitLog = logRes.rows[0];

  if (parseFloat(odometer_in) < parseFloat(exitLog.odometer_out)) {
    return c.json({ 
      success: false, 
      message: `Kilometer masuk (${odometer_in}) tidak boleh lebih kecil dari kilometer keluar (${exitLog.odometer_out})` 
    }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update Fleet Exit Log to RETURNED
    const updateRes = await client.query(
      `UPDATE fleet_exit_logs 
       SET status = 'RETURNED',
           actual_return_time = CURRENT_TIMESTAMP,
           odometer_in = $2,
           fuel_level_in = $3,
           return_security_officer = $4,
           return_photo_url = $5,
           return_notes = $6
       WHERE id = $1
       RETURNING *`,
      [
        id, 
        odometer_in, 
        fuel_level_in || 'FULL', 
        return_security_officer, 
        return_photo_url || null, 
        return_notes || null
      ]
    );
    const updatedLog = updateRes.rows[0];

    // 2. Set vehicle status back to AVAILABLE
    await client.query(`UPDATE vehicles SET status = 'AVAILABLE' WHERE id = $1`, [exitLog.vehicle_id]);

    await client.query('COMMIT');

    const distance = parseFloat(odometer_in) - parseFloat(exitLog.odometer_out);

    // Record Checkpoint (Gate Return)
    await recordCheckpoint({
      entity_type: 'FLEET_EXIT_LOG',
      entity_id: id as string,
      entity_number: exitLog.log_number,
      step_code: 'FLEET_RETURNED',
      step_label: 'Pemeriksaan Pos Satpam (Gate-In Selesai)',
      actor_id: actor_id || null,
      actor_name: return_security_officer,
      actor_role: actor_role,
      notes: `Armada kembali. Total Jarak: ${distance.toFixed(1)} km, BBM: ${fuel_level_in || 'FULL'}. Petugas: ${return_security_officer}`,
      photo_urls: return_photo_url ? [return_photo_url] : []
    });

    return c.json({ 
      success: true, 
      message: 'Fleet return logged successfully', 
      data: updatedLog 
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});
