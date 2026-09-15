import { Hono } from 'hono';
import { z } from 'zod';
import { query } from '../db.js';
import { authenticate, requireRole, UserTokenPayload } from '../middlewares/auth.js';
import { recordCheckpoint } from '../services/checkpoint.js';

export const masterRoutes = new Hono();

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN_ADM'];

const customerSchema = z.object({
  code: z.string().min(2).max(32),
  name: z.string().min(3).max(160),
  type: z.enum(['INTERNAL', 'EXTERNAL', 'VENDOR', 'PRINCIPAL']).default('INTERNAL'),
  contact_name: z.string().max(120).nullish(),
  contact_phone: z.string().max(32).nullish(),
  contact_email: z.string().email().max(160).nullish(),
  address: z.string().max(400).nullish(),
  is_active: z.boolean().optional()
});

// Customers (pengirim/penerima untuk dropdown PO, order, manifest)
masterRoutes.get('/customers', async (c) => {
  const includeInactive = c.req.query('include_inactive') === 'true';
  const result = await query(
    `SELECT id, code, name, type, contact_name, contact_phone, contact_email, address, is_active
     FROM customers ${includeInactive ? '' : 'WHERE is_active = true'} ORDER BY name ASC`
  );
  return c.json({ success: true, data: result.rows });
});

// Create customer (admin only)
masterRoutes.post('/customers', authenticate, requireRole(ADMIN_ROLES), async (c) => {
  const user = c.get('user' as any) as UserTokenPayload;
  const parsed = customerSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ success: false, message: 'Data tidak valid', details: parsed.error.flatten().fieldErrors }, 400);
  }
  const d = parsed.data;

  const dupRes = await query(`SELECT id FROM customers WHERE code = $1 LIMIT 1`, [d.code]);
  if (dupRes.rows.length > 0) {
    return c.json({ success: false, message: `Kode customer '${d.code}' sudah dipakai` }, 409);
  }

  const result = await query(
    `INSERT INTO customers (id, code, name, type, contact_name, contact_phone, contact_email, address)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [d.code, d.name, d.type, d.contact_name || null, d.contact_phone || null, d.contact_email || null, d.address || null]
  );
  const created = result.rows[0];

  await recordCheckpoint({
    entity_type: 'CUSTOMER',
    entity_id: created.id,
    entity_number: created.code,
    step_code: 'CUSTOMER_CREATED',
    step_label: 'Master customer dibuat',
    actor_id: user.id,
    actor_name: user.full_name,
    actor_role: user.role,
    notes: `Customer ${created.name} (${created.type})`
  });

  return c.json({ success: true, data: created }, 201);
});

// Update customer (admin only)
masterRoutes.put('/customers/:id', authenticate, requireRole(ADMIN_ROLES), async (c) => {
  const user = c.get('user' as any) as UserTokenPayload;
  const id = c.req.param('id');
  const parsed = customerSchema.partial().safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ success: false, message: 'Data tidak valid', details: parsed.error.flatten().fieldErrors }, 400);
  }
  const d = parsed.data;

  const exists = await query(`SELECT id, code FROM customers WHERE id = $1`, [id]);
  if (exists.rows.length === 0) {
    return c.json({ success: false, message: 'Customer tidak ditemukan' }, 404);
  }

  const sets: string[] = [];
  const params: any[] = [];
  const push = (col: string, val: any) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  if (d.code !== undefined) push('code', d.code);
  if (d.name !== undefined) push('name', d.name);
  if (d.type !== undefined) push('type', d.type);
  if (d.contact_name !== undefined) push('contact_name', d.contact_name || null);
  if (d.contact_phone !== undefined) push('contact_phone', d.contact_phone || null);
  if (d.contact_email !== undefined) push('contact_email', d.contact_email || null);
  if (d.address !== undefined) push('address', d.address || null);
  if (d.is_active !== undefined) push('is_active', d.is_active);
  if (sets.length === 0) {
    return c.json({ success: false, message: 'Tidak ada perubahan yang dikirim' }, 400);
  }
  params.push(id);
  sets.push(`updated_at = CURRENT_TIMESTAMP`);

  const result = await query(
    `UPDATE customers SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );

  await recordCheckpoint({
    entity_type: 'CUSTOMER',
    entity_id: id!,
    entity_number: exists.rows[0]!.code,
    step_code: 'CUSTOMER_UPDATED',
    step_label: 'Master customer diperbarui',
    actor_id: user.id,
    actor_name: user.full_name,
    actor_role: user.role,
    notes: `Perubahan: ${Object.keys(d).join(', ')}`
  });

  return c.json({ success: true, data: result.rows[0] });
});

// Warehouse Types (Main Hub, Transit Spoke)
masterRoutes.get('/warehouse-types', async (c) => {
  const result = await query(`SELECT id, name FROM master_warehouse_types ORDER BY name ASC`);
  return c.json({ success: true, data: result.rows });
});

// 1. Cargo Types (Bulky, Curah Kering, Curah Cair, Packaged)
masterRoutes.get('/cargo-types', async (c) => {
  const includeInactive = c.req.query('include_inactive') === 'true';
  const result = await query(
    `SELECT * FROM master_cargo_types ${includeInactive ? '' : 'WHERE is_active = true'} ORDER BY name ASC`
  );
  return c.json({ success: true, data: result.rows });
});

masterRoutes.post('/cargo-types', async (c) => {
  const body = await c.req.json();
  const { code, name, category, handling_instructions, requires_weighbridge, requires_temperature_control } = body;
  const cleanCode = (code || '').toUpperCase().replace(/[^A-Z0-9_]/g, '');
  const result = await query(
    `INSERT INTO master_cargo_types (id, code, name, category, handling_instructions, requires_weighbridge, requires_temperature_control)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6) RETURNING *`,
    [cleanCode, name, category || 'GENERAL', handling_instructions || null, requires_weighbridge || false, requires_temperature_control || false]
  );
  return c.json({ success: true, data: result.rows[0] }, 201);
});

masterRoutes.put('/cargo-types/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, category, handling_instructions, requires_weighbridge, requires_temperature_control, is_active } = body;

  const check = await query(`SELECT id FROM master_cargo_types WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    return c.json({ success: false, message: 'Tipe kargo tidak ditemukan' }, 404);
  }

  const sets: string[] = [];
  const params: any[] = [];
  const push = (col: string, val: any) => { params.push(val); sets.push(`${col} = $${params.length}`); };

  if (name !== undefined) push('name', name);
  if (category !== undefined) push('category', category);
  if (handling_instructions !== undefined) push('handling_instructions', handling_instructions || null);
  if (requires_weighbridge !== undefined) push('requires_weighbridge', requires_weighbridge);
  if (requires_temperature_control !== undefined) push('requires_temperature_control', requires_temperature_control);
  if (is_active !== undefined) push('is_active', is_active);

  if (sets.length === 0) {
    return c.json({ success: false, message: 'Tidak ada perubahan yang dikirim' }, 400);
  }

  params.push(id);
  sets.push(`updated_at = now()`);
  const result = await query(
    `UPDATE master_cargo_types SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return c.json({ success: true, message: 'Tipe kargo berhasil diperbarui', data: result.rows[0] });
});

masterRoutes.delete('/cargo-types/:id', async (c) => {
  const id = c.req.param('id');
  const check = await query(`SELECT id, name FROM master_cargo_types WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    return c.json({ success: false, message: 'Tipe kargo tidak ditemukan' }, 404);
  }
  const result = await query(
    `UPDATE master_cargo_types SET is_active = false, updated_at = now() WHERE id = $1 RETURNING *`,
    [id]
  );
  return c.json({ success: true, message: `Tipe kargo ${check.rows[0].name} dinonaktifkan`, data: result.rows[0] });
});

// 2. Packaging Types (Jumbo Bag, Drum, Pallet, Sack, Silo, etc.)
masterRoutes.get('/packaging-types', async (c) => {
  const includeInactive = c.req.query('include_inactive') === 'true';
  const result = await query(
    `SELECT * FROM master_packaging_types ${includeInactive ? '' : 'WHERE is_active = true'} ORDER BY name ASC`
  );
  return c.json({ success: true, data: result.rows });
});

masterRoutes.post('/packaging-types', async (c) => {
  const body = await c.req.json();
  const { code, name, is_bulk_container, tare_weight_kg, nominal_capacity_kg, nominal_capacity_liter } = body;
  const cleanCode = (code || '').toUpperCase().replace(/[^A-Z0-9_]/g, '');
  const result = await query(
    `INSERT INTO master_packaging_types (id, code, name, is_bulk_container, tare_weight_kg, nominal_capacity_kg, nominal_capacity_liter)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6) RETURNING *`,
    [cleanCode, name, is_bulk_container || false, tare_weight_kg || 0, nominal_capacity_kg || 0, nominal_capacity_liter || 0]
  );
  return c.json({ success: true, data: result.rows[0] }, 201);
});

masterRoutes.put('/packaging-types/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, is_bulk_container, tare_weight_kg, nominal_capacity_kg, nominal_capacity_liter, is_active } = body;

  const check = await query(`SELECT id FROM master_packaging_types WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    return c.json({ success: false, message: 'Tipe kemasan tidak ditemukan' }, 404);
  }

  const sets: string[] = [];
  const params: any[] = [];
  const push = (col: string, val: any) => { params.push(val); sets.push(`${col} = $${params.length}`); };

  if (name !== undefined) push('name', name);
  if (is_bulk_container !== undefined) push('is_bulk_container', is_bulk_container);
  if (tare_weight_kg !== undefined) push('tare_weight_kg', tare_weight_kg);
  if (nominal_capacity_kg !== undefined) push('nominal_capacity_kg', nominal_capacity_kg);
  if (nominal_capacity_liter !== undefined) push('nominal_capacity_liter', nominal_capacity_liter);
  if (is_active !== undefined) push('is_active', is_active);

  if (sets.length === 0) {
    return c.json({ success: false, message: 'Tidak ada perubahan yang dikirim' }, 400);
  }

  params.push(id);
  sets.push(`updated_at = now()`);
  const result = await query(
    `UPDATE master_packaging_types SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return c.json({ success: true, message: 'Tipe kemasan berhasil diperbarui', data: result.rows[0] });
});

masterRoutes.delete('/packaging-types/:id', async (c) => {
  const id = c.req.param('id');
  const check = await query(`SELECT id, name FROM master_packaging_types WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    return c.json({ success: false, message: 'Tipe kemasan tidak ditemukan' }, 404);
  }
  const result = await query(
    `UPDATE master_packaging_types SET is_active = false, updated_at = now() WHERE id = $1 RETURNING *`,
    [id]
  );
  return c.json({ success: true, message: `Tipe kemasan ${check.rows[0].name} dinonaktifkan`, data: result.rows[0] });
});

// 3. UOM & Conversions
masterRoutes.get('/uoms', async (c) => {
  const includeInactive = c.req.query('include_inactive') === 'true';
  const uomRes = await query(
    `SELECT * FROM master_uom ${includeInactive ? '' : 'WHERE is_active = true'} ORDER BY base_category, code`
  );
  const convRes = await query(`
    SELECT c.*, u1.code AS from_code, u1.name AS from_name, u2.code AS to_code, u2.name AS to_name
    FROM master_uom_conversions c
    JOIN master_uom u1 ON c.from_uom_id = u1.id
    JOIN master_uom u2 ON c.to_uom_id = u2.id
    ORDER BY u1.code, u2.code
  `);
  return c.json({ success: true, data: { uoms: uomRes.rows, conversions: convRes.rows } });
});

masterRoutes.post('/uoms', async (c) => {
  const body = await c.req.json();
  const { code, name, base_category, is_base_unit } = body;
  const cleanCode = (code || '').toUpperCase().replace(/[^A-Z0-9_]/g, '');
  const result = await query(
    `INSERT INTO master_uom (id, code, name, base_category, is_base_unit)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4) RETURNING *`,
    [cleanCode, name, base_category || 'PIECES', is_base_unit || false]
  );
  return c.json({ success: true, data: result.rows[0] }, 201);
});

masterRoutes.put('/uoms/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, base_category, is_base_unit, is_active } = body;

  const check = await query(`SELECT id FROM master_uom WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    return c.json({ success: false, message: 'Satuan UOM tidak ditemukan' }, 404);
  }

  const sets: string[] = [];
  const params: any[] = [];
  const push = (col: string, val: any) => { params.push(val); sets.push(`${col} = $${params.length}`); };

  if (name !== undefined) push('name', name);
  if (base_category !== undefined) push('base_category', base_category);
  if (is_base_unit !== undefined) push('is_base_unit', is_base_unit);
  if (is_active !== undefined) push('is_active', is_active);

  if (sets.length === 0) {
    return c.json({ success: false, message: 'Tidak ada perubahan yang dikirim' }, 400);
  }

  params.push(id);
  const result = await query(
    `UPDATE master_uom SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return c.json({ success: true, message: 'Satuan UOM berhasil diperbarui', data: result.rows[0] });
});

masterRoutes.delete('/uoms/:id', async (c) => {
  const id = c.req.param('id');
  const check = await query(`SELECT id, name FROM master_uom WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    return c.json({ success: false, message: 'Satuan UOM tidak ditemukan' }, 404);
  }
  const result = await query(
    `UPDATE master_uom SET is_active = false WHERE id = $1 RETURNING *`,
    [id]
  );
  return c.json({ success: true, message: `Satuan UOM ${check.rows[0].name} dinonaktifkan`, data: result.rows[0] });
});

// UOM Conversions CRUD
masterRoutes.post('/uom-conversions', async (c) => {
  const body = await c.req.json();
  const { from_uom_id, to_uom_id, conversion_multiplier, notes } = body;

  if (!from_uom_id || !to_uom_id || !conversion_multiplier) {
    return c.json({ success: false, message: 'from_uom_id, to_uom_id, dan conversion_multiplier wajib diisi' }, 400);
  }
  if (from_uom_id === to_uom_id) {
    return c.json({ success: false, message: 'Satuan asal dan tujuan tidak boleh sama' }, 400);
  }

  const dup = await query(
    `SELECT id FROM master_uom_conversions WHERE from_uom_id = $1 AND to_uom_id = $2`,
    [from_uom_id, to_uom_id]
  );
  if (dup.rows.length > 0) {
    return c.json({ success: false, message: 'Aturan konversi untuk pasangan satuan ini sudah ada' }, 409);
  }

  const result = await query(
    `INSERT INTO master_uom_conversions (id, from_uom_id, to_uom_id, conversion_multiplier, notes)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4) RETURNING *`,
    [from_uom_id, to_uom_id, parseFloat(conversion_multiplier), notes || null]
  );

  return c.json({ success: true, message: 'Aturan konversi UOM berhasil disimpan', data: result.rows[0] }, 201);
});

masterRoutes.put('/uom-conversions/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { conversion_multiplier, notes } = body;

  const check = await query(`SELECT id FROM master_uom_conversions WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    return c.json({ success: false, message: 'Aturan konversi tidak ditemukan' }, 404);
  }

  const sets: string[] = [];
  const params: any[] = [];
  const push = (col: string, val: any) => { params.push(val); sets.push(`${col} = $${params.length}`); };

  if (conversion_multiplier !== undefined) push('conversion_multiplier', parseFloat(conversion_multiplier));
  if (notes !== undefined) push('notes', notes || null);

  if (sets.length === 0) {
    return c.json({ success: false, message: 'Tidak ada perubahan yang dikirim' }, 400);
  }

  params.push(id);
  const result = await query(
    `UPDATE master_uom_conversions SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );

  return c.json({ success: true, message: 'Aturan konversi berhasil diperbarui', data: result.rows[0] });
});

masterRoutes.delete('/uom-conversions/:id', async (c) => {
  const id = c.req.param('id');
  const check = await query(`SELECT id FROM master_uom_conversions WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    return c.json({ success: false, message: 'Aturan konversi tidak ditemukan' }, 404);
  }

  await query(`DELETE FROM master_uom_conversions WHERE id = $1`, [id]);
  return c.json({ success: true, message: 'Aturan konversi UOM berhasil dihapus' });
});

// 4. Vehicle Types (CDE, CDD, Fuso, Wingbox, Dump Truck, Tanker, Trailer)
masterRoutes.get('/vehicle-types', async (c) => {
  const includeInactive = c.req.query('include_inactive') === 'true';
  const result = await query(
    `SELECT * FROM master_vehicle_types ${includeInactive ? '' : 'WHERE is_active = true'} ORDER BY max_payload_kg ASC`
  );
  return c.json({ success: true, data: result.rows });
});

masterRoutes.post('/vehicle-types', async (c) => {
  const body = await c.req.json();
  const { code, name, body_type, axle_count, max_payload_kg, max_volume_cbm, fuel_type, avg_fuel_consumption_km_per_liter } = body;
  const cleanCode = (code || '').toUpperCase().replace(/[^A-Z0-9_]/g, '');
  const result = await query(
    `INSERT INTO master_vehicle_types (
      id, code, name, body_type, axle_count, max_payload_kg, max_volume_cbm, fuel_type, avg_fuel_consumption_km_per_liter
    ) VALUES (
      uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8
    ) RETURNING *`,
    [
      cleanCode,
      name,
      body_type || 'BOX',
      axle_count || 2,
      max_payload_kg || 1000,
      max_volume_cbm || 5,
      fuel_type || 'SOLAR',
      avg_fuel_consumption_km_per_liter || 4.0
    ]
  );
  return c.json({ success: true, data: result.rows[0] }, 201);
});

masterRoutes.put('/vehicle-types/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, body_type, axle_count, max_payload_kg, max_volume_cbm, fuel_type, avg_fuel_consumption_km_per_liter, is_active } = body;

  const check = await query(`SELECT id FROM master_vehicle_types WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    return c.json({ success: false, message: 'Tipe armada tidak ditemukan' }, 404);
  }

  const sets: string[] = [];
  const params: any[] = [];
  const push = (col: string, val: any) => { params.push(val); sets.push(`${col} = $${params.length}`); };

  if (name !== undefined) push('name', name);
  if (body_type !== undefined) push('body_type', body_type);
  if (axle_count !== undefined) push('axle_count', axle_count);
  if (max_payload_kg !== undefined) push('max_payload_kg', max_payload_kg);
  if (max_volume_cbm !== undefined) push('max_volume_cbm', max_volume_cbm);
  if (fuel_type !== undefined) push('fuel_type', fuel_type);
  if (avg_fuel_consumption_km_per_liter !== undefined) push('avg_fuel_consumption_km_per_liter', avg_fuel_consumption_km_per_liter);
  if (is_active !== undefined) push('is_active', is_active);

  if (sets.length === 0) {
    return c.json({ success: false, message: 'Tidak ada perubahan yang dikirim' }, 400);
  }

  params.push(id);
  sets.push(`updated_at = now()`);
  const result = await query(
    `UPDATE master_vehicle_types SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return c.json({ success: true, message: 'Tipe armada berhasil diperbarui', data: result.rows[0] });
});

masterRoutes.delete('/vehicle-types/:id', async (c) => {
  const id = c.req.param('id');
  const check = await query(`SELECT id, name FROM master_vehicle_types WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    return c.json({ success: false, message: 'Tipe armada tidak ditemukan' }, 404);
  }
  const result = await query(
    `UPDATE master_vehicle_types SET is_active = false, updated_at = now() WHERE id = $1 RETURNING *`,
    [id]
  );
  return c.json({ success: true, message: `Tipe armada ${check.rows[0].name} dinonaktifkan`, data: result.rows[0] });
});

// 5. Document Types (SJ Supplier, SJ Pengiriman, Master AWB, House AWB)
masterRoutes.get('/document-types', async (c) => {
  const includeInactive = c.req.query('include_inactive') === 'true';
  const result = await query(
    `SELECT * FROM master_document_types ${includeInactive ? '' : 'WHERE is_active = true'} ORDER BY category, name`
  );
  return c.json({ success: true, data: result.rows });
});

masterRoutes.post('/document-types', async (c) => {
  const body = await c.req.json();
  const { code, name, category, is_cross_doc_eligible } = body;
  const cleanCode = (code || '').toUpperCase().replace(/[^A-Z0-9_]/g, '');
  const result = await query(
    `INSERT INTO master_document_types (id, code, name, category, is_cross_doc_eligible)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4) RETURNING *`,
    [cleanCode, name, category || 'SHIPPING', is_cross_doc_eligible ?? true]
  );
  return c.json({ success: true, data: result.rows[0] }, 201);
});

masterRoutes.put('/document-types/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, category, is_cross_doc_eligible, is_active } = body;

  const check = await query(`SELECT id FROM master_document_types WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    return c.json({ success: false, message: 'Tipe dokumen tidak ditemukan' }, 404);
  }

  const sets: string[] = [];
  const params: any[] = [];
  const push = (col: string, val: any) => { params.push(val); sets.push(`${col} = $${params.length}`); };

  if (name !== undefined) push('name', name);
  if (category !== undefined) push('category', category);
  if (is_cross_doc_eligible !== undefined) push('is_cross_doc_eligible', is_cross_doc_eligible);
  if (is_active !== undefined) push('is_active', is_active);

  if (sets.length === 0) {
    return c.json({ success: false, message: 'Tidak ada perubahan yang dikirim' }, 400);
  }

  params.push(id);
  const result = await query(
    `UPDATE master_document_types SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return c.json({ success: true, message: 'Tipe dokumen berhasil diperbarui', data: result.rows[0] });
});

masterRoutes.delete('/document-types/:id', async (c) => {
  const id = c.req.param('id');
  const check = await query(`SELECT id, name FROM master_document_types WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    return c.json({ success: false, message: 'Tipe dokumen tidak ditemukan' }, 404);
  }
  const result = await query(
    `UPDATE master_document_types SET is_active = false WHERE id = $1 RETURNING *`,
    [id]
  );
  return c.json({ success: true, message: `Tipe dokumen ${check.rows[0].name} dinonaktifkan`, data: result.rows[0] });
});

// 6. Print Templates (Surat Jalan: A4, Continuous 3-Ply, Continuous Wartel, Thermal Bluetooth)
masterRoutes.get('/print-templates', async (c) => {
  const category = c.req.query('category');
  const includeInactive = c.req.query('include_inactive') === 'true';
  let sql = `SELECT * FROM master_print_templates WHERE 1=1`;
  const params: any[] = [];
  if (!includeInactive) {
    sql += ` AND is_active = true`;
  }
  if (category) {
    params.push(category);
    sql += ` AND category = $${params.length}`;
  }
  sql += ` ORDER BY is_default DESC, created_at ASC`;
  const result = await query(sql, params);
  return c.json({ success: true, data: result.rows });
});

masterRoutes.put('/print-templates/:id/default', async (c) => {
  const id = c.req.param('id');
  const checkRes = await query(`SELECT * FROM master_print_templates WHERE id = $1`, [id]);
  if (checkRes.rows.length === 0) {
    return c.json({ success: false, message: 'Template cetak tidak ditemukan' }, 404);
  }

  const tpl = checkRes.rows[0];
  // Reset other templates in the same category
  await query(`UPDATE master_print_templates SET is_default = false, updated_at = now() WHERE category = $1`, [tpl.category]);
  // Set target template as default
  const updateRes = await query(
    `UPDATE master_print_templates SET is_default = true, updated_at = now() WHERE id = $1 RETURNING *`,
    [id]
  );

  return c.json({
    success: true,
    message: `Template ${tpl.name} berhasil dijadikan template default`,
    data: updateRes.rows[0]
  });
});

masterRoutes.post('/print-templates', async (c) => {
  const body = await c.req.json();
  const { code, name, category, paper_size, printer_type, description, is_default } = body;
  const cleanCode = (code || '').toUpperCase().replace(/[^A-Z0-9_]/g, '');

  if (is_default) {
    await query(`UPDATE master_print_templates SET is_default = false WHERE category = $1`, [category || 'WAYBILL']);
  }

  const result = await query(
    `INSERT INTO master_print_templates (
       id, code, name, category, paper_size, printer_type, description, is_default
     ) VALUES (
       uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7
     ) RETURNING *`,
    [cleanCode, name, category || 'WAYBILL', paper_size, printer_type || 'LASER_INKJET', description || '', is_default || false]
  );

  return c.json({ success: true, data: result.rows[0] }, 201);
});

masterRoutes.put('/print-templates/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, category, paper_size, printer_type, description, is_active } = body;

  const check = await query(`SELECT id FROM master_print_templates WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    return c.json({ success: false, message: 'Template cetak tidak ditemukan' }, 404);
  }

  const sets: string[] = [];
  const params: any[] = [];
  const push = (col: string, val: any) => { params.push(val); sets.push(`${col} = $${params.length}`); };

  if (name !== undefined) push('name', name);
  if (category !== undefined) push('category', category);
  if (paper_size !== undefined) push('paper_size', paper_size);
  if (printer_type !== undefined) push('printer_type', printer_type);
  if (description !== undefined) push('description', description);
  if (is_active !== undefined) push('is_active', is_active);

  if (sets.length === 0) {
    return c.json({ success: false, message: 'Tidak ada perubahan yang dikirim' }, 400);
  }

  params.push(id);
  sets.push(`updated_at = now()`);
  const result = await query(
    `UPDATE master_print_templates SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return c.json({ success: true, message: 'Template cetak berhasil diperbarui', data: result.rows[0] });
});

masterRoutes.delete('/print-templates/:id', async (c) => {
  const id = c.req.param('id');
  const check = await query(`SELECT id, name FROM master_print_templates WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    return c.json({ success: false, message: 'Template cetak tidak ditemukan' }, 404);
  }
  const result = await query(
    `UPDATE master_print_templates SET is_active = false, updated_at = now() WHERE id = $1 RETURNING *`,
    [id]
  );
  return c.json({ success: true, message: `Template cetak ${check.rows[0].name} dinonaktifkan`, data: result.rows[0] });
});

