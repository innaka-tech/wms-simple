import { Hono } from 'hono';
import { query } from '../db.js';

export const checkpointRoutes = new Hono();

// Recent checkpoint activity across all entities (dashboard audit strip).
// MUST be declared before the /:entity_type/:entity_id param route.
checkpointRoutes.get('/recent', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10) || 20, 100);

  const result = await query(
    `SELECT id, entity_type, entity_id, entity_number, step_code, step_label,
            actor_name, actor_role, created_at
     FROM checkpoint_logs
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );

  return c.json({ success: true, data: result.rows });
});

// Timeline lengkap satu dokumen berdasarkan NOMOR dokumen (human-facing)
// + verifikasi integritas rantai prev_checkpoint_id (AGENTS.md aturan 5)
checkpointRoutes.get('/by-number/:number', async (c) => {
  const docNumber = c.req.param('number').trim().toUpperCase();
  if (docNumber.length < 4) {
    return c.json({ success: false, message: 'Nomor dokumen terlalu pendek (min 4 karakter)' }, 400);
  }

  const result = await query(
    `SELECT cl.*, u.full_name AS actor_full_name
     FROM checkpoint_logs cl
     LEFT JOIN users u ON cl.actor_id = u.id
     WHERE UPPER(cl.entity_number) = $1
     ORDER BY cl.created_at ASC`,
    [docNumber]
  );

  if (result.rows.length === 0) {
    return c.json({ success: false, message: `Tidak ada checkpoint untuk dokumen "${docNumber}"` }, 404);
  }

  // Integritas rantai: baris ke-N harus menautkan id baris ke-(N-1)
  const rows = result.rows;
  let chainValid = true;
  let brokenAt: number | null = null;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].prev_checkpoint_id !== rows[i - 1].id) {
      chainValid = false;
      brokenAt = i;
      break;
    }
  }

  return c.json({
    success: true,
    data: {
      document_number: docNumber,
      entity_type: rows[0].entity_type,
      chain_valid: chainValid,
      broken_at_step: brokenAt === null ? null : rows[brokenAt].step_code,
      total_checkpoints: rows.length,
      timeline: rows
    }
  });
});

// Get audit trail checkpoint chain for any entity
checkpointRoutes.get('/:entity_type/:entity_id', async (c) => {
  const entity_type = c.req.param('entity_type');
  const entity_id = c.req.param('entity_id');

  const result = await query(
    `SELECT * FROM checkpoint_logs 
     WHERE entity_type = $1 AND entity_id = $2 
     ORDER BY created_at ASC`,
    [entity_type, entity_id]
  );

  return c.json({
    success: true,
    data: result.rows
  });
});
