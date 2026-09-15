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

describe('Stock Opname (Cycle Count) API Routes Integration Tests', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn()
    };
    vi.mocked(db.pool.connect).mockResolvedValue(mockClient);
  });

  describe('GET /api/stock/opname', () => {
    it('should list stock opname sessions with warehouse filter and metrics', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [
          {
            id: 'sess-1',
            opname_number: 'OPNAME202609',
            warehouse_name: 'Gudang Utama Jakarta',
            status: 'IN_PROGRESS',
            total_items: 15,
            discrepancy_items: 2,
            created_by_name: 'Checker Joko'
          }
        ]
      } as any);

      const res = await app.request('/api/stock/opname?warehouse_id=wh-1');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].opname_number).toBe('OPNAME202609');
      expect(body.data[0].discrepancy_items).toBe(2);
    });
  });

  describe('GET /api/stock/opname/:id', () => {
    it('should return session detail along with snapshot items', async () => {
      // 1. Session query
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [
          {
            id: 'sess-1',
            opname_number: 'OPNAME202609',
            warehouse_name: 'Gudang Utama Jakarta',
            status: 'IN_PROGRESS'
          }
        ]
      } as any);

      // 2. Items query
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [
          {
            id: 'item-1',
            sku_code: 'KDMPCHILLER300L',
            product_name: 'Showcase Chiller 300L',
            system_qty: 10,
            physical_qty: 9,
            difference_qty: -1,
            status: 'DISCREPANCY',
            unit: 'UNIT'
          }
        ]
      } as any);

      const res = await app.request('/api/stock/opname/sess-1');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.opname_number).toBe('OPNAME202609');
      expect(body.data.items).toHaveLength(1);
      expect(body.data.items[0].difference_qty).toBe(-1);
    });

    it('should return 404 if opname session does not exist', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [] } as any);

      const res = await app.request('/api/stock/opname/non-existent-session');
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain('tidak ditemukan');
    });
  });

  describe('POST /api/stock/opname', () => {
    it('should validate warehouse_id and reject if missing', async () => {
      const res = await app.request('/api/stock/opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouse_id: '' })
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain('Gudang wajib dipilih');
    });

    it('should create opname session with non-hyphen OPNAMEXXXXXX, populate items snapshot, and record checkpoint', async () => {
      // Mock client.query for INSERT session RETURNING and stock_levels SELECT
      mockClient.query.mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('INSERT INTO stock_opname_sessions')) {
          return {
            rows: [{
              id: 'sess-uuid-1',
              opname_number: params?.[0] || 'OPNAME123456',
              warehouse_id: 'wh-1',
              status: 'IN_PROGRESS'
            }]
          };
        }
        if (sql.includes('SELECT sl.product_id')) {
          return {
            rows: [
              { product_id: 'prod-1', qty_on_hand: 50, uom_id: 'uom-1' },
              { product_id: 'prod-2', qty_on_hand: 20, uom_id: 'uom-2' }
            ]
          };
        }
        return { rows: [] };
      });

      const res = await app.request('/api/stock/opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: 'wh-1',
          zone: 'Zona Cold Storage',
          notes: 'Audit bulanan chiller dan freezer',
          actor_name: 'Auditor Salim'
        })
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('IN_PROGRESS');

      // Verify non-hyphen numbering format
      expect(body.data.opname_number).toMatch(/^OPNAME[A-Z0-9]+$/);

      // Verify stock items were snapshotted
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO stock_opname_items'),
        expect.any(Array)
      );

      // Verify checkpoint recorded
      expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'STOCK_OPNAME',
          step_code: 'OPNAME_STARTED',
          actor_name: 'Auditor Salim'
        })
      );
    });
  });

  describe('POST /api/stock/opname/:id/count', () => {
    it('should update physical count, calculate difference, and set status to DISCREPANCY', async () => {
      vi.mocked(db.query).mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT * FROM stock_opname_items')) {
          return {
            rows: [{
              id: 'item-1',
              session_id: 'sess-1',
              product_id: 'prod-1',
              system_qty: 25,
              physical_qty: 25,
              difference_qty: 0
            }]
          };
        }
        if (sql.includes('UPDATE stock_opname_items')) {
          return { rows: [{ id: 'item-1', difference_qty: -3, status: 'DISCREPANCY' }] };
        }
        return { rows: [] };
      });

      const res = await app.request('/api/stock/opname/sess-1/count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: 'item-1',
          physical_qty: 22,
          notes: '3 unit kemasan penyok/rusak',
          actor_name: 'Checker Dodi'
        })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.difference_qty).toBe(-3);
    });
  });

  describe('POST /api/stock/opname/:id/reconcile', () => {
    it('should reject already reconciled session with 400', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'sess-1',
          status: 'RECONCILED'
        }]
      } as any);

      const res = await app.request('/api/stock/opname/sess-1/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_name: 'Manager Hendra' })
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain('sudah direkonsiliasi');
    });

    it('should adjust double-entry stock ledger with txClient, mark session RECONCILED, and record checkpoint', async () => {
      // 1. Session lookup
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'sess-1',
          opname_number: 'OPNAME202609',
          warehouse_id: 'wh-cikarang',
          status: 'IN_PROGRESS'
        }]
      } as any);

      // 2. Discrepancy items lookup
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [
          {
            id: 'item-diff-1',
            product_id: 'prod-chiller',
            sku_code: 'KDMPCHILLER300L',
            difference_qty: -2,
            notes: 'Selisih fisik kurang 2 unit'
          },
          {
            id: 'item-diff-2',
            product_id: 'prod-sugar',
            sku_code: 'SUGARSACK25KG',
            difference_qty: 5,
            notes: 'Fisik lebih 5 karung dari batch sebelumnya'
          }
        ]
      } as any);

      const res = await app.request('/api/stock/opname/sess-1/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor_name: 'Manager Hendra'
        })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('berhasil diselesaikan');

      // Verify adjustStock was called for both items with txClient: mockClient
      expect(stockService.adjustStock).toHaveBeenCalledTimes(2);
      expect(stockService.adjustStock).toHaveBeenCalledWith(
        expect.objectContaining({
          warehouse_id: 'wh-cikarang',
          product_id: 'prod-chiller',
          movement_type: 'STOCK_OPNAME_RECONCILE',
          qty_change: -2,
          txClient: mockClient
        })
      );
      expect(stockService.adjustStock).toHaveBeenCalledWith(
        expect.objectContaining({
          warehouse_id: 'wh-cikarang',
          product_id: 'prod-sugar',
          movement_type: 'STOCK_OPNAME_RECONCILE',
          qty_change: 5,
          txClient: mockClient
        })
      );

      // Verify session updated to RECONCILED
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE stock_opname_sessions SET status = 'RECONCILED'"),
        ['sess-1']
      );

      // Verify checkpoint recorded
      expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'STOCK_OPNAME',
          step_code: 'OPNAME_RECONCILED',
          actor_name: 'Manager Hendra'
        })
      );
    });
  });
});
