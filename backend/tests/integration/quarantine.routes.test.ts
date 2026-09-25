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

describe('Quarantine & Return Management API Routes Integration Tests', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn()
    };
    vi.mocked(db.pool.connect).mockResolvedValue(mockClient);
  });

  describe('GET /api/stock/quarantine', () => {
    it('should return list of quarantine records with filters', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [
          {
            id: 'qrn-1',
            record_number: 'QRN20260901',
            warehouse_name: 'Gudang Utama Cikarang',
            sku_code: 'KDMPCHILLER300L',
            product_name: 'Showcase Chiller 300L',
            qty: 2,
            unit: 'UNIT',
            source_type: 'DAMAGE_FOUND',
            reason: 'Kaca showcase retak saat staging',
            inspection_status: 'PENDING'
          }
        ]
      } as any);

      const res = await app.request('/api/stock/quarantine?warehouse_id=wh-1&status=PENDING');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].record_number).toBe('QRN20260901');
      expect(body.data[0].inspection_status).toBe('PENDING');
    });
  });

  describe('POST /api/stock/quarantine', () => {
    it('should validate form and reject invalid payload (missing fields / negative qty)', async () => {
      const res = await app.request('/api/stock/quarantine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: '',
          product_id: '',
          qty: -5,
          reason: ''
        })
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain('Validasi form gagal');
    });

    it('should hold item into quarantine, deduct on_hand, pass txClient, and record checkpoint', async () => {
      // 1. Mock product lookup
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ default_uom_id: 'uom-pcs', sku_code: 'KDMPCHILLER300L', name: 'Showcase Chiller 300L' }]
      } as any);

      // 2. Mock client.query for INSERT RETURNING
      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes('INSERT INTO quarantine_records')) {
          return {
            rows: [{
              id: 'qrn-uuid-1',
              record_number: 'QRN12345678',
              warehouse_id: 'wh-cikarang',
              product_id: 'prod-chiller',
              qty: 3,
              inspection_status: 'PENDING'
            }]
          };
        }
        return { rows: [] };
      });

      const res = await app.request('/api/stock/quarantine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: 'wh-cikarang',
          product_id: 'prod-chiller',
          qty: 3,
          reason: 'Unit miring saat penurunan kontainer (>45 derajat)',
          source_type: 'DAMAGE_FOUND',
          actor_name: 'Checker Ahmad'
        })
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.inspection_status).toBe('PENDING');

      // Verify adjustStock was called with txClient: mockClient
      expect(stockService.adjustStock).toHaveBeenCalledWith(
        expect.objectContaining({
          warehouse_id: 'wh-cikarang',
          product_id: 'prod-chiller',
          movement_type: 'QUARANTINE_HOLD',
          qty_change: -3,
          performed_by_name: 'Checker Ahmad',
          txClient: mockClient
        })
      );

      // Verify checkpoint recorded
      expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'QUARANTINE_RECORD',
          step_code: 'QUARANTINE_HELD',
          actor_name: 'Checker Ahmad'
        })
      );

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('POST /api/stock/quarantine/:id/inspect', () => {
    it('should reject invalid disposition with 400', async () => {
      const res = await app.request('/api/stock/quarantine/qrn-1/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disposition: 'INVALID_DISPOSITION'
        })
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain('Disposisi pemeriksaan tidak valid');
    });

    it('should return 404 if quarantine record is not found', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [] } as any);

      const res = await app.request('/api/stock/quarantine/non-existent/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disposition: 'RETURN_TO_STOCK',
          inspection_notes: 'Lolos uji resting oli 4 jam'
        })
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain('Catatan karantina tidak ditemukan');
    });

    it('should process RETURN_TO_STOCK: replenish on_hand via adjustStock with txClient and record checkpoint', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'qrn-1',
          record_number: 'QRN20260901',
          warehouse_id: 'wh-cikarang',
          product_id: 'prod-chiller',
          qty: 2
        }]
      } as any);

      const res = await app.request('/api/stock/quarantine/qrn-1/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disposition: 'RETURN_TO_STOCK',
          inspection_notes: 'Lolos uji fungsi kompresor, suhu stabil 4°C',
          actor_name: 'QC Lead Bambang'
        })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('RETURN_TO_STOCK');

      // Verify adjustStock replenished on_hand with txClient
      expect(stockService.adjustStock).toHaveBeenCalledWith(
        expect.objectContaining({
          warehouse_id: 'wh-cikarang',
          product_id: 'prod-chiller',
          movement_type: 'QUARANTINE_RELEASE',
          qty_change: 2,
          performed_by_name: 'QC Lead Bambang',
          txClient: mockClient
        })
      );

      // Verify checkpoint
      expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'QUARANTINE_RECORD',
          step_code: 'QUARANTINE_INSPECTED',
          actor_name: 'QC Lead Bambang'
        })
      );
    });

    it('should process DISPOSE_SCRAP without replenishing on_hand', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'qrn-2',
          record_number: 'QRN20260902',
          warehouse_id: 'wh-cikarang',
          product_id: 'prod-chiller',
          qty: 1
        }]
      } as any);

      const res = await app.request('/api/stock/quarantine/qrn-2/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disposition: 'DISPOSE_SCRAP',
          inspection_notes: 'Pipa freon patah dan kompresor terbakar, berita acara pemusnahan #BA-0921',
          actor_name: 'QC Lead Bambang'
        })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // adjustStock should NOT be called for scrap (already deducted on quarantine hold)
      expect(stockService.adjustStock).not.toHaveBeenCalled();

      // Checkpoint must still be recorded
      expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'QUARANTINE_RECORD',
          step_code: 'QUARANTINE_INSPECTED'
        })
      );
    });
  });
});
