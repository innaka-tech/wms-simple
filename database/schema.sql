-- ============================================================================
-- WMS SIMPLE - POSTGRESQL DATABASE SCHEMA
-- Version: 1.0.0
-- Model: Non-Dynamic, Hardcoded Business Flow for Trucking & Logistics
-- Core Modules:
--   1. Multi-Warehouse (Main + Transit)
--   2. Inbound (Receive -> Sort -> Putaway/Transfer)
--   3. Cross-Dock Manifest
--   4. Outbound (Pick -> Pack -> Ship -> POD)
--   5. Stock On-Hand & Movement Ledger
--   6. Checkpoint Chain (Audit Trail)
--   7. Fleet Exit Log (Pencatatan Armada Keluar)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. MASTER DATA TABLES
-- ----------------------------------------------------------------------------

-- 1.1 Warehouses (Main Hub & Transit Spoke Warehouses)
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('MAIN', 'TRANSIT')),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    contact_name VARCHAR(100),
    contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 1.2 Warehouse Locations / Bins (Storage Grid within Warehouse)
CREATE TABLE warehouse_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    zone VARCHAR(50) NOT NULL,
    aisle VARCHAR(50) NOT NULL,
    rack VARCHAR(50) NOT NULL,
    bin VARCHAR(50) NOT NULL,
    capacity_units INT DEFAULT 1000,
    current_qty INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, zone, aisle, rack, bin)
);

-- 1.3 Customers (Internal business units or external logistics clients)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(20) DEFAULT 'INTERNAL' CHECK (type IN ('INTERNAL', 'EXTERNAL')),
    contact_name VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 1.4 Users & Role Based Access Control
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN (
        'SUPER_ADMIN', 
        'ADMIN_ADM', 
        'WH_MANAGER', 
        'WH_STAFF', 
        'DRIVER', 
        'CUSTOMER'
    )),
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 1.5 Product Master / SKU
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    unit VARCHAR(20) DEFAULT 'PCS',
    weight_kg NUMERIC(10, 2) DEFAULT 0,
    volume_m3 NUMERIC(10, 4) DEFAULT 0,
    min_stock_qty INT DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 1.6 Fleet / Vehicle Master
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plate_number VARCHAR(30) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., CDE, CDD, FUSO, WINGBOX, TRONTON
    brand VARCHAR(50),
    model VARCHAR(50),
    capacity_kg NUMERIC(10, 2) NOT NULL,
    capacity_cbm NUMERIC(10, 2) DEFAULT 0,
    current_driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'INACTIVE')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. STOCK LEDGER & ON-HAND TABLES
-- ----------------------------------------------------------------------------

-- 2.1 Stock Levels (Current snapshot per warehouse and product)
CREATE TABLE stock_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty_on_hand INT NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
    qty_reserved INT NOT NULL DEFAULT 0 CHECK (qty_reserved >= 0),
    qty_in_transit INT NOT NULL DEFAULT 0 CHECK (qty_in_transit >= 0),
    last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, product_id)
);

-- 2.2 Stock Movements (Immutable audit ledger of every inventory change)
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    product_id UUID NOT NULL REFERENCES products(id),
    movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN (
        'INBOUND_RECEIVE',
        'INBOUND_PUTAWAY',
        'CROSS_DOCK_OUT',
        'CROSS_DOCK_IN',
        'OUTBOUND_PICK',
        'OUTBOUND_SHIP',
        'ADJUSTMENT',
        'TRANSFER'
    )),
    reference_type VARCHAR(30) NOT NULL CHECK (reference_type IN (
        'INBOUND_ORDER',
        'CROSS_DOCK_MANIFEST',
        'OUTBOUND_ORDER',
        'STOCK_ADJUSTMENT'
    )),
    reference_id UUID NOT NULL,
    qty_change INT NOT NULL, -- positive or negative
    qty_before INT NOT NULL,
    qty_after INT NOT NULL,
    location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    notes TEXT,
    performed_by_id UUID REFERENCES users(id),
    performed_by_name VARCHAR(150) NOT NULL, -- petugas_name mandatory
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. INBOUND MODULE (Receive -> Sort -> Putaway / Cross-Dock Transfer)
-- ----------------------------------------------------------------------------

CREATE TABLE inbound_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED' CHECK (status IN (
        'CREATED',
        'RECEIVED',
        'SORTED',
        'PUTAWAY_COMPLETED',
        'CANCELLED'
    )),
    eta TIMESTAMPTZ,
    actual_received_at TIMESTAMPTZ,
    sender_info VARCHAR(200),
    truck_plate VARCHAR(50),
    driver_name VARCHAR(100),
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
    ordered_qty INT NOT NULL CHECK (ordered_qty > 0),
    received_qty INT DEFAULT 0 CHECK (received_qty >= 0),
    cross_dock_qty INT DEFAULT 0 CHECK (cross_dock_qty >= 0),
    storage_qty INT DEFAULT 0 CHECK (storage_qty >= 0),
    item_condition VARCHAR(30) DEFAULT 'GOOD' CHECK (item_condition IN ('GOOD', 'DAMAGED', 'SHORTAGE', 'OVERAGE')),
    location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. CROSS-DOCK MANIFEST MODULE (Main Hub -> Transit Spoke Transfer)
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
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED' CHECK (status IN (
        'CREATED',
        'LOADED',
        'IN_TRANSIT',
        'RECEIVED_DEST',
        'COMPLETED',
        'CANCELLED'
    )),
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
    planned_qty INT NOT NULL CHECK (planned_qty > 0),
    loaded_qty INT DEFAULT 0 CHECK (loaded_qty >= 0),
    received_qty INT DEFAULT 0 CHECK (received_qty >= 0),
    variance_qty INT GENERATED ALWAYS AS (received_qty - loaded_qty) STORED,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. OUTBOUND MODULE (Pick -> Pack -> Ship -> Deliver -> POD Verified)
-- ----------------------------------------------------------------------------

CREATE TABLE outbound_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED' CHECK (status IN (
        'CREATED',
        'PICKING',
        'PICKED',
        'PACKED',
        'SHIPPED',
        'DELIVERED',
        'POD_VERIFIED',
        'CANCELLED'
    )),
    recipient_name VARCHAR(150) NOT NULL,
    recipient_phone VARCHAR(50),
    destination_address TEXT NOT NULL,
    destination_city VARCHAR(100),
    vehicle_id UUID REFERENCES vehicles(id),
    driver_id UUID REFERENCES users(id),
    driver_name VARCHAR(150),
    truck_plate VARCHAR(50),
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
    ordered_qty INT NOT NULL CHECK (ordered_qty > 0),
    picked_qty INT DEFAULT 0 CHECK (picked_qty >= 0),
    packed_qty INT DEFAULT 0 CHECK (packed_qty >= 0),
    delivered_qty INT DEFAULT 0 CHECK (delivered_qty >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outbound_order_id UUID NOT NULL REFERENCES outbound_orders(id) ON DELETE CASCADE,
    box_code VARCHAR(100) NOT NULL,
    weight_kg NUMERIC(10, 2) DEFAULT 0,
    dimensions VARCHAR(50), -- e.g. 40x30x20 cm
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
    delivered_qty INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACCEPTED' CHECK (status IN ('ACCEPTED', 'REJECTED', 'PARTIAL')),
    rejection_reason TEXT,
    verified_by_id UUID REFERENCES users(id),
    verified_by_name VARCHAR(150),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 6. FLEET EXIT LOG (Pencatatan Armada Keluar / Security Gate Pass)
-- ----------------------------------------------------------------------------

CREATE TABLE fleet_exit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_number VARCHAR(100) UNIQUE NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    driver_id UUID REFERENCES users(id),
    driver_name VARCHAR(150) NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id), -- Origin gate
    purpose VARCHAR(50) NOT NULL CHECK (purpose IN (
        'CROSS_DOCK_DELIVERY',
        'OUTBOUND_DELIVERY',
        'EMPTY_RETURN',
        'MAINTENANCE',
        'INTER_HUB_RELOCATION',
        'OTHER'
    )),
    reference_type VARCHAR(50) CHECK (reference_type IN (
        'CROSS_DOCK_MANIFEST',
        'OUTBOUND_ORDER',
        'MAINTENANCE_ORDER',
        'NONE'
    )),
    reference_id UUID, -- links to cross_dock_manifests.id or outbound_orders.id
    reference_number VARCHAR(100),
    
    -- Departure info
    departure_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expected_return_time TIMESTAMPTZ,
    odometer_out NUMERIC(10, 2) NOT NULL,
    fuel_level_out VARCHAR(20) DEFAULT 'FULL' CHECK (fuel_level_out IN ('EMPTY', '1/4', '1/2', '3/4', 'FULL')),
    departure_security_officer VARCHAR(150) NOT NULL, -- Petugas pos satpam keluar
    departure_notes TEXT,
    departure_photo_url TEXT,
    
    -- Return info
    actual_return_time TIMESTAMPTZ,
    odometer_in NUMERIC(10, 2),
    fuel_level_in VARCHAR(20) CHECK (fuel_level_in IN ('EMPTY', '1/4', '1/2', '3/4', 'FULL')),
    return_security_officer VARCHAR(150), -- Petugas pos satpam masuk
    return_notes TEXT,
    return_photo_url TEXT,
    distance_travelled_km NUMERIC(10, 2) GENERATED ALWAYS AS (
        CASE WHEN odometer_in IS NOT NULL THEN odometer_in - odometer_out ELSE NULL END
    ) STORED,
    
    status VARCHAR(30) NOT NULL DEFAULT 'DEPARTED' CHECK (status IN (
        'DEPARTED',
        'RETURNED',
        'OVERDUE',
        'CANCELLED'
    )),
    approved_by_id UUID REFERENCES users(id),
    approved_by_name VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 7. CHECKPOINT CHAIN (Tamper-Evident Immutable Audit Trail)
-- ----------------------------------------------------------------------------

CREATE TABLE checkpoint_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
        'INBOUND_ORDER',
        'CROSS_DOCK_MANIFEST',
        'OUTBOUND_ORDER',
        'FLEET_EXIT_LOG',
        'STOCK_ADJUSTMENT'
    )),
    entity_id UUID NOT NULL,
    entity_number VARCHAR(100) NOT NULL, -- PO number, manifest number, order number, etc.
    step_code VARCHAR(50) NOT NULL, -- e.g. PO_CREATED, PO_RECEIVED, PUTAWAY, MANIFEST_LOADED, FLEET_DEPARTED, etc.
    step_label VARCHAR(150) NOT NULL,
    actor_id UUID REFERENCES users(id),
    actor_name VARCHAR(150) NOT NULL, -- Nama Petugas (Mandatory Accountability)
    actor_role VARCHAR(50) NOT NULL,
    notes TEXT,
    photo_urls JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    prev_checkpoint_id UUID REFERENCES checkpoint_logs(id), -- Linked list chain
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 8. ALERTS SYSTEM (Real-time monitoring for SLA breaches & anomalies)
-- ----------------------------------------------------------------------------

CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'CHECKPOINT_TIMEOUT',
        'STOCK_MIN_BREACH',
        'VARIANCE_DETECTED',
        'TRANSIT_DELAY',
        'FLEET_OVERDUE',
        'POD_REJECTED'
    )),
    entity_type VARCHAR(50),
    entity_id UUID,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'WARNING' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
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

CREATE INDEX idx_warehouses_type ON warehouses(type);
CREATE INDEX idx_locations_wh ON warehouse_locations(warehouse_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_stock_levels_wh_prod ON stock_levels(warehouse_id, product_id);
CREATE INDEX idx_stock_movements_wh_prod ON stock_movements(warehouse_id, product_id);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at);
CREATE INDEX idx_inbound_status ON inbound_orders(status);
CREATE INDEX idx_inbound_wh ON inbound_orders(warehouse_id);
CREATE INDEX idx_crossdock_status ON cross_dock_manifests(status);
CREATE INDEX idx_crossdock_src_dest ON cross_dock_manifests(source_warehouse_id, destination_warehouse_id);
CREATE INDEX idx_outbound_status ON outbound_orders(status);
CREATE INDEX idx_outbound_wh ON outbound_orders(warehouse_id);
CREATE INDEX idx_fleet_exit_status ON fleet_exit_logs(status);
CREATE INDEX idx_fleet_exit_veh ON fleet_exit_logs(vehicle_id);
CREATE INDEX idx_fleet_exit_wh ON fleet_exit_logs(warehouse_id);
CREATE INDEX idx_checkpoint_entity ON checkpoint_logs(entity_type, entity_id);
CREATE INDEX idx_checkpoint_created ON checkpoint_logs(created_at);
CREATE INDEX idx_alerts_unresolved ON alerts(is_resolved, severity);

-- ----------------------------------------------------------------------------
-- 10. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_warehouses_updated BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_inbound_updated BEFORE UPDATE ON inbound_orders FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_crossdock_updated BEFORE UPDATE ON cross_dock_manifests FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_outbound_updated BEFORE UPDATE ON outbound_orders FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_fleet_exit_updated BEFORE UPDATE ON fleet_exit_logs FOR EACH ROW EXECUTE FUNCTION update_timestamp();
