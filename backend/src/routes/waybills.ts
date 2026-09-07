import { Hono } from 'hono';
import { query } from '../db.js';

export const waybillRoutes = new Hono();

// List waybill (Surat Jalan + Resi) dengan filter status opsional
// GET /api/waybills?status=ISSUED
waybillRoutes.get('/', async (c) => {
  const status = c.req.query('status');

  const rows = status
    ? (await query(
        `SELECT w.*, oo.order_number, oo.recipient_name, oo.destination_city
         FROM waybills w
         LEFT JOIN outbound_orders oo ON w.reference_type = 'OUTBOUND_ORDER' AND w.reference_id = oo.id
         WHERE w.status = $1
         ORDER BY w.issued_at DESC`,
        [status]
      )).rows
    : (await query(
        `SELECT w.*, oo.order_number, oo.recipient_name, oo.destination_city
         FROM waybills w
         LEFT JOIN outbound_orders oo ON w.reference_type = 'OUTBOUND_ORDER' AND w.reference_id = oo.id
         ORDER BY w.issued_at DESC`
      )).rows;

  return c.json({ success: true, data: rows });
});

// Detail satu waybill + checkpoint rantai auditnya
waybillRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const res = await query(`SELECT * FROM waybills WHERE id = $1`, [id]);

  if (res.rows.length === 0) {
    return c.json({ success: false, message: 'Waybill not found' }, 404);
  }

  const checkpoints = await query(
    `SELECT * FROM checkpoint_logs
     WHERE entity_type = 'WAYBILL' AND entity_id = $1
     ORDER BY created_at ASC`,
    [id]
  );

  return c.json({ success: true, data: { ...res.rows[0], checkpoints: checkpoints.rows } });
});
