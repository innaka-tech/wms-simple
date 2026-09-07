/**
 * E2E Test — Rantai Transaksi Penuh 3 Backlog Terakhir
 * (1: Waybill SJ+Resi, 2: Vendor Exit, 3: Billing sampai LUNAS)
 *
 * Dijalankan lawan PostgreSQL RESMI (global DB stack, database wms_simple_test_db)
 * lewat HTTP app.request — TANPA mock. Memverifikasi:
 *   - Alur pool: order → pick → pack → issue-waybill → gate-out → POD → verify → invoice → LUNAS
 *   - Alur vendor: order → issue-waybill → vendor-exit (vendor/nopol/resi wajib) → POD → invoice → LUNAS
 *   - Guard: duplikat waybill/faktur, invoice sebelum billing_ready, bayar setelah LUNAS,
 *            resi tidak terdaftar, referensi tidak dikenal
 *   - Integritas rantai audit checkpoint: id tidak NULL, prev_checkpoint_id tersambung berurutan,
 *     actor_name wajib terisi (AGENTS.md aturan 5)
 *   - Mata uang Rupiah (IDR) pada faktur
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Database test terpisah — HARUS di-set sebelum import modul backend
process.env.DB_NAME = 'wms_simple_test_db';
process.env.NODE_ENV = 'test';

// IDs dari seed master data
const WH_JKT = 'a0000000-0000-0000-0000-000000000001';
const CUST_A1 = 'c0000000-0000-0000-0000-000000000001';
const PRODUCT_TV = 'e0000000-0000-0000-0000-000000000004';
const VEHICLE_TRONTON = 'f0000000-0000-0000-0000-000000000001';

let app: any;
let query: any;
let closePool: any;

async function req(method: string, url: string, body?: any) {
  const res = await app.request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
}

async function createOrder(recipient: string): Promise<any> {
  const r = await req('POST', '/api/outbound', {
    customer_id: CUST_A1,
    warehouse_id: WH_JKT,
    recipient_name: recipient,
    destination_address: 'Jl. Test E2E No. 1',
    destination_city: 'Jakarta',
    items: [{ product_id: PRODUCT_TV, ordered_qty: 2 }],
    actor_name: 'Admin Order E2E'
  });
  expect(r.status).toBe(201);
  expect(r.data.id).toBeTruthy();
  return r.data;
}

async function pickAndPack(orderId: string) {
  const detail = await req('GET', `/api/outbound/${orderId}`);
  expect(detail.status).toBe(200);
  const item = detail.data.items[0];
  expect(item.id).toBeTruthy();

  const pick = await req('POST', `/api/outbound/${orderId}/pick`, {
    items: [{ id: item.id, product_id: PRODUCT_TV, picked_qty: 2 }],
    actor_name: 'Picker E2E'
  });
  expect(pick.status).toBe(200);

  const pack = await req('POST', `/api/outbound/${orderId}/pack`, {
    packages: [{ box_code: 'BOX-E2E-01', weight_kg: 17 }],
    actor_name: 'Packer E2E'
  });
  expect(pack.status).toBe(200);
}

async function submitAndVerifyPod(orderId: string) {
  const pod = await req('POST', `/api/outbound/${orderId}/pod`, {
    recipient_name: 'Penerima E2E',
    pod_photo_url: 'https://cdn.wms.internal/pod/e2e.jpg',
    signature_photo_url: 'data:image/png;base64,e2e-signature',
    delivered_qty: 2,
    actor_name: 'Driver E2E'
  });
  expect(pod.status).toBe(200);

  const verify = await req('POST', `/api/outbound/${orderId}/verify-pod`, {
    status: 'ACCEPTED',
    actor_name: 'Admin Verifikator E2E'
  });
  expect(verify.status).toBe(200);
}

/**
 * Integritas rantai checkpoint (AGENTS.md aturan 5):
 * semua id non-NULL, actor_name terisi, prev_checkpoint_id menyambung mundur
 * persis seurutan ctid (insert order), dan urutan step_code sesuai rantai transaksi.
 */
async function expectChainIntegrity(orderId: string, expectedSteps: string[]) {
  const rows = (
    await query(
      `SELECT * FROM checkpoint_logs WHERE entity_type = 'OUTBOUND_ORDER' AND entity_id = $1 ORDER BY rowid ASC`,
      [orderId]
    )
  ).rows;

  expect(rows.map((r: any) => r.step_code)).toEqual(expectedSteps);
  for (const r of rows) {
    expect(r.id, `checkpoint ${r.step_code} harus punya id (bukan NULL)`).toBeTruthy();
    expect((r.actor_name || '').trim().length).toBeGreaterThanOrEqual(2);
    expect(r.entity_number).toMatch(/^ORD-/);
  }

  // Telusuri prev_checkpoint_id dari ujung ekor ke kepala
  const byId = new Map(rows.map((r: any) => [r.id, r]));
  let cur: any = rows[rows.length - 1];
  const walked: string[] = [];
  while (cur) {
    walked.unshift(cur.step_code);
    cur = cur.prev_checkpoint_id ? byId.get(cur.prev_checkpoint_id) : undefined;
  }
  expect(walked).toEqual(expectedSteps);
}

describe('E2E Rantai Transaksi (PostgreSQL): Waybill → Gate → POD → Invoice → LUNAS', () => {
  beforeAll(async () => {
    const dbMod = await import('../../src/db.js');
    query = dbMod.query;
    closePool = dbMod.closePool;
    const appMod = await import('../../src/app.js');
    app = appMod.app;

    // Pastikan schema + seed siap, lalu bersihkan state transaksional (master data dipertahankan)
    await query('SELECT 1');
    await query(`TRUNCATE outbound_orders, inbound_orders, cross_dock_manifests, cross_documents,
      stock_conversions, fleet_exit_logs, vendor_vehicle_exit_logs, waybills, invoices, payments,
      pod_documents, packages, outbound_items, checkpoint_logs, stock_movements, weighbridge_logs, alerts
      RESTART IDENTITY CASCADE`);
    await query(`UPDATE vehicles SET status = 'AVAILABLE'`);
  });

  afterAll(async () => {
    await closePool?.();
  });

  it('Jalur A (armada pool): rantai penuh sampai LUNAS', async () => {
    // 1-3. Order → Pick → Pack
    const order = await createOrder('Pelanggan Jalur Pool');
    await pickAndPack(order.id);

    // 4. Terbitkan SJ + Resi (universal, bukan cuma cross-dock)
    const wb = await req('POST', `/api/outbound/${order.id}/issue-waybill`, {
      actor_name: 'Siti Admin Gudang'
    });
    expect(wb.status).toBe(201);
    expect(wb.data.id).toBeTruthy(); // id bukan NULL (regresi PK)
    expect(wb.data.sj_number).toMatch(/^SJ-[0-9A-HJ-NP-Z]{8}$/);
    expect(wb.data.resi_number).toMatch(/^RESI-[0-9A-HJ-NP-Z]{8}$/);

    // 5. Pos satpam keluar jalur pool: wajib bawa resi yang sah
    const dep = await req('POST', '/api/fleet/departure', {
      vehicle_id: VEHICLE_TRONTON,
      driver_name: 'Budi Santoso',
      warehouse_id: WH_JKT,
      odometer_out: 45200,
      waybill_number: wb.data.sj_number,
      reference_type: 'OUTBOUND_ORDER',
      reference_id: order.id,
      departure_security_officer: 'Sersan Hendro'
    });
    expect(dep.status).toBe(201);
    expect(dep.data.id).toBeTruthy();
    expect(dep.data.log_number).toMatch(/^GATE-OUT-[0-9A-HJ-NP-Z]{8}$/);

    const orderAfterShip = await req('GET', `/api/outbound/${order.id}`);
    expect(orderAfterShip.data.status).toBe('SHIPPED');

    // 6-7. POD → Verify (billing_ready = penanda tunggal penagihan)
    await submitAndVerifyPod(order.id);
    const orderVerified = await req('GET', `/api/outbound/${order.id}`);
    expect(orderVerified.data.status).toBe('POD_VERIFIED');
    expect(Number(orderVerified.data.billing_ready)).toBe(1);
    expect(orderVerified.data.payment_status).toBe('UNPAID');

    // 8. Faktur — dalam Rupiah (IDR)
    const inv = await req('POST', `/api/billing/${order.id}/invoice`, {
      amount: 1_500_000,
      notes: 'Faktur pengiriman TV 2 unit',
      actor_name: 'Dina Kasir'
    });
    expect(inv.status).toBe(201);
    expect(inv.data.id).toBeTruthy();
    expect(inv.data.invoice_number).toMatch(/^INV-[0-9A-HJ-NP-Z]{8}$/);
    expect(inv.data.currency).toBe('IDR');

    // 9. Pembayaran parsial → belum LUNAS
    const pay1 = await req('POST', `/api/billing/invoices/${inv.data.id}/payments`, {
      amount_paid: 700_000,
      method: 'TRANSFER',
      actor_name: 'Dina Kasir'
    });
    expect(pay1.status).toBe(201);
    expect(pay1.data.lunas).toBe(false);
    expect(pay1.data.invoice_status).toBe('ISSUED');

    // 10. Pelunasan → AKHIR TUNGGAL transaksi
    const pay2 = await req('POST', `/api/billing/invoices/${inv.data.id}/payments`, {
      amount_paid: 800_000,
      method: 'TRANSFER',
      actor_name: 'Dina Kasir'
    });
    expect(pay2.status).toBe(201);
    expect(pay2.data.lunas).toBe(true);
    expect(pay2.data.invoice_status).toBe('PAID');
    expect(pay2.data.total_paid).toBe(1_500_000);

    const finalOrder = await req('GET', `/api/outbound/${order.id}`);
    expect(finalOrder.data.payment_status).toBe('PAID');

    // Keadaan DB: waybill, gate pass, stok, kendaraan
    const wbRow = (await query(`SELECT * FROM waybills WHERE id = $1`, [wb.data.id])).rows[0];
    expect(wbRow.status).toBe('ISSUED');

    const fleetRow = (await query(`SELECT * FROM fleet_exit_logs WHERE id = $1`, [dep.data.id])).rows[0];
    expect(fleetRow.waybill_number).toBe(wb.data.sj_number);

    const vehicle = (await query(`SELECT status FROM vehicles WHERE id = $1`, [VEHICLE_TRONTON])).rows[0];
    expect(vehicle.status).toBe('IN_USE'); // armada pool menunggu gate-in

    const movement = (
      await query(`SELECT * FROM stock_movements WHERE reference_id = $1 AND movement_type = 'OUTBOUND_PICK'`, [
        order.id
      ])
    ).rows[0];
    expect(movement).toBeTruthy();
    expect(movement.id).toBeTruthy();

    // Rantai audit order (FLEET_DEPARTED tercatat di entity FLEET_EXIT_LOG, bukan order)
    await expectChainIntegrity(order.id, [
      'ORDER_CREATED',
      'PICKING_COMPLETED',
      'PACKING_COMPLETED',
      'WAYBILL_ISSUED',
      'DELIVERED',
      'POD_VERIFIED',
      'INVOICE_ISSUED',
      'PAYMENT_RECEIVED',
      'PAYMENT_RECEIVED'
    ]);

    // Rantai audit gate pass
    const fleetCk = (
      await query(`SELECT * FROM checkpoint_logs WHERE entity_type = 'FLEET_EXIT_LOG' AND entity_id = $1`, [
        dep.data.id
      ])
    ).rows;
    expect(fleetCk.map((r: any) => r.step_code)).toEqual(['FLEET_DEPARTED']);
    expect(fleetCk[0].actor_name).toBe('Sersan Hendro');
  });

  it('Jalur B (truk vendor): vendor + nopol + resi wajib, rantai sampai LUNAS', async () => {
    const order = await createOrder('Pelanggan Jalur Vendor');
    const detail = await req('GET', `/api/outbound/${order.id}`);
    expect(detail.status).toBe(200);
    expect(detail.data.items[0].id).toBeTruthy();

    const wb = await req('POST', `/api/outbound/${order.id}/issue-waybill`, {
      actor_name: 'Siti Admin Gudang'
    });
    expect(wb.status).toBe(201);

    // Truk vendor keluar: nama vendor + nopol manual + resi dibawa — wajib
    const vexit = await req('POST', '/api/fleet/vendor-exit', {
      vendor_name: 'PT Ekspedisi Jaya Sentosa',
      plate_number: 'B 8765 XYZ',
      waybill_number: wb.data.sj_number,
      reference_type: 'OUTBOUND_ORDER',
      reference_id: order.id,
      destination_note: 'Gudang transit Denpasar',
      actor_name: 'Sersan Hendro'
    });
    expect(vexit.status).toBe(201);
    expect(vexit.data.id).toBeTruthy(); // id bukan NULL (regresi PK)
    expect(vexit.data.log_number).toMatch(/^VEND-OUT-[0-9A-HJ-NP-Z]{8}$/);

    const orderShipped = await req('GET', `/api/outbound/${order.id}`);
    expect(orderShipped.data.status).toBe('SHIPPED');

    // Truk vendor tidak wajib kembali — tidak ada gate-in; langsung POD
    await submitAndVerifyPod(order.id);

    // Faktur tanpa nilai (amount NULL) → pembayaran pertama menutup faktur (LUNAS)
    const inv = await req('POST', `/api/billing/${order.id}/invoice`, {
      actor_name: 'Dina Kasir'
    });
    expect(inv.status).toBe(201);
    expect(inv.data.currency).toBe('IDR');

    const pay = await req('POST', `/api/billing/invoices/${inv.data.id}/payments`, {
      amount_paid: 2_250_000,
      method: 'CASH',
      actor_name: 'Dina Kasir'
    });
    expect(pay.status).toBe(201);
    expect(pay.data.lunas).toBe(true);
    expect(pay.data.invoice_status).toBe('PAID');

    // Log vendor + checkpoint-nya
    const vlog = (await query(`SELECT * FROM vendor_vehicle_exit_logs WHERE id = $1`, [vexit.data.id])).rows[0];
    expect(vlog.vendor_name).toBe('PT Ekspedisi Jaya Sentosa');
    expect(vlog.plate_number).toBe('B 8765 XYZ');
    expect(vlog.waybill_number).toBe(wb.data.sj_number);

    const vCk = (
      await query(`SELECT * FROM checkpoint_logs WHERE entity_type = 'VENDOR_EXIT_LOG' AND entity_id = $1`, [
        vexit.data.id
      ])
    ).rows;
    expect(vCk.map((r: any) => r.step_code)).toEqual(['VENDOR_EXIT']);
    expect(vCk[0].id).toBeTruthy();
    expect(vCk[0].actor_name).toBe('Sersan Hendro');

    await expectChainIntegrity(order.id, [
      'ORDER_CREATED',
      'WAYBILL_ISSUED',
      'DELIVERED',
      'POD_VERIFIED',
      'INVOICE_ISSUED',
      'PAYMENT_RECEIVED'
    ]);
  });

  it('Guard: waybill ganda ditolak 409 (satu waybill aktif per order)', async () => {
    const order = await createOrder('Guard Duplikat Waybill');
    const wb1 = await req('POST', `/api/outbound/${order.id}/issue-waybill`, { actor_name: 'Siti Admin Gudang' });
    expect(wb1.status).toBe(201);

    const wb2 = await req('POST', `/api/outbound/${order.id}/issue-waybill`, { actor_name: 'Siti Admin Gudang' });
    expect(wb2.status).toBe(409);
    expect(wb2.message).toContain(wb1.data.sj_number);
  });

  it('Guard: issue-waybill setelah barang terkirim ditolak 409', async () => {
    const order = await createOrder('Guard Waybill Setelah Delivered');
    await pickAndPack(order.id);
    await submitAndVerifyPod(order.id); // DELIVERED tanpa waybill/gate (skenario sengaja)

    const wb = await req('POST', `/api/outbound/${order.id}/issue-waybill`, { actor_name: 'Siti Admin Gudang' });
    expect(wb.status).toBe(409);
  });

  it('Guard: faktur sebelum POD terverifikasi ditolak 409 (billing_ready = false)', async () => {
    const order = await createOrder('Guard Invoice Belum Ready');
    const inv = await req('POST', `/api/billing/${order.id}/invoice`, { actor_name: 'Dina Kasir' });
    expect(inv.status).toBe(409);
    expect(inv.message).toContain('billing_ready');
  });

  it('Guard: faktur ganda ditolak 409 (satu faktur aktif per order)', async () => {
    const order = await createOrder('Guard Duplikat Faktur');
    await pickAndPack(order.id);
    const wb = await req('POST', `/api/outbound/${order.id}/issue-waybill`, { actor_name: 'Siti Admin Gudang' });
    expect(wb.status).toBe(201);
    await req('POST', '/api/fleet/vendor-exit', {
      vendor_name: 'PT Ekspedisi Guard',
      plate_number: 'B 1111 GUA',
      waybill_number: wb.data.sj_number,
      reference_type: 'OUTBOUND_ORDER',
      reference_id: order.id,
      actor_name: 'Sersan Hendro'
    });
    await submitAndVerifyPod(order.id);

    const inv1 = await req('POST', `/api/billing/${order.id}/invoice`, { amount: 500_000, actor_name: 'Dina Kasir' });
    expect(inv1.status).toBe(201);
    const inv2 = await req('POST', `/api/billing/${order.id}/invoice`, { amount: 500_000, actor_name: 'Dina Kasir' });
    expect(inv2.status).toBe(409);
    expect(inv2.message).toContain(inv1.data.invoice_number);
  });

  it('Guard: pembayaran setelah LUNAS ditolak 409', async () => {
    const order = await createOrder('Guard Bayar Setelah Lunas');
    await pickAndPack(order.id);
    const wb = await req('POST', `/api/outbound/${order.id}/issue-waybill`, { actor_name: 'Siti Admin Gudang' });
    await req('POST', '/api/fleet/vendor-exit', {
      vendor_name: 'PT Ekspedisi Guard',
      plate_number: 'B 2222 GUA',
      waybill_number: wb.data.sj_number,
      reference_type: 'OUTBOUND_ORDER',
      reference_id: order.id,
      actor_name: 'Sersan Hendro'
    });
    await submitAndVerifyPod(order.id);
    const inv = await req('POST', `/api/billing/${order.id}/invoice`, { actor_name: 'Dina Kasir' });
    const pay1 = await req('POST', `/api/billing/invoices/${inv.data.id}/payments`, {
      amount_paid: 100_000,
      actor_name: 'Dina Kasir'
    });
    expect(pay1.data.lunas).toBe(true);

    const pay2 = await req('POST', `/api/billing/invoices/${inv.data.id}/payments`, {
      amount_paid: 50_000,
      actor_name: 'Dina Kasir'
    });
    expect(pay2.status).toBe(409);
    expect(pay2.message).toContain('LUNAS');
  });

  it('Guard: vendor-exit dengan resi tidak terdaftar ditolak 409 (docs/05)', async () => {
    const res = await req('POST', '/api/fleet/vendor-exit', {
      vendor_name: 'PT Ekspedisi Phantom',
      plate_number: 'B 9999 PHM',
      waybill_number: 'RESI-TIDAK-ADA',
      actor_name: 'Sersan Hendro'
    });
    expect(res.status).toBe(409);
    expect(res.message).toContain('tidak ditemukan');
  });

  it('Guard: vendor-exit dengan referensi order tidak dikenal ditolak 404', async () => {
    const wb = await req('POST', '/api/outbound', {
      customer_id: CUST_A1,
      warehouse_id: WH_JKT,
      recipient_name: 'Resi Untuk Referensi Phantom',
      destination_address: 'Jl. Ref 1',
      items: [{ product_id: PRODUCT_TV, ordered_qty: 1 }],
      actor_name: 'Admin Order E2E'
    });
    const order = wb.data;
    const issued = await req('POST', `/api/outbound/${order.id}/issue-waybill`, { actor_name: 'Siti Admin Gudang' });
    expect(issued.status).toBe(201);

    const res = await req('POST', '/api/fleet/vendor-exit', {
      vendor_name: 'PT Ekspedisi Phantom',
      plate_number: 'B 9998 PHM',
      waybill_number: issued.data.sj_number,
      reference_type: 'OUTBOUND_ORDER',
      reference_id: 'order-pantom-000',
      actor_name: 'Sersan Hendro'
    });
    expect(res.status).toBe(404);
    expect(res.message).toContain('referensi tidak ditemukan');
  });

  it('Guard: departure tanpa resi/SJ ditolak 400 (docs/05: tidak ada truk keluar tanpa dokumen)', async () => {
    const res = await req('POST', '/api/fleet/departure', {
      vehicle_id: VEHICLE_TRONTON,
      driver_name: 'Budi Santoso',
      warehouse_id: WH_JKT,
      odometer_out: 45300,
      // waybill_number sengaja tidak dikirim
      departure_security_officer: 'Sersan Hendro'
    });
    expect(res.status).toBe(400);
    expect(res.message).toContain('resi/Surat Jalan');
  });

  it('Guard: verify-pod dengan status di luar enum ditolak 400 (Zod)', async () => {
    const order = await createOrder('Guard Verify POD Enum');
    const res = await req('POST', `/api/outbound/${order.id}/verify-pod`, {
      status: 'NGACO',
      actor_name: 'Admin Verifikator E2E'
    });
    expect(res.status).toBe(400);
  });
});
