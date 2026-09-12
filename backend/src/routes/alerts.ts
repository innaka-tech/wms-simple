import { Hono } from 'hono';
import { query } from '../db.js';
import { optionalAuth, UserTokenPayload } from '../middlewares/auth.js';

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

// Resolve alert (manager/admin only)
alertRoutes.post('/:id/resolve', optionalAuth, async (c) => {
  const user = c.get('user' as any) as UserTokenPayload | undefined;
  const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER'];
  if (user && !ALLOWED_ROLES.includes(user.role)) {
    return c.json({ success: false, message: `Akses ditolak: Peran '${user.role}' tidak memiliki izin untuk menyelesaikan alert` }, 403);
  }

  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { resolution_notes } = body;
  const actor_name = user?.full_name || body.actor_name || 'Admin';
  const actor_id = user?.id || body.actor_id || null;

  const result = await query(
    `UPDATE alerts 
     SET is_resolved = true,
         resolution_notes = $2,
         resolved_by_id = $3,
         resolved_by_name = $4,
         resolved_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [id, resolution_notes || 'Resolved by admin', actor_id, actor_name]
  );

  return c.json({ success: true, message: 'Alert resolved', data: result.rows[0] });
});
