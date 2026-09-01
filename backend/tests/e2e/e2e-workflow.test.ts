import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../src/db.js';
import { app } from '../../src/app.js';
import * as checkpointService from '../../src/services/checkpoint.js';
import * as stockService from '../../src/services/stock.js';

vi.mock('../../src/db.js', () => ({
  query: vi.fn(),
  pool: { connect: vi.fn() }
}));

vi.mock('../../src/services/checkpoint.js', () => ({
  recordCheckpoint: vi.fn()
}));

vi.mock('../../src/services/stock.js', () => ({
  adjustStock: vi.fn()
}));

describe('WMS Simple Enterprise - Master End-to-End Operational Lifecycle Test Suite', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    };
    vi.mocked(db.pool.connect).mockResolvedValue(mockClient as any);
  });

  it('Should execute the entire 7-Phase Operational Journey flawlessly', async () => {
    // =========================================================================
    // PHASE 1: INBOUND ORDER CREATION, PHYSICAL RECEIVE, & PUTAWAY
    // =========================================================================

    // 1.1 Create PO
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({   // INSERT inbound_orders
        rows: [{ id: 'po-e2e-001', po_number: 'PO-20260901-E2E', status: 'CREATED', warehouse_id: 'wh-jkt' }]
      })
      .mockResolvedValueOnce({}) // INSERT inbound_items
      .mockResolvedValueOnce({}); // COMMIT

    const createPoRes = await app.request('/api/inbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 'cust-agro-01',
        warehouse_id: 'wh-jkt',
        eta: '2026-09-01T10:00:00Z',
        items: [{ product_id: 'prod-sugar-jumbo-1t', ordered_qty: 10 }],
        actor_name: 'Siti Adm (Admin Gudang)',
        notes: 'Inbound 10 Jumbo Bag Gula Rafinasi'
      })
    });

    expect(createPoRes.status).toBe(201);
    const poData = (await createPoRes.json()).data;
    expect(poData.po_number).toBe('PO-20260901-E2E');
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({ step_code: 'PO_CREATED', actor_name: 'Siti Adm (Admin Gudang)' })
    );

    // 1.2 Physical Receive at Dock
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // UPDATE inbound_orders
      .mockResolvedValueOnce({}) // UPDATE inbound_items
      .mockResolvedValueOnce({ rows: [{ id: 'po-e2e-001', po_number: 'PO-20260901-E2E' }] }) // SELECT order
      .mockResolvedValueOnce({}); // COMMIT

    const receiveRes = await app.request('/api/inbound/po-e2e-001/receive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        truck_plate: 'B 9188 WMS',
        driver_name: 'Pak Supri',
        items: [{ id: 'item-po-1', received_qty: 10, item_condition: 'GOOD' }],
        actor_name: 'Ahmad Checker Dock'
      })
    });
    expect(receiveRes.status).toBe(200);
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({ step_code: 'PO_RECEIVED', actor_name: 'Ahmad Checker Dock' })
    );

    // 1.3 Putaway to Bulky Floor Staging & Stock Addition
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'po-e2e-001', po_number: 'PO-20260901-E2E', warehouse_id: 'wh-jkt' }]
    } as any);

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // UPDATE inbound_items
      .mockResolvedValueOnce({}) // UPDATE inbound_orders PUTAWAY_COMPLETED
      .mockResolvedValueOnce({}); // COMMIT

    const putawayRes = await app.request('/api/inbound/po-e2e-001/putaway', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: 'item-po-1', product_id: 'prod-sugar-jumbo-1t', received_qty: 10, cross_dock_qty: 0, storage_qty: 10, location_id: 'loc-bulky-floor' }],
        actor_name: 'Budi Forklift Driver'
      })
    });
    expect(putawayRes.status).toBe(200);
    expect(stockService.adjustStock).toHaveBeenCalledWith(
      expect.objectContaining({
        movement_type: 'INBOUND_PUTAWAY',
        product_id: 'prod-sugar-jumbo-1t',
        qty_change: 10
      })
    );
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({ step_code: 'PUTAWAY_COMPLETED', actor_name: 'Budi Forklift Driver' })
    );

    // =========================================================================
    // PHASE 2: DE-BULKING WORK ORDER (BULKY -> RETAIL SACKS & SHRINKAGE)
    // =========================================================================
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({   // INSERT stock_conversions
        rows: [{
          id: 'wo-debulk-001',
          conversion_number: 'DEBULK-E2E-001',
          shrinkage_percentage: '0.50',
          total_input_weight_kg: 1000,
          total_output_weight_kg: 995
        }]
      })
      .mockResolvedValueOnce({}) // INSERT stock_conversion_items_in
      .mockResolvedValueOnce({}) // INSERT stock_conversion_items_out
      .mockResolvedValueOnce({}); // COMMIT

    const debulkRes = await app.request('/api/debulking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: 'wh-jkt',
        conversion_type: 'BULKY_TO_PACKAGED',
        inputs: [{ product_id: 'prod-sugar-jumbo-1t', qty_used: 1, uom_id: 'uom-jumbo', weight_kg: 1000 }],
        outputs: [{ product_id: 'prod-sugar-sack-25kg', qty_produced: 39.8, uom_id: 'uom-sack', weight_kg: 995 }],
        allowable_shrinkage_percentage: 1.0,
        actor_name: 'Mandor Supri'
      })
    });

    expect(debulkRes.status).toBe(201);
    expect(stockService.adjustStock).toHaveBeenCalledWith(
      expect.objectContaining({ movement_type: 'DEBULKING_INPUT', qty_change: -1 })
    );
    expect(stockService.adjustStock).toHaveBeenCalledWith(
      expect.objectContaining({ movement_type: 'DEBULKING_OUTPUT', qty_change: 39.8 })
    );
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({ step_code: 'DEBULKING_COMPLETED', actor_name: 'Mandor Supri' })
    );

    // =========================================================================
    // PHASE 3: CROSS-DOCK MANIFEST & CROSS-DOCUMENT RE-ISSUANCE (SJ SWAP)
    // =========================================================================

    // 3.1 Create Cross-Dock Transfer Manifest (Jakarta -> Bali)
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({   // INSERT cross_dock_manifests
        rows: [{ id: 'mnf-e2e-001', manifest_number: 'MNF-E2E-001', status: 'CREATED' }]
      })
      .mockResolvedValueOnce({}) // INSERT cross_dock_items
      .mockResolvedValueOnce({}); // COMMIT

    const createMnfRes = await app.request('/api/crossdock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_warehouse_id: 'wh-jkt',
        destination_warehouse_id: 'wh-bali',
        customer_id: 'cust-agro-01',
        vehicle_id: 'veh-tronton-01',
        driver_name: 'Budi Santoso',
        truck_plate: 'B 9188 WMS',
        items: [{ product_id: 'prod-sugar-jumbo-1t', planned_qty: 5 }],
        actor_name: 'Admin Manifest'
      })
    });
    expect(createMnfRes.status).toBe(201);
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({ step_code: 'MANIFEST_CREATED', actor_name: 'Admin Manifest' })
    );

    // 3.2 Loading to Truck
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'mnf-e2e-001', manifest_number: 'MNF-E2E-001', source_warehouse_id: 'wh-jkt' }]
    } as any);

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // UPDATE cross_dock_items
      .mockResolvedValueOnce({}) // UPDATE cross_dock_manifests status LOADED
      .mockResolvedValueOnce({}); // COMMIT

    const loadRes = await app.request('/api/crossdock/mnf-e2e-001/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: 'item-cd-1', product_id: 'prod-sugar-jumbo-1t', loaded_qty: 5 }],
        actor_name: 'Dimas Loading Checker'
      })
    });
    expect(loadRes.status).toBe(200);
    expect(stockService.adjustStock).toHaveBeenCalledWith(
      expect.objectContaining({ movement_type: 'CROSS_DOCK_OUT', qty_change: -5, warehouse_id: 'wh-jkt' })
    );
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({ step_code: 'MANIFEST_LOADED', actor_name: 'Dimas Loading Checker' })
    );

    // 3.3 Re-issue Surat Jalan (Cross-Document Swap for Blind Shipping)
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({   // INSERT cross_documents
        rows: [{ id: 'xdoc-e2e-001', cross_doc_number: 'XDOC-E2E-001', status: 'ISSUED' }]
      })
      .mockResolvedValueOnce({}) // INSERT cross_document_items
      .mockResolvedValueOnce({}); // COMMIT

    const xdocRes = await app.request('/api/crossdoc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: 'wh-jkt',
        customer_id: 'cust-agro-01',
        source_document_type_id: 'doc-sj-pabrik',
        source_document_number: 'SJ-PABRIK-999',
        source_sender_name: 'Pabrik Gula Nasional',
        target_document_type_id: 'doc-sj-wms-blind',
        target_document_number: 'SJ-TITIPAN-888',
        target_recipient_name: 'Koperasi Pasar Bali',
        items: [{ product_id: 'prod-sugar-jumbo-1t', original_qty: 5, reissued_qty: 5, uom_id: 'uom-jumbo' }],
        actor_name: 'Admin Swap Dokumen'
      })
    });
    expect(xdocRes.status).toBe(201);
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({ step_code: 'CROSS_DOC_ISSUED', actor_name: 'Admin Swap Dokumen' })
    );

    // =========================================================================
    // PHASE 4: SECURITY GATE PASS (FLEET DEPARTURE)
    // =========================================================================
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({   // SELECT vehicle FOR UPDATE -> status AVAILABLE
        rows: [{ id: 'veh-tronton-01', plate_number: 'B 9188 WMS', status: 'AVAILABLE' }]
      })
      .mockResolvedValueOnce({   // INSERT fleet_exit_logs
        rows: [{ id: 'gate-log-e2e-001', log_number: 'GATE-OUT-E2E', status: 'DEPARTED' }]
      })
      .mockResolvedValueOnce({}) // UPDATE vehicles status IN_USE
      .mockResolvedValueOnce({}) // UPDATE cross_dock_manifests status IN_TRANSIT
      .mockResolvedValueOnce({}); // COMMIT

    const gateOutRes = await app.request('/api/fleet/departure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicle_id: 'veh-tronton-01',
        driver_name: 'Budi Santoso',
        warehouse_id: 'wh-jkt',
        purpose: 'CROSS_DOCK_DELIVERY',
        reference_type: 'CROSS_DOCK_MANIFEST',
        reference_id: 'mnf-e2e-001',
        reference_number: 'MNF-E2E-001',
        odometer_out: 45200.0,
        fuel_level_out: 'FULL',
        departure_security_officer: 'Sersan Hendro (Satpam Cakung)'
      })
    });
    expect(gateOutRes.status).toBe(201);
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({ step_code: 'FLEET_DEPARTED', actor_name: 'Sersan Hendro (Satpam Cakung)' })
    );

    // =========================================================================
    // PHASE 5: RECEIVE AT DESTINATION TRANSIT SPOKE (BALI)
    // =========================================================================
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'mnf-e2e-001', manifest_number: 'MNF-E2E-001', destination_warehouse_id: 'wh-bali' }]
    } as any);

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // UPDATE cross_dock_items
      .mockResolvedValueOnce({}) // UPDATE cross_dock_manifests status RECEIVED_DEST
      .mockResolvedValueOnce({}); // COMMIT

    const receiveDestRes = await app.request('/api/crossdock/mnf-e2e-001/receive-dest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: 'item-cd-1', product_id: 'prod-sugar-jumbo-1t', received_qty: 5 }],
        actor_name: 'Wayan Spoke Bali Checker'
      })
    });
    expect(receiveDestRes.status).toBe(200);
    expect(stockService.adjustStock).toHaveBeenCalledWith(
      expect.objectContaining({ movement_type: 'CROSS_DOCK_IN', qty_change: 5, warehouse_id: 'wh-bali' })
    );
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({ step_code: 'RECEIVED_AT_DEST', actor_name: 'Wayan Spoke Bali Checker' })
    );

    // =========================================================================
    // PHASE 6: FLEET RETURN AT SECURITY GATE (ODOMETER & DISTANCE CALCULATION)
    // =========================================================================
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'gate-log-e2e-001', log_number: 'GATE-OUT-E2E', vehicle_id: 'veh-tronton-01', odometer_out: '45200.0' }]
    } as any);

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({   // UPDATE fleet_exit_logs
        rows: [{ id: 'gate-log-e2e-001', status: 'RETURNED', odometer_in: '45430.5' }]
      })
      .mockResolvedValueOnce({}) // UPDATE vehicles status AVAILABLE
      .mockResolvedValueOnce({}); // COMMIT

    const gateInRes = await app.request('/api/fleet/logs/gate-log-e2e-001/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        odometer_in: 45430.5,
        fuel_level_in: 'HALF',
        return_security_officer: 'Bripka Joko (Satpam Gerbang)'
      })
    });
    expect(gateInRes.status).toBe(200);
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        step_code: 'FLEET_RETURNED',
        actor_name: 'Bripka Joko (Satpam Gerbang)',
        notes: expect.stringContaining('230.5 km') // Automatic distance calculation
      })
    );

    // =========================================================================
    // PHASE 7: OUTBOUND FULFILLMENT & KDMP BAST POD SIGNATURE
    // =========================================================================

    // 7.1 Create Outbound Order for KDMP Showcase Chiller
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({   // INSERT outbound_orders
        rows: [{ id: 'ord-kdmp-001', order_number: 'ORD-KDMP-001', status: 'CREATED', warehouse_id: 'wh-jkt' }]
      })
      .mockResolvedValueOnce({}) // INSERT outbound_items
      .mockResolvedValueOnce({}); // COMMIT

    const createOutRes = await app.request('/api/outbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 'cust-kdmp-national',
        warehouse_id: 'wh-jkt',
        recipient_name: 'Koperasi Desa Sukamaju (Bpk Kades)',
        destination_address: 'Balai Desa Sukamaju, Kec. Ciawi',
        items: [{ product_id: 'sku-chiller-kdmp', ordered_qty: 2 }],
        actor_name: 'Admin KDMP'
      })
    });
    expect(createOutRes.status).toBe(201);
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({ step_code: 'ORDER_CREATED', actor_name: 'Admin KDMP' })
    );

    // 7.2 Pick Items
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'ord-kdmp-001', order_number: 'ORD-KDMP-001', warehouse_id: 'wh-jkt' }]
    } as any);

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // UPDATE outbound_items
      .mockResolvedValueOnce({}) // UPDATE outbound_orders status PICKED
      .mockResolvedValueOnce({}); // COMMIT

    const pickRes = await app.request('/api/outbound/ord-kdmp-001/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: 'item-out-1', product_id: 'sku-chiller-kdmp', picked_qty: 2, location_id: 'loc-rack-01' }],
        actor_name: 'Picker Bayu'
      })
    });
    expect(pickRes.status).toBe(200);
    expect(stockService.adjustStock).toHaveBeenCalledWith(
      expect.objectContaining({ movement_type: 'OUTBOUND_PICK', qty_change: -2, warehouse_id: 'wh-jkt' })
    );

    // 7.3 Pack into Upright Wooden Crates
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'ord-kdmp-001', order_number: 'ORD-KDMP-001' }]
    } as any);

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // INSERT packages
      .mockResolvedValueOnce({}) // UPDATE outbound_orders status PACKED
      .mockResolvedValueOnce({}); // COMMIT

    const packRes = await app.request('/api/outbound/ord-kdmp-001/pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packages: [{ box_code: 'CRATE-KDMP-UPRIGHT-01', weight_kg: 85, dimensions: '60x60x175 cm' }],
        actor_name: 'Packer Bambang'
      })
    });
    expect(packRes.status).toBe(200);

    // 7.4 Submit Driver POD with Touch Signature & Photo
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'ord-kdmp-001', order_number: 'ORD-KDMP-001', recipient_name: 'Pak Kades' }]
    } as any);

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // INSERT pod_documents
      .mockResolvedValueOnce({}) // UPDATE outbound_orders status DELIVERED
      .mockResolvedValueOnce({}); // COMMIT

    const podRes = await app.request('/api/outbound/ord-kdmp-001/pod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_name: 'Pak Kades Sukamaju',
        pod_photo_url: 'https://cdn.wms.internal/pod/chiller-desa-01.jpg',
        signature_photo_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        delivered_qty: 2,
        actor_name: 'Driver Slamet (CDE Tail-Lift)'
      })
    });
    expect(podRes.status).toBe(200);
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({ step_code: 'DELIVERED', actor_name: 'Driver Slamet (CDE Tail-Lift)' })
    );

    // 7.5 Verify POD by Admin
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ id: 'ord-kdmp-001', order_number: 'ORD-KDMP-001' }]
    } as any);

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // UPDATE pod_documents
      .mockResolvedValueOnce({}) // UPDATE outbound_orders status POD_VERIFIED
      .mockResolvedValueOnce({}); // COMMIT

    const verifyPodRes = await app.request('/api/outbound/ord-kdmp-001/verify-pod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ACCEPTED',
        actor_name: 'Siti Adm (Admin Verifikator)'
      })
    });
    expect(verifyPodRes.status).toBe(200);
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({ step_code: 'POD_VERIFIED', actor_name: 'Siti Adm (Admin Verifikator)' })
    );

    // =========================================================================
    // AUDIT TRAIL VERIFICATION: Total checkpoints recorded in chain
    // =========================================================================
    expect(checkpointService.recordCheckpoint).toHaveBeenCalledTimes(15);
  });
});
