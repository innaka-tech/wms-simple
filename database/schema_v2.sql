-- ============================================================================
-- WMS SIMPLE V2 - POSTGRESQL ENTERPRISE DATABASE SCHEMA
-- Features:
--   1. Dynamic Master Data (No Hardcoding in schema or code)
--   2. Bulky, Curah (Dry & Liquid Bulk), & Packaged Cargo Handling
--   3. De-bulking / Breakdown / Bagging-Off / Conversion Module with Shrinkage Tracking
--   4. Dynamic Fleet Master (Vehicle Types, Cargo Compatibility, Dimensions, Tonase/CBM)
--   5. Cross-Docking & Cross-Document Re-issuance / Document Swap
--   6. Security Gate Pass (Fleet Exit Log - Departure & Return Odometer/Fuel/Inspection)
--   7. Double-Entry Stock Ledger (8+ Movement Types)
--   8. Immutable Checkpoint Chain Audit Trail (Linked List)
--   9. Strategic 6-Pillar Enablers (Weighbridge, SLA Alerts, Metrics)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. DYNAMIC MASTER LOOKUP TABLES (Dapat Dikelola via CRUD)
-- ----------------------------------------------------------------------------

-- 1.1 Master Tipe Kargo (General, Bulky, Dry Bulk, Liquid Bulk, Hazmat, Cold)
CREATE TABLE master_cargo_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL', -- BULKY, BULK_DRY, BULK_LIQUID, PACKAGED, SPECIAL
    handling_instructions TEXT,
    requires_weighbridge BOOLEAN DEFAULT FALSE,
    requires_temperature_control BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 1.2 Master Jenis Kemasan / Handling Unit (Jumbo Bag, Drum, Pallet, Sack, Silo, Tangki, Curah Loose)
CREATE TABLE master_packaging_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_bulk_container BOOLEAN DEFAULT FALSE,
    tare_weight_kg NUMERIC(10, 2) DEFAULT 0,
    nominal_capacity_kg NUMERIC(10, 2) DEFAULT 0,
    nominal_capacity_liter NUMERIC(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 1.3 Master Satuan Ukur (UOM) & Konversi
CREATE TABLE master_uom (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL, -- KG, TON, LTR, M3, JUMBO_BAG, DRUM, SACK, CTN, PCS
    name VARCHAR(50) NOT NULL,
    base_category VARCHAR(30) NOT NULL, -- WEIGHT, VOLUME, PIECES, PACKAGING
    is_base_unit BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE master_uom_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_uom_id UUID NOT NULL REFERENCES master_uom(id) ON DELETE CASCADE,
    to_uom_id UUID NOT NULL REFERENCES master_uom(id) ON DELETE CASCADE,
    conversion_multiplier NUMERIC(15, 6) NOT NULL, -- from * multiplier = to
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_uom_id, to_uom_id)
);

-- 1.4 Master Tipe Gudang (Main Hub, Transit Spoke, Bulk Terminal, CFS Station)
CREATE TABLE master_warehouse_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    can_store_bulk BOOLEAN DEFAULT FALSE,
    can_cross_dock BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 1.5 Master Tipe Dokumen (Surat Jalan Asal, Surat Jalan Pengiriman, Master AWB, House AWB, Delivery Note)
CREATE TABLE master_document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'SHIPPING', -- INBOUND, OUTBOUND, CROSS_DOC, BILLING
    is_cross_doc_eligible BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 1.6 Master Tipe Armada / Kendaraan (Dinamis: CDE, CDD, Fuso, Wingbox, Dump Truck, Tanker, Trailer)
CREATE TABLE master_vehicle_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    body_type VARCHAR(50) NOT NULL, -- BOX, WINGBOX, BAK_TERBUKA, DUMP_TRUCK, TANKER, FLATBED, SKELETON
    axle_count INT DEFAULT 2,
    max_payload_kg NUMERIC(10, 2) NOT NULL,
    max_volume_cbm NUMERIC(10, 2) DEFAULT 0,
    length_cm INT DEFAULT 0,
    width_cm INT DEFAULT 0,
    height_cm INT DEFAULT 0,
    door_type VARCHAR(50) DEFAULT 'REAR', -- REAR, WING_SIDE, TOP_HATCH, BOTTOM_DUMP
    fuel_type VARCHAR(30) DEFAULT 'SOLAR',
    avg_fuel_consumption_km_per_liter NUMERIC(5, 2) DEFAULT 3.5,
    compatible_cargo_type_ids JSONB DEFAULT '[]'::jsonb, -- Array of master_cargo_types.id
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. CORE MASTER DATA ENTITIES
-- ----------------------------------------------------------------------------

-- 2.1 Warehouses
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    warehouse_type_id UUID NOT NULL REFERENCES master_warehouse_types(id),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    has_weighbridge BOOLEAN DEFAULT FALSE,
    has_debulking_facility BOOLEAN DEFAULT FALSE,
    contact_name VARCHAR(100),
    contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.2 Warehouse Storage Locations / Bins / Silos / Staging Bays
CREATE TABLE warehouse_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    zone VARCHAR(50) NOT NULL,
    aisle VARCHAR(50) NOT NULL,
    rack VARCHAR(50) NOT NULL,
    bin VARCHAR(50) NOT NULL,
    location_type VARCHAR(50) DEFAULT 'STANDARD_RACK', -- STANDARD_RACK, BULK_SILO, LIQUID_TANK, FLOOR_STAGING, CROSSDOCK_BAY
    max_weight_capacity_kg NUMERIC(10, 2) DEFAULT 2000,
    max_volume_capacity_cbm NUMERIC(10, 2) DEFAULT 5.0,
    current_qty INT DEFAULT 0,
    current_weight_kg NUMERIC(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, zone, aisle, rack, bin)
);

-- 2.3 Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(20) DEFAULT 'INTERNAL',
    contact_name VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.4 Users & RBAC
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL, -- SUPER_ADMIN, ADMIN_ADM, WH_MANAGER, WH_STAFF, DRIVER, CUSTOMER, GATE_OFFICER
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.5 Products / SKUs (Mendukung Barang Packaged, Bulky, dan Curah)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    cargo_type_id UUID NOT NULL REFERENCES master_cargo_types(id),
    default_packaging_type_id UUID REFERENCES master_packaging_types(id),
    default_uom_id UUID NOT NULL REFERENCES master_uom(id),
    weight_kg_per_unit NUMERIC(10, 2) DEFAULT 1.0,
    volume_m3_per_unit NUMERIC(10, 4) DEFAULT 0.001,
    is_debulking_target BOOLEAN DEFAULT FALSE, -- Apakah produk ini hasil dari pencurahan barang bulky?
    parent_bulky_product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- Referensi barang bulky induk
    min_stock_qty NUMERIC(10, 2) DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.6 Vehicles / Armada
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plate_number VARCHAR(30) UNIQUE NOT NULL,
    vehicle_type_id UUID NOT NULL REFERENCES master_vehicle_types(id),
    brand VARCHAR(50),
    model VARCHAR(50),
    year_made INT,
    current_driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'AVAILABLE', -- AVAILABLE, IN_USE, MAINTENANCE, INACTIVE
    last_odometer_km NUMERIC(10, 2) DEFAULT 0,
    kir_expiry_date DATE,
    stnk_expiry_date DATE,
    gps_tracking_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. STOCK LEDGER & CONVERSION / DE-BULKING MODULE
-- ----------------------------------------------------------------------------

-- 3.1 Stock Levels Snapshot (Real-time Balance per Warehouse & SKU)
CREATE TABLE stock_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty_on_hand NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
    qty_reserved NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (qty_reserved >= 0),
    qty_in_transit NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (qty_in_transit >= 0),
    uom_id UUID NOT NULL REFERENCES master_uom(id),
    last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, product_id)
);

-- 3.2 Stock Movements (Double-Entry Immutable Ledger)
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    product_id UUID NOT NULL REFERENCES products(id),
    movement_type VARCHAR(50) NOT NULL, 
    -- INBOUND_RECEIVE, INBOUND_PUTAWAY, DEBULKING_INPUT, DEBULKING_OUTPUT, 
    -- CROSS_DOCK_OUT, CROSS_DOCK_IN, OUTBOUND_PICK, OUTBOUND_SHIP, ADJUSTMENT, TRANSFER
    reference_type VARCHAR(50) NOT NULL,
    -- INBOUND_ORDER, STOCK_CONVERSION, CROSS_DOCK_MANIFEST, OUTBOUND_ORDER, STOCK_ADJUSTMENT
    reference_id UUID NOT NULL,
    qty_change NUMERIC(12, 2) NOT NULL,
    qty_before NUMERIC(12, 2) NOT NULL,
    qty_after NUMERIC(12, 2) NOT NULL,
    uom_id UUID REFERENCES master_uom(id),
    location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    notes TEXT,
    performed_by_id UUID REFERENCES users(id),
    performed_by_name VARCHAR(150) NOT NULL, -- Mandatory Petugas Name
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3.3 De-bulking / Breakdown / Bagging-Off / Conversion Work Orders
CREATE TABLE stock_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversion_number VARCHAR(100) UNIQUE NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    conversion_type VARCHAR(50) NOT NULL DEFAULT 'DEBULKING_BREAKDOWN', -- BULKY_TO_BULK_DRY, BULKY_TO_PACKAGED, TANK_DECANTING, REPACKING
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, IN_PROGRESS, COMPLETED, CANCELLED
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    total_input_weight_kg NUMERIC(12, 2) DEFAULT 0,
    total_output_weight_kg NUMERIC(12, 2) DEFAULT 0,
    shrinkage_loss_weight_kg NUMERIC(12, 2) GENERATED ALWAYS AS (total_input_weight_kg - total_output_weight_kg) STORED,
    shrinkage_percentage NUMERIC(5, 2),
    allowable_shrinkage_percentage NUMERIC(5, 2) DEFAULT 1.0, -- Toleransi susut maksimal (e.g. 1%)
    notes TEXT,
    supervised_by_id UUID REFERENCES users(id),
    supervised_by_name VARCHAR(150) NOT NULL, -- Petugas Pengawas
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_conversion_items_in (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversion_id UUID NOT NULL REFERENCES stock_conversions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id), -- Bulky Item (e.g., Jumbo Bag 1 Ton)
    location_id UUID REFERENCES warehouse_locations(id),
    qty_used NUMERIC(10, 2) NOT NULL CHECK (qty_used > 0),
    uom_id UUID NOT NULL REFERENCES master_uom(id),
    weight_kg NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_conversion_items_out (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversion_id UUID NOT NULL REFERENCES stock_conversions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id), -- Child Item (e.g., Karung 25kg / Curah)
    destination_location_id UUID REFERENCES warehouse_locations(id),
    qty_produced NUMERIC(10, 2) NOT NULL CHECK (qty_produced > 0),
    uom_id UUID NOT NULL REFERENCES master_uom(id),
    weight_kg NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3.4 Weighbridge Logs (Jembatan Timbang untuk Truk Curah & Bulky)
CREATE TABLE weighbridge_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(100) UNIQUE NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    vehicle_id UUID REFERENCES vehicles(id),
    truck_plate VARCHAR(50) NOT NULL,
    driver_name VARCHAR(150),
    reference_type VARCHAR(50) NOT NULL, -- INBOUND_ORDER, OUTBOUND_ORDER, CROSS_DOCK_MANIFEST
    reference_id UUID NOT NULL,
    first_weight_gross_kg NUMERIC(10, 2) NOT NULL, -- Berat Truk + Muatan
    second_weight_tare_kg NUMERIC(10, 2), -- Berat Truk Kosong
    net_weight_cargo_kg NUMERIC(10, 2) GENERATED ALWAYS AS (
        CASE WHEN second_weight_tare_kg IS NOT NULL THEN ABS(first_weight_gross_kg - second_weight_tare_kg) ELSE NULL END
    ) STORED,
    weighbridge_operator VARCHAR(150) NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. INBOUND MODULE (Mendukung General, Bulky, & Curah)
-- ----------------------------------------------------------------------------

CREATE TABLE inbound_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    cargo_type_id UUID REFERENCES master_cargo_types(id),
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED', -- CREATED, RECEIVED, SORTED, PUTAWAY_COMPLETED, CANCELLED
    eta TIMESTAMPTZ,
    actual_received_at TIMESTAMPTZ,
    sender_info VARCHAR(200),
    truck_plate VARCHAR(50),
    driver_name VARCHAR(100),
    is_bulk_cargo BOOLEAN DEFAULT FALSE,
    requires_weighbridge BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_by_id UUID REFERENCES users(id),
    created_by_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inbound_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inbound_order_id UUID NOT NULL REFERENCES inbound_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    ordered_qty NUMERIC(10, 2) NOT NULL CHECK (ordered_qty > 0),
    received_qty NUMERIC(10, 2) DEFAULT 0,
    cross_dock_qty NUMERIC(10, 2) DEFAULT 0,
    storage_qty NUMERIC(10, 2) DEFAULT 0,
    uom_id UUID NOT NULL REFERENCES master_uom(id),
    item_condition VARCHAR(30) DEFAULT 'GOOD', -- GOOD, DAMAGED, SHORTAGE, OVERAGE
    location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. CROSS-DOCK & CROSS-DOCUMENT (Re-issuance / Doc Swap) MODULE
-- ----------------------------------------------------------------------------

CREATE TABLE cross_dock_manifests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manifest_number VARCHAR(100) UNIQUE NOT NULL,
    source_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    destination_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    vehicle_id UUID REFERENCES vehicles(id),
    driver_id UUID REFERENCES users(id),
    driver_name VARCHAR(150),
    truck_plate VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED', -- CREATED, LOADED, IN_TRANSIT, RECEIVED_DEST, COMPLETED, CANCELLED
    scheduled_departure TIMESTAMPTZ,
    actual_departure TIMESTAMPTZ,
    eta_arrival TIMESTAMPTZ,
    actual_arrival TIMESTAMPTZ,
    notes TEXT,
    created_by_id UUID REFERENCES users(id),
    created_by_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cross_dock_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manifest_id UUID NOT NULL REFERENCES cross_dock_manifests(id) ON DELETE CASCADE,
    inbound_item_id UUID REFERENCES inbound_items(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES products(id),
    planned_qty NUMERIC(10, 2) NOT NULL CHECK (planned_qty > 0),
    loaded_qty NUMERIC(10, 2) DEFAULT 0,
    received_qty NUMERIC(10, 2) DEFAULT 0,
    uom_id UUID NOT NULL REFERENCES master_uom(id),
    variance_qty NUMERIC(10, 2) GENERATED ALWAYS AS (received_qty - loaded_qty) STORED,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5.2 Cross Document Header (Penerbitan Ulang / Penggantian Dokumen Logistik)
CREATE TABLE cross_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cross_doc_number VARCHAR(100) UNIQUE NOT NULL, -- Format: XDOC-YYYYMMDD-XXXX
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    cross_doc_type VARCHAR(50) NOT NULL DEFAULT 'SURAT_JALAN_SWAP', -- SURAT_JALAN_SWAP, AWB_REISSUE, DECONSOLIDATION_SUB_SJ, CONSOLIDATION_MASTER_SJ
    reason VARCHAR(100) NOT NULL, -- BLIND_SHIPPING, ROUTE_RE_DISPATCH, SUB_DISTRIBUTION, CARRIER_HANDOFF
    source_document_type_id UUID NOT NULL REFERENCES master_document_types(id),
    source_document_number VARCHAR(100) NOT NULL, -- Nomor SJ / AWB Supplier Asal
    source_sender_name VARCHAR(150) NOT NULL,
    target_document_type_id UUID NOT NULL REFERENCES master_document_types(id),
    target_document_number VARCHAR(100) UNIQUE NOT NULL, -- Nomor SJ / AWB Baru yang Diterbitkan
    target_recipient_name VARCHAR(150) NOT NULL,
    target_destination_address TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ISSUED', -- DRAFT, ISSUED, ATTACHED_TO_CARGO, DISPATCHED, CANCELLED
    issued_by_id UUID REFERENCES users(id),
    issued_by_name VARCHAR(150) NOT NULL, -- Petugas Penerbit Dokumen
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cross_document_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cross_doc_id UUID NOT NULL REFERENCES cross_documents(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    original_qty NUMERIC(10, 2) NOT NULL,
    reissued_qty NUMERIC(10, 2) NOT NULL,
    uom_id UUID NOT NULL REFERENCES master_uom(id),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 6. OUTBOUND MODULE
-- ----------------------------------------------------------------------------

CREATE TABLE outbound_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    cargo_type_id UUID REFERENCES master_cargo_types(id),
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED', -- CREATED, PICKING, PICKED, PACKED, SHIPPED, DELIVERED, POD_VERIFIED, CANCELLED
    recipient_name VARCHAR(150) NOT NULL,
    recipient_phone VARCHAR(50),
    destination_address TEXT NOT NULL,
    destination_city VARCHAR(100),
    vehicle_id UUID REFERENCES vehicles(id),
    driver_id UUID REFERENCES users(id),
    driver_name VARCHAR(150),
    truck_plate VARCHAR(50),
    cross_doc_id UUID REFERENCES cross_documents(id) ON DELETE SET NULL, -- Referensi Cross-Doc jika ada
    scheduled_ship_date TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    notes TEXT,
    created_by_id UUID REFERENCES users(id),
    created_by_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE outbound_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outbound_order_id UUID NOT NULL REFERENCES outbound_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    ordered_qty NUMERIC(10, 2) NOT NULL CHECK (ordered_qty > 0),
    picked_qty NUMERIC(10, 2) DEFAULT 0,
    packed_qty NUMERIC(10, 2) DEFAULT 0,
    delivered_qty NUMERIC(10, 2) DEFAULT 0,
    uom_id UUID NOT NULL REFERENCES master_uom(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outbound_order_id UUID NOT NULL REFERENCES outbound_orders(id) ON DELETE CASCADE,
    box_code VARCHAR(100) NOT NULL,
    packaging_type_id UUID REFERENCES master_packaging_types(id),
    weight_kg NUMERIC(10, 2) DEFAULT 0,
    dimensions VARCHAR(50),
    packed_by_id UUID REFERENCES users(id),
    packed_by_name VARCHAR(150) NOT NULL,
    sealed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pod_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outbound_order_id UUID UNIQUE NOT NULL REFERENCES outbound_orders(id) ON DELETE CASCADE,
    pod_number VARCHAR(100) UNIQUE NOT NULL,
    recipient_name VARCHAR(150) NOT NULL,
    pod_photo_url TEXT NOT NULL,
    signature_photo_url TEXT NOT NULL,
    received_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    delivered_qty NUMERIC(10, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACCEPTED', -- ACCEPTED, REJECTED, PARTIAL
    rejection_reason TEXT,
    verified_by_id UUID REFERENCES users(id),
    verified_by_name VARCHAR(150),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 7. FLEET EXIT LOG (Pencatatan Armada Keluar-Masuk Pos Satpam)
-- ----------------------------------------------------------------------------

CREATE TABLE fleet_exit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_number VARCHAR(100) UNIQUE NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    vehicle_type_id UUID REFERENCES master_vehicle_types(id),
    driver_id UUID REFERENCES users(id),
    driver_name VARCHAR(150) NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    purpose VARCHAR(50) NOT NULL, -- CROSS_DOCK_DELIVERY, OUTBOUND_DELIVERY, EMPTY_RETURN, MAINTENANCE, WEIGHING, OTHER
    reference_type VARCHAR(50), -- CROSS_DOCK_MANIFEST, OUTBOUND_ORDER, CROSS_DOCUMENT, NONE
    reference_id UUID,
    reference_number VARCHAR(100),
    
    -- Departure info
    departure_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expected_return_time TIMESTAMPTZ,
    odometer_out NUMERIC(10, 2) NOT NULL,
    fuel_level_out VARCHAR(20) DEFAULT 'FULL', -- EMPTY, 1/4, 1/2, 3/4, FULL
    departure_security_officer VARCHAR(150) NOT NULL,
    departure_notes TEXT,
    departure_photo_url TEXT,
    
    -- Return info
    actual_return_time TIMESTAMPTZ,
    odometer_in NUMERIC(10, 2),
    fuel_level_in VARCHAR(20),
    return_security_officer VARCHAR(150),
    return_notes TEXT,
    return_photo_url TEXT,
    distance_travelled_km NUMERIC(10, 2) GENERATED ALWAYS AS (
        CASE WHEN odometer_in IS NOT NULL THEN odometer_in - odometer_out ELSE NULL END
    ) STORED,
    
    status VARCHAR(30) NOT NULL DEFAULT 'DEPARTED', -- DEPARTED, RETURNED, OVERDUE, CANCELLED
    approved_by_id UUID REFERENCES users(id),
    approved_by_name VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 8. CHECKPOINT CHAIN (Audit Trail Immutable) & ALERTS
-- ----------------------------------------------------------------------------

CREATE TABLE checkpoint_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, 
    -- INBOUND_ORDER, CROSS_DOCK_MANIFEST, CROSS_DOCUMENT, STOCK_CONVERSION, OUTBOUND_ORDER, FLEET_EXIT_LOG, STOCK_ADJUSTMENT
    entity_id UUID NOT NULL,
    entity_number VARCHAR(100) NOT NULL,
    step_code VARCHAR(50) NOT NULL,
    step_label VARCHAR(150) NOT NULL,
    actor_id UUID REFERENCES users(id),
    actor_name VARCHAR(150) NOT NULL, -- Nama Petugas (Mandatory Accountability)
    actor_role VARCHAR(50) NOT NULL,
    notes TEXT,
    photo_urls JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    prev_checkpoint_id UUID REFERENCES checkpoint_logs(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(50) NOT NULL, 
    -- CHECKPOINT_TIMEOUT, STOCK_MIN_BREACH, VARIANCE_DETECTED, TRANSIT_DELAY, FLEET_OVERDUE, DEBULKING_SHRINKAGE_HIGH, POD_REJECTED
    entity_type VARCHAR(50),
    entity_id UUID,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'WARNING', -- INFO, WARNING, CRITICAL
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by_id UUID REFERENCES users(id),
    resolved_by_name VARCHAR(150),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 9. PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX idx_products_cargo ON products(cargo_type_id);
CREATE INDEX idx_products_debulking ON products(is_debulking_target, parent_bulky_product_id);
CREATE INDEX idx_stock_levels_wh_prod ON stock_levels(warehouse_id, product_id);
CREATE INDEX idx_stock_movements_wh_prod ON stock_movements(warehouse_id, product_id);
CREATE INDEX idx_conversions_status ON stock_conversions(status, warehouse_id);
CREATE INDEX idx_crossdoc_numbers ON cross_documents(source_document_number, target_document_number);
CREATE INDEX idx_fleet_exit_status ON fleet_exit_logs(status, warehouse_id);
CREATE INDEX idx_checkpoint_entity ON checkpoint_logs(entity_type, entity_id);
CREATE INDEX idx_alerts_unresolved ON alerts(is_resolved, severity);

-- ----------------------------------------------------------------------------
-- 10. AUTO UPDATE TIMESTAMP TRIGGERS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_master_cargo_updated BEFORE UPDATE ON master_cargo_types FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_master_pkg_updated BEFORE UPDATE ON master_packaging_types FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_master_veh_updated BEFORE UPDATE ON master_vehicle_types FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_warehouses_updated BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_conversions_updated BEFORE UPDATE ON stock_conversions FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_crossdoc_updated BEFORE UPDATE ON cross_documents FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_inbound_updated BEFORE UPDATE ON inbound_orders FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_crossdock_updated BEFORE UPDATE ON cross_dock_manifests FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_outbound_updated BEFORE UPDATE ON outbound_orders FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_fleet_exit_updated BEFORE UPDATE ON fleet_exit_logs FOR EACH ROW EXECUTE FUNCTION update_timestamp();
