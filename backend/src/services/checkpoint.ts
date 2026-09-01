import { query } from '../db.js';

export interface CreateCheckpointParams {
  entity_type: 'INBOUND_ORDER' | 'CROSS_DOCK_MANIFEST' | 'CROSS_DOCUMENT' | 'OUTBOUND_ORDER' | 'FLEET_EXIT_LOG' | 'STOCK_ADJUSTMENT' | 'STOCK_CONVERSION' | string;
  entity_id: string;
  entity_number: string;
  step_code: string;
  step_label: string;
  actor_id?: string | null;
  actor_name: string; // Mandatory Petugas Name
  actor_role: string;
  notes?: string;
  photo_urls?: string[];
  metadata?: Record<string, any>;
}

export async function recordCheckpoint(params: CreateCheckpointParams) {
  if (!params.actor_name || params.actor_name.trim().length < 2) {
    throw new Error('Nama petugas pelaksana wajib diisi (Mandatory petugas_name)');
  }

  // Find previous checkpoint for linked-list audit chain
  const prevRes = await query(
    `SELECT id FROM checkpoint_logs 
     WHERE entity_type = $1 AND entity_id = $2 
     ORDER BY created_at DESC LIMIT 1`,
    [params.entity_type, params.entity_id]
  );
  const prevId = prevRes.rows.length > 0 ? prevRes.rows[0].id : null;

  const result = await query(
    `INSERT INTO checkpoint_logs (
      entity_type, entity_id, entity_number, step_code, step_label,
      actor_id, actor_name, actor_role, notes, photo_urls, metadata, prev_checkpoint_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      params.entity_type,
      params.entity_id,
      params.entity_number,
      params.step_code,
      params.step_label,
      params.actor_id || null,
      params.actor_name.trim(),
      params.actor_role,
      params.notes || null,
      JSON.stringify(params.photo_urls || []),
      JSON.stringify(params.metadata || {}),
      prevId
    ]
  );

  return result.rows[0];
}
