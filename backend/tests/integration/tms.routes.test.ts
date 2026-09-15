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

describe('TMS (Transportation Management System) API Routes Integration Tests', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    };
    vi.mocked(db.pool.connect).mockResolvedValue(mockClient as any);
  });

  it('GET /api/tms/available-orders should return orders ready for consolidation', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [
        {
          id: 'ord-1',
          order_number: 'ORD20260901',
          warehouse_name: 'Gudang Utama Jakarta',
          recipient_name: 'Kopdes Sukamaju',
          total_weight_kg: 250,
          total_volume_cbm: 1.5,
          total_items: 2
        }
      ]
    } as any);

    const res = await app.request('/api/tms/available-orders');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].order_number).toBe('ORD20260901');
  });

  it('POST /api/tms/trips should validate required fields (warehouse, vehicle, stops)', async () => {
    const res = await app.request('/api/tms/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: '',
        vehicle_id: '',
        driver_name: '',
        stops: []
      })
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('POST /api/tms/trips should trigger Overload Guard when payload exceeds vehicle capacity', async () => {
    // Return vehicle with max_payload_kg = 2500 kg
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [
        {
          id: 'veh-1',
          plate_number: 'B 9845 WMS',
          status: 'AVAILABLE',
          last_odometer_km: 12000,
          type_name: 'CDE Box',
          max_payload_kg: 2500,
          max_volume_cbm: 10
        }
      ]
    } as any);

    const res = await app.request('/api/tms/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: 'wh-1',
        vehicle_id: 'veh-1',
        driver_name: 'Budi Santoso',
        stops: [
          {
            reference_type: 'OUTBOUND_ORDER',
            reference_id: 'ord-1',
            reference_number: 'ORD20260901',
            recipient_name: 'Kopdes Sukamaju',
            destination_address: 'Desa Sukamaju No 1',
            weight_kg: 3200, // Exceeds 2500 kg max payload!
            volume_cbm: 4.0
          }
        ]
      })
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('OVERLOAD_PAYLOAD_EXCEEDED');
    expect(body.message).toContain('Overload Guard');
  });

  it('POST /api/tms/trips should successfully plan trip with seamless non-hyphen number', async () => {
    // Vehicle spec within limit
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [
        {
          id: 'veh-1',
          plate_number: 'B 9845 WMS',
          status: 'AVAILABLE',
          last_odometer_km: 12000,
          type_name: 'CDE Box',
          max_payload_kg: 2500,
          max_volume_cbm: 10
        }
      ]
    } as any);

    // mockClient.query for BEGIN, INSERT trips, INSERT trip_stops, UPDATE outbound_orders, COMMIT
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'trip-1',
            trip_number: 'TRIP20260901',
            vehicle_id: 'veh-1',
            truck_plate: 'B 9845 WMS',
            status: 'PLANNED',
            total_weight_kg: 1500,
            total_volume_cbm: 5
          }
        ]
      }) // INSERT trips
      .mockResolvedValueOnce({}) // INSERT trip_stops
      .mockResolvedValueOnce({}) // UPDATE outbound_orders
      .mockResolvedValueOnce({}); // COMMIT

    const res = await app.request('/api/tms/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: 'wh-1',
        vehicle_id: 'veh-1',
        driver_name: 'Budi Santoso',
        stops: [
          {
            reference_type: 'OUTBOUND_ORDER',
            reference_id: 'ord-1',
            reference_number: 'ORD20260901',
            recipient_name: 'Kopdes Sukamaju',
            destination_address: 'Desa Sukamaju No 1',
            weight_kg: 1500,
            volume_cbm: 5.0
          }
        ]
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.trip_number).toMatch(/^TRIP[0-9A-Z]+$/); // Non-hyphen format!
    expect(checkpointService.recordCheckpoint).toHaveBeenCalled();
  });

  it('POST /api/tms/trips/:id/dispatch should transition trip to IN_TRANSIT and vehicle to IN_USE', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [
        {
          id: 'trip-1',
          trip_number: 'TRIP20260901',
          vehicle_id: 'veh-1',
          truck_plate: 'B 9845 WMS',
          driver_name: 'Budi Santoso',
          status: 'PLANNED'
        }
      ]
    } as any);

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // UPDATE trips
      .mockResolvedValueOnce({}) // UPDATE vehicles
      .mockResolvedValueOnce({}) // UPDATE outbound_orders
      .mockResolvedValueOnce({}); // COMMIT

    const res = await app.request('/api/tms/trips/trip-1/dispatch', { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('IN_TRANSIT');
    expect(checkpointService.recordCheckpoint).toHaveBeenCalled();
  });

  it('POST /api/tms/trips/:id/stops/:stopId/complete should mark stop delivered and complete trip if last stop', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [{ id: 'stop-1', trip_id: 'trip-1', stop_sequence: 1, reference_type: 'OUTBOUND_ORDER', reference_id: 'ord-1', reference_number: 'ORD20260901', recipient_name: 'Kopdes' }]
      } as any) // stop
      .mockResolvedValueOnce({
        rows: [{ id: 'trip-1', trip_number: 'TRIP20260901', vehicle_id: 'veh-1' }]
      } as any); // trip

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // UPDATE trip_stops
      .mockResolvedValueOnce({}) // UPDATE outbound_orders
      .mockResolvedValueOnce({ rows: [{ remaining: '0' }] }) // Remaining stops count (0 remaining)
      .mockResolvedValueOnce({}) // UPDATE trips COMPLETED
      .mockResolvedValueOnce({}) // UPDATE vehicles AVAILABLE
      .mockResolvedValueOnce({}); // COMMIT

    const res = await app.request('/api/tms/trips/trip-1/stops/stop-1/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pod_notes: 'Diterima oleh Kepala Desa' })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.trip_completed).toBe(true);
    expect(checkpointService.recordCheckpoint).toHaveBeenCalled();
  });
});
