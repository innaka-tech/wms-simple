import { Hono } from 'hono';
import { z } from 'zod';
import { query, pool } from '../db.js';
import { recordCheckpoint } from '../services/checkpoint.js';
import { optionalAuth, UserTokenPayload } from '../middlewares/auth.js';
import { generateDocumentNumber } from '../utils/waybill.js';

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
  if (deliveryPurpose && (!waybill_number || String(waybill_number).trim().length < 4)) {
    return c.json({
      success: false,
      message: 'Nomor resi/Surat Jalan yang dibawa wajib dicatat untuk keberangkatan pengiriman barang'
    }, 400);
  }
  if (deliveryPurpose) {
    const docRes = await query(
      `SELECT 1 FROM waybills WHERE sj_number = $1 OR resi_number = $1
       UNION ALL SELECT 1 FROM cross_documents WHERE target_document_number = $1`,
      [String(waybill_number).trim()]
    );
    if (docRes.rows.length === 0) {
      return c.json({
        success: false,
        message: `Resi/SJ "${waybill_number}" tidak ditemukan — keberangkatan tanpa dokumen sah ditolak (docs/05)`
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
      throw new Error(`Kendaraan plat ${vehRes.rows[0].plate_number} sedang berstatus IN_USE (belum tercatat kembali)`);
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
        purpose || 'OUTBOUND_DELIVERY', reference_type || 'NONE', reference_id || null, reference_number || null, waybill_number || null,
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
  reference_id: z.string().optional(),
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
    `SELECT 1 FROM waybills WHERE sj_number = $1 OR resi_number = $1
     UNION ALL SELECT 1 FROM cross_documents WHERE target_document_number = $1`,
    [body.waybill_number]
  );
  if (docRes.rows.length === 0) {
    return c.json({
      success: false,
      message: `Resi/SJ "${body.waybill_number}" tidak ditemukan — keberangkatan tanpa dokumen sah ditolak (docs/05)`
    }, 409);
  }

  // Referensi order/manifest harus ada agar update status tidak diam-diam gagal
  if (body.reference_type === 'OUTBOUND_ORDER' && body.reference_id) {
    const refRes = await query(`SELECT id FROM outbound_orders WHERE id = $1`, [body.reference_id]);
    if (refRes.rows.length === 0) {
      return c.json({ success: false, message: 'Outbound order referensi tidak ditemukan' }, 404);
    }
  } else if (body.reference_type === 'CROSS_DOCK_MANIFEST' && body.reference_id) {
    const refRes = await query(`SELECT id FROM cross_dock_manifests WHERE id = $1`, [body.reference_id]);
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
        body.driver_name || null, body.waybill_number, body.reference_type || 'NONE', body.reference_id || null,
        body.destination_note || null, actor_name, body.departure_photo_url || null, body.notes || null
      ]
    );
    const vendorLog = insertRes.rows[0];

    // Sama seperti jalur pool: order terkait berangkat dari gudang
    if (body.reference_type === 'OUTBOUND_ORDER' && body.reference_id) {
      await client.query(
        `UPDATE outbound_orders SET status = 'SHIPPED', shipped_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [body.reference_id]
      );
    } else if (body.reference_type === 'CROSS_DOCK_MANIFEST' && body.reference_id) {
      await client.query(
        `UPDATE cross_dock_manifests SET status = 'IN_TRANSIT', actual_departure = CURRENT_TIMESTAMP WHERE id = $1`,
        [body.reference_id]
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
