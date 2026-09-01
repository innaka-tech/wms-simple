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

describe('Inbound Flow API Routes Integration Tests', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    };
    vi.mocked(db.pool.connect).mockResolvedValue(mockClient as any);
  });

  it('GET /api/inbound should list inbound orders', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'in-1', po_number: 'PO-001', status: 'CREATED', warehouse_name: 'Main Hub Jakarta' }]
    } as any);

    const res = await app.request('/api/inbound?status=CREATED');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].po_number).toBe('PO-001');
  });

  it('GET /api/inbound/:id should return order detail with items and checkpoints', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [{ id: 'in-1', po_number: 'PO-001', status: 'RECEIVED' }] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 'item-1', product_id: 'p-1', ordered_qty: 10 }] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 'cp-1', step_code: 'PO_CREATED', actor_name: 'Admin' }] } as any);

    const res = await app.request('/api/inbound/in-1');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.po_number).toBe('PO-001');
    expect(body.data.items).toHaveLength(1);
    expect(body.data.checkpoints).toHaveLength(1);
  });

  it('POST /api/inbound should validate mandatory items and actor_name', async () => {
    const resNoItems = await app.request('/api/inbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 'cust-1',
        warehouse_id: 'wh-1',
        items: [],
        actor_name: 'Admin'
      })
    });
    expect(resNoItems.status).toBe(400);

    const resNoActor = await app.request('/api/inbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 'cust-1',
        warehouse_id: 'wh-1',
        items: [{ product_id: 'p-1', ordered_qty: 10 }],
        actor_name: ''
      })
    });
    expect(resNoActor.status).toBe(400);
  });

  it('POST /api/inbound should create PO and record checkpoint PO_CREATED', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({   // INSERT inbound_orders
        rows: [{ id: 'in-created-1', po_number: 'PO-20260901', status: 'CREATED' }]
      })
      .mockResolvedValueOnce({}) // INSERT inbound_items
      .mockResolvedValueOnce({}); // COMMIT

    const res = await app.request('/api/inbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 'cust-1',
        warehouse_id: 'wh-1',
        items: [{ product_id: 'p-1', ordered_qty: 20 }],
        actor_name: 'Budi Adm'
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.po_number).toBe('PO-20260901');
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        step_code: 'PO_CREATED',
        actor_name: 'Budi Adm'
      })
    );
  });

  it('POST /api/inbound/:id/receive should record physical receive and checkpoint PO_RECEIVED', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // UPDATE inbound_orders
      .mockResolvedValueOnce({}) // UPDATE inbound_items
      .mockResolvedValueOnce({ rows: [{ id: 'in-1', po_number: 'PO-001' }] }) // SELECT order
      .mockResolvedValueOnce({}); // COMMIT

    const res = await app.request('/api/inbound/in-1/receive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        truck_plate: 'B 1234 CD',
        driver_name: 'Pak Supri',
        items: [{ id: 'item-1', received_qty: 20, item_condition: 'GOOD' }],
        actor_name: 'Ahmad Checker'
      })
    });

    expect(res.status).toBe(200);
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        step_code: 'PO_RECEIVED',
        actor_name: 'Ahmad Checker'
      })
    );
  });

  it('POST /api/inbound/:id/putaway should reject if cross_dock + storage != received_qty', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'in-1', po_number: 'PO-001', warehouse_id: 'wh-1' }]
    } as any);

    mockClient.query.mockResolvedValueOnce({}); // BEGIN

    const res = await app.request('/api/inbound/in-1/putaway', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: 'item-1', product_id: 'p-1', received_qty: 20, cross_dock_qty: 5, storage_qty: 10 }], // 5+10 != 20
        actor_name: 'Ahmad Checker'
      })
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toContain('harus sama dengan Received Qty');
  });

  it('POST /api/inbound/:id/putaway should complete putaway, adjust stock and record checkpoint', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'in-1', po_number: 'PO-001', warehouse_id: 'wh-1' }]
    } as any);

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // UPDATE inbound_items
      .mockResolvedValueOnce({}) // UPDATE inbound_orders status PUTAWAY_COMPLETED
      .mockResolvedValueOnce({}); // COMMIT

    const res = await app.request('/api/inbound/in-1/putaway', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: 'item-1', product_id: 'p-1', received_qty: 20, cross_dock_qty: 5, storage_qty: 15, location_id: 'loc-1' }],
        actor_name: 'Ahmad Checker'
      })
    });

    expect(res.status).toBe(200);
    expect(stockService.adjustStock).toHaveBeenCalledWith(
      expect.objectContaining({
        warehouse_id: 'wh-1',
        product_id: 'p-1',
        qty_change: 15,
        movement_type: 'INBOUND_PUTAWAY'
      })
    );
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        step_code: 'PUTAWAY_COMPLETED',
        actor_name: 'Ahmad Checker'
      })
    );
  });
});
