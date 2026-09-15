import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../src/db.js';
import { app } from '../../src/app.js';

vi.mock('../../src/db.js', () => ({
  query: vi.fn(),
  pool: { connect: vi.fn() }
}));

describe('Weighbridge API Routes Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/weighbridge should list weighbridge tickets', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [
        {
          id: 'wb-1',
          ticket_number: 'WB20260901',
          truck_plate: 'B9988XYZ',
          warehouse_name: 'Gudang Utama Jakarta',
          first_weight_gross_kg: 18500,
          second_weight_tare_kg: 7200,
          net_weight_cargo_kg: 11300,
          weighbridge_operator: 'Sutrisno'
        }
      ]
    } as any);

    const res = await app.request('/api/weighbridge');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].ticket_number).toBe('WB20260901');
    expect(body.data[0].net_weight_cargo_kg).toBe(11300);
  });

  it('POST /api/weighbridge should validate required fields (warehouse_id, truck_plate, first_weight_gross_kg, operator)', async () => {
    const res = await app.request('/api/weighbridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: '',
        truck_plate: '',
        first_weight_gross_kg: 0,
        weighbridge_operator: ''
      })
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('wajib diisi');
  });

  it('POST /api/weighbridge should create a ticket with non-hyphen ticket_number (WBXXXXXXXX)', async () => {
    vi.mocked(db.query).mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('INSERT INTO weighbridge_logs')) {
        return {
          rows: [
            {
              id: 'wb-generated-uuid',
              ticket_number: params![0],
              warehouse_id: params![1],
              truck_plate: params![3],
              first_weight_gross_kg: params![7],
              weighbridge_operator: params![10]
            }
          ]
        } as any;
      }
      return { rows: [] } as any;
    });

    const res = await app.request('/api/weighbridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: 'wh-1',
        truck_plate: 'B 1234 CDD',
        driver_name: 'Pak Sugiono',
        reference_type: 'INBOUND_ORDER',
        reference_id: 'PO20260901',
        first_weight_gross_kg: 16500,
        weighbridge_operator: 'Bambang Checker'
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.ticket_number).toMatch(/^WB[0-9A-Z]{8}$/);
    expect(body.data.first_weight_gross_kg).toBe(16500);
    expect(body.data.truck_plate).toBe('B 1234 CDD');
  });

  it('PUT /api/weighbridge/:id/second-weight should calculate net_weight_cargo_kg accurately', async () => {
    // 1. Check ticket exists
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'wb-1',
            ticket_number: 'WB12345678',
            first_weight_gross_kg: 18500,
            second_weight_tare_kg: null,
            weighbridge_operator: 'Bambang'
          }
        ]
      } as any)
      // 2. Update second weight
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'wb-1',
            ticket_number: 'WB12345678',
            first_weight_gross_kg: 18500,
            second_weight_tare_kg: 7200,
            net_weight_cargo_kg: 11300,
            weighbridge_operator: 'Bambang'
          }
        ]
      } as any);

    const res = await app.request('/api/weighbridge/wb-1/second-weight', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        second_weight_tare_kg: 7200,
        weighbridge_operator: 'Bambang'
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.net_weight_cargo_kg).toBe(11300);
    expect(body.message).toMatch(/Muatan bersih \(Net Cargo\): 11[.,]300 KG/);
  });

  it('PUT /api/weighbridge/:id/second-weight should reject if second weight already recorded', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [
        {
          id: 'wb-1',
          ticket_number: 'WB12345678',
          first_weight_gross_kg: 18500,
          second_weight_tare_kg: 7200 // already completed
        }
      ]
    } as any);

    const res = await app.request('/api/weighbridge/wb-1/second-weight', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        second_weight_tare_kg: 7000
      })
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('sudah tercatat');
  });
});
