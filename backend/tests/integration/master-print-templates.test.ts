import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { masterRoutes } from '../../src/routes/master.js';
import * as db from '../../src/db.js';

vi.mock('../../src/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn()
}));

vi.mock('../../src/middlewares/auth.js', () => ({
  authenticate: (c: any, next: any) => next(),
  requireRole: () => (c: any, next: any) => next()
}));

describe('Master Print Templates API', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/api/master', masterRoutes);
  });

  it('GET /api/master/print-templates should return all active templates', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [
        { id: 't-1', code: 'A4_PORTRAIT', name: 'A4 Portrait Standar', is_default: true, category: 'WAYBILL' },
        { id: 't-2', code: 'CONTINUOUS_3PLY', name: 'Continuous Form 3-Ply Matrix', is_default: false, category: 'WAYBILL' }
      ]
    } as any);

    const res = await app.request('/api/master/print-templates');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].code).toBe('A4_PORTRAIT');
    expect(body.data[0].is_default).toBe(true);
  });

  it('PUT /api/master/print-templates/:id/default should set template as default and reset others', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [{ id: 't-2', code: 'CONTINUOUS_3PLY', name: 'Continuous Form 3-Ply Matrix', category: 'WAYBILL' }]
      } as any) // checkRes
      .mockResolvedValueOnce({ rows: [] } as any) // reset others
      .mockResolvedValueOnce({
        rows: [{ id: 't-2', code: 'CONTINUOUS_3PLY', name: 'Continuous Form 3-Ply Matrix', is_default: true, category: 'WAYBILL' }]
      } as any); // update target

    const res = await app.request('/api/master/print-templates/t-2/default', {
      method: 'PUT'
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.is_default).toBe(true);
    expect(body.message).toContain('berhasil dijadikan template default');
  });

  it('PUT /api/master/print-templates/:id/default should return 404 for non-existent template', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ rows: [] } as any);

    const res = await app.request('/api/master/print-templates/invalid-id/default', {
      method: 'PUT'
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
