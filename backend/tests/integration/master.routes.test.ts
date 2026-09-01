import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../src/db.js';
import { app } from '../../src/app.js';

vi.mock('../../src/db.js', () => ({
  query: vi.fn(),
  pool: { connect: vi.fn() }
}));

describe('Master Data API Routes Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/master/cargo-types should return list of active cargo types', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [
        { id: '1', code: 'COLD_CHAIN', name: 'Rantai Dingin (KDMP)', category: 'TEMPERATURE_CONTROLLED' },
        { id: '2', code: 'BULKY_HEAVY', name: 'Bulky & Heavy Lift', category: 'HEAVY' }
      ]
    } as any);

    const res = await app.request('/api/master/cargo-types');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].code).toBe('COLD_CHAIN');
  });

  it('POST /api/master/cargo-types should create new cargo type', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: '3', code: 'HAZMAT', name: 'Bahan Berbahaya', category: 'CHEMICAL' }]
    } as any);

    const res = await app.request('/api/master/cargo-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'HAZMAT',
        name: 'Bahan Berbahaya',
        category: 'CHEMICAL',
        handling_instructions: 'Gunakan APD lengkap',
        requires_weighbridge: true
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.code).toBe('HAZMAT');
  });

  it('GET /api/master/packaging-types should return packaging types', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [
        { id: '1', code: 'JUMBO_BAG_1T', name: 'Jumbo Bag 1 Ton' },
        { id: '2', code: 'WOODEN_CRATE', name: 'Peti Kayu Showcase KDMP' }
      ]
    } as any);

    const res = await app.request('/api/master/packaging-types');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it('GET /api/master/uoms should return UOMs and UOM conversions', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [{ id: '1', code: 'KG', name: 'Kilogram' }] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 'c1', from_code: 'TON', to_code: 'KG', conversion_rate: 1000 }] } as any);

    const res = await app.request('/api/master/uoms');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.uoms).toHaveLength(1);
    expect(body.data.conversions).toHaveLength(1);
  });

  it('GET /api/master/vehicle-types should return fleet specs', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [
        { id: '1', code: 'CDE_TAIL_LIFT', name: 'Colt Diesel Engkel Tail-Lift (Khusus KDMP)', max_payload_kg: 2500 }
      ]
    } as any);

    const res = await app.request('/api/master/vehicle-types');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data[0].code).toBe('CDE_TAIL_LIFT');
  });

  it('GET /api/master/document-types should return logistics document types', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [
        { id: '1', code: 'SURAT_JALAN_SUPPLIER', name: 'Surat Jalan Asli Supplier' },
        { id: '2', code: 'BAST_DESA_KDMP', name: 'Berita Acara Serah Terima KDMP' }
      ]
    } as any);

    const res = await app.request('/api/master/document-types');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data[1].code).toBe('BAST_DESA_KDMP');
  });
});
