import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../src/db.js';
import * as checkpointService from '../../src/services/checkpoint.js';
import { app } from '../../src/app.js';

vi.mock('../../src/db.js', () => ({
  query: vi.fn(),
  pool: { connect: vi.fn() }
}));

vi.mock('../../src/services/checkpoint.js', () => ({
  recordCheckpoint: vi.fn()
}));

describe('Outbound Customer Document & OCR Flow Integration Tests', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    };
    vi.mocked(db.pool.connect).mockResolvedValue(mockClient as any);
  });

  it('POST /api/outbound should create order from customer document with attachment and OCR payload', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [] } as any) // check dup
      .mockResolvedValueOnce({ // INSERT outbound_orders
        rows: [{
          id: 'out-cust-1',
          order_number: 'ORD-CUST-001',
          status: 'CREATED',
          picking_source: 'CUSTOMER_DOC',
          customer_ref_number: 'PO-KENCANA-992',
          attachment_name: 'sp_kencana.pdf',
          attachment_type: 'PDF'
        }]
      })
      .mockResolvedValueOnce({ rows: [{ default_uom_id: 'uom-1' }] } as any) // SELECT UOM produk
      .mockResolvedValueOnce({}) // INSERT outbound_items
      .mockResolvedValueOnce({}); // COMMIT

    const payload = {
      customer_id: 'c-1',
      warehouse_id: 'wh-1',
      recipient_name: 'Toko Makmur Sejahtera',
      destination_address: 'Jl. Ahmad Yani No. 88, Surabaya',
      picking_source: 'CUSTOMER_DOC',
      customer_ref_number: 'PO-KENCANA-992',
      attachment_url: 'data:application/pdf;base64,JVBERi0xLjQK...',
      attachment_name: 'sp_kencana.pdf',
      attachment_type: 'PDF',
      ocr_raw_text: 'Surat Permintaan Kirim PO-KENCANA-992 Toko Makmur Sejahtera',
      items: [
        { product_id: 'p-1', ordered_qty: 25 }
      ],
      actor_name: 'Admin Siti'
    };

    const res = await app.request('/api/outbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.picking_source).toBe('CUSTOMER_DOC');
    expect(body.data.customer_ref_number).toBe('PO-KENCANA-992');

    // Verify checkpoint recorded with CUSTOMER_DOC metadata
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        step_code: 'ORDER_CREATED',
        step_label: expect.stringContaining('Dokumen Customer'),
        metadata: expect.objectContaining({
          picking_source: 'CUSTOMER_DOC',
          customer_ref_number: 'PO-KENCANA-992',
          attachment_name: 'sp_kencana.pdf',
          attachment_type: 'PDF'
        })
      })
    );
  });
});
