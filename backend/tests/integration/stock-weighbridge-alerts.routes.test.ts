import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../src/db.js';
import * as checkpointService from '../../src/services/checkpoint.js';
import * as stockService from '../../src/services/stock.js';
import { app } from '../../src/app.js';

vi.mock('../../src/db.js', () => ({
  query: vi.fn(),
  pool: { connect: vi.fn() }
}));

vi.mock('../../src/services/checkpoint.js', () => ({
  recordCheckpoint: vi.fn()
}));

vi.mock('../../src/services/stock.js', () => ({
  adjustStock: vi.fn()
}));

describe('Stock, Weighbridge, Checkpoints, and Alerts API Routes Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Stock Routes', () => {
    it('GET /api/stock/levels should return stock levels snapshot with is_low_stock flag', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [
          {
            id: 'sl-1',
            warehouse_name: 'Main Hub Jakarta',
            sku_code: 'KDMP-CHILLER',
            qty_on_hand: 5,
            min_stock_qty: 10,
            is_low_stock: true
          }
        ]
      } as any);

      const res = await app.request('/api/stock/levels?warehouse_id=wh-jakarta');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data[0].is_low_stock).toBe(true);
    });

    it('GET /api/stock/movements should return stock movements audit ledger', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [
          { id: 'sm-1', movement_type: 'INBOUND_PUTAWAY', qty_change: 20, performed_by_name: 'Budi Staff' }
        ]
      } as any);

      const res = await app.request('/api/stock/movements');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });

    it('POST /api/stock/adjust should perform manual opname stock adjustment and checkpoint', async () => {
      vi.mocked(stockService.adjustStock).mockResolvedValueOnce({
        id: 'sm-adj-1',
        movement_type: 'ADJUSTMENT',
        qty_change: -2
      } as any);

      const res = await app.request('/api/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: 'wh-jakarta',
          product_id: 'p-chiller',
          qty_change: -2,
          notes: 'Barang rusak saat pemindahan rak',
          actor_name: 'Pak Hendra WH Manager'
        })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          step_code: 'STOCK_ADJUSTED',
          actor_name: 'Pak Hendra WH Manager'
        })
      );
    });
  });

  describe('Weighbridge Routes', () => {
    it('GET /api/weighbridge should list weighbridge tickets', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [
          { id: 'wb-1', ticket_number: 'WB-001', truck_plate: 'B 1234 CD', first_weight_gross_kg: 14500 }
        ]
      } as any);

      const res = await app.request('/api/weighbridge');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });

    it('POST /api/weighbridge should create weighbridge ticket', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'wb-1', ticket_number: 'WB-20260901', first_weight_gross_kg: 15000 }]
      } as any);

      const res = await app.request('/api/weighbridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: 'wh-jakarta',
          truck_plate: 'B 9999 XYZ',
          first_weight_gross_kg: 15000,
          second_weight_tare_kg: 5000,
          weighbridge_operator: 'Operator Anton'
        })
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.ticket_number).toBe('WB-20260901');
    });
  });

  describe('Checkpoint Chain Routes', () => {
    it('GET /api/checkpoints/:entity_type/:entity_id should return ordered chain logs', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [
          { id: 'cp-1', step_code: 'PO_CREATED', actor_name: 'Admin', prev_checkpoint_id: null },
          { id: 'cp-2', step_code: 'PO_RECEIVED', actor_name: 'Checker', prev_checkpoint_id: 'cp-1' }
        ]
      } as any);

      const res = await app.request('/api/checkpoints/INBOUND_ORDER/inbound-123');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.data[1].prev_checkpoint_id).toBe('cp-1');
    });
  });

  describe('Alerts Routes', () => {
    it('GET /api/alerts should return active alerts', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [
          { id: 'al-1', alert_type: 'DEBULKING_SHRINKAGE_HIGH', title: 'Susut Tinggi', is_resolved: false }
        ]
      } as any);

      const res = await app.request('/api/alerts?is_resolved=false');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });

    it('POST /api/alerts/:id/resolve should resolve alert', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'al-1', is_resolved: true, resolution_notes: 'Sudah diinvestigasi tim operasional' }]
      } as any);

      const res = await app.request('/api/alerts/al-1/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution_notes: 'Sudah diinvestigasi tim operasional',
          actor_name: 'WH Manager Budi'
        })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.is_resolved).toBe(true);
    });
  });
});
