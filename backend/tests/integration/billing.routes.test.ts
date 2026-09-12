import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../src/db.js';
import * as checkpointService from '../../src/services/checkpoint.js';
import { app } from '../../src/app.js';

vi.mock('../../src/db.js', () => ({
  query: vi.fn(),
  pool: { connect: vi.fn() }
}));

vi.mock('../../src/services/checkpoint.js', () => ({
  recordCheckpoint: vi.fn()
}));

describe('Billing (Invoice & Payment sampai LUNAS) API Routes Integration Tests', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    };
    vi.mocked(db.pool.connect).mockResolvedValue(mockClient as any);
  });

  describe('POST /api/billing/:orderId/invoice', () => {
    const orderRow = {
      id: 'out-1',
      order_number: 'ORD-001',
      status: 'POD_VERIFIED',
      billing_ready: 1
    };

    it('should issue invoice when billing_ready is true and record checkpoint INVOICE_ISSUED', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [orderRow] } as any) // SELECT order
        .mockResolvedValueOnce({ rows: [] } as any) // cek faktur aktif
        .mockResolvedValueOnce({ rows: [] } as any); // cek nomor INV unik

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'inv-1', invoice_number: 'INV-AAAA1111', status: 'ISSUED' }] }) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      const res = await app.request('/api/billing/out-1/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 2500000, actor_name: 'Admin Penagih' })
      });

      expect(res.status).toBe(201);
      const bodyRes = await res.json();
      expect(bodyRes.data.invoice_number).toMatch(/^INV-[0-9A-HJ-NP-Z]{8}$/);
      expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          step_code: 'INVOICE_ISSUED',
          actor_name: 'Admin Penagih',
          metadata: expect.objectContaining({ invoice_id: 'inv-1', amount: 2500000 })
        })
      );
    });

    it('should return 409 when billing_ready is false (POD belum terverifikasi)', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ ...orderRow, billing_ready: 0 }]
      } as any);

      const res = await app.request('/api/billing/out-1/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_name: 'Admin Penagih' })
      });

      expect(res.status).toBe(409);
      const bodyRes = await res.json();
      expect(bodyRes.message).toContain('billing_ready');
    });

    it('should return 409 when an active invoice already exists', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [orderRow] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 'inv-1', invoice_number: 'INV-EXIST77' }] } as any);

      const res = await app.request('/api/billing/out-1/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_name: 'Admin Penagih' })
      });

      expect(res.status).toBe(409);
      const bodyRes = await res.json();
      expect(bodyRes.message).toContain('INV-EXIST77');
    });

    it('should return 404 when order does not exist', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [] } as any);

      const res = await app.request('/api/billing/out-404/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_name: 'Admin Penagih' })
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/billing/invoices/:invoiceId/payments', () => {
    const invoiceRow = {
      id: 'inv-1',
      invoice_number: 'INV-AAAA1111',
      order_id: 'out-1',
      order_number: 'ORD-001',
      amount: 1000000,
      status: 'ISSUED'
    };

    it('should record payment, mark invoice PAID and order payment_status PAID (LUNAS)', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [invoiceRow] } as any); // SELECT invoice

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // SELECT invoices FOR UPDATE (lock anti-race)
        .mockResolvedValueOnce({ rows: [{ id: 'pay-1', amount_paid: 1000000 }] }) // INSERT payment
        .mockResolvedValueOnce({ rows: [{ total_paid: 1000000 }] } as any) // SUM total DI DALAM transaksi
        .mockResolvedValueOnce({}) // UPDATE invoices PAID
        .mockResolvedValueOnce({}) // UPDATE outbound_orders payment_status PAID
        .mockResolvedValueOnce({}); // COMMIT

      const res = await app.request('/api/billing/invoices/inv-1/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_paid: 1000000, method: 'TRANSFER', actor_name: 'Kasir Dina' })
      });

      expect(res.status).toBe(201);
      const bodyRes = await res.json();
      expect(bodyRes.data.lunas).toBe(true);
      expect(bodyRes.data.invoice_status).toBe('PAID');
      expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          step_code: 'PAYMENT_RECEIVED',
          step_label: expect.stringContaining('LUNAS'),
          actor_name: 'Kasir Dina',
          metadata: expect.objectContaining({ lunas: true, total_paid: 1000000 })
        })
      );
    });

    it('should record partial payment without closing the invoice', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [invoiceRow] } as any); // SELECT invoice

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // SELECT invoices FOR UPDATE (lock anti-race)
        .mockResolvedValueOnce({ rows: [{ id: 'pay-2', amount_paid: 300000 }] })
        .mockResolvedValueOnce({ rows: [{ total_paid: 700000 }] } as any) // SUM total DI DALAM transaksi
        .mockResolvedValueOnce({}); // COMMIT

      const res = await app.request('/api/billing/invoices/inv-1/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_paid: 300000, method: 'CASH', actor_name: 'Kasir Dina' })
      });

      expect(res.status).toBe(201);
      const bodyRes = await res.json();
      expect(bodyRes.data.lunas).toBe(false);
      expect(bodyRes.data.invoice_status).toBe('ISSUED');
      expect(bodyRes.data.total_paid).toBe(700000);
    });

    it('should return 409 when invoice is already PAID', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ ...invoiceRow, status: 'PAID' }]
      } as any);

      const res = await app.request('/api/billing/invoices/inv-1/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_paid: 50000, actor_name: 'Kasir Dina' })
      });

      expect(res.status).toBe(409);
      const bodyRes = await res.json();
      expect(bodyRes.message).toContain('LUNAS');
    });

    it('should return 404 when invoice does not exist', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [] } as any);

      const res = await app.request('/api/billing/invoices/inv-404/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_paid: 50000, actor_name: 'Kasir Dina' })
      });

      expect(res.status).toBe(404);
    });

    it('should return 400 when amount_paid is not positive', async () => {
      const res = await app.request('/api/billing/invoices/inv-1/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_paid: 0, actor_name: 'Kasir Dina' })
      });

      expect(res.status).toBe(400);
    });
  });

  it('GET /api/billing/invoices should return invoice list with total_paid', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'inv-1', invoice_number: 'INV-AAAA1111', status: 'ISSUED', total_paid: 500000 }]
    } as any);

    const res = await app.request('/api/billing/invoices');
    expect(res.status).toBe(200);
    const bodyRes = await res.json();
    expect(bodyRes.success).toBe(true);
    expect(bodyRes.data[0].total_paid).toBe(500000);
  });
});
