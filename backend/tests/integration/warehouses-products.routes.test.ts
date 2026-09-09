import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../src/db.js';
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

const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_JWT}` };

describe('Warehouses and Products API Routes Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Warehouse Routes', () => {
    it('GET /api/warehouses should list all warehouses', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [
          { id: 'wh-1', code: 'WH-CGK-01', name: 'Main Central Hub Jakarta', type: 'Main Consolidation & Fulfillment Hub' },
          { id: 'wh-2', code: 'WH-DPS-01', name: 'Spoke Transit Bali', type: 'Transit Spoke Warehouse' }
        ]
      } as any);

      const res = await app.request('/api/warehouses');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
    });

    it('GET /api/warehouses/:id should return warehouse detail and storage locations', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({
          rows: [{ id: 'wh-1', code: 'WH-CGK-01', name: 'Main Hub Jakarta', type: 'Main Hub' }]
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 'loc-1', warehouse_id: 'wh-1', zone: 'A', aisle: '01', rack: '01', bin: '01' }]
        } as any);

      const res = await app.request('/api/warehouses/wh-1');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Main Hub Jakarta');
      expect(body.data.locations).toHaveLength(1);
    });

    it('GET /api/warehouses/:id should return 404 if warehouse not found', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [] } as any);

      const res = await app.request('/api/warehouses/wh-non-existent');
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe('Warehouse not found');
    });

    it('POST /api/warehouses should create new warehouse with valid type', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [] } as any) // duplicate code check
        .mockResolvedValueOnce({ rows: [{ id: 'wt-2', name: 'Transit Spoke Warehouse' }] } as any) // type lookup
        .mockResolvedValueOnce({
          rows: [{ id: 'wh-3', code: 'WH-BPN-01', name: 'Spoke Transit Balikpapan', type: 'Transit Spoke Warehouse' }]
        } as any); // insert

      const res = await app.request('/api/warehouses', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          code: 'WH-BPN-01',
          name: 'Spoke Transit Balikpapan',
          warehouse_type_id: '40000000-0000-0000-0000-000000000002',
          address: 'Kariangau Km 13',
          city: 'Balikpapan',
          contact_name: 'Pak Doni',
          contact_phone: '08123456789'
        })
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.code).toBe('WH-BPN-01');
    });

    it('POST /api/warehouses should reject unknown warehouse type', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const res = await app.request('/api/warehouses', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          code: 'WH-X', name: 'Gudang X', warehouse_type_id: '40000000-0000-0000-0000-000000000099',
          address: 'Jl. Test', city: 'Test'
        })
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it('PUT /api/warehouses/:id should update warehouse', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ id: 'wh-1', code: 'WH-CGK-01' }] } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 'wh-1', code: 'WH-CGK-01', name: 'Main Hub Jakarta Barat', is_active: true }]
        } as any);

      const res = await app.request('/api/warehouses/wh-1', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ name: 'Main Hub Jakarta Barat', is_active: true })
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.name).toBe('Main Hub Jakarta Barat');
    });

    it('POST /api/warehouses/:id/locations should create storage location', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ id: 'wh-1' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any) // duplicate check
        .mockResolvedValueOnce({ rows: [{ id: 'loc-9', warehouse_id: 'wh-1', zone: 'C', aisle: 'A1', rack: 'R1', bin: 'B1' }] } as any);

      const res = await app.request('/api/warehouses/wh-1/locations', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ zone: 'C', aisle: 'A1', rack: 'R1', bin: 'B1' })
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe('Product Routes', () => {
    it('GET /api/products should return all products with total on hand stock', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [
          { id: 'p-1', sku_code: 'KDMP-CHILLER-300L', name: 'Chiller Display Showcase 300L', total_on_hand: 50 },
          { id: 'p-2', sku_code: 'SUGAR-RAW-1T', name: 'Gula Kristal Putih Jumbo Bag 1T', total_on_hand: 20 }
        ]
      } as any);

      const res = await app.request('/api/products');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].sku_code).toBe('KDMP-CHILLER-300L');
    });

    it('POST /api/products should create new product / SKU', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [] } as any) // duplicate check
        .mockResolvedValueOnce({
          rows: [{ id: 'p-3', sku_code: 'KDMP-FREEZER-500L', name: 'Chest Freezer Deep 500L' }]
        } as any); // insert

      const res = await app.request('/api/products', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          sku_code: 'KDMP-FREEZER-500L',
          name: 'Chest Freezer Deep 500L',
          cargo_type_id: '40000000-0000-0000-0000-000000000001',
          default_uom_id: '30000000-0000-0000-0000-000000000009',
          weight_kg_per_unit: 85,
          volume_m3_per_unit: 1.2,
          min_stock_qty: 5
        })
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.sku_code).toBe('KDMP-FREEZER-500L');
    });

    it('POST /api/products should reject duplicate SKU', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [{ id: 'p-1' }] } as any);

      const res = await app.request('/api/products', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          sku_code: 'KDMP-CHILLER-300L', name: 'Duplikat',
          cargo_type_id: '40000000-0000-0000-0000-000000000001',
          default_uom_id: '30000000-0000-0000-0000-000000000009'
        })
      });
      expect(res.status).toBe(409);
    });

    it('PUT /api/products/:id should update product', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ id: 'p-1', sku_code: 'KDMP-CHILLER-300L' }] } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 'p-1', sku_code: 'KDMP-CHILLER-300L', name: 'Showcase Chiller 300L Update', min_stock_qty: 8 }]
        } as any);

      const res = await app.request('/api/products/p-1', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ name: 'Showcase Chiller 300L Update', min_stock_qty: 8 })
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.name).toBe('Showcase Chiller 300L Update');
    });

    it('POST /api/products without token should return 401', async () => {
      const res = await app.request('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku_code: 'X-1', name: 'Tanpa Token' })
      });
      expect(res.status).toBe(401);
    });
  });
});
