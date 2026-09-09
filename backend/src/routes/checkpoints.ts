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
