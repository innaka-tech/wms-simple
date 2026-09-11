import { Pool } from 'pg';

/**
 * Schema PostgreSQL — transliterasi 1:1 dari skema sumber (SQLite dialect) ke PG.
 * Idempotent: CREATE TABLE IF NOT EXISTS + seed ON CONFLICT DO NOTHING.
 * Dipanggil otomatis oleh db.ts saat startup (juga untuk database test).
 */
const SCHEMA_SQL = `    CREATE TABLE IF NOT EXISTS master_cargo_types (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'GENERAL',
      handling_instructions TEXT,
      requires_weighbridge BOOLEAN DEFAULT FALSE,
      requires_temperature_control BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TEXT DEFAULT now(),
      updated_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS master_packaging_types (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      is_bulk_container BOOLEAN DEFAULT FALSE,
      tare_weight_kg DOUBLE PRECISION DEFAULT 0,
      nominal_capacity_kg DOUBLE PRECISION DEFAULT 0,
      nominal_capacity_liter DOUBLE PRECISION DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TEXT DEFAULT now(),
      updated_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS master_uom (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      base_category TEXT NOT NULL,
      is_base_unit BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS master_uom_conversions (
      id TEXT PRIMARY KEY,
      from_uom_id TEXT NOT NULL REFERENCES master_uom(id) ON DELETE CASCADE,
      to_uom_id TEXT NOT NULL REFERENCES master_uom(id) ON DELETE CASCADE,
      conversion_multiplier DOUBLE PRECISION NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT now(),
      UNIQUE(from_uom_id, to_uom_id)
    );

    CREATE TABLE IF NOT EXISTS master_warehouse_types (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      can_store_bulk BOOLEAN DEFAULT FALSE,
      can_cross_dock BOOLEAN DEFAULT TRUE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS master_document_types (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'SHIPPING',
      is_cross_doc_eligible BOOLEAN DEFAULT TRUE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS master_vehicle_types (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      body_type TEXT NOT NULL,
      axle_count INTEGER DEFAULT 2,
      max_payload_kg DOUBLE PRECISION NOT NULL,
      max_volume_cbm DOUBLE PRECISION DEFAULT 0,
      length_cm INTEGER DEFAULT 0,
      width_cm INTEGER DEFAULT 0,
      height_cm INTEGER DEFAULT 0,
      door_type TEXT DEFAULT 'REAR',
      fuel_type TEXT DEFAULT 'SOLAR',
      avg_fuel_consumption_km_per_liter DOUBLE PRECISION DEFAULT 3.5,
      compatible_cargo_type_ids TEXT DEFAULT '[]',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TEXT DEFAULT now(),
      updated_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      warehouse_type_id TEXT NOT NULL REFERENCES master_warehouse_types(id),
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      has_weighbridge BOOLEAN DEFAULT FALSE,
      has_debulking_facility BOOLEAN DEFAULT FALSE,
      contact_name TEXT,
      contact_phone TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TEXT DEFAULT now(),
      updated_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS warehouse_locations (
      id TEXT PRIMARY KEY,
      warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
      zone TEXT NOT NULL,
      aisle TEXT NOT NULL,
      rack TEXT NOT NULL,
      bin TEXT NOT NULL,
      location_type TEXT DEFAULT 'STANDARD_RACK',
      max_weight_capacity_kg DOUBLE PRECISION DEFAULT 2000,
      max_volume_capacity_cbm DOUBLE PRECISION DEFAULT 5.0,
      current_qty INTEGER DEFAULT 0,
      current_weight_kg DOUBLE PRECISION DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TEXT DEFAULT now(),
      UNIQUE(warehouse_id, zone, aisle, rack, bin)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'INTERNAL',
      contact_name TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      address TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TEXT DEFAULT now(),
      updated_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      warehouse_id TEXT REFERENCES warehouses(id) ON DELETE SET NULL,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TEXT DEFAULT now(),
      updated_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      cargo_type_id TEXT NOT NULL REFERENCES master_cargo_types(id),
      default_packaging_type_id TEXT REFERENCES master_packaging_types(id),
      default_uom_id TEXT NOT NULL REFERENCES master_uom(id),
      weight_kg_per_unit DOUBLE PRECISION DEFAULT 1.0,
      volume_m3_per_unit DOUBLE PRECISION DEFAULT 0.001,
      is_debulking_target BOOLEAN DEFAULT FALSE,
      parent_bulky_product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      min_stock_qty DOUBLE PRECISION DEFAULT 10,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TEXT DEFAULT now(),
      updated_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      plate_number TEXT UNIQUE NOT NULL,
      vehicle_type_id TEXT NOT NULL REFERENCES master_vehicle_types(id),
      brand TEXT,
      model TEXT,
      year_made INTEGER,
      current_driver_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      assigned_warehouse_id TEXT REFERENCES warehouses(id) ON DELETE SET NULL,
      status TEXT DEFAULT 'AVAILABLE',
      last_odometer_km DOUBLE PRECISION DEFAULT 0,
      kir_expiry_date TEXT,
      stnk_expiry_date TEXT,
      gps_tracking_id TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TEXT DEFAULT now(),
      updated_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS stock_levels (
      id TEXT PRIMARY KEY,
      warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      qty_on_hand DOUBLE PRECISION NOT NULL DEFAULT 0,
      qty_reserved DOUBLE PRECISION NOT NULL DEFAULT 0,
      qty_in_transit DOUBLE PRECISION NOT NULL DEFAULT 0,
      uom_id TEXT NOT NULL REFERENCES master_uom(id),
      last_updated TEXT DEFAULT now(),
      UNIQUE(warehouse_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      movement_type TEXT NOT NULL,
      reference_type TEXT NOT NULL,
      reference_id TEXT NOT NULL,
      qty_change DOUBLE PRECISION NOT NULL,
      qty_before DOUBLE PRECISION NOT NULL,
      qty_after DOUBLE PRECISION NOT NULL,
      uom_id TEXT REFERENCES master_uom(id),
      location_id TEXT REFERENCES warehouse_locations(id) ON DELETE SET NULL,
      notes TEXT,
      performed_by_id TEXT REFERENCES users(id),
      performed_by_name TEXT NOT NULL,
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS stock_conversions (
      id TEXT PRIMARY KEY,
      conversion_number TEXT UNIQUE NOT NULL,
      warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
      conversion_type TEXT NOT NULL DEFAULT 'DEBULKING_BREAKDOWN',
      status TEXT NOT NULL DEFAULT 'DRAFT',
      started_at TEXT,
      completed_at TEXT,
      total_input_weight_kg DOUBLE PRECISION DEFAULT 0,
      total_output_weight_kg DOUBLE PRECISION DEFAULT 0,
      shrinkage_loss_weight_kg DOUBLE PRECISION DEFAULT 0,
      shrinkage_percentage DOUBLE PRECISION DEFAULT 0,
      allowable_shrinkage_percentage DOUBLE PRECISION DEFAULT 1.0,
      notes TEXT,
      supervised_by_id TEXT REFERENCES users(id),
      supervised_by_name TEXT NOT NULL,
      created_at TEXT DEFAULT now(),
      updated_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS stock_conversion_items_in (
      id TEXT PRIMARY KEY,
      conversion_id TEXT NOT NULL REFERENCES stock_conversions(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      location_id TEXT REFERENCES warehouse_locations(id),
      qty_used DOUBLE PRECISION NOT NULL,
      uom_id TEXT NOT NULL REFERENCES master_uom(id),
      weight_kg DOUBLE PRECISION NOT NULL,
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS stock_conversion_items_out (
      id TEXT PRIMARY KEY,
      conversion_id TEXT NOT NULL REFERENCES stock_conversions(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      destination_location_id TEXT REFERENCES warehouse_locations(id),
      qty_produced DOUBLE PRECISION NOT NULL,
      uom_id TEXT NOT NULL REFERENCES master_uom(id),
      weight_kg DOUBLE PRECISION NOT NULL,
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS weighbridge_logs (
      id TEXT PRIMARY KEY,
      ticket_number TEXT UNIQUE NOT NULL,
      warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
      vehicle_id TEXT REFERENCES vehicles(id),
      truck_plate TEXT NOT NULL,
      driver_name TEXT,
      reference_type TEXT NOT NULL,
      reference_id TEXT NOT NULL,
      first_weight_gross_kg DOUBLE PRECISION NOT NULL,
      second_weight_tare_kg DOUBLE PRECISION,
      net_weight_cargo_kg DOUBLE PRECISION,
      weighbridge_operator TEXT NOT NULL,
      photo_url TEXT,
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS inbound_orders (
      id TEXT PRIMARY KEY,
      po_number TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
      cargo_type_id TEXT REFERENCES master_cargo_types(id),
      status TEXT NOT NULL DEFAULT 'CREATED',
      eta TEXT,
      actual_received_at TEXT,
      sender_info TEXT,
      truck_plate TEXT,
      driver_name TEXT,
      is_bulk_cargo BOOLEAN DEFAULT FALSE,
      requires_weighbridge BOOLEAN DEFAULT FALSE,
      notes TEXT,
      created_by_id TEXT REFERENCES users(id),
      created_by_name TEXT NOT NULL,
      created_at TEXT DEFAULT now(),
      updated_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS inbound_items (
      id TEXT PRIMARY KEY,
      inbound_order_id TEXT NOT NULL REFERENCES inbound_orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      ordered_qty DOUBLE PRECISION NOT NULL,
      received_qty DOUBLE PRECISION DEFAULT 0,
      cross_dock_qty DOUBLE PRECISION DEFAULT 0,
      storage_qty DOUBLE PRECISION DEFAULT 0,
      uom_id TEXT NOT NULL REFERENCES master_uom(id),
      item_condition TEXT DEFAULT 'GOOD',
      location_id TEXT REFERENCES warehouse_locations(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS cross_dock_manifests (
      id TEXT PRIMARY KEY,
      manifest_number TEXT UNIQUE NOT NULL,
      source_warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
      destination_warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
      customer_id TEXT NOT NULL REFERENCES customers(id),
      vehicle_id TEXT REFERENCES vehicles(id),
      driver_id TEXT REFERENCES users(id),
      driver_name TEXT,
      truck_plate TEXT,
      status TEXT NOT NULL DEFAULT 'CREATED',
      scheduled_departure TEXT,
      actual_departure TEXT,
      eta_arrival TEXT,
      actual_arrival TEXT,
      notes TEXT,
      created_by_id TEXT REFERENCES users(id),
      created_by_name TEXT NOT NULL,
      created_at TEXT DEFAULT now(),
      updated_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS cross_dock_items (
      id TEXT PRIMARY KEY,
      manifest_id TEXT NOT NULL REFERENCES cross_dock_manifests(id) ON DELETE CASCADE,
      inbound_item_id TEXT REFERENCES inbound_items(id) ON DELETE SET NULL,
      product_id TEXT NOT NULL REFERENCES products(id),
      planned_qty DOUBLE PRECISION NOT NULL,
      loaded_qty DOUBLE PRECISION DEFAULT 0,
      received_qty DOUBLE PRECISION DEFAULT 0,
      uom_id TEXT NOT NULL REFERENCES master_uom(id),
      variance_qty DOUBLE PRECISION DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS cross_documents (
      id TEXT PRIMARY KEY,
      cross_doc_number TEXT UNIQUE NOT NULL,
      warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
      customer_id TEXT NOT NULL REFERENCES customers(id),
      cross_doc_type TEXT NOT NULL DEFAULT 'SURAT_JALAN_SWAP',
      reason TEXT NOT NULL,
      source_document_type_id TEXT NOT NULL REFERENCES master_document_types(id),
      source_document_number TEXT NOT NULL,
      source_sender_name TEXT NOT NULL,
      target_document_type_id TEXT NOT NULL REFERENCES master_document_types(id),
      target_document_number TEXT UNIQUE NOT NULL,
      target_recipient_name TEXT NOT NULL,
      target_destination_address TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ISSUED',
      issued_by_id TEXT REFERENCES users(id),
      issued_by_name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT now(),
      updated_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS cross_document_items (
      id TEXT PRIMARY KEY,
      cross_doc_id TEXT NOT NULL REFERENCES cross_documents(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      original_qty DOUBLE PRECISION NOT NULL,
      reissued_qty DOUBLE PRECISION NOT NULL,
      uom_id TEXT NOT NULL REFERENCES master_uom(id),
      remarks TEXT,
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS outbound_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
      cargo_type_id TEXT REFERENCES master_cargo_types(id),
      status TEXT NOT NULL DEFAULT 'CREATED',
      recipient_name TEXT NOT NULL,
      recipient_phone TEXT,
      destination_address TEXT NOT NULL,
      destination_city TEXT,
      vehicle_id TEXT REFERENCES vehicles(id),
      driver_id TEXT REFERENCES users(id),
      driver_name TEXT,
      truck_plate TEXT,
      cross_doc_id TEXT REFERENCES cross_documents(id) ON DELETE SET NULL,
      billing_ready BOOLEAN DEFAULT FALSE,
      payment_status TEXT DEFAULT 'UNPAID',
      scheduled_ship_date TEXT,
      shipped_at TEXT,
      delivered_at TEXT,
      notes TEXT,
      created_by_id TEXT REFERENCES users(id),
      created_by_name TEXT NOT NULL,
      created_at TEXT DEFAULT now(),
      updated_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS outbound_items (
      id TEXT PRIMARY KEY,
      outbound_order_id TEXT NOT NULL REFERENCES outbound_orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      location_id TEXT REFERENCES warehouse_locations(id) ON DELETE SET NULL,
      ordered_qty DOUBLE PRECISION NOT NULL,
      picked_qty DOUBLE PRECISION DEFAULT 0,
      packed_qty DOUBLE PRECISION DEFAULT 0,
      delivered_qty DOUBLE PRECISION DEFAULT 0,
      uom_id TEXT NOT NULL REFERENCES master_uom(id),
      notes TEXT,
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY,
      outbound_order_id TEXT NOT NULL REFERENCES outbound_orders(id) ON DELETE CASCADE,
      box_code TEXT NOT NULL,
      packaging_type_id TEXT REFERENCES master_packaging_types(id),
      weight_kg DOUBLE PRECISION DEFAULT 0,
      dimensions TEXT,
      packed_by_id TEXT REFERENCES users(id),
      packed_by_name TEXT NOT NULL,
      sealed_at TEXT DEFAULT now(),
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS pod_documents (
      id TEXT PRIMARY KEY,
      outbound_order_id TEXT UNIQUE NOT NULL REFERENCES outbound_orders(id) ON DELETE CASCADE,
      pod_number TEXT UNIQUE NOT NULL,
      recipient_name TEXT NOT NULL,
      pod_photo_url TEXT NOT NULL,
      signature_photo_url TEXT NOT NULL,
      received_date TEXT DEFAULT now(),
      delivered_qty DOUBLE PRECISION NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACCEPTED',
      rejection_reason TEXT,
      verified_by_id TEXT REFERENCES users(id),
      verified_by_name TEXT,
      verified_at TEXT,
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS fleet_exit_logs (
      id TEXT PRIMARY KEY,
      log_number TEXT UNIQUE NOT NULL,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
      vehicle_type_id TEXT REFERENCES master_vehicle_types(id),
      driver_id TEXT REFERENCES users(id),
      driver_name TEXT NOT NULL,
      warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
      purpose TEXT NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      reference_number TEXT,
      waybill_number TEXT,
      departure_time TEXT DEFAULT now(),
      expected_return_time TEXT,
      odometer_out DOUBLE PRECISION NOT NULL,
      fuel_level_out TEXT DEFAULT 'FULL',
      departure_security_officer TEXT NOT NULL,
      departure_notes TEXT,
      departure_photo_url TEXT,
      actual_return_time TEXT,
      odometer_in DOUBLE PRECISION,
      fuel_level_in TEXT,
      return_security_officer TEXT,
      return_notes TEXT,
      return_photo_url TEXT,
      distance_travelled_km DOUBLE PRECISION,
      status TEXT NOT NULL DEFAULT 'DEPARTED',
      approved_by_id TEXT REFERENCES users(id),
      approved_by_name TEXT,
      created_at TEXT DEFAULT now(),
      updated_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      outbound_order_id TEXT NOT NULL REFERENCES outbound_orders(id),
      amount DOUBLE PRECISION,
      currency TEXT NOT NULL DEFAULT 'IDR',
      status TEXT NOT NULL DEFAULT 'ISSUED',
      issued_by_id TEXT REFERENCES users(id),
      issued_by_name TEXT NOT NULL,
      issued_at TEXT DEFAULT now(),
      notes TEXT,
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id),
      amount_paid DOUBLE PRECISION NOT NULL,
      method TEXT,
      paid_at TEXT DEFAULT now(),
      recorded_by_id TEXT REFERENCES users(id),
      recorded_by_name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS vendor_vehicle_exit_logs (
      id TEXT PRIMARY KEY,
      log_number TEXT UNIQUE NOT NULL,
      warehouse_id TEXT REFERENCES warehouses(id),
      vendor_name TEXT NOT NULL,
      plate_number TEXT NOT NULL,
      vehicle_type TEXT,
      driver_name TEXT,
      waybill_number TEXT NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      destination_note TEXT,
      departure_security_officer TEXT NOT NULL,
      departure_photo_url TEXT,
      notes TEXT,
      closed_at TEXT,
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS checkpoint_logs (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      entity_number TEXT NOT NULL,
      step_code TEXT NOT NULL,
      step_label TEXT NOT NULL,
      actor_id TEXT REFERENCES users(id),
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      notes TEXT,
      photo_urls TEXT DEFAULT '[]',
      metadata TEXT DEFAULT '{}',
      prev_checkpoint_id TEXT REFERENCES checkpoint_logs(id),
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      alert_type TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      warehouse_id TEXT REFERENCES warehouses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT DEFAULT 'WARNING',
      is_resolved BOOLEAN DEFAULT FALSE,
      resolved_by_id TEXT REFERENCES users(id),
      resolved_by_name TEXT,
      resolved_at TEXT,
      resolution_notes TEXT,
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS waybills (
      id TEXT PRIMARY KEY,
      sj_number TEXT UNIQUE NOT NULL,
      resi_number TEXT UNIQUE NOT NULL,
      reference_type TEXT NOT NULL DEFAULT 'OUTBOUND_ORDER',
      reference_id TEXT NOT NULL,
      issued_by_id TEXT REFERENCES users(id),
      issued_by_name TEXT NOT NULL,
      issued_at TEXT DEFAULT now(),
      status TEXT NOT NULL DEFAULT 'ISSUED',
      notes TEXT,
      created_at TEXT DEFAULT now()
    );`;

const SEED_SQL = `      INSERT INTO master_cargo_types (id, code, name, category, handling_instructions, requires_weighbridge, requires_temperature_control) VALUES
      ('10000000-0000-0000-0000-000000000001', 'GENERAL_CARGO', 'General Packaged Goods', 'PACKAGED', 'Penanganan standar, susun sesuai tanda arah panah', FALSE, FALSE),
      ('10000000-0000-0000-0000-000000000002', 'BULKY_HEAVY', 'Bulky & Heavy Lift Cargo', 'BULKY', 'Gunakan Forklift > 5 Ton / Crane, pastikan tumpuan rata', TRUE, FALSE),
      ('10000000-0000-0000-0000-000000000003', 'DRY_BULK', 'Curah Kering (Grains / Fertilizer / Sugar)', 'BULK_DRY', 'Timbang jembatan timbang, hindari kelembapan dan kontak air', TRUE, FALSE),
      ('10000000-0000-0000-0000-000000000004', 'LIQUID_BULK', 'Curah Cair (CPO / Oil / Chemical)', 'BULK_LIQUID', 'Gunakan pompa hisap & selang pipa makanan/kimia, cek segel tangki', TRUE, FALSE),
      ('10000000-0000-0000-0000-000000000005', 'TEMPERATURE_CONTROLLED', 'Cold Chain & Frozen Food', 'SPECIAL', 'Pertahankan suhu -18C s.d 4C, catat log suhu', FALSE, TRUE)
      ON CONFLICT DO NOTHING;

      INSERT INTO master_packaging_types (id, code, name, is_bulk_container, tare_weight_kg, nominal_capacity_kg, nominal_capacity_liter) VALUES
      ('20000000-0000-0000-0000-000000000001', 'JUMBO_BAG_1T', 'Jumbo Bag FIBC 1.000 KG', TRUE, 2.50, 1000.00, 1200.00),
      ('20000000-0000-0000-0000-000000000002', 'STEEL_DRUM_200L', 'Steel Drum 200 Liter', TRUE, 18.00, 200.00, 200.00),
      ('20000000-0000-0000-0000-000000000003', 'WOODEN_PALLET', 'Standard Wooden Pallet (120x100cm)', FALSE, 20.00, 1500.00, 0.00),
      ('20000000-0000-0000-0000-000000000004', 'SACK_50KG', 'Karung Anyaman PP 50 KG', FALSE, 0.15, 50.00, 60.00),
      ('20000000-0000-0000-0000-000000000005', 'SACK_25KG', 'Karung Anyaman PP 25 KG', FALSE, 0.10, 25.00, 30.00),
      ('20000000-0000-0000-0000-000000000006', 'LOOSE_BULK', 'Curah Bebas / Tanpa Kemasan', TRUE, 0.00, 30000.00, 35000.00),
      ('20000000-0000-0000-0000-000000000007', 'CARTON_BOX', 'Karton Box Standar', FALSE, 0.50, 25.00, 35.00)
      ON CONFLICT DO NOTHING;

      INSERT INTO master_uom (id, code, name, base_category, is_base_unit) VALUES
      ('30000000-0000-0000-0000-000000000001', 'KG', 'Kilogram', 'WEIGHT', TRUE),
      ('30000000-0000-0000-0000-000000000002', 'TON', 'Metric Ton', 'WEIGHT', FALSE),
      ('30000000-0000-0000-0000-000000000003', 'LTR', 'Liter', 'VOLUME', TRUE),
      ('30000000-0000-0000-0000-000000000004', 'M3', 'Meter Kubik (CBM)', 'VOLUME', FALSE),
      ('30000000-0000-0000-0000-000000000005', 'JUMBO_BAG', 'Jumbo Bag Unit', 'PACKAGING', FALSE),
      ('30000000-0000-0000-0000-000000000006', 'DRUM', 'Drum Unit', 'PACKAGING', FALSE),
      ('30000000-0000-0000-0000-000000000007', 'SACK', 'Karung / Sack', 'PACKAGING', FALSE),
      ('30000000-0000-0000-0000-000000000008', 'CTN', 'Carton Box', 'PACKAGING', FALSE),
      ('30000000-0000-0000-0000-000000000009', 'PCS', 'Pieces / Unit', 'PIECES', TRUE)
      ON CONFLICT DO NOTHING;

      INSERT INTO master_warehouse_types (id, code, name, can_store_bulk, can_cross_dock) VALUES
      ('40000000-0000-0000-0000-000000000001', 'MAIN_HUB', 'Main Consolidation & Fulfillment Hub', TRUE, TRUE),
      ('40000000-0000-0000-0000-000000000002', 'TRANSIT_SPOKE', 'Transit Spoke Warehouse', FALSE, TRUE)
      ON CONFLICT DO NOTHING;

      INSERT INTO master_document_types (id, code, name, category, is_cross_doc_eligible) VALUES
      ('50000000-0000-0000-0000-000000000001', 'SJ_SUPPLIER', 'Surat Jalan Supplier / Vendor Asal', 'INBOUND', TRUE),
      ('50000000-0000-0000-0000-000000000002', 'SJ_PENGIRIMAN', 'Surat Jalan Pengiriman Resmi (WMS)', 'OUTBOUND', TRUE),
      ('50000000-0000-0000-0000-000000000003', 'MASTER_AWB', 'Master Airway Bill / Master B/L', 'CROSS_DOC', TRUE),
      ('50000000-0000-0000-0000-000000000004', 'HOUSE_AWB', 'House Airway Bill (Sub-AWB Penerima Akhir)', 'CROSS_DOC', TRUE)
      ON CONFLICT DO NOTHING;

      INSERT INTO master_vehicle_types (id, code, name, body_type, axle_count, max_payload_kg, max_volume_cbm, length_cm, width_cm, height_cm, door_type, fuel_type, avg_fuel_consumption_km_per_liter) VALUES
      ('60000000-0000-0000-0000-000000000001', 'CDE_BOX', 'Colt Diesel Engkel (CDE) 4 Roda Box', 'BOX', 2, 2500.00, 10.00, 310, 170, 170, 'REAR', 'SOLAR', 5.50),
      ('60000000-0000-0000-0000-000000000002', 'CDD_BOX', 'Colt Diesel Double (CDD) 6 Roda Box', 'BOX', 2, 5000.00, 18.00, 430, 200, 200, 'REAR', 'SOLAR', 4.50),
      ('60000000-0000-0000-0000-000000000005', 'TRONTON_WINGBOX', 'Tronton Wingbox 10 Roda', 'WINGBOX', 3, 18000.00, 48.00, 940, 245, 240, 'WING_SIDE', 'SOLAR', 2.80)
      ON CONFLICT DO NOTHING;

      INSERT INTO warehouses (id, code, name, warehouse_type_id, address, city, has_weighbridge, has_debulking_facility, contact_name, contact_phone) VALUES
      ('a0000000-0000-0000-0000-000000000001', 'WH-JKT-01', 'Gudang Utama Jakarta Hub & Terminal Bulky', '40000000-0000-0000-0000-000000000001', 'Kawasan Industri Cakung Blok A1-4', 'Jakarta Timur', TRUE, TRUE, 'Bambang Sudiro', '081122334455'),
      ('a0000000-0000-0000-0000-000000000002', 'WH-DPS-01', 'Gudang Transit Denpasar Spoke', '40000000-0000-0000-0000-000000000002', 'Jl. Bypass Ngurah Rai No. 88', 'Denpasar', FALSE, FALSE, 'I Made Wardana', '081299887766')
      ON CONFLICT DO NOTHING;

      INSERT INTO customers (id, code, name, type, contact_name, contact_phone, contact_email, address) VALUES
      ('c0000000-0000-0000-0000-000000000001', 'CUST-A1', 'PT Logistik Prima Mandiri (Grup A.1)', 'INTERNAL', 'Hendra Setiawan', '081512345678', 'hendra@prima.logistics.com', 'Jakarta Pusat'),
      ('c0000000-0000-0000-0000-000000000002', 'CUST-KDMP', 'Koperasi Desa Merah Putih (KDMP Sukamaju)', 'INTERNAL', 'I Made Sukarja', '081623456789', 'koperasi@kdmp-sukamaju.desa.id', 'Jawa Barat')
      ON CONFLICT DO NOTHING;

      -- USERS & RBAC ACCOUNTS (Password for all: password123 or admin123)
      INSERT INTO users (id, username, full_name, email, password_hash, role, warehouse_id, customer_id) VALUES
      ('d0000000-0000-0000-0000-000000000001', 'superadmin', 'System Super Administrator', 'superadmin@wms-simple.local', 'password123', 'SUPER_ADMIN', NULL, NULL),
      ('d0000000-0000-0000-0000-000000000002', 'admin_adm', 'Siti Rahmawati (Admin Adm)', 'admin@wms-simple.local', 'password123', 'ADMIN_ADM', 'a0000000-0000-0000-0000-000000000001', NULL),
      ('d0000000-0000-0000-0000-000000000003', 'mgr_jkt', 'Bambang Sudiro (WH Manager JKT)', 'mgr.jkt@wms-simple.local', 'password123', 'WH_MANAGER', 'a0000000-0000-0000-0000-000000000001', NULL),
      ('d0000000-0000-0000-0000-000000000004', 'staff_jkt', 'Joko Susanto (WH Staff JKT)', 'staff.jkt@wms-simple.local', 'password123', 'WH_STAFF', 'a0000000-0000-0000-0000-000000000001', NULL),
      ('d0000000-0000-0000-0000-000000000005', 'driver_budi', 'Budi Santoso (Driver Tronton)', 'driver.budi@wms-simple.local', 'password123', 'DRIVER', 'a0000000-0000-0000-0000-000000000001', NULL),
      ('d0000000-0000-0000-0000-000000000006', 'gate_officer', 'Sersan Hendro (Satpam Gerbang)', 'satpam@wms-simple.local', 'password123', 'GATE_OFFICER', 'a0000000-0000-0000-0000-000000000001', NULL)
      ON CONFLICT DO NOTHING;

      INSERT INTO products (id, sku_code, name, description, cargo_type_id, default_packaging_type_id, default_uom_id, weight_kg_per_unit, volume_m3_per_unit, is_debulking_target, parent_bulky_product_id, min_stock_qty) VALUES
      ('e0000000-0000-0000-0000-000000000001', 'BULK-SUGAR-1T', 'Gula Pasir Rafinasi Jumbo Bag 1 Ton (Bulky)', 'Gula rafinasi industri kemasan Jumbo Bag 1000 kg', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 1000.00, 1.2000, FALSE, NULL, 5),
      ('e0000000-0000-0000-0000-000000000002', 'SUGAR-SACK-25KG', 'Gula Pasir Rafinasi Karung 25 KG (Retail/Distribusi)', 'Hasil repack bagging-off dari Jumbo Bag 1 Ton', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000007', 25.00, 0.0300, TRUE, 'e0000000-0000-0000-0000-000000000001', 50),
      ('e0000000-0000-0000-0000-000000000003', 'KDMP-CHILLER-300L', 'Showcase Display Chiller 300L (KDMP)', 'Showcase display pendingin untuk Koperasi Desa Merah Putih', '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000009', 65.00, 0.6500, FALSE, NULL, 10),
      ('e0000000-0000-0000-0000-000000000004', 'ELEC-TV-43', 'Smart LED TV 43 Inch FHD', 'Televisi LED 43 Inch with Smart OS', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000009', 8.50, 0.0850, FALSE, NULL, 20)
      ON CONFLICT DO NOTHING;

      INSERT INTO vehicles (id, plate_number, vehicle_type_id, brand, model, year_made, current_driver_id, assigned_warehouse_id, status, last_odometer_km) VALUES
      ('f0000000-0000-0000-0000-000000000001', 'B 9188 WMS', '60000000-0000-0000-0000-000000000005', 'Mitsubishi', 'Fighter FN 62 F Tronton Wingbox', 2022, 'd0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'AVAILABLE', 45200.00),
      ('f0000000-0000-0000-0000-000000000002', 'B 9845 WMS', '60000000-0000-0000-0000-000000000001', 'Isuzu', 'Elf CDE Box Tail-Lift KDMP', 2023, NULL, 'a0000000-0000-0000-0000-000000000001', 'AVAILABLE', 12400.00)
      ON CONFLICT DO NOTHING;

      INSERT INTO stock_levels (id, warehouse_id, product_id, qty_on_hand, qty_reserved, qty_in_transit, uom_id) VALUES
      ('s0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 20.00, 0.00, 0.00, '30000000-0000-0000-0000-000000000005'),
      ('s0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 200.00, 0.00, 0.00, '30000000-0000-0000-0000-000000000007'),
      ('s0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 15.00, 2.00, 5.00, '30000000-0000-0000-0000-000000000009'),
      ('s0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 120.00, 10.00, 0.00, '30000000-0000-0000-0000-000000000009')
      ON CONFLICT DO NOTHING;`;

/** Kolom baru hasil migrasi backlog — guard idempotent untuk database lama */
const MIGRATION_ALTERS = [
  'ALTER TABLE outbound_orders ADD COLUMN billing_ready BOOLEAN DEFAULT FALSE',
  "ALTER TABLE outbound_orders ADD COLUMN payment_status TEXT DEFAULT 'UNPAID'",
  'ALTER TABLE fleet_exit_logs ADD COLUMN waybill_number TEXT',
  "ALTER TABLE invoices ADD COLUMN currency TEXT NOT NULL DEFAULT 'IDR'",
  "ALTER TABLE checkpoint_logs ADD COLUMN photo_urls TEXT DEFAULT '[]'",
  "ALTER TABLE checkpoint_logs ADD COLUMN metadata TEXT DEFAULT '{}'",
  'ALTER TABLE checkpoint_logs ADD COLUMN prev_checkpoint_id TEXT',
  'ALTER TABLE stock_conversions ADD COLUMN outbound_order_id TEXT REFERENCES outbound_orders(id)'
];

// Partial unique index: satu waybill aktif & satu faktur aktif per referensi (race-proof)
const INDEX_SQL = [
  "CREATE UNIQUE INDEX IF NOT EXISTS ux_waybills_active_reference ON waybills(reference_type, reference_id) WHERE status <> 'VOID'",
  "CREATE UNIQUE INDEX IF NOT EXISTS ux_invoices_active_order ON invoices(outbound_order_id) WHERE status <> 'VOID'",
  'CREATE INDEX IF NOT EXISTS ix_stock_conversions_outbound_order ON stock_conversions(outbound_order_id)'
];

export async function initPgSchema(pool: Pool): Promise<void> {
  await pool.query(SCHEMA_SQL);
  await pool.query(SEED_SQL);
  for (const sql of MIGRATION_ALTERS) {
    try {
      await pool.query(sql);
    } catch {
      // kolom sudah ada pada database lama — abaikan
    }
  }
  for (const sql of INDEX_SQL) {
    await pool.query(sql);
  }
}
