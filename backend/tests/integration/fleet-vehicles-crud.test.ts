import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../src/db.js';
import * as checkpointService from '../../src/services/checkpoint.js';
import { app } from '../../src/app.js';
import { generateToken } from '../../src/middlewares/auth.js';

vi.mock('../../src/db.js', () => ({
  query: vi.fn(),
  pool: { connect: vi.fn() }
}));

vi.mock('../../src/services/checkpoint.js', () => ({
  recordCheckpoint: vi.fn()
}));

const ADMIN_JWT = await generateToken({
  id: 'u-admin', username: 'admin_adm', full_name: 'Admin ADM', email: 'admin@wms.local',
  role: 'ADMIN_ADM', warehouse_id: null, customer_id: null
});

const STAFF_JWT = await generateToken({
  id: 'u-staff', username: 'staff_jkt', full_name: 'Joko Susanto', email: 'staff@wms.local',
  role: 'WH_STAFF', warehouse_id: null, customer_id: null
});

const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_JWT}` };
const staffHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${STAFF_JWT}` };

const VALID_VEHICLE = {
  plate_number: 'B 9999 XYZ',
  vehicle_type_id: '60000000-0000-0000-0000-000000000001',
  brand: 'Hino',
  model: 'Dutro 130',
  year_made: 2023,
  assigned_warehouse_id: 'a0000000-0000-0000-0000-000000000001'
};

describe('Fleet Vehicle Master CRUD (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/fleet/vehicles should return vehicle list with type info', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'v-1', plate_number: 'B 1234 WMS', vehicle_type_name: 'CDD Box', status: 'AVAILABLE' }]
    } as any);

    const res = await app.request('/api/fleet/vehicles');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data[0].vehicle_type_name).toBe('CDD Box');
  });

  it('POST /api/fleet/vehicles should create vehicle (admin)', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [] } as any) // duplicate plate
      .mockResolvedValueOnce({ rows: [{ id: '60000000-0000-0000-0000-000000000001', name: 'CDE Box' }] } as any) // type
      .mockResolvedValueOnce({ rows: [{ id: 'v-9', plate_number: 'B 9999 XYZ', status: 'AVAILABLE' }] } as any); // insert

    const res = await app.request('/api/fleet/vehicles', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(VALID_VEHICLE)
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.plate_number).toBe('B 9999 XYZ');
  });

  it('POST /api/fleet/vehicles should reject duplicate plate (409)', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [{ id: 'v-1' }] } as any); // duplicate plate

    const res = await app.request('/api/fleet/vehicles', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(VALID_VEHICLE)
    });
    expect(res.status).toBe(409);
  });

  it('POST /api/fleet/vehicles should reject unknown vehicle type (400)', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [] } as any) // duplicate plate
      .mockResolvedValueOnce({ rows: [] } as any); // type lookup

    const res = await app.request('/api/fleet/vehicles', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(VALID_VEHICLE)
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/fleet/vehicles should reject non-admin (403)', async () => {
    const res = await app.request('/api/fleet/vehicles', {
      method: 'POST',
      headers: staffHeaders,
      body: JSON.stringify(VALID_VEHICLE)
    });
    expect(res.status).toBe(403);
  });

  it('POST /api/fleet/vehicles should reject without token (401)', async () => {
    const res = await app.request('/api/fleet/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_VEHICLE)
    });
    expect(res.status).toBe(401);
  });

  it('PUT /api/fleet/vehicles/:id should update vehicle', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [{ id: 'v-1', plate_number: 'B 1234 WMS', status: 'AVAILABLE' }] } as any) // exists
      .mockResolvedValueOnce({ rows: [{ id: 'v-1', plate_number: 'B 1234 WMS', status: 'MAINTENANCE' }] } as any); // update

    const res = await app.request('/api/fleet/vehicles/v-1', {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ status: 'MAINTENANCE', kir_expiry_date: '2027-06-15' })
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('MAINTENANCE');
  });

  it('PUT should refuse deactivate while vehicle IN_USE with open exit log', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [{ id: 'v-1', plate_number: 'B 1234 WMS', status: 'IN_USE' }] } as any) // exists
      .mockResolvedValueOnce({ rows: [{ id: 'fel-1' }] } as any); // open exit log

    const res = await app.request('/api/fleet/vehicles/v-1', {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ is_active: false })
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('PUT should return 404 for unknown vehicle', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ rows: [] } as any);

    const res = await app.request('/api/fleet/vehicles/v-none', {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ status: 'MAINTENANCE' })
    });
    expect(res.status).toBe(404);
  });
});
