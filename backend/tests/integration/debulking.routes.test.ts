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

describe('De-bulking & Conversion API Routes Integration Tests', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    };
    vi.mocked(db.pool.connect).mockResolvedValue(mockClient as any);
  });

  it('GET /api/debulking should return list of work orders', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'deb-1', conversion_number: 'DEBULK-001', status: 'COMPLETED', warehouse_name: 'Main Hub' }]
    } as any);

    const res = await app.request('/api/debulking');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it('GET /api/debulking/:id should return work order with inputs, outputs, and checkpoints', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [{ id: 'deb-1', conversion_number: 'DEBULK-001', shrinkage_percentage: '0.50' }] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 'in-1', product_id: 'p-raw', weight_kg: '1000' }] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 'out-1', product_id: 'p-retail', weight_kg: '995' }] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 'cp-1', step_code: 'DEBULKING_COMPLETED' }] } as any);

    const res = await app.request('/api/debulking/deb-1');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.inputs).toHaveLength(1);
    expect(body.data.outputs).toHaveLength(1);
    expect(body.data.checkpoints).toHaveLength(1);
  });

  it('POST /api/debulking should validate mandatory inputs/outputs and actor_name', async () => {
    const resNoInputs = await app.request('/api/debulking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: 'wh-1',
        inputs: [],
        outputs: [{ product_id: 'p-1', qty_produced: 1, uom_id: 'u1', weight_kg: 100 }],
        actor_name: 'Mandor Joko'
      })
    });
    expect(resNoInputs.status).toBe(400);

    const resNoActor = await app.request('/api/debulking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: 'wh-1',
        inputs: [{ product_id: 'p-1', qty_used: 1, uom_id: 'u1', weight_kg: 100 }],
        outputs: [{ product_id: 'p-2', qty_produced: 1, uom_id: 'u1', weight_kg: 100 }],
        actor_name: ''
      })
    });
    expect(resNoActor.status).toBe(400);
  });

  it('POST /api/debulking should process work order, adjust stock, create alert on high shrinkage', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({   // INSERT stock_conversions
        rows: [{
          id: 'deb-wo-1',
          conversion_number: 'DEBULK-WO-01',
          shrinkage_percentage: '2.50',
          total_input_weight_kg: 1000,
          total_output_weight_kg: 975
        }]
      })
      .mockResolvedValueOnce({}) // INSERT stock_conversion_items_in
      .mockResolvedValueOnce({}) // INSERT stock_conversion_items_out
      .mockResolvedValueOnce({}) // INSERT alerts (high shrinkage > 1.0%)
      .mockResolvedValueOnce({}); // COMMIT

    const res = await app.request('/api/debulking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: 'wh-jakarta',
        conversion_type: 'BULKY_TO_BULK_DRY',
        inputs: [{ product_id: 'p-sugar-1t', qty_used: 1, uom_id: 'u-jumbo', weight_kg: 1000 }],
        outputs: [{ product_id: 'p-sugar-25kg', qty_produced: 39, uom_id: 'u-sack', weight_kg: 975 }], // 25kg loss = 2.5% > 1.0%
        allowable_shrinkage_percentage: 1.0,
        actor_name: 'Mandor Supri'
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify stock adjustment for input (deduct) and output (add)
    expect(stockService.adjustStock).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: 'p-sugar-1t',
        qty_change: -1,
        movement_type: 'DEBULKING_INPUT'
      })
    );
    expect(stockService.adjustStock).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: 'p-sugar-25kg',
        qty_change: 39,
        movement_type: 'DEBULKING_OUTPUT'
      })
    );

    // Verify checkpoint recorded
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        step_code: 'DEBULKING_COMPLETED',
        actor_name: 'Mandor Supri'
      })
    );
  });
});
