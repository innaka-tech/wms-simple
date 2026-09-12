/**
 * E2E Test Backlog #5 — Rantai Checkpoint Inbound & Cross-Dock/Cross-Doc
 * (PostgreSQL RESMI via global DB stack, database wms_simple_test_db, TANPA mock)
 *
 * Mencakup tiga rantai dokumen sekaligus:
 *   1. INBOUND:  PO_CREATED → PO_RECEIVED → PUTAWAY_COMPLETED
 *                (sortir storage vs cross-dock, stok masuk rak via INBOUND_PUTAWAY)
 *   2. CROSS-DOCK: MANIFEST_CREATED → MANIFEST_LOADED (stok keluar + in_transit)
 *                → [gate-out satpam → IN_TRANSIT] → RECEIVED_AT_DEST (stok masuk di spoke)
 *   3. CROSS-DOC: dokumen lama diterbitkan ulang (SURAT_JALAN_SWAP) dan nomor baru
 *                terdaftar sebagai dokumen sah untuk vendor-exit (docs/05)
 *
 * Verifikasi tambahan:
 *   - Ledger stok konsisten (double-entry): saldo akhir = seed ± selisih mutasi
 *   - Integritas rantai checkpoint: id non-NULL, prev_checkpoint_id tersambung,
 *     actor_name wajib (AGENTS.md aturan 5)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Database test terpisah — HARUS di-set sebelum import modul backend
process.env.DB_NAME = 'wms_simple_test_db';
process.env.NODE_ENV = 'test';

const WH_JKT = 'a0000000-0000-0000-0000-000000000001'; // Main Hub (stok seed tersedia)
const WH_DPS = 'a0000000-0000-0000-0000-000000000002'; // Spoke Denpasar (tujuan cross-dock)
const CUST_A1 = 'c0000000-0000-0000-0000-000000000001';
const PRODUCT_TV = 'e0000000-0000-0000-0000-000000000004'; // SKU stok seed 120
const VEHICLE_TRONTON = 'f0000000-0000-0000-0000-000000000001';
const DOC_TYPE_SJ_SUPPLIER = '50000000-0000-0000-0000-000000000001'; // INBOUND
const DOC_TYPE_SJ_PENGIRIMAN = '50000000-0000-0000-0000-000000000002'; // OUTBOUND

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

async function stockOf(warehouseId: string, productId: string) {
  const r = await query(
    `SELECT qty_on_hand, qty_in_transit FROM stock_levels WHERE warehouse_id = $1 AND product_id = $2`,
    [warehouseId, productId]
  );
  return r.rows[0] || { qty_on_hand: 0, qty_in_transit: 0 };
}

/** Integritas rantai checkpoint (AGENTS.md aturan 5) untuk entity apa pun */
async function expectChainIntegrity(entityType: string, entityId: string, expectedSteps: string[]) {
  const rows = (
    await query(
      `SELECT * FROM checkpoint_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY rowid ASC`,
      [entityType, entityId]
    )
  ).rows;

  expect(rows.map((r: any) => r.step_code)).toEqual(expectedSteps);
  for (const r of rows) {
    expect(r.id, `checkpoint ${r.step_code} harus punya id (bukan NULL)`).toBeTruthy();
    expect((r.actor_name || '').trim().length).toBeGreaterThanOrEqual(2);
  }

  // Telusuri prev_checkpoint_id dari ekor ke kepala
  const byId = new Map(rows.map((r: any) => [r.id, r]));
  let cur: any = rows[rows.length - 1];
  const walked: string[] = [];
  while (cur) {
    walked.unshift(cur.step_code);
    cur = cur.prev_checkpoint_id ? byId.get(cur.prev_checkpoint_id) : undefined;
  }
  expect(walked).toEqual(expectedSteps);
}

describe('E2E Backlog #5 (PostgreSQL): Inbound → Putaway → Cross-Dock → Cross-Doc', () => {
  beforeAll(async () => {
    const dbMod = await import('../../src/db.js');
    query = dbMod.query;
    closePool = dbMod.closePool;
    const appMod = await import('../../src/app.js');
    app = appMod.app;

    await query('SELECT 1');
    await query(`TRUNCATE outbound_orders, inbound_orders, cross_dock_manifests, cross_documents,
      stock_conversions, fleet_exit_logs, vendor_vehicle_exit_logs, waybills, invoices, payments,
      pod_documents, packages, outbound_items, checkpoint_logs, stock_movements, weighbridge_logs, alerts
      RESTART IDENTITY CASCADE`);
    await query(`UPDATE vehicles SET status = 'AVAILABLE'`);
    // Reset saldo stok ke nilai seed agar deterministik antar-run
    await query(`DELETE FROM stock_levels`);
    await query(`INSERT INTO stock_levels (id, warehouse_id, product_id, qty_on_hand, qty_reserved, qty_in_transit, uom_id) VALUES
      ('s0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 20.00, 0.00, 0.00, '30000000-0000-0000-0000-000000000005'),
      ('s0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 200.00, 0.00, 0.00, '30000000-0000-0000-0000-000000000007'),
      ('s0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 15.00, 2.00, 5.00, '30000000-0000-0000-0000-000000000009'),
      ('s0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 120.00, 0.00, 0.00, '30000000-0000-0000-0000-000000000009')`);
  });

  afterAll(async () => {
    await closePool?.();
  });

  it('Inbound: PO → receive fisik → sortir & putaway (stok masuk rak)', async () => {
    const stockBefore = await stockOf(WH_JKT, PRODUCT_TV);
    // 1. Buat PO
    const po = await req('POST', '/api/inbound', {
      customer_id: CUST_A1,
      warehouse_id: WH_JKT,
      sender_info: 'PT Supplier Sejahtera',
      items: [{ product_id: PRODUCT_TV, ordered_qty: 10 }],
      actor_name: 'Siti Admin Pembelian'
    });
    expect(po.status).toBe(201);
    expect(po.data.id).toBeTruthy();
    expect(po.data.po_number).toMatch(/^PO-/);

    // 2. Penerimaan fisik di dock (tally: 10 masuk, kondisi baik)
    const detail = await req('GET', `/api/inbound/${po.data.id}`);
    expect(detail.status).toBe(200);
    const item = detail.data.items[0];
    expect(item.id).toBeTruthy();

    const receive = await req('POST', `/api/inbound/${po.data.id}/receive`, {
      truck_plate: 'B 1234 ABC',
      driver_name: 'Supir Supplier',
      items: [{ id: item.id, received_qty: 10, item_condition: 'GOOD' }],
      actor_name: 'Joko Checker'
    });
    expect(receive.status).toBe(200);

    // 3. Sortir & putaway: 4 ke staging cross-dock, 6 masuk rak
    const putaway = await req('POST', `/api/inbound/${po.data.id}/putaway`, {
      items: [{ id: item.id, product_id: PRODUCT_TV, received_qty: 10, cross_dock_qty: 4, storage_qty: 6, location_id: null }],
      actor_name: 'Joko Checker'
    });
    expect(putaway.status).toBe(200);

    // Stok masuk rak sesuai alokasi storage (basis dinamis, bukan asumsi seed)
    const st = await stockOf(WH_JKT, PRODUCT_TV);
    expect(Number(st.qty_on_hand)).toBe(Number(stockBefore.qty_on_hand) + 6);

    // Mutasi ledger tercatat dengan petugas wajib
    const mv = await query(
      `SELECT performed_by_name FROM stock_movements
       WHERE reference_type = 'INBOUND_ORDER' AND reference_id = $1 AND movement_type = 'INBOUND_PUTAWAY'`,
      [po.data.id]
    );
    expect(mv.rows.length).toBe(1);
    expect(mv.rows[0].performed_by_name).toBe('Joko Checker');

    await expectChainIntegrity('INBOUND_ORDER', po.data.id, ['PO_CREATED', 'PO_RECEIVED', 'PUTAWAY_COMPLETED']);
  });

  it('Cross-dock: manifest → load (stok keluar + in transit) → gate-out → terima di spoke', async () => {
    const before = await stockOf(WH_JKT, PRODUCT_TV);
    const dstBefore = await stockOf(WH_DPS, PRODUCT_TV);

    // 1. Buat manifest ke Denpasar (memuat sisa staging cross-dock + sebagian rak)
    const mnf = await req('POST', '/api/crossdock', {
      source_warehouse_id: WH_JKT,
      destination_warehouse_id: WH_DPS,
      customer_id: CUST_A1,
      vehicle_id: VEHICLE_TRONTON,
      driver_name: 'Budi Santoso',
      truck_plate: 'B 9188 WMS',
      items: [{ product_id: PRODUCT_TV, planned_qty: 8 }],
      actor_name: 'Siti Admin Gudang'
    });
    expect(mnf.status).toBe(201);
    expect(mnf.data.id).toBeTruthy();
    expect(mnf.data.manifest_number).toMatch(/^MNF-/);

    // 2. Loading ke truk
    const mnfDetail = await req('GET', `/api/crossdock/${mnf.data.id}`);
    expect(mnfDetail.status).toBe(200);
    const mnfItem = mnfDetail.data.items[0];
    expect(mnfItem.id).toBeTruthy();

    const load = await req('POST', `/api/crossdock/${mnf.data.id}/load`, {
      items: [{ id: mnfItem.id, loaded_qty: 8 }],
      actor_name: 'Joko Checker'
    });
    expect(load.status).toBe(200);

    // Stok sumber: berkurang on_hand, bertambah in_transit
    const afterLoad = await stockOf(WH_JKT, PRODUCT_TV);
    expect(Number(afterLoad.qty_on_hand)).toBe(Number(before.qty_on_hand) - 8);
    expect(Number(afterLoad.qty_in_transit)).toBe(Number(before.qty_in_transit) + 8);

    // 3. Pos satpam keluar (jalur pool) → manifest IN_TRANSIT
    //    Dokumen yang dibawa = nomor manifest (docs/05)
    const dep = await req('POST', '/api/fleet/departure', {
      vehicle_id: VEHICLE_TRONTON,
      driver_name: 'Budi Santoso',
      warehouse_id: WH_JKT,
      odometer_out: 45500,
      purpose: 'CROSS_DOCK_TRANSFER',
      reference_type: 'CROSS_DOCK_MANIFEST',
      reference_id: mnf.data.id,
      reference_number: mnf.data.manifest_number,
      departure_security_officer: 'Sersan Hendro'
    });
    expect(dep.status).toBe(201);

    const mnfAfterDep = await req('GET', `/api/crossdock/${mnf.data.id}`);
    expect(mnfAfterDep.data.status).toBe('IN_TRANSIT');

    // 4. Penerimaan di gudang tujuan (spoke Denpasar)
    const recv = await req('POST', `/api/crossdock/${mnf.data.id}/receive-dest`, {
      items: [{ id: mnfItem.id, received_qty: 8 }],
      actor_name: 'Made Penerima Spoke'
    });
    expect(recv.status).toBe(200);

    // Stok di sumber: in_transit kembali seperti semula; stok di tujuan bertambah
    const afterRecvSrc = await stockOf(WH_JKT, PRODUCT_TV);
    expect(Number(afterRecvSrc.qty_on_hand)).toBe(Number(before.qty_on_hand) - 8);
    expect(Number(afterRecvSrc.qty_in_transit)).toBe(Number(before.qty_in_transit));

    const dstStock = await stockOf(WH_DPS, PRODUCT_TV);
    expect(Number(dstStock.qty_on_hand)).toBe(Number(dstBefore.qty_on_hand) + 8);

    await expectChainIntegrity('CROSS_DOCK_MANIFEST', mnf.data.id, [
      'MANIFEST_CREATED', 'MANIFEST_LOADED', 'RECEIVED_AT_DEST'
    ]);
  });

  it('Cross-doc: surat jalan swap diterbitkan & nomor baru sah untuk vendor-exit', async () => {
    // 1. Terbitkan ulang dokumen (swap SJ lama → dokumen target baru)
    const xdoc = await req('POST', '/api/crossdoc', {
      warehouse_id: WH_DPS,
      customer_id: CUST_A1,
      cross_doc_type: 'SURAT_JALAN_SWAP',
      reason: 'SUB_DISTRIBUTION',
      source_document_type_id: DOC_TYPE_SJ_SUPPLIER,
      source_document_number: 'SJ-SUPPLIER-ASAL-001',
      source_sender_name: 'PT Supplier Sejahtera',
      target_document_type_id: DOC_TYPE_SJ_PENGIRIMAN,
      target_document_number: 'SJ-DISTRIBUSI-DESA-001',
      target_recipient_name: 'Koperasi Desa Merah Putih',
      target_destination_address: 'Dusun Sukamaju RT 02',
      items: [{ product_id: PRODUCT_TV, original_qty: 8, reissued_qty: 8 }],
      actor_name: 'Siti Admin Dokumen'
    });
    expect(xdoc.status).toBe(201);
    expect(xdoc.data.id).toBeTruthy();
    expect(xdoc.data.cross_doc_number).toMatch(/^XDOC-/);
    expect(xdoc.data.status).toBe('ISSUED');

    // 2. Nomor dokumen target terdaftar → sah dibawa truk vendor (docs/05 V_DOC)
    const vend = await req('POST', '/api/fleet/vendor-exit', {
      vendor_name: 'Ekspedisi Bali Kilat',
      plate_number: 'DK 9876 ZZ',
      waybill_number: 'SJ-DISTRIBUSI-DESA-001',
      reference_type: 'CROSS_DOCK_MANIFEST',
      reference_id: null,
      destination_note: 'Antar ke KDMP Sukamaju',
      actor_name: 'Sersan Hendro'
    });
    expect(vend.status).toBe(201);
    expect(vend.data.id).toBeTruthy();
    expect(vend.data.log_number).toMatch(/^VEND-OUT-/);

    await expectChainIntegrity('CROSS_DOCUMENT', xdoc.data.id, ['CROSS_DOC_ISSUED']);
    await expectChainIntegrity('VENDOR_EXIT_LOG', vend.data.id, ['VENDOR_EXIT']);
  });

  it('Guard: putaway dengan alokasi tidak konsisten ditolak (cross_dock + storage ≠ received)', async () => {
    const po = await req('POST', '/api/inbound', {
      customer_id: CUST_A1,
      warehouse_id: WH_JKT,
      items: [{ product_id: PRODUCT_TV, ordered_qty: 5 }],
      actor_name: 'Siti Admin Pembelian'
    });
    expect(po.status).toBe(201);

    await req('POST', `/api/inbound/${po.data.id}/receive`, {
      truck_plate: 'B 5555 XX',
      driver_name: 'Supir Kedua',
      items: [],
      actor_name: 'Joko Checker'
    });

    const detail = await req('GET', `/api/inbound/${po.data.id}`);
    const item = detail.data.items.find((i: any) => i.product_id === PRODUCT_TV);

    // 3 + 3 ≠ 5 → transaksi rollback, status order tetap RECEIVED
    const bad = await req('POST', `/api/inbound/${po.data.id}/putaway`, {
      items: [{ id: item.id, product_id: PRODUCT_TV, received_qty: 5, cross_dock_qty: 3, storage_qty: 3 }],
      actor_name: 'Joko Checker'
    });
    expect(bad.status).toBe(500);
    expect(bad.message).toContain('harus sama dengan');

    const orderAfter = await req('GET', `/api/inbound/${po.data.id}`);
    expect(orderAfter.data.status).toBe('RECEIVED');
  });
});
