import { Hono } from 'hono';
import { query } from '../db.js';

export const alertRoutes = new Hono();

// List all active alerts
alertRoutes.get('/', async (c) => {
  const is_resolved = c.req.query('is_resolved') === 'true';
  const result = await query(
    `SELECT a.*, w.name AS warehouse_name
     FROM alerts a
     LEFT JOIN warehouses w ON a.warehouse_id = w.id
     WHERE a.is_resolved = $1
     ORDER BY a.created_at DESC`,
    [is_resolved]
  );
  return c.json({ success: true, data: result.rows });
});

// Resolve alert
alertRoutes.post('/:id/resolve', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { resolution_notes, actor_name, actor_id } = body;

  const result = await query(
    `UPDATE alerts 
     SET is_resolved = true,
         resolution_notes = $2,
         resolved_by_id = $3,
         resolved_by_name = $4,
         resolved_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [id, resolution_notes || 'Resolved by admin', actor_id || null, actor_name || 'Admin']
  );

  return c.json({ success: true, message: 'Alert resolved', data: result.rows[0] });
});
