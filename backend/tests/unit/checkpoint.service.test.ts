import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../src/db.js';
import { recordCheckpoint, CreateCheckpointParams } from '../../src/services/checkpoint.js';

vi.mock('../../src/db.js', () => ({
  query: vi.fn(),
  pool: {
    connect: vi.fn()
  }
}));

describe('Checkpoint Chain Service Unit Tests (Skenario AUD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Skenario AUD-02: Wajib Nama Petugas (Mandatory actor_name)
  it('AUD-02: should throw an error if actor_name is empty or whitespace', async () => {
    const params: CreateCheckpointParams = {
      entity_type: 'INBOUND_ORDER',
      entity_id: 'inbound-uuid-1',
      entity_number: 'PO-20260901-001',
      step_code: 'PO_CREATED',
      step_label: 'PO Dibuat',
      actor_name: '   ',
      actor_role: 'ADMIN_ADM'
    };

    await expect(recordCheckpoint(params)).rejects.toThrow(
      'Nama petugas pelaksana wajib diisi (Mandatory petugas_name)'
    );
  });

  it('AUD-02: should throw an error if actor_name is missing/undefined', async () => {
    const params = {
      entity_type: 'INBOUND_ORDER',
      entity_id: 'inbound-uuid-1',
      entity_number: 'PO-20260901-001',
      step_code: 'PO_CREATED',
      step_label: 'PO Dibuat',
      actor_name: '',
      actor_role: 'ADMIN_ADM'
    } as any;

    await expect(recordCheckpoint(params)).rejects.toThrow(
      'Nama petugas pelaksana wajib diisi (Mandatory petugas_name)'
    );
  });

  // Skenario AUD-01: Kontinuitas Pointer prev_checkpoint_id
  it('AUD-01: should link prev_checkpoint_id to existing previous checkpoint', async () => {
    const previousCheckpointId = 'cp-prev-uuid-1234';

    // Mock query for previous checkpoint lookup
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [{ id: previousCheckpointId }]
      } as any)
      .mockResolvedValueOnce({
        rows: [{
          id: 'cp-new-uuid-5678',
          entity_type: 'INBOUND_ORDER',
          entity_id: 'inbound-uuid-1',
          entity_number: 'PO-20260901-001',
          step_code: 'PO_RECEIVED',
          step_label: 'Barang Diterima Fisik',
          actor_name: 'Budi Santoso',
          actor_role: 'WH_STAFF',
          prev_checkpoint_id: previousCheckpointId
        }]
      } as any);

    const params: CreateCheckpointParams = {
      entity_type: 'INBOUND_ORDER',
      entity_id: 'inbound-uuid-1',
      entity_number: 'PO-20260901-001',
      step_code: 'PO_RECEIVED',
      step_label: 'Barang Diterima Fisik',
      actor_name: 'Budi Santoso',
      actor_role: 'WH_STAFF',
      photo_urls: ['https://cdn.wms.internal/photos/pod-01.jpg'],
      metadata: { temperature_celsius: 4.2 }
    };

    const result = await recordCheckpoint(params);

    expect(db.query).toHaveBeenCalledTimes(2);

    // Verify first query searched for previous checkpoint
    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SELECT id FROM checkpoint_logs'),
      ['INBOUND_ORDER', 'inbound-uuid-1']
    );

    // Verify insert query included prevId and JSON-stringified arrays/objects
    const insertArgs = vi.mocked(db.query).mock.calls[1][1];
    expect(insertArgs).toBeDefined();
    expect(insertArgs![11]).toBe(previousCheckpointId); // prev_checkpoint_id
    expect(insertArgs![6]).toBe('Budi Santoso'); // actor_name trimmed
    expect(insertArgs![9]).toBe(JSON.stringify(['https://cdn.wms.internal/photos/pod-01.jpg']));
    expect(insertArgs![10]).toBe(JSON.stringify({ temperature_celsius: 4.2 }));

    expect(result.prev_checkpoint_id).toBe(previousCheckpointId);
  });

  it('AUD-01: should set prev_checkpoint_id to null if this is the root checkpoint', async () => {
    // Mock no previous checkpoint found
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({
        rows: [{
          id: 'cp-root-001',
          entity_type: 'OUTBOUND_ORDER',
          entity_id: 'out-1',
          entity_number: 'ORD-001',
          step_code: 'ORDER_CREATED',
          actor_name: 'Siti Aminah',
          prev_checkpoint_id: null
        }]
      } as any);

    const params: CreateCheckpointParams = {
      entity_type: 'OUTBOUND_ORDER',
      entity_id: 'out-1',
      entity_number: 'ORD-001',
      step_code: 'ORDER_CREATED',
      step_label: 'Order Dibuat',
      actor_name: 'Siti Aminah',
      actor_role: 'ADMIN_ADM'
    };

    const result = await recordCheckpoint(params);

    const insertArgs = vi.mocked(db.query).mock.calls[1][1];
    expect(insertArgs![11]).toBeNull();
    expect(result.prev_checkpoint_id).toBeNull();
  });
});
