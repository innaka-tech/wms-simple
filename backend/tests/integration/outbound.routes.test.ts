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
      .mockResolvedValueOnce({   // INSERT outbound_orders
        rows: [{ id: 'out-1', order_number: 'ORD-20260901', status: 'CREATED' }]
      })
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
      .mockResolvedValueOnce({}) // INSERT pod_documents
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
});
