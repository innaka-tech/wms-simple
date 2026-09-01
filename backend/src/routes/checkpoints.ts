import { Hono } from 'hono';
import { query } from '../db.js';

export const checkpointRoutes = new Hono();

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
