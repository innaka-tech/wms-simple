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

describe('Cross-Dock and Cross-Document API Routes Integration Tests', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    };
    vi.mocked(db.pool.connect).mockResolvedValue(mockClient as any);
  });

  describe('Cross-Dock Transfer Routes', () => {
    it('GET /api/crossdock should return manifests list', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'mnf-1', manifest_number: 'MNF-001', status: 'CREATED' }]
      } as any);

      const res = await app.request('/api/crossdock');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });

    it('POST /api/crossdock should create manifest and checkpoint MANIFEST_CREATED', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({   // INSERT cross_dock_manifests
          rows: [{ id: 'mnf-1', manifest_number: 'MNF-20260901', status: 'CREATED' }]
        })
        .mockResolvedValueOnce({}) // INSERT cross_dock_items
        .mockResolvedValueOnce({}); // COMMIT

      const res = await app.request('/api/crossdock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_warehouse_id: 'wh-jakarta',
          destination_warehouse_id: 'wh-bali',
          customer_id: 'cust-1',
          items: [{ product_id: 'p-chiller', planned_qty: 10 }],
          actor_name: 'Admin Logistik'
        })
      });

      expect(res.status).toBe(201);
      expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          step_code: 'MANIFEST_CREATED',
          actor_name: 'Admin Logistik'
        })
      );
    });

    it('POST /api/crossdock/:id/load should update loaded_qty, trigger CROSS_DOCK_OUT stock movement and checkpoint', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'mnf-1', manifest_number: 'MNF-001', source_warehouse_id: 'wh-jakarta' }]
      } as any);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE cross_dock_items
        .mockResolvedValueOnce({}) // UPDATE cross_dock_manifests status LOADED
        .mockResolvedValueOnce({}); // COMMIT

      const res = await app.request('/api/crossdock/mnf-1/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: 'item-1', product_id: 'p-chiller', loaded_qty: 10 }],
          actor_name: 'Checker Dimas'
        })
      });

      expect(res.status).toBe(200);
      expect(stockService.adjustStock).toHaveBeenCalledWith(
        expect.objectContaining({
          movement_type: 'CROSS_DOCK_OUT',
          qty_change: -10,
          warehouse_id: 'wh-jakarta'
        })
      );
      expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          step_code: 'MANIFEST_LOADED',
          actor_name: 'Checker Dimas'
        })
      );
    });

    it('POST /api/crossdock/:id/receive-dest should receive at spoke transit, trigger CROSS_DOCK_IN stock movement', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'mnf-1', manifest_number: 'MNF-001', destination_warehouse_id: 'wh-bali' }]
      } as any);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE cross_dock_items
        .mockResolvedValueOnce({}) // UPDATE cross_dock_manifests status RECEIVED_DEST
        .mockResolvedValueOnce({}); // COMMIT

      const res = await app.request('/api/crossdock/mnf-1/receive-dest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: 'item-1', product_id: 'p-chiller', received_qty: 10 }],
          actor_name: 'Spoke Staff Ketut'
        })
      });

      expect(res.status).toBe(200);
      expect(stockService.adjustStock).toHaveBeenCalledWith(
        expect.objectContaining({
          movement_type: 'CROSS_DOCK_IN',
          qty_change: 10,
          warehouse_id: 'wh-bali'
        })
      );
      expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          step_code: 'RECEIVED_AT_DEST',
          actor_name: 'Spoke Staff Ketut'
        })
      );
    });
  });

  describe('Cross-Document (SJ Swap) Routes', () => {
    it('GET /api/crossdoc should return list of cross documents', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'xdoc-1', cross_doc_number: 'XDOC-001', status: 'ISSUED' }]
      } as any);

      const res = await app.request('/api/crossdoc');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });

    it('POST /api/crossdoc should issue reissued surat jalan (swap doc) and record checkpoint', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({   // INSERT cross_documents
          rows: [{ id: 'xdoc-1', cross_doc_number: 'XDOC-20260901', status: 'ISSUED' }]
        })
        .mockResolvedValueOnce({}) // INSERT cross_document_items
        .mockResolvedValueOnce({}); // COMMIT

      const res = await app.request('/api/crossdoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: 'wh-jakarta',
          customer_id: 'cust-1',
          source_document_type_id: 'doc-sj-supplier',
          source_document_number: 'SJ-SUPP-999',
          source_sender_name: 'Pabrik Chiller Jakarta',
          target_document_type_id: 'doc-sj-wms',
          target_document_number: 'SJ-WMS-888',
          target_recipient_name: 'Koperasi Merah Putih Bali',
          items: [{ product_id: 'p-chiller', original_qty: 10, reissued_qty: 10, uom_id: 'u-unit' }],
          actor_name: 'Admin Swap'
        })
      });

      expect(res.status).toBe(201);
      expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          step_code: 'CROSS_DOC_ISSUED',
          actor_name: 'Admin Swap'
        })
      );
    });
  });
});
