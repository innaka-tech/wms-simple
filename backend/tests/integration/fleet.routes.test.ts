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

describe('Fleet Gate Pass API Routes Integration Tests', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    };
    vi.mocked(db.pool.connect).mockResolvedValue(mockClient as any);
  });

  it('GET /api/fleet/vehicles should return vehicle list with driver info', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'v-1', plate_number: 'B 1234 WMS', type: 'CDE_TAIL_LIFT', status: 'AVAILABLE' }]
    } as any);

    const res = await app.request('/api/fleet/vehicles');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].plate_number).toBe('B 1234 WMS');
  });

  it('POST /api/fleet/departure should validate required fields', async () => {
    const res = await app.request('/api/fleet/departure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicle_id: 'v-1',
        driver_name: '', // Empty driver name
        odometer_out: 1000,
        departure_security_officer: 'Satpam Bripka Joko'
      })
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('wajib diisi');
  });

  it('POST /api/fleet/departure should reject if vehicle is already IN_USE', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({   // SELECT vehicle FOR UPDATE -> status IN_USE
        rows: [{ id: 'v-1', plate_number: 'B 1234 WMS', status: 'IN_USE' }]
      })
      .mockResolvedValueOnce({}); // ROLLBACK

    const res = await app.request('/api/fleet/departure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicle_id: 'v-1',
        driver_name: 'Pak Bambang',
        warehouse_id: 'wh-jakarta',
        odometer_out: 45000,
        departure_security_officer: 'Satpam Slamet'
      })
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toContain('sedang berstatus IN_USE');
  });

  it('POST /api/fleet/departure should record departure, set vehicle IN_USE, and record checkpoint FLEET_DEPARTED', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({   // SELECT vehicle FOR UPDATE -> status AVAILABLE
        rows: [{ id: 'v-1', plate_number: 'B 1234 WMS', status: 'AVAILABLE' }]
      })
      .mockResolvedValueOnce({   // INSERT fleet_exit_logs
        rows: [{ id: 'log-1', log_number: 'GATE-OUT-001', status: 'DEPARTED' }]
      })
      .mockResolvedValueOnce({}) // UPDATE vehicles SET status = 'IN_USE'
      .mockResolvedValueOnce({}); // COMMIT

    const res = await app.request('/api/fleet/departure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicle_id: 'v-1',
        driver_name: 'Pak Bambang',
        warehouse_id: 'wh-jakarta',
        odometer_out: 45000,
        fuel_level_out: 'FULL',
        departure_security_officer: 'Satpam Slamet'
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        step_code: 'FLEET_DEPARTED',
        actor_name: 'Satpam Slamet'
      })
    );
  });

  it('POST /api/fleet/logs/:id/return should reject when Odometer In is less than Odometer Out', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'log-1', log_number: 'GATE-OUT-001', odometer_out: '45200' }]
    } as any);

    const res = await app.request('/api/fleet/logs/log-1/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        odometer_in: 45100, // < 45200
        return_security_officer: 'Satpam Agus'
      })
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('tidak boleh lebih kecil dari kilometer keluar');
  });

  it('POST /api/fleet/logs/:id/return should record gate return, set vehicle AVAILABLE, and record checkpoint FLEET_RETURNED', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'log-1', log_number: 'GATE-OUT-001', vehicle_id: 'v-1', odometer_out: '45200' }]
    } as any);

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({   // UPDATE fleet_exit_logs
        rows: [{ id: 'log-1', status: 'RETURNED', odometer_in: '45450' }]
      })
      .mockResolvedValueOnce({}) // UPDATE vehicles SET status = 'AVAILABLE'
      .mockResolvedValueOnce({}); // COMMIT

    const res = await app.request('/api/fleet/logs/log-1/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        odometer_in: 45450,
        fuel_level_in: 'HALF',
        return_security_officer: 'Satpam Agus'
      })
    });

    expect(res.status).toBe(200);
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        step_code: 'FLEET_RETURNED',
        actor_name: 'Satpam Agus'
      })
    );
  });

  describe('POST /api/fleet/vendor-exit (Jalur B — Truk Vendor)', () => {
    it('should record vendor exit log with VEND-OUT number and checkpoint VENDOR_EXIT', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({   // INSERT vendor_vehicle_exit_logs
          rows: [{
            id: 'vlog-1',
            log_number: 'VEND-OUT-12345678',
            vendor_name: 'PT Ekspedisi Jaya',
            plate_number: 'B 8765 XYZ',
            waybill_number: 'RESI-TEST1234',
            status: 'CLOSED'
          }]
        })
        .mockResolvedValueOnce({}) // UPDATE outbound_orders SHIPPED
        .mockResolvedValueOnce({}); // COMMIT

      const res = await app.request('/api/fleet/vendor-exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_name: 'PT Ekspedisi Jaya',
          plate_number: 'B 8765 XYZ',
          waybill_number: 'RESI-TEST1234',
          reference_type: 'OUTBOUND_ORDER',
          reference_id: 'out-9',
          destination_note: 'Gudang transit Denpasar',
          actor_name: 'Sersan Hendro'
        })
      });

      expect(res.status).toBe(201);
      const bodyRes = await res.json();
      expect(bodyRes.data.log_number).toMatch(/^VEND-OUT-/);
      expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          step_code: 'VENDOR_EXIT',
          entity_type: 'VENDOR_EXIT_LOG',
          actor_name: 'Sersan Hendro',
          metadata: expect.objectContaining({
            vendor_name: 'PT Ekspedisi Jaya',
            plate_number: 'B 8765 XYZ',
            waybill_number: 'RESI-TEST1234'
          })
        })
      );
    });

    it('should return 400 when waybill_number is missing (wajib)', async () => {
      const res = await app.request('/api/fleet/vendor-exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_name: 'PT Ekspedisi Jaya',
          plate_number: 'B 8765 XYZ',
          actor_name: 'Sersan Hendro'
        })
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 when vendor_name is too short', async () => {
      const res = await app.request('/api/fleet/vendor-exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_name: 'P',
          plate_number: 'B 8765 XYZ',
          waybill_number: 'RESI-TEST1234',
          actor_name: 'Sersan Hendro'
        })
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 when actor_name is missing (Mandatory petugas_name)', async () => {
      const res = await app.request('/api/fleet/vendor-exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_name: 'PT Ekspedisi Jaya',
          plate_number: 'B 8765 XYZ',
          waybill_number: 'RESI-TEST1234'
        })
      });

      expect(res.status).toBe(400);
    });
  });

  it('GET /api/fleet/vendor-exits should return vendor exit logs list', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'vlog-1', log_number: 'VEND-OUT-12345678', vendor_name: 'PT Ekspedisi Jaya' }]
    } as any);

    const res = await app.request('/api/fleet/vendor-exits');
    expect(res.status).toBe(200);
    const bodyRes = await res.json();
    expect(bodyRes.success).toBe(true);
    expect(bodyRes.data).toHaveLength(1);
    expect(bodyRes.data[0].log_number).toMatch(/^VEND-OUT-/);
  });
});
