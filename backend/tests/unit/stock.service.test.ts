import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../src/db.js';
import { adjustStock, RecordStockMovementParams } from '../../src/services/stock.js';

vi.mock('../../src/db.js', () => ({
  query: vi.fn(),
  pool: {
    connect: vi.fn()
  }
}));

describe('Stock Ledger Service Unit Tests (Skenario STK)', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    };
    vi.mocked(db.pool.connect).mockResolvedValue(mockClient as any);
  });

  it('should validate mandatory performed_by_name (Petugas Name)', async () => {
    const params: RecordStockMovementParams = {
      warehouse_id: 'wh-1',
      product_id: 'prod-1',
      movement_type: 'INBOUND_PUTAWAY',
      reference_type: 'INBOUND_ORDER',
      reference_id: 'ref-1',
      qty_change: 10,
      performed_by_name: '  '
    };

    await expect(adjustStock(params)).rejects.toThrow(
      'Nama petugas mutasi stok wajib diisi (Mandatory petugas_name)'
    );
  });

  // Skenario STK-01: Pencegahan Saldo Negatif
  it('STK-01: should throw an error and rollback if stock on-hand is insufficient (prevent negative balance)', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({   // SELECT stock_levels FOR UPDATE
        rows: [{
          id: 'sl-1',
          warehouse_id: 'wh-jakarta',
          product_id: 'sku-chiller-kdmp',
          qty_on_hand: 10,
          qty_reserved: 0,
          qty_in_transit: 0
        }]
      })
      .mockResolvedValueOnce({}); // ROLLBACK

    const params: RecordStockMovementParams = {
      warehouse_id: 'wh-jakarta',
      product_id: 'sku-chiller-kdmp',
      movement_type: 'OUTBOUND_PICK',
      reference_type: 'OUTBOUND_ORDER',
      reference_id: 'ord-123',
      qty_change: -15, // Try to pick 15 when only 10 available
      performed_by_name: 'Agus Staff'
    };

    await expect(adjustStock(params)).rejects.toThrow(/Stok tidak mencukupi untuk SKU sku-chiller-kdmp/);

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  // Skenario STK-02: Integritas Cross-Dock Inter-Hub
  it('STK-02: should update qty_on_hand and qty_in_transit properly during CROSS_DOCK_OUT', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({   // SELECT stock_levels
        rows: [{
          id: 'sl-1',
          warehouse_id: 'wh-jakarta',
          product_id: 'sku-kdmp-01',
          qty_on_hand: 50,
          qty_in_transit: 0
        }]
      })
      .mockResolvedValueOnce({}) // UPDATE stock_levels (qty_on_hand -50, qty_in_transit +50)
      .mockResolvedValueOnce({   // INSERT stock_movements
        rows: [{
          id: 'sm-001',
          movement_type: 'CROSS_DOCK_OUT',
          qty_change: -50,
          qty_before: 50,
          qty_after: 0
        }]
      })
      .mockResolvedValueOnce({}); // COMMIT

    const params: RecordStockMovementParams = {
      warehouse_id: 'wh-jakarta',
      product_id: 'sku-kdmp-01',
      movement_type: 'CROSS_DOCK_OUT',
      reference_type: 'CROSS_DOCK_MANIFEST',
      reference_id: 'mnf-456',
      qty_change: -50,
      performed_by_name: 'Agus Checker'
    };

    const result = await adjustStock(params);

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE stock_levels'),
      ['wh-jakarta', 'sku-kdmp-01', -50, 50]
    );
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
    expect(result.id).toBe('sm-001');
  });

  it('should initialize stock level to 0 if record does not exist on putaway', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // SELECT -> empty
      .mockResolvedValueOnce({ rows: [{ qty_on_hand: 0 }] }) // INSERT initial row
      .mockResolvedValueOnce({}) // UPDATE stock_levels
      .mockResolvedValueOnce({   // INSERT stock_movements
        rows: [{
          id: 'sm-002',
          movement_type: 'INBOUND_PUTAWAY',
          qty_change: 25,
          qty_before: 0,
          qty_after: 25
        }]
      })
      .mockResolvedValueOnce({}); // COMMIT

    const params: RecordStockMovementParams = {
      warehouse_id: 'wh-bali',
      product_id: 'sku-new-01',
      movement_type: 'INBOUND_PUTAWAY',
      reference_type: 'INBOUND_ORDER',
      reference_id: 'po-789',
      qty_change: 25,
      performed_by_name: 'Wayan Putaway'
    };

    const result = await adjustStock(params);

    expect(result.qty_after).toBe(25);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });
});
