import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../src/db.js';
import { app } from '../../src/app.js';

vi.mock('../../src/db.js', () => ({
  query: vi.fn(),
  pool: { connect: vi.fn() }
}));

describe('Warehouses and Products API Routes Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Warehouse Routes', () => {
    it('GET /api/warehouses should list all warehouses', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [
          { id: 'wh-1', code: 'WH-CGK-01', name: 'Main Central Hub Jakarta', type: 'MAIN_HUB' },
          { id: 'wh-2', code: 'WH-DPS-01', name: 'Spoke Transit Bali', type: 'TRANSIT' }
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
          rows: [{ id: 'wh-1', code: 'WH-CGK-01', name: 'Main Hub Jakarta', type: 'MAIN_HUB' }]
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

    it('POST /api/warehouses should create new warehouse', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'wh-3', code: 'WH-BPN-01', name: 'Spoke Transit Balikpapan', type: 'TRANSIT' }]
      } as any);

      const res = await app.request('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'WH-BPN-01',
          name: 'Spoke Transit Balikpapan',
          type: 'TRANSIT',
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
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'p-3', sku_code: 'KDMP-FREEZER-500L', name: 'Chest Freezer Deep 500L', unit: 'UNIT' }]
      } as any);

      const res = await app.request('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku_code: 'KDMP-FREEZER-500L',
          name: 'Chest Freezer Deep 500L',
          unit: 'UNIT',
          weight_kg: 85,
          volume_m3: 1.2,
          min_stock_qty: 5
        })
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.sku_code).toBe('KDMP-FREEZER-500L');
    });
  });
});
