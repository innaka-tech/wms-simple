import { Hono } from 'hono';
import { z } from 'zod';
import { query, pool } from '../db.js';
import { recordCheckpoint } from '../services/checkpoint.js';
import { optionalAuth, authenticate, requireRole, UserTokenPayload } from '../middlewares/auth.js';
import { generateDocumentNumber } from '../utils/waybill.js';
import { AppError } from '../utils/errors.js';

export const fleetRoutes = new Hono();

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN_ADM'];

const VEHICLE_STATUSES = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED'] as const;

const createVehicleSchema = z.object({
  plate_number: z.string().trim().min(4).max(16).toUpperCase(),
  vehicle_type_id: z.string().uuid(),
  brand: z.string().trim().max(60).nullish(),
  model: z.string().trim().max(60).nullish(),
  year_made: z.number().int().min(1980).max(2100).nullish(),
  current_driver_id: z.string().uuid().nullish(),
  assigned_warehouse_id: z.string().uuid().nullish(),
  kir_expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'format YYYY-MM-DD').nullish(),
  stnk_expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'format YYYY-MM-DD').nullish(),
  gps_tracking_id: z.string().trim().max(64).nullish(),
  last_odometer_km: z.number().nonnegative().max(3000000).default(0)
});

const updateVehicleSchema = createVehicleSchema.partial().extend({
  status: z.enum(VEHICLE_STATUSES).optional(),
  is_active: z.boolean().optional()
});

// 1. List Vehicles Master
fleetRoutes.get('/vehicles', async (c) => {
  const includeInactive = c.req.query('include_inactive') === 'true';
  const result = await query(`
    SELECT v.*, u.full_name AS driver_name, w.name AS assigned_warehouse_name,
           vt.name AS vehicle_type_name, vt.code AS vehicle_type_code
    FROM vehicles v
    LEFT JOIN users u ON v.current_driver_id = u.id
    LEFT JOIN warehouses w ON v.assigned_warehouse_id = w.id
    LEFT JOIN master_vehicle_types vt ON v.vehicle_type_id = vt.id
    ${includeInactive ? '' : 'WHERE v.is_active = true'}
    ORDER BY v.plate_number ASC
  `);
  return c.json({ success: true, data: result.rows });
});

// 1b. Create pool vehicle (admin only)
fleetRoutes.post('/vehicles', authenticate, requireRole(ADMIN_ROLES), async (c) => {
  const user = c.get('user' as any) as UserTokenPayload;
  const parsed = createVehicleSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ success: false, message: 'Data kendaraan tidak valid', details: parsed.error.flatten().fieldErrors }, 400);
  }
  const d = parsed.data;

  const dupRes = await query(`SELECT id FROM vehicles WHERE plate_number = $1 LIMIT 1`, [d.plate_number]);
  if (dupRes.rows.length > 0) {
    return c.json({ success: false, message: `Nomor polisi '${d.plate_number}' sudah terdaftar` }, 409);
  }

  const typeRes = await query(`SELECT id, name FROM master_vehicle_types WHERE id = $1`, [d.vehicle_type_id]);
  if (typeRes.rows.length === 0) {
    return c.json({ success: false, message: 'Tipe kendaraan tidak dikenal' }, 400);
  }

  if (d.current_driver_id) {
    const drvRes = await query(`SELECT id, full_name, role FROM users WHERE id = $1 AND is_active = true`, [d.current_driver_id]);
    if (drvRes.rows.length === 0) {
      return c.json({ success: false, message: 'Pengemudi tidak ditemukan / tidak aktif' }, 400);
    }
  }

  const result = await query(
    `INSERT INTO vehicles (id, plate_number, vehicle_type_id, brand, model, year_made, current_driver_id,
                           assigned_warehouse_id, status, last_odometer_km, kir_expiry_date, stnk_expiry_date, gps_tracking_id)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, 'AVAILABLE', $8, $9, $10, $11) RETURNING *`,
    [d.plate_number, d.vehicle_type_id, d.brand || null, d.model || null, d.year_made || null,
     d.current_driver_id || null, d.assigned_warehouse_id || null, d.last_odometer_km,
     d.kir_expiry_date || null, d.stnk_expiry_date || null, d.gps_tracking_id || null]
  );
  const created = result.rows[0];

  await recordCheckpoint({
    entity_type: 'VEHICLE',
    entity_id: created.id,
    entity_number: created.plate_number,
    step_code: 'VEHICLE_REGISTERED',
    step_label: 'Kendaraan pool terdaftar',
    actor_id: user.id,
    actor_name: user.full_name,
    actor_role: user.role,
    notes: `${typeRes.rows[0]!.name} — ${created.plate_number}`
  });

  return c.json({ success: true, data: created }, 201);
});

// 1c. Update pool vehicle (admin only)
// Guard: kendaraan dengan exit log aktif (DEPARTED belum RETURNED) tidak boleh dinonaktifkan/retired
fleetRoutes.put('/vehicles/:id', authenticate, requireRole(ADMIN_ROLES), async (c) => {
  const user = c.get('user' as any) as UserTokenPayload;
  const id = c.req.param('id');
  const parsed = updateVehicleSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ success: false, message: 'Data kendaraan tidak valid', details: parsed.error.flatten().fieldErrors }, 400);
  }
  const d = parsed.data;

  const exists = await query(`SELECT id, plate_number, status FROM vehicles WHERE id = $1`, [id]);
  if (exists.rows.length === 0) {
    return c.json({ success: false, message: 'Kendaraan tidak ditemukan' }, 404);
  }
  const current = exists.rows[0]!;

  if (d.plate_number && d.plate_number !== current.plate_number) {
    const dupRes = await query(`SELECT id FROM vehicles WHERE plate_number = $1 AND id <> $2 LIMIT 1`, [d.plate_number, id]);
    if (dupRes.rows.length > 0) {
      return c.json({ success: false, message: `Nomor polisi '${d.plate_number}' sudah dipakai kendaraan lain` }, 409);
    }
  }

  if (d.vehicle_type_id) {
    const typeRes = await query(`SELECT id FROM master_vehicle_types WHERE id = $1`, [d.vehicle_type_id]);
    if (typeRes.rows.length === 0) {
      return c.json({ success: false, message: 'Tipe kendaraan tidak dikenal' }, 400);
    }
  }

  if (d.current_driver_id) {
    const drvRes = await query(`SELECT id FROM users WHERE id = $1 AND is_active = true`, [d.current_driver_id]);
    if (drvRes.rows.length === 0) {
      return c.json({ success: false, message: 'Pengemudi tidak ditemukan / tidak aktif' }, 400);
    }
  }

  const deactivating = (d.is_active === false || d.status === 'RETIRED');
  if (deactivating && current.status === 'IN_USE') {
    const activeLog = await query(
      `SELECT id FROM fleet_exit_logs WHERE vehicle_id = $1 AND actual_return_time IS NULL LIMIT 1`,
      [id]
    );
    if (activeLog.rows.length > 0) {
      return c.json({ success: false, message: 'Kendaraan sedang di perjalanan (exit log belum ditutup) — tidak bisa dinonaktifkan' }, 400);
    }
  }

  const sets: string[] = [];
  const params: any[] = [];
  const push = (col: string, val: any) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  if (d.plate_number !== undefined) push('plate_number', d.plate_number);
  if (d.vehicle_type_id !== undefined) push('vehicle_type_id', d.vehicle_type_id);
  if (d.brand !== undefined) push('brand', d.brand || null);
  if (d.model !== undefined) push('model', d.model || null);
  if (d.year_made !== undefined) push('year_made', d.year_made || null);
  if (d.current_driver_id !== undefined) push('current_driver_id', d.current_driver_id || null);
  if (d.assigned_warehouse_id !== undefined) push('assigned_warehouse_id', d.assigned_warehouse_id || null);
  if (d.kir_expiry_date !== undefined) push('kir_expiry_date', d.kir_expiry_date || null);
  if (d.stnk_expiry_date !== undefined) push('stnk_expiry_date', d.stnk_expiry_date || null);
  if (d.gps_tracking_id !== undefined) push('gps_tracking_id', d.gps_tracking_id || null);
  if (d.last_odometer_km !== undefined) push('last_odometer_km', d.last_odometer_km);
  if (d.status !== undefined) push('status', d.status);
  if (d.is_active !== undefined) push('is_active', d.is_active);
  if (sets.length === 0) {
    return c.json({ success: false, message: 'Tidak ada perubahan yang dikirim' }, 400);
  }
  params.push(id);
  sets.push(`updated_at = CURRENT_TIMESTAMP`);

  const result = await query(
    `UPDATE vehicles SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  const updated = result.rows[0];

  await recordCheckpoint({
    entity_type: 'VEHICLE',
    entity_id: updated.id,
    entity_number: updated.plate_number,
    step_code: 'VEHICLE_UPDATED',
    step_label: 'Data kendaraan diperbarui',
    actor_id: user.id,
    actor_name: user.full_name,
    actor_role: user.role,
    notes: `Perubahan: ${Object.keys(d).join(', ')}`
  });

  return c.json({ success: true, data: updated });
});

// 2. List Fleet Exit Logs (Pencatatan Armada Keluar-Masuk)
fleetRoutes.get('/logs', async (c) => {
  const status = c.req.query('status');
  const warehouse_id = c.req.query('warehouse_id');

  let sql = `
    SELECT fel.*, 
           v.plate_number, vt.name AS vehicle_type,
           w.name AS warehouse_name
    FROM fleet_exit_logs fel
    JOIN vehicles v ON fel.vehicle_id = v.id
    LEFT JOIN master_vehicle_types vt ON v.vehicle_type_id = vt.id
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
            v.plate_number, vt.name AS vehicle_type, v.brand, v.model,
            w.name AS warehouse_name
     FROM fleet_exit_logs fel
     JOIN vehicles v ON fel.vehicle_id = v.id
    LEFT JOIN master_vehicle_types vt ON v.vehicle_type_id = vt.id
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
    waybill_number,
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

  // docs/05: tidak ada truk keluar tanpa dokumen — resi/SJ wajib untuk keberangkatan pengiriman barang
  const deliveryPurpose = (purpose || 'OUTBOUND_DELIVERY') === 'OUTBOUND_DELIVERY';
  const effectiveWaybillNumber = (waybill_number || (deliveryPurpose ? reference_number : undefined) || '').trim();

  if (deliveryPurpose && (!effectiveWaybillNumber || effectiveWaybillNumber.length < 4)) {
    return c.json({
      success: false,
      message: 'Nomor resi/Surat Jalan yang dibawa wajib dicatat untuk keberangkatan pengiriman barang'
    }, 400);
  }

  let resolvedRefType = reference_type || (deliveryPurpose ? 'OUTBOUND_ORDER' : 'NONE');
  let resolvedRefId = reference_id;

  if (deliveryPurpose && effectiveWaybillNumber) {
    const docRes = await query(
      `SELECT reference_type, reference_id FROM waybills WHERE UPPER(sj_number) = $1 OR UPPER(resi_number) = $1
       UNION ALL SELECT 'CROSS_DOCUMENT' AS reference_type, id AS reference_id FROM cross_documents WHERE UPPER(target_document_number) = $1`,
      [effectiveWaybillNumber.toUpperCase()]
    );
    if (docRes.rows.length === 0) {
      return c.json({
        success: false,
        message: `Resi/SJ "${effectiveWaybillNumber}" tidak ditemukan — keberangkatan tanpa dokumen sah ditolak (docs/05)`
      }, 409);
    }
    if (!resolvedRefId && docRes.rows[0]?.reference_id) {
      resolvedRefType = docRes.rows[0].reference_type;
      resolvedRefId = docRes.rows[0].reference_id;
    }
  }
  // docs/05: keberangkatan manifest cross-dock — nomor manifest wajib dicatat & divalidasi
  if (resolvedRefType === 'CROSS_DOCK_MANIFEST' && resolvedRefId) {
    if (!reference_number || String(reference_number).trim().length < 4) {
      return c.json({
        success: false,
        message: 'Nomor manifest yang dibawa wajib dicatat untuk keberangkatan cross-dock'
      }, 400);
    }
    const mnfRes = await query(
      `SELECT 1 FROM cross_dock_manifests WHERE id = $1 AND manifest_number = $2`,
      [resolvedRefId, String(reference_number).trim()]
    );
    if (mnfRes.rows.length === 0) {
      return c.json({
        success: false,
        message: `Manifest "${reference_number}" tidak dikenal — keberangkatan tanpa dokumen sah ditolak (docs/05)`
      }, 409);
    }
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
      throw new AppError(`Kendaraan plat ${vehRes.rows[0].plate_number} sedang berstatus IN_USE (belum tercatat kembali)`, 400, 'VEHICLE_IN_USE');
    }
    if (vehRes.rows[0].is_active === false || vehRes.rows[0].status === 'RETIRED') {
      throw new AppError(`Kendaraan plat ${vehRes.rows[0].plate_number} sudah dinonaktifkan/dipensiunkan — perbarui master armada dulu`, 400, 'VEHICLE_INACTIVE');
    }
    if (vehRes.rows[0].status === 'MAINTENANCE') {
      throw new AppError(`Kendaraan plat ${vehRes.rows[0].plate_number} sedang perawatan (MAINTENANCE) — ubah status ke AVAILABLE di master armada setelah selesai`, 400, 'VEHICLE_MAINTENANCE');
    }

    // Nomor gate pass unik (acak + cek database) — bukan timestamp yang collision-prone
    let logNumber = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateDocumentNumber('GATE-OUT');
      const dup = await client.query(`SELECT 1 FROM fleet_exit_logs WHERE log_number = $1`, [candidate]);
      if (dup.rows.length === 0) {
        logNumber = candidate;
        break;
      }
    }
    if (!logNumber) throw new Error('Gagal generate nomor gate pass unik');

    // 2. Insert Fleet Exit Log
    const insertRes = await client.query(
      `INSERT INTO fleet_exit_logs (
        id, log_number, vehicle_id, driver_id, driver_name, warehouse_id,
        purpose, reference_type, reference_id, reference_number, waybill_number,
        expected_return_time, odometer_out, fuel_level_out,
        departure_security_officer, departure_photo_url, departure_notes,
        status, approved_by_id, approved_by_name
      ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'DEPARTED', $17, $18)
      RETURNING *`,
      [
        logNumber, vehicle_id, driver_id || null, driver_name.trim(), warehouse_id,
        purpose || 'OUTBOUND_DELIVERY', resolvedRefType || 'NONE', resolvedRefId || null, reference_number || null, effectiveWaybillNumber || waybill_number || null,
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
    if (resolvedRefType === 'CROSS_DOCK_MANIFEST' && resolvedRefId) {
      await client.query(
        `UPDATE cross_dock_manifests 
         SET status = 'IN_TRANSIT', actual_departure = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [resolvedRefId]
      );
    } else if (resolvedRefType === 'OUTBOUND_ORDER' && resolvedRefId) {
      await client.query(
        `UPDATE outbound_orders 
         SET status = 'SHIPPED', shipped_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [resolvedRefId]
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
    if (err instanceof AppError) {
      return c.json({ success: false, message: err.message, code: err.code }, err.status as any);
    }
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

  const distance = Math.max(0, parseFloat(odometer_in) - parseFloat(exitLog.odometer_out));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update Fleet Exit Log to RETURNED with distance_travelled_km
    const updateRes = await client.query(
      `UPDATE fleet_exit_logs 
       SET status = 'RETURNED',
           actual_return_time = CURRENT_TIMESTAMP,
           odometer_in = $2,
           fuel_level_in = $3,
           return_security_officer = $4,
           return_photo_url = $5,
           return_notes = $6,
           distance_travelled_km = $7
       WHERE id = $1
       RETURNING *`,
      [
        id, 
        odometer_in, 
        fuel_level_in || 'FULL', 
        return_security_officer, 
        return_photo_url || null, 
        return_notes || null,
        distance
      ]
    );
    const updatedLog = updateRes.rows[0];

    // 2. Set vehicle status back to AVAILABLE and update last_odometer_km
    await client.query(
      `UPDATE vehicles 
       SET status = 'AVAILABLE',
           last_odometer_km = $2,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [exitLog.vehicle_id, odometer_in]
    );

    await client.query('COMMIT');

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

// 6. Vendor Truck Exit — Jalur B Pos Satpam (truk sewa/ekspedisi eksternal)
// Wajib: nama vendor, nomor polisi (manual), nomor resi/SJ yang dibawa.
// Tidak menyentuh master armada pool; tidak ada gate-in odometer (truk vendor tidak wajib kembali).
const vendorExitSchema = z.object({
  vendor_name: z.string().trim().min(2, 'Nama vendor wajib diisi (min 2 karakter)'),
  plate_number: z.string().trim().min(3, 'Nomor polisi truk vendor wajib diisi'),
  waybill_number: z.string().trim().min(4, 'Nomor Resi/Surat Jalan yang dibawa wajib dicatat'),
  warehouse_id: z.string().optional(),
  vehicle_type: z.string().optional(),
  driver_name: z.string().optional(),
  reference_type: z.enum(['OUTBOUND_ORDER', 'CROSS_DOCK_MANIFEST', 'NONE']).optional(),
  reference_id: z.string().nullish(),
  destination_note: z.string().max(300).optional(),
  departure_photo_url: z.string().optional(),
  notes: z.string().max(500).optional(),
  actor_name: z.string().trim().min(2, 'Nama petugas satpam wajib diisi (min 2 karakter)').optional(),
  actor_id: z.string().optional()
});

fleetRoutes.post('/vendor-exit', optionalAuth, async (c) => {
  const user = c.get('user' as any) as UserTokenPayload | undefined;

  const parsed = vendorExitSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ success: false, message: parsed.error.issues[0]?.message || 'Payload tidak valid' }, 400);
  }
  const body = parsed.data;

  const actor_name = (user?.full_name || body.actor_name || '').trim();
  const actor_id = user?.id || body.actor_id;
  const actor_role = user?.role || 'GATE_OFFICER';

  if (!actor_name || actor_name.length < 2) {
    return c.json({ success: false, message: 'Nama petugas satpam wajib diisi (Mandatory petugas_name)' }, 400);
  }

  // docs/05 V_DOC: resi/SJ yang dibawa harus valid (terdaftar di sistem)
  const docRes = await query(
    `SELECT reference_type, reference_id FROM waybills WHERE UPPER(sj_number) = $1 OR UPPER(resi_number) = $1
     UNION ALL SELECT 'CROSS_DOCUMENT' AS reference_type, id AS reference_id FROM cross_documents WHERE UPPER(target_document_number) = $1`,
    [body.waybill_number.toUpperCase()]
  );
  if (docRes.rows.length === 0) {
    return c.json({
      success: false,
      message: `Resi/SJ "${body.waybill_number}" tidak ditemukan — keberangkatan tanpa dokumen sah ditolak (docs/05)`
    }, 409);
  }

  let resolvedRefType = body.reference_type && body.reference_type !== 'NONE' ? body.reference_type : (docRes.rows[0]?.reference_type || 'NONE');
  let resolvedRefId = body.reference_id || (docRes.rows[0]?.reference_id || null);

  // Referensi order/manifest harus ada agar update status tidak diam-diam gagal
  if (resolvedRefType === 'OUTBOUND_ORDER' && resolvedRefId) {
    const refRes = await query(`SELECT id FROM outbound_orders WHERE id = $1`, [resolvedRefId]);
    if (refRes.rows.length === 0) {
      return c.json({ success: false, message: 'Outbound order referensi tidak ditemukan' }, 404);
    }
  } else if (resolvedRefType === 'CROSS_DOCK_MANIFEST' && resolvedRefId) {
    const refRes = await query(`SELECT id FROM cross_dock_manifests WHERE id = $1`, [resolvedRefId]);
    if (refRes.rows.length === 0) {
      return c.json({ success: false, message: 'Cross-dock manifest referensi tidak ditemukan' }, 404);
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Nomor log vendor unik (acak + cek database) — bukan timestamp yang collision-prone
    let logNumber = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateDocumentNumber('VEND-OUT');
      const dup = await client.query(`SELECT 1 FROM vendor_vehicle_exit_logs WHERE log_number = $1`, [candidate]);
      if (dup.rows.length === 0) {
        logNumber = candidate;
        break;
      }
    }
    if (!logNumber) throw new Error('Gagal generate nomor log vendor unik');
    const insertRes = await client.query(
      `INSERT INTO vendor_vehicle_exit_logs (
        id, log_number, warehouse_id, vendor_name, plate_number, vehicle_type,
        driver_name, waybill_number, reference_type, reference_id,
        destination_note, departure_security_officer, departure_photo_url, notes
      ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        logNumber, body.warehouse_id || null, body.vendor_name, body.plate_number, body.vehicle_type || null,
        body.driver_name || null, body.waybill_number, resolvedRefType || 'NONE', resolvedRefId || null,
        body.destination_note || null, actor_name, body.departure_photo_url || null, body.notes || null
      ]
    );
    const vendorLog = insertRes.rows[0];

    // Sama seperti jalur pool: order terkait berangkat dari gudang
    if (resolvedRefType === 'OUTBOUND_ORDER' && resolvedRefId) {
      await client.query(
        `UPDATE outbound_orders SET status = 'SHIPPED', shipped_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [resolvedRefId]
      );
    } else if (resolvedRefType === 'CROSS_DOCK_MANIFEST' && resolvedRefId) {
      await client.query(
        `UPDATE cross_dock_manifests SET status = 'IN_TRANSIT', actual_departure = CURRENT_TIMESTAMP WHERE id = $1`,
        [resolvedRefId]
      );
    }

    await client.query('COMMIT');

    // Record Checkpoint: VENDOR_EXIT (rantai audit tetap tersambung)
    await recordCheckpoint({
      entity_type: 'VENDOR_EXIT_LOG',
      entity_id: vendorLog.id,
      entity_number: vendorLog.log_number,
      step_code: 'VENDOR_EXIT',
      step_label: 'Truk Vendor Keluar via Pos Satpam (Log Keluar Vendor)',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: actor_role,
      notes: body.notes || `Vendor ${body.vendor_name} nopol ${body.plate_number} bawa resi/SJ ${body.waybill_number}. Tidak wajib kembali.`,
      metadata: {
        vendor_name: body.vendor_name,
        plate_number: body.plate_number,
        waybill_number: body.waybill_number
      },
      photo_urls: body.departure_photo_url ? [body.departure_photo_url] : []
    });

    return c.json({ success: true, data: vendorLog }, 201);
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});

// 7. List Vendor Exit Logs (daftar + filter)
fleetRoutes.get('/vendor-exits', async (c) => {
  const warehouse_id = c.req.query('warehouse_id');
  const vendor = c.req.query('vendor');

  let sql = `SELECT * FROM vendor_vehicle_exit_logs WHERE 1=1`;
  const params: any[] = [];
  if (warehouse_id) {
    params.push(warehouse_id);
    sql += ` AND warehouse_id = $${params.length}`;
  }
  if (vendor) {
    params.push(`%${vendor.toLowerCase()}%`);
    sql += ` AND LOWER(vendor_name) LIKE $${params.length}`;
  }
  sql += ` ORDER BY created_at DESC`;

  const result = await query(sql, params);
  return c.json({ success: true, data: result.rows });
});
