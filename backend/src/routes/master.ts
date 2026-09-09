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
  const result = await query(`SELECT * FROM master_cargo_types WHERE is_active = true ORDER BY name ASC`);
  return c.json({ success: true, data: result.rows });
});

masterRoutes.post('/cargo-types', async (c) => {
  const body = await c.req.json();
  const { code, name, category, handling_instructions, requires_weighbridge, requires_temperature_control } = body;
  const result = await query(
    `INSERT INTO master_cargo_types (id, code, name, category, handling_instructions, requires_weighbridge, requires_temperature_control)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6) RETURNING *`,
    [code, name, category || 'GENERAL', handling_instructions || null, requires_weighbridge || false, requires_temperature_control || false]
  );
  return c.json({ success: true, data: result.rows[0] }, 201);
});

// 2. Packaging Types (Jumbo Bag, Drum, Pallet, Sack, Silo, etc.)
masterRoutes.get('/packaging-types', async (c) => {
  const result = await query(`SELECT * FROM master_packaging_types WHERE is_active = true ORDER BY name ASC`);
  return c.json({ success: true, data: result.rows });
});

// 3. UOM & Conversions
masterRoutes.get('/uoms', async (c) => {
  const uomRes = await query(`SELECT * FROM master_uom WHERE is_active = true ORDER BY base_category, code`);
  const convRes = await query(`
    SELECT c.*, u1.code AS from_code, u2.code AS to_code
    FROM master_uom_conversions c
    JOIN master_uom u1 ON c.from_uom_id = u1.id
    JOIN master_uom u2 ON c.to_uom_id = u2.id
  `);
  return c.json({ success: true, data: { uoms: uomRes.rows, conversions: convRes.rows } });
});

// 4. Vehicle Types (CDE, CDD, Fuso, Wingbox, Dump Truck, Tanker, Trailer)
masterRoutes.get('/vehicle-types', async (c) => {
  const result = await query(`SELECT * FROM master_vehicle_types WHERE is_active = true ORDER BY max_payload_kg ASC`);
  return c.json({ success: true, data: result.rows });
});

// 5. Document Types (SJ Supplier, SJ Pengiriman, Master AWB, House AWB)
masterRoutes.get('/document-types', async (c) => {
  const result = await query(`SELECT * FROM master_document_types WHERE is_active = true ORDER BY category, name`);
  return c.json({ success: true, data: result.rows });
});
