import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../src/db.js';
import { app } from '../../src/app.js';

vi.mock('../../src/db.js', () => ({
  query: vi.fn(),
  pool: { connect: vi.fn() }
}));

describe('GET /api/checkpoints/by-number/:number', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function chainRows() {
    return {
      rows: [
        {
          id: 'cp-1', entity_type: 'INBOUND_ORDER', entity_number: 'PO-123', step_code: 'PO_CREATED',
          step_label: 'PO dibuat', actor_name: 'Siti', actor_role: 'ADMIN_ADM', prev_checkpoint_id: null,
          created_at: '2026-09-09T01:00:00Z', notes: null, photo_urls: '[]', metadata: '{}', actor_full_name: 'Siti'
        },
        {
          id: 'cp-2', entity_type: 'INBOUND_ORDER', entity_number: 'PO-123', step_code: 'PO_RECEIVED',
          step_label: 'Barang diterima', actor_name: 'Joko', actor_role: 'WH_STAFF', prev_checkpoint_id: 'cp-1',
          created_at: '2026-09-09T02:00:00Z', notes: 'Tally OK', photo_urls: '[]', metadata: '{}', actor_full_name: 'Joko'
        },
        {
          id: 'cp-3', entity_type: 'INBOUND_ORDER', entity_number: 'PO-123', step_code: 'PUTAWAY_COMPLETED',
          step_label: 'Disimpan ke rak', actor_name: 'Joko', actor_role: 'WH_STAFF', prev_checkpoint_id: 'cp-2',
          created_at: '2026-09-09T03:00:00Z', notes: null, photo_urls: '[]', metadata: '{}', actor_full_name: 'Joko'
        }
      ]
    } as any;
  }

  it('should return 404 for unknown document number', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ rows: [] } as any);
    const res = await app.request('/api/checkpoints/by-number/PO-TIDAK-ADA');
    expect(res.status).toBe(404);
  });

  it('should return 400 for too-short number', async () => {
    const res = await app.request('/api/checkpoints/by-number/AB');
    expect(res.status).toBe(400);
  });

  it('should return timeline with valid chain for linked checkpoints', async () => {
    vi.mocked(db.query).mockResolvedValueOnce(chainRows());
    const res = await app.request('/api/checkpoints/by-number/po-123'); // lowercase → harus di-upper
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.document_number).toBe('PO-123');
    expect(body.data.chain_valid).toBe(true);
    expect(body.data.broken_at_step).toBeNull();
    expect(body.data.total_checkpoints).toBe(3);
    expect(body.data.timeline[0].step_code).toBe('PO_CREATED');
    expect(body.data.timeline[2].step_code).toBe('PUTAWAY_COMPLETED');
  });

  it('should flag broken chain when prev_checkpoint_id mismatch', async () => {
    const rows = chainRows();
    rows.rows[2].prev_checkpoint_id = 'cp-99'; // tidak menautkan cp-2
    vi.mocked(db.query).mockResolvedValueOnce(rows);
    const res = await app.request('/api/checkpoints/by-number/PO-123');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.chain_valid).toBe(false);
    expect(body.data.broken_at_step).toBe('PUTAWAY_COMPLETED');
  });

  it('should treat single checkpoint as valid chain', async () => {
    const rows = chainRows();
    rows.rows = rows.rows.slice(0, 1);
    vi.mocked(db.query).mockResolvedValueOnce(rows);
    const res = await app.request('/api/checkpoints/by-number/PO-123');
    const body = await res.json();
    expect(body.data.chain_valid).toBe(true);
    expect(body.data.total_checkpoints).toBe(1);
  });

  it('should embed prev/next context in each timeline row', async () => {
    vi.mocked(db.query).mockResolvedValueOnce(chainRows());
    const res = await app.request('/api/checkpoints/by-number/PO-123');
    const body = await res.json();
    const t = body.data.timeline;
    // Baris pertama: tanpa prev, ada next
    expect(t[0].prev_step_code).toBeNull();
    expect(t[0].next_step_code).toBe('PO_RECEIVED');
    expect(t[0].next_actor_name).toBe('Joko');
    // Baris tengah: dua-duanya ada
    expect(t[1].prev_step_code).toBe('PO_CREATED');
    expect(t[1].prev_actor_name).toBe('Siti');
    expect(t[1].next_step_code).toBe('PUTAWAY_COMPLETED');
    // Baris terakhir: tanpa next
    expect(t[2].next_step_code).toBeNull();
    expect(t[2].prev_step_code).toBe('PO_RECEIVED');
    expect(t[2].seq).toBe(3);
  });
});
