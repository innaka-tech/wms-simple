-- ============================================================================
-- WMS SIMPLE - INITIAL SEED DATA
-- ============================================================================

-- 1. Warehouses (1 Main Hub + 2 Transit Spokes)
INSERT INTO warehouses (id, code, name, type, address, city, contact_name, contact_phone) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'WH-JKT-01', 'Gudang Utama Jakarta Hub', 'MAIN', 'Kawasan Industri Cakung Blok A1-4', 'Jakarta Timur', 'Bambang Sudiro', '081122334455'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'WH-DPS-01', 'Gudang Transit Denpasar Spoke', 'TRANSIT', 'Jl. Bypass Ngurah Rai No. 88', 'Denpasar', 'I Made Wardana', '081299887766'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'WH-BPN-01', 'Gudang Transit Balikpapan Spoke', 'TRANSIT', 'Jl. Mulawarman Km. 13 Batakan', 'Balikpapan', 'Rahmat Hidayat', '081377665544');

-- 2. Warehouse Locations / Bins (Jakarta Main Hub)
INSERT INTO warehouse_locations (id, warehouse_id, zone, aisle, rack, bin, capacity_units, current_qty) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ZONE-A', 'AISLE-01', 'RACK-01', 'BIN-01', 500, 0),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ZONE-A', 'AISLE-01', 'RACK-01', 'BIN-02', 500, 0),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ZONE-B', 'AISLE-02', 'RACK-01', 'BIN-01', 1000, 0),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'CROSSDOCK', 'STAGE-01', 'BAY-01', 'BIN-CD1', 2000, 0);

-- 3. Customers
INSERT INTO customers (id, code, name, type, contact_name, contact_phone, contact_email, address) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'CUST-A1', 'PT Logistik Prima Mandiri (Grup A.1)', 'INTERNAL', 'Hendra Setiawan', '081512345678', 'hendra@prima.logistics.com', 'Jakarta Pusat'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'CUST-A2', 'PT Ritel Nusantara Jaya (Grup A.2)', 'INTERNAL', 'Dewi Lestari', '081623456789', 'dewi@ritelnusantara.co.id', 'Jakarta Barat'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'CUST-A3', 'PT Distribusi Sinar Maju (Grup A.3)', 'INTERNAL', 'Agus Prayitno', '081734567890', 'agus@sinarmaju.com', 'Surabaya');

-- 4. Users (Password default: 'password123' bcrypt hashed or plaintext for dev/demo)
INSERT INTO users (id, username, full_name, email, password_hash, role, warehouse_id, customer_id) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'superadmin', 'System Super Administrator', 'superadmin@wms-simple.local', '$2a$10$w099g67G32tWqXhRkP/73u9T1o2v9vFkG0uA4e7D8I9L.qR1kXw0S', 'SUPER_ADMIN', NULL, NULL),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', 'admin_adm', 'Siti Rahmawati (Admin Adm)', 'admin@wms-simple.local', '$2a$10$w099g67G32tWqXhRkP/73u9T1o2v9vFkG0uA4e7D8I9L.qR1kXw0S', 'ADMIN_ADM', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d03', 'mgr_jkt', 'Bambang Sudiro (WH Manager JKT)', 'mgr.jkt@wms-simple.local', '$2a$10$w099g67G32tWqXhRkP/73u9T1o2v9vFkG0uA4e7D8I9L.qR1kXw0S', 'WH_MANAGER', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d04', 'staff_jkt', 'Joko Susanto (WH Staff JKT)', 'staff.jkt@wms-simple.local', '$2a$10$w099g67G32tWqXhRkP/73u9T1o2v9vFkG0uA4e7D8I9L.qR1kXw0S', 'WH_STAFF', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d05', 'driver_budi', 'Budi Santoso (Driver)', 'driver.budi@wms-simple.local', '$2a$10$w099g67G32tWqXhRkP/73u9T1o2v9vFkG0uA4e7D8I9L.qR1kXw0S', 'DRIVER', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d06', 'driver_anto', 'Anto Wibowo (Driver)', 'driver.anto@wms-simple.local', '$2a$10$w099g67G32tWqXhRkP/73u9T1o2v9vFkG0uA4e7D8I9L.qR1kXw0S', 'DRIVER', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d07', 'cust_prima', 'Hendra Client (Customer A.1)', 'client.a1@wms-simple.local', '$2a$10$w099g67G32tWqXhRkP/73u9T1o2v9vFkG0uA4e7D8I9L.qR1kXw0S', 'CUSTOMER', NULL, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01');

-- 5. Products / SKUs
INSERT INTO products (id, sku_code, name, description, unit, weight_kg, volume_m3, min_stock_qty) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', 'SKU-ELEC-001', 'Smart LED TV 43 Inch FHD', 'Televisi LED 43 Inch with Smart OS', 'UNIT', 8.50, 0.0850, 20),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e02', 'SKU-FMCG-002', 'Minyak Goreng Sawit 2L (Karton isi 6)', 'Karton minyak goreng 2L kemasan pouch', 'CTN', 12.00, 0.0240, 50),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e03', 'SKU-AUTO-003', 'Oli Mesin Full Synthetic 4L (Galon)', 'Pelumas mesin bensin/diesel 5W-30 SN', 'GLN', 3.80, 0.0060, 30),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e04', 'SKU-HOME-004', 'Blender Multi-Fungsi 1.5L Glass Jar', 'Peralatan dapur blender kaca 4 bilah pisau', 'UNIT', 2.20, 0.0120, 15);

-- 6. Vehicles (Fleet Master)
INSERT INTO vehicles (id, plate_number, type, brand, model, capacity_kg, capacity_cbm, current_driver_id, assigned_warehouse_id, status) VALUES
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f01', 'B 9188 WMS', 'CDD Box 6 Roda', 'Isuzu', 'Elf NMR 71 HD', 5000.00, 18.00, 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d05', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'AVAILABLE'),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f02', 'B 9845 WMS', 'Fuso Wingbox', 'Mitsubishi', 'Fighter FN 62 F', 16000.00, 45.00, 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d06', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'AVAILABLE'),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f03', 'DK 8214 WMS', 'CDE Box 4 Roda', 'Hino', 'Dutro 110 SDB', 2500.00, 10.00, NULL, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'AVAILABLE');

-- 7. Initial Stock Levels
INSERT INTO stock_levels (warehouse_id, product_id, qty_on_hand, qty_reserved, qty_in_transit) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', 120, 10, 0),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e02', 350, 0, 0),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e03', 200, 20, 0),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e04', 80, 0, 0),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', 15, 0, 0),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e02', 40, 0, 0),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e03', 25, 0, 0);

-- Initial Stock Movement Log
INSERT INTO stock_movements (warehouse_id, product_id, movement_type, reference_type, reference_id, qty_change, qty_before, qty_after, notes, performed_by_id, performed_by_name) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', 'ADJUSTMENT', 'STOCK_ADJUSTMENT', '00000000-0000-0000-0000-000000000001', 120, 0, 120, 'Initial Stock Opname System Setup', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'System Super Administrator'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e02', 'ADJUSTMENT', 'STOCK_ADJUSTMENT', '00000000-0000-0000-0000-000000000001', 350, 0, 350, 'Initial Stock Opname System Setup', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'System Super Administrator');
