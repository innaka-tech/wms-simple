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

describe('Outbound Fulfillment and POD API Routes Integration Tests', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    };
    vi.mocked(db.pool.connect).mockResolvedValue(mockClient as any);
  });

  it('GET /api/outbound should return outbound orders list', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'out-1', order_number: 'ORD-001', status: 'CREATED', customer_name: 'KDMP' }]
    } as any);

    const res = await app.request('/api/outbound');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it('POST /api/outbound should create outbound order and record checkpoint ORDER_CREATED', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [] } as any) // cek unik order_number
      .mockResolvedValueOnce({   // INSERT outbound_orders
        rows: [{ id: 'out-1', order_number: 'ORD-20260901', status: 'CREATED' }]
      })
      .mockResolvedValueOnce({ rows: [{ default_uom_id: 'uom-1' }] } as any) // SELECT UOM produk
      .mockResolvedValueOnce({}) // INSERT outbound_items
      .mockResolvedValueOnce({}); // COMMIT

    const res = await app.request('/api/outbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 'cust-1',
        warehouse_id: 'wh-jakarta',
        recipient_name: 'Pak Kades Sukamaju',
        destination_address: 'Balai Desa Sukamaju',
        items: [{ product_id: 'p-chiller-kdmp', ordered_qty: 2 }],
        actor_name: 'Admin Order'
      })
    });

    expect(res.status).toBe(201);
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        step_code: 'ORDER_CREATED',
        actor_name: 'Admin Order'
      })
    );
  });

  it('POST /api/outbound/:id/pick should pick items from bins, adjust stock and record checkpoint', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'out-1', order_number: 'ORD-001', warehouse_id: 'wh-jakarta' }]
    } as any);

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // UPDATE outbound_items
      .mockResolvedValueOnce({}) // UPDATE outbound_orders status PICKED
      .mockResolvedValueOnce({}); // COMMIT

    const res = await app.request('/api/outbound/out-1/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: 'item-1', product_id: 'p-chiller-kdmp', picked_qty: 2, location_id: 'loc-1' }],
        actor_name: 'Picker Bayu'
      })
    });

    expect(res.status).toBe(200);
    expect(stockService.adjustStock).toHaveBeenCalledWith(
      expect.objectContaining({
        movement_type: 'OUTBOUND_PICK',
        qty_change: -2,
        warehouse_id: 'wh-jakarta'
      })
    );
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        step_code: 'PICKING_COMPLETED',
        actor_name: 'Picker Bayu'
      })
    );
  });

  it('POST /api/outbound/:id/pack should record package boxes and checkpoint PACKING_COMPLETED', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'out-1', order_number: 'ORD-001' }]
    } as any);

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // INSERT packages
      .mockResolvedValueOnce({}) // UPDATE outbound_orders status PACKED
      .mockResolvedValueOnce({}); // COMMIT

    const res = await app.request('/api/outbound/out-1/pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packages: [{ box_code: 'BOX-KDMP-01', weight_kg: 85, dimensions: '60x60x170 cm' }],
        actor_name: 'Packer Joko'
      })
    });

    expect(res.status).toBe(200);
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        step_code: 'PACKING_COMPLETED',
        actor_name: 'Packer Joko'
      })
    );
  });

  it('POST /api/outbound/:id/pod should submit digital POD evidence (photo + signature) and checkpoint DELIVERED', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'out-1', order_number: 'ORD-001', recipient_name: 'Pak Kades' }]
    } as any);

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [] } as any) // cek unik pod_number
      .mockResolvedValueOnce({}) // INSERT pod_documents
      .mockResolvedValueOnce({ rows: [{ product_id: 'p-1', packed_qty: 2 }] } as any) // items utk ledger OUTBOUND_SHIP
      .mockResolvedValueOnce({}) // UPDATE outbound_orders status DELIVERED
      .mockResolvedValueOnce({}); // COMMIT

    const res = await app.request('/api/outbound/out-1/pod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_name: 'Pak Kades Sukamaju',
        pod_photo_url: 'https://cdn.wms.internal/pod/photo-desa-01.jpg',
        signature_photo_url: 'data:image/png;base64,iVBORw0KGgo...',
        delivered_qty: 2,
        actor_name: 'Driver Slamet'
      })
    });

    expect(res.status).toBe(200);
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        step_code: 'DELIVERED',
        actor_name: 'Driver Slamet'
      })
    );
  });

  it('POST /api/outbound/:id/verify-pod should allow admin to verify POD acceptance and record checkpoint', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'out-1', order_number: 'ORD-001' }]
    } as any);

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // UPDATE pod_documents
      .mockResolvedValueOnce({}) // UPDATE outbound_orders status POD_VERIFIED
      .mockResolvedValueOnce({}); // COMMIT

    const res = await app.request('/api/outbound/out-1/verify-pod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ACCEPTED',
        actor_name: 'Admin Verifikator'
      })
    });

    expect(res.status).toBe(200);
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        step_code: 'POD_VERIFIED',
        actor_name: 'Admin Verifikator'
      })
    );
  });

  describe('POST /api/outbound/:id/issue-waybill', () => {
    const orderRow = { id: 'out-1', order_number: 'ORD-001', status: 'PACKED' };

    it('should issue waybill with unique SJ + RESI numbers and record checkpoint WAYBILL_ISSUED', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [orderRow] } as any) // SELECT order
        .mockResolvedValueOnce({ rows: [] } as any) // cek waybill aktif (kosong)
        .mockResolvedValueOnce({ rows: [] } as any) // cek sj_number unik
        .mockResolvedValueOnce({ rows: [] } as any); // cek resi_number unik

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'wb-1', sj_number: 'SJ-AAAA1111', resi_number: 'RESI-BBBB2222', status: 'ISSUED' }] }) // INSERT waybills
        .mockResolvedValueOnce({}); // COMMIT

      const res = await app.request('/api/outbound/out-1/issue-waybill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_name: 'Admin Gudang Siti' })
      });

      expect(res.status).toBe(201);
      const bodyRes = await res.json();
      expect(bodyRes.success).toBe(true);
      expect(bodyRes.data.sj_number).toMatch(/^SJ-[0-9A-HJ-NP-Z]{8}$/);
      expect(bodyRes.data.resi_number).toMatch(/^RESI-[0-9A-HJ-NP-Z]{8}$/);
      expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          step_code: 'WAYBILL_ISSUED',
          actor_name: 'Admin Gudang Siti',
          metadata: expect.objectContaining({
            sj_number: expect.stringMatching(/^SJ-[0-9A-HJ-NP-Z]{8}$/),
            resi_number: expect.stringMatching(/^RESI-[0-9A-HJ-NP-Z]{8}$/)
          })
        })
      );
    });

    it('should return 404 when outbound order does not exist', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [] } as any);

      const res = await app.request('/api/outbound/out-404/issue-waybill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_name: 'Admin Gudang Siti' })
      });

      expect(res.status).toBe(404);
    });

    it('should return 409 when an active waybill already exists for the order', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [orderRow] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 'wb-1', sj_number: 'SJ-EXIST77' }] } as any);

      const res = await app.request('/api/outbound/out-1/issue-waybill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_name: 'Admin Gudang Siti' })
      });

      expect(res.status).toBe(409);
      const bodyRes = await res.json();
      expect(bodyRes.message).toContain('SJ-EXIST77');
    });

    it('should return 409 when order status is DELIVERED or POD_VERIFIED', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ ...orderRow, status: 'POD_VERIFIED' }] } as any);

      const res = await app.request('/api/outbound/out-1/issue-waybill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_name: 'Admin Gudang Siti' })
      });

      expect(res.status).toBe(409);
    });

    it('should return 400 when actor_name is missing (Mandatory petugas_name)', async () => {
      const res = await app.request('/api/outbound/out-1/issue-waybill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      expect(res.status).toBe(400);
    });
  });
});
