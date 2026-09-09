import { Hono } from 'hono';
import { z } from 'zod';
import { query } from '../db.js';
import { authenticate, requireRole, UserTokenPayload } from '../middlewares/auth.js';
import { recordCheckpoint } from '../services/checkpoint.js';

export const warehouseRoutes = new Hono();

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN_ADM'];

const warehouseSchema = z.object({
  code: z.string().min(2).max(32),
  name: z.string().min(3).max(160),
  warehouse_type_id: z.string().uuid(),
  address: z.string().min(3).max(300),
  city: z.string().min(2).max(80),
  has_weighbridge: z.boolean().default(false),
  has_debulking_facility: z.boolean().default(false),
  contact_name: z.string().max(120).nullish(),
  contact_phone: z.string().max(32).nullish()
});

const locationSchema = z.object({
  zone: z.string().min(1).max(32),
  aisle: z.string().min(1).max(32),
  rack: z.string().min(1).max(32),
  bin: z.string().min(1).max(32),
  location_type: z.enum(['STANDARD_RACK', 'FLOOR_STAGING', 'BULK_SILO', 'CROSS_DOCK_LANE', 'COLD_STORAGE']).default('STANDARD_RACK'),
  max_weight_capacity_kg: z.number().positive().max(1000000).default(2000),
  max_volume_capacity_cbm: z.number().positive().max(10000).default(5)
});

// List all warehouses
warehouseRoutes.get('/', async (c) => {
  const result = await query(
    `SELECT w.*, wt.name AS type
     FROM warehouses w
     LEFT JOIN master_warehouse_types wt ON w.warehouse_type_id = wt.id
     ORDER BY wt.name ASC, w.name ASC`
  );
  return c.json({ success: true, data: result.rows });
});

// Get warehouse by ID + locations
warehouseRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const whRes = await query(`SELECT * FROM warehouses WHERE id = $1`, [id]);
  if (whRes.rows.length === 0) {
    return c.json({ success: false, message: 'Warehouse not found' }, 404);
  }
  const locRes = await query(`SELECT * FROM warehouse_locations WHERE warehouse_id = $1 ORDER BY zone, aisle, rack, bin`, [id]);
  return c.json({ success: true, data: { ...whRes.rows[0], locations: locRes.rows } });
});

// Create warehouse (admin only)
warehouseRoutes.post('/', authenticate, requireRole(ADMIN_ROLES), async (c) => {
  const user = c.get('user' as any) as UserTokenPayload;
  const parsed = warehouseSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ success: false, message: 'Data tidak valid', details: parsed.error.flatten().fieldErrors }, 400);
  }
  const d = parsed.data;

  const dupRes = await query(`SELECT id FROM warehouses WHERE code = $1 LIMIT 1`, [d.code]);
  if (dupRes.rows.length > 0) {
    return c.json({ success: false, message: `Kode gudang '${d.code}' sudah dipakai` }, 409);
  }

  // Ground truth check: warehouse type must exist (anti-hallucination, OWASP LLM09)
  const typeRes = await query(`SELECT id, name FROM master_warehouse_types WHERE id = $1`, [d.warehouse_type_id]);
  if (typeRes.rows.length === 0) {
    return c.json({ success: false, message: 'Tipe gudang tidak dikenal' }, 400);
  }

  const result = await query(
    `INSERT INTO warehouses (id, code, name, warehouse_type_id, address, city, has_weighbridge, has_debulking_facility, contact_name, contact_phone)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [d.code, d.name, d.warehouse_type_id, d.address, d.city, d.has_weighbridge, d.has_debulking_facility, d.contact_name || null, d.contact_phone || null]
  );
  const created = result.rows[0];

  await recordCheckpoint({
    entity_type: 'WAREHOUSE',
    entity_id: created.id,
    entity_number: created.code,
    step_code: 'WAREHOUSE_CREATED',
    step_label: 'Master gudang dibuat',
    actor_id: user.id,
    actor_name: user.full_name,
    actor_role: user.role,
    notes: `Gudang ${created.name} (${typeRes.rows[0].name}) — ${created.city}`
  });

  return c.json({ success: true, data: { ...created, type: typeRes.rows[0].name } }, 201);
});

// Update warehouse (admin only)
warehouseRoutes.put('/:id', authenticate, requireRole(ADMIN_ROLES), async (c) => {
  const user = c.get('user' as any) as UserTokenPayload;
  const id = c.req.param('id');
  const parsed = warehouseSchema.partial().extend({
    is_active: z.boolean().optional()
  }).safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ success: false, message: 'Data tidak valid', details: parsed.error.flatten().fieldErrors }, 400);
  }
  const d = parsed.data;

  const exists = await query(`SELECT id, code FROM warehouses WHERE id = $1`, [id]);
  if (exists.rows.length === 0) {
    return c.json({ success: false, message: 'Warehouse not found' }, 404);
  }

  if (d.warehouse_type_id) {
    const typeRes = await query(`SELECT id FROM master_warehouse_types WHERE id = $1`, [d.warehouse_type_id]);
    if (typeRes.rows.length === 0) {
      return c.json({ success: false, message: 'Tipe gudang tidak dikenal' }, 400);
    }
  }

  const sets: string[] = [];
  const params: any[] = [];
  const push = (col: string, val: any) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  if (d.code !== undefined) push('code', d.code);
  if (d.name !== undefined) push('name', d.name);
  if (d.warehouse_type_id !== undefined) push('warehouse_type_id', d.warehouse_type_id);
  if (d.address !== undefined) push('address', d.address);
  if (d.city !== undefined) push('city', d.city);
  if (d.has_weighbridge !== undefined) push('has_weighbridge', d.has_weighbridge);
  if (d.has_debulking_facility !== undefined) push('has_debulking_facility', d.has_debulking_facility);
  if (d.contact_name !== undefined) push('contact_name', d.contact_name || null);
  if (d.contact_phone !== undefined) push('contact_phone', d.contact_phone || null);
  if (d.is_active !== undefined) push('is_active', d.is_active);
  if (sets.length === 0) {
    return c.json({ success: false, message: 'Tidak ada perubahan yang dikirim' }, 400);
  }
  params.push(id);
  sets.push(`updated_at = CURRENT_TIMESTAMP`);

  const result = await query(
    `UPDATE warehouses SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );

  await recordCheckpoint({
    entity_type: 'WAREHOUSE',
    entity_id: id!,
    entity_number: exists.rows[0]!.code,
    step_code: 'WAREHOUSE_UPDATED',
    step_label: 'Master gudang diperbarui',
    actor_id: user.id,
    actor_name: user.full_name,
    actor_role: user.role,
    notes: `Perubahan: ${Object.keys(d).join(', ')}`
  });

  return c.json({ success: true, data: result.rows[0] });
});

// Create storage location inside a warehouse (admin only)
warehouseRoutes.post('/:id/locations', authenticate, requireRole(ADMIN_ROLES), async (c) => {
  const user = c.get('user' as any) as UserTokenPayload;
  const warehouseId = c.req.param('id');
  const parsed = locationSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ success: false, message: 'Data lokasi tidak valid', details: parsed.error.flatten().fieldErrors }, 400);
  }
  const d = parsed.data;

  const whRes = await query(`SELECT id, code FROM warehouses WHERE id = $1`, [warehouseId]);
  if (whRes.rows.length === 0) {
    return c.json({ success: false, message: 'Warehouse not found' }, 404);
  }

  const dupRes = await query(
    `SELECT id FROM warehouse_locations WHERE warehouse_id = $1 AND zone = $2 AND aisle = $3 AND rack = $4 AND bin = $5 LIMIT 1`,
    [warehouseId, d.zone, d.aisle, d.rack, d.bin]
  );
  if (dupRes.rows.length > 0) {
    return c.json({ success: false, message: 'Kombinasi zone/aisle/rack/bin sudah ada di gudang ini' }, 409);
  }

  const result = await query(
    `INSERT INTO warehouse_locations (id, warehouse_id, zone, aisle, rack, bin, location_type, max_weight_capacity_kg, max_volume_capacity_cbm)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [warehouseId, d.zone, d.aisle, d.rack, d.bin, d.location_type, d.max_weight_capacity_kg, d.max_volume_capacity_cbm]
  );
  const created = result.rows[0];

  await recordCheckpoint({
    entity_type: 'WAREHOUSE_LOCATION',
    entity_id: created.id,
    entity_number: `${whRes.rows[0].code}/${d.zone}-${d.aisle}-${d.rack}-${d.bin}`,
    step_code: 'LOCATION_CREATED',
    step_label: 'Lokasi penyimpanan dibuat',
    actor_id: user.id,
    actor_name: user.full_name,
    actor_role: user.role,
    notes: `Lokasi ${d.zone}/${d.aisle}/${d.rack}/${d.bin} tipe ${d.location_type}`
  });

  return c.json({ success: true, data: created }, 201);
});
