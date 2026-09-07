import { Hono } from 'hono';
import { z } from 'zod';
import { query, pool } from '../db.js';
import { recordCheckpoint } from '../services/checkpoint.js';
import { optionalAuth, UserTokenPayload } from '../middlewares/auth.js';
import { generateWaybillNumber } from '../utils/waybill.js';

export const billingRoutes = new Hono();

// 1. Issue Invoice (Terbitkan Faktur dari POD Terverifikasi)
// Syarat mutlak: outbound_orders.billing_ready = true (POD sudah diverifikasi admin).
billingRoutes.post('/:orderId/invoice', optionalAuth, async (c) => {
  const user = c.get('user' as any) as UserTokenPayload | undefined;
  const orderId = c.req.param('orderId');

  const schema = z.object({
    amount: z.number().positive('Nilai faktur harus lebih dari 0').optional(),
    notes: z.string().max(500).optional(),
    actor_name: z.string().trim().min(2, 'Nama petugas penerbit faktur wajib diisi (min 2 karakter)').optional(),
    actor_id: z.string().optional()
  });
  const parsed = schema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ success: false, message: parsed.error.issues[0]?.message || 'Payload tidak valid' }, 400);
  }
  const body = parsed.data;

  const actor_name = (user?.full_name || body.actor_name || '').trim();
  const actor_id = user?.id || body.actor_id;
  const actor_role = user?.role || 'ADMIN_ADM';

  if (!actor_name || actor_name.length < 2) {
    return c.json({ success: false, message: 'Nama petugas penerbit faktur wajib diisi (Mandatory petugas_name)' }, 400);
  }

  const orderRes = await query(`SELECT * FROM outbound_orders WHERE id = $1`, [orderId]);
  if (orderRes.rows.length === 0) {
    return c.json({ success: false, message: 'Outbound order not found' }, 404);
  }
  const order = orderRes.rows[0];

  // Faktur hanya boleh terbit setelah POD terverifikasi (billing_ready)
  if (!order.billing_ready) {
    return c.json(
      { success: false, message: 'Faktur belum dapat diterbitkan: POD belum terverifikasi admin (billing_ready = false)' },
      409
    );
  }

  // Satu faktur aktif per order
  const dupRes = await query(
    `SELECT id, invoice_number FROM invoices WHERE outbound_order_id = $1 AND status != 'VOID'`,
    [orderId]
  );
  if (dupRes.rows.length > 0) {
    return c.json(
      { success: false, message: `Faktur sudah diterbitkan untuk order ini (INV: ${dupRes.rows[0].invoice_number})` },
      409
    );
  }

  // Generate nomor faktur unik (cek database, maksimal 5 percobaan)
  let invoiceNumber = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateWaybillNumber('INV');
    const exists = await query(`SELECT 1 FROM invoices WHERE invoice_number = $1`, [candidate]);
    if (exists.rows.length === 0) {
      invoiceNumber = candidate;
      break;
    }
  }
  if (!invoiceNumber) {
    return c.json({ success: false, message: 'Gagal generate nomor faktur unik, coba lagi' }, 500);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const invoiceRes = await client.query(
      `INSERT INTO invoices (
        invoice_number, outbound_order_id, amount, issued_by_id, issued_by_name, status, notes
      ) VALUES ($1, $2, $3, $4, $5, 'ISSUED', $6)
      RETURNING *`,
      [invoiceNumber, orderId, body.amount ?? null, actor_id || null, actor_name, body.notes || null]
    );
    const invoice = invoiceRes.rows[0];
    await client.query('COMMIT');

    // Record Checkpoint: INVOICE_ISSUED (rantai audit transaksi sampai LUNAS)
    await recordCheckpoint({
      entity_type: 'OUTBOUND_ORDER',
      entity_id: orderId as string,
      entity_number: order.order_number,
      step_code: 'INVOICE_ISSUED',
      step_label: 'Faktur / Tagihan Diterbitkan (Dasar: POD Terverifikasi)',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: actor_role,
      notes: body.notes || `Faktur ${invoiceNumber} diterbitkan, menunggu pembayaran`,
      metadata: { invoice_number: invoiceNumber, invoice_id: invoice.id, amount: body.amount ?? null }
    });

    return c.json({ success: true, data: invoice }, 201);
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});

// 2. Record Payment (Catat Penerimaan Pembayaran — AKHIR TUNGGAL TRANSAKSI)
// LUNAS: total pembayaran >= nilai faktur (atau pembayaran pertama bila faktur tanpa nilai).
billingRoutes.post('/invoices/:invoiceId/payments', optionalAuth, async (c) => {
  const user = c.get('user' as any) as UserTokenPayload | undefined;
  const invoiceId = c.req.param('invoiceId');

  const schema = z.object({
    amount_paid: z.number().positive('Jumlah pembayaran harus lebih dari 0'),
    method: z.string().trim().min(2).max(50).optional(),
    notes: z.string().max(500).optional(),
    actor_name: z.string().trim().min(2, 'Nama petugas pencatat pembayaran wajib diisi (min 2 karakter)').optional(),
    actor_id: z.string().optional()
  });
  const parsed = schema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ success: false, message: parsed.error.issues[0]?.message || 'Payload tidak valid' }, 400);
  }
  const body = parsed.data;

  const actor_name = (user?.full_name || body.actor_name || '').trim();
  const actor_id = user?.id || body.actor_id;
  const actor_role = user?.role || 'ADMIN_ADM';

  if (!actor_name || actor_name.length < 2) {
    return c.json({ success: false, message: 'Nama petugas pencatat pembayaran wajib diisi (Mandatory petugas_name)' }, 400);
  }

  const invoiceRes = await query(
    `SELECT i.*, oo.order_number, oo.id AS order_id
     FROM invoices i
     JOIN outbound_orders oo ON i.outbound_order_id = oo.id
     WHERE i.id = $1`,
    [invoiceId]
  );
  if (invoiceRes.rows.length === 0) {
    return c.json({ success: false, message: 'Invoice not found' }, 404);
  }
  const invoice = invoiceRes.rows[0];

  if (invoice.status === 'VOID') {
    return c.json({ success: false, message: 'Faktur berstatus VOID, tidak dapat menerima pembayaran' }, 409);
  }
  if (invoice.status === 'PAID') {
    return c.json(
      { success: false, message: `Faktur ${invoice.invoice_number} sudah LUNAS` },
      409
    );
  }

  const paidRes = await query(
    `SELECT COALESCE(SUM(amount_paid), 0) AS total_paid FROM payments WHERE invoice_id = $1`,
    [invoiceId]
  );
  const totalPaidBefore = Number(paidRes.rows[0]?.total_paid || 0);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const paymentRes = await client.query(
      `INSERT INTO payments (
        invoice_id, amount_paid, method, recorded_by_id, recorded_by_name, notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [invoiceId, body.amount_paid, body.method || null, actor_id || null, actor_name, body.notes || null]
    );
    const payment = paymentRes.rows[0];

    const totalPaid = totalPaidBefore + body.amount_paid;
    // Faktur tanpa nilai (amount NULL): pembayaran pertama menutup faktur
    const lunas = invoice.amount == null ? true : totalPaid >= Number(invoice.amount);

    if (lunas) {
      await client.query(`UPDATE invoices SET status = 'PAID' WHERE id = $1`, [invoiceId]);
      await client.query(`UPDATE outbound_orders SET payment_status = 'PAID' WHERE id = $1`, [invoice.order_id]);
    }
    await client.query('COMMIT');

    // Record Checkpoint: PAYMENT_RECEIVED (AKHIR TUNGGAL bila LUNAS)
    await recordCheckpoint({
      entity_type: 'OUTBOUND_ORDER',
      entity_id: invoice.order_id,
      entity_number: invoice.order_number,
      step_code: 'PAYMENT_RECEIVED',
      step_label: lunas
        ? 'Pembayaran Diterima — Transaksi LUNAS (Akhir Tunggal Transaksi)'
        : 'Pembayaran Parsial Diterima',
      actor_id: actor_id || null,
      actor_name: actor_name,
      actor_role: actor_role,
      notes: body.notes || `Pembayaran ${body.amount_paid} untuk faktur ${invoice.invoice_number}`,
      metadata: {
        invoice_number: invoice.invoice_number,
        payment_id: payment.id,
        amount_paid: body.amount_paid,
        total_paid: totalPaid,
        lunas
      }
    });

    return c.json({
      success: true,
      data: { payment, invoice_status: lunas ? 'PAID' : 'ISSUED', total_paid: totalPaid, lunas }
    }, 201);
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ success: false, message: err.message }, 500);
  } finally {
    client.release();
  }
});

// 3. List Invoices (daftar faktur + filter status)
billingRoutes.get('/invoices', async (c) => {
  const status = c.req.query('status');

  const rows = status
    ? (await query(
        `SELECT i.*, oo.order_number, oo.recipient_name, oo.payment_status,
                COALESCE((SELECT SUM(amount_paid) FROM payments p WHERE p.invoice_id = i.id), 0) AS total_paid
         FROM invoices i
         JOIN outbound_orders oo ON i.outbound_order_id = oo.id
         WHERE i.status = $1
         ORDER BY i.issued_at DESC`,
        [status]
      )).rows
    : (await query(
        `SELECT i.*, oo.order_number, oo.recipient_name, oo.payment_status,
                COALESCE((SELECT SUM(amount_paid) FROM payments p WHERE p.invoice_id = i.id), 0) AS total_paid
         FROM invoices i
         JOIN outbound_orders oo ON i.outbound_order_id = oo.id
         ORDER BY i.issued_at DESC`
      )).rows;

  return c.json({ success: true, data: rows });
});

// 4. Invoice Detail + payments + checkpoints
billingRoutes.get('/invoices/:id', async (c) => {
  const id = c.req.param('id');
  const invoiceRes = await query(
    `SELECT i.*, oo.order_number, oo.recipient_name, oo.payment_status
     FROM invoices i
     JOIN outbound_orders oo ON i.outbound_order_id = oo.id
     WHERE i.id = $1`,
    [id]
  );
  if (invoiceRes.rows.length === 0) {
    return c.json({ success: false, message: 'Invoice not found' }, 404);
  }

  const paymentsRes = await query(
    `SELECT * FROM payments WHERE invoice_id = $1 ORDER BY paid_at ASC`,
    [id]
  );
  const checkpointsRes = await query(
    `SELECT * FROM checkpoint_logs
     WHERE entity_type = 'OUTBOUND_ORDER' AND entity_id = $1
       AND step_code IN ('INVOICE_ISSUED', 'PAYMENT_RECEIVED')
     ORDER BY created_at ASC`,
    [invoiceRes.rows[0].outbound_order_id]
  );

  return c.json({
    success: true,
    data: {
      ...invoiceRes.rows[0],
      payments: paymentsRes.rows,
      checkpoints: checkpointsRes.rows
    }
  });
});
