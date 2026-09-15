import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../src/db.js';
import { app } from '../../src/app.js';

vi.mock('../../src/db.js', () => ({
  query: vi.fn(),
  pool: { connect: vi.fn() }
}));

describe('Alerts API Routes Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/alerts should return unresolved alerts ordered by severity', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [
        { id: 'a1', alert_type: 'DEBULKING_SHRINKAGE_HIGH', severity: 'CRITICAL', title: 'Susut Tinggi', is_resolved: false },
        { id: 'a2', alert_type: 'FLEET_OVERDUE', severity: 'WARNING', title: 'Armada Terlambat', is_resolved: false }
      ]
    } as any);

    const res = await app.request('/api/alerts?is_resolved=false');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].severity).toBe('CRITICAL');
  });

  it('GET /api/alerts/summary should return active alert counts by severity', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [
        { total_unresolved: '5', critical_count: '2', warning_count: '2', info_count: '1' }
      ]
    } as any);

    const res = await app.request('/api/alerts/summary');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.total_unresolved).toBe(5);
    expect(body.data.critical_count).toBe(2);
    expect(body.data.warning_count).toBe(2);
    expect(body.data.info_count).toBe(1);
  });

  it('POST /api/alerts should create manual/system operational alert', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{
        id: 'a3',
        alert_type: 'MANUAL_DISCREPANCY',
        title: 'Tutup Gudang Dini',
        message: 'Gudang Cikarang tutup darurat perbaikan listrik',
        severity: 'WARNING'
      }]
    } as any);

    const res = await app.request('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert_type: 'MANUAL_DISCREPANCY',
        title: 'Tutup Gudang Dini',
        message: 'Gudang Cikarang tutup darurat perbaikan listrik',
        severity: 'WARNING'
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Tutup Gudang Dini');
  });

  it('POST /api/alerts/:id/resolve should mark alert resolved', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'a1', is_resolved: true, resolution_notes: 'Sudah diinvestigasi QC' }]
    } as any);

    const res = await app.request('/api/alerts/a1/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resolution_notes: 'Sudah diinvestigasi QC',
        actor_name: 'Budi Santoso'
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.is_resolved).toBe(true);
  });

  it('POST /api/alerts/resolve-all should batch resolve unresolved alerts', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }]
    } as any);

    const res = await app.request('/api/alerts/resolve-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resolution_notes: 'Selesai shift pagi',
        actor_name: 'Supervisor Rudi'
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.resolved_count).toBe(3);
  });

  it('POST /api/alerts/scan-overdue should detect overdue fleet and create alerts', async () => {
    // 1. Return overdue departed vehicle
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [{
          id: 'fel-1',
          log_number: 'GATEOUT20260901',
          vehicle_id: 'v-1',
          driver_name: 'Pak Supir',
          expected_return_time: '2026-09-14T10:00:00',
          warehouse_id: 'wh-1',
          plate_number: 'B9999XYZ'
        }]
      } as any)
      // 2. Check existing unresolved alert for this log
      .mockResolvedValueOnce({ rows: [] } as any)
      // 3. Insert new alert
      .mockResolvedValueOnce({
        rows: [{
          id: 'a-new',
          alert_type: 'FLEET_OVERDUE',
          entity_id: 'fel-1',
          severity: 'CRITICAL'
        }]
      } as any);

    const res = await app.request('/api/alerts/scan-overdue', { method: 'POST' });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.overdue_found).toBe(1);
    expect(body.new_alerts_created).toBe(1);
  });
});
