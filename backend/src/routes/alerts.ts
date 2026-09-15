import { Hono } from 'hono';
import { z } from 'zod';
import { query } from '../db.js';

export const alertRoutes = new Hono();

const createAlertSchema = z.object({
  alert_type: z.string().min(2).max(64),
  title: z.string().min(2).max(200),
  message: z.string().min(2),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).default('WARNING'),
  warehouse_id: z.string().uuid().nullish(),
  entity_type: z.string().max(64).nullish(),
  entity_id: z.string().nullish()
});

// 1. List alerts with filters
alertRoutes.get('/', async (c) => {
  const is_resolved = c.req.query('is_resolved') === 'true';
  const severity = c.req.query('severity');
  const warehouse_id = c.req.query('warehouse_id');

  let sql = `
    SELECT a.*, w.name AS warehouse_name, w.code AS warehouse_code
    FROM alerts a
    LEFT JOIN warehouses w ON a.warehouse_id = w.id
    WHERE a.is_resolved = $1
  `;
  const params: any[] = [is_resolved];

  if (severity) {
    params.push(severity);
    sql += ` AND a.severity = $${params.length}`;
  }

  if (warehouse_id) {
    params.push(warehouse_id);
    sql += ` AND a.warehouse_id = $${params.length}`;
  }

  sql += ` ORDER BY CASE a.severity WHEN 'CRITICAL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END, a.created_at DESC`;

  const result = await query(sql, params);
  return c.json({ success: true, data: result.rows });
});

// 2. Summary stats of active alerts
alertRoutes.get('/summary', async (c) => {
  const warehouse_id = c.req.query('warehouse_id');
  let sql = `
    SELECT 
      COUNT(*) FILTER (WHERE is_resolved = false) AS total_unresolved,
      COUNT(*) FILTER (WHERE is_resolved = false AND severity = 'CRITICAL') AS critical_count,
      COUNT(*) FILTER (WHERE is_resolved = false AND severity = 'WARNING') AS warning_count,
      COUNT(*) FILTER (WHERE is_resolved = false AND severity = 'INFO') AS info_count
    FROM alerts
    WHERE 1=1
  `;
  const params: any[] = [];
  if (warehouse_id) {
    params.push(warehouse_id);
    sql += ` AND warehouse_id = $1`;
  }

  const result = await query(sql, params);
  const row = result.rows[0] || {};
  return c.json({
    success: true,
    data: {
      total_unresolved: parseInt(row.total_unresolved || '0', 10),
      critical_count: parseInt(row.critical_count || '0', 10),
      warning_count: parseInt(row.warning_count || '0', 10),
      info_count: parseInt(row.info_count || '0', 10)
    }
  });
});

// 3. Create alert
alertRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = createAlertSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, message: 'Data alert tidak valid', details: parsed.error.flatten().fieldErrors }, 400);
  }
  const d = parsed.data;

  const result = await query(
    `INSERT INTO alerts (
      id, alert_type, title, message, severity, warehouse_id, entity_type, entity_id
    ) VALUES (
      uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7
    ) RETURNING *`,
    [
      d.alert_type,
      d.title,
      d.message,
      d.severity,
      d.warehouse_id || null,
      d.entity_type || null,
      d.entity_id || null
    ]
  );

  return c.json({ success: true, message: 'Alert berhasil dibuat', data: result.rows[0] }, 201);
});

// 4. Resolve single alert
alertRoutes.post('/:id/resolve', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
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
    [id, resolution_notes || 'Diselesaikan oleh operator', actor_id || null, actor_name || 'Admin']
  );

  if (result.rows.length === 0) {
    return c.json({ success: false, message: 'Alert tidak ditemukan' }, 404);
  }

  return c.json({ success: true, message: 'Alert berhasil diselesaikan', data: result.rows[0] });
});

// 5. Batch resolve all unresolved alerts
alertRoutes.post('/resolve-all', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { warehouse_id, alert_type, resolution_notes, actor_name, actor_id } = body;

  let sql = `
    UPDATE alerts
    SET is_resolved = true,
        resolution_notes = $1,
        resolved_by_id = $2,
        resolved_by_name = $3,
        resolved_at = CURRENT_TIMESTAMP
    WHERE is_resolved = false
  `;
  const params: any[] = [
    resolution_notes || 'Diselesaikan serentak via Alert Center',
    actor_id || null,
    actor_name || 'Admin'
  ];

  if (warehouse_id) {
    params.push(warehouse_id);
    sql += ` AND warehouse_id = $${params.length}`;
  }
  if (alert_type) {
    params.push(alert_type);
    sql += ` AND alert_type = $${params.length}`;
  }

  sql += ` RETURNING id`;
  const result = await query(sql, params);

  return c.json({
    success: true,
    message: `${result.rows.length} alert berhasil diselesaikan`,
    resolved_count: result.rows.length
  });
});

// 6. Proactive anomaly scanner (Fleet Overdue & Operational SLA)
alertRoutes.post('/scan-overdue', async (c) => {
  // Query all departed vehicles with expected_return_time in the past
  const overdueLogsRes = await query(`
    SELECT fel.id, fel.log_number, fel.vehicle_id, fel.driver_name, fel.expected_return_time,
           fel.warehouse_id, v.plate_number, w.name AS warehouse_name
    FROM fleet_exit_logs fel
    LEFT JOIN vehicles v ON fel.vehicle_id = v.id
    LEFT JOIN warehouses w ON fel.warehouse_id = w.id
    WHERE fel.status = 'DEPARTED'
      AND fel.expected_return_time IS NOT NULL
      AND fel.expected_return_time < TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS')
  `);

  let createdCount = 0;
  const createdAlerts: any[] = [];

  for (const log of overdueLogsRes.rows) {
    // Check if an unresolved FLEET_OVERDUE alert for this log already exists
    const existing = await query(
      `SELECT id FROM alerts WHERE entity_type = 'FLEET_EXIT_LOG' AND entity_id = $1 AND is_resolved = false LIMIT 1`,
      [log.id]
    );

    if (existing.rows.length === 0) {
      const ins = await query(
        `INSERT INTO alerts (
          id, alert_type, entity_type, entity_id, warehouse_id, title, message, severity
        ) VALUES (
          uuid_generate_v4(), 'FLEET_OVERDUE', 'FLEET_EXIT_LOG', $1, $2, $3, $4, 'CRITICAL'
        ) RETURNING *`,
        [
          log.id,
          log.warehouse_id,
          `Armada Terlambat: ${log.plate_number || log.log_number}`,
          `Armada ${log.plate_number || log.log_number} (Driver: ${log.driver_name}) melewati batas waktu kembali (${log.expected_return_time}). Mohon konfirmasi satpam/driver.`
        ]
      );
      createdCount++;
      createdAlerts.push(ins.rows[0]);
    }
  }

  return c.json({
    success: true,
    message: `Pemeriksaan selesai. ${createdCount} alert armada overdue diterbitkan.`,
    overdue_found: overdueLogsRes.rows.length,
    new_alerts_created: createdCount,
    alerts: createdAlerts
  });
});
