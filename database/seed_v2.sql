-- ============================================================================
-- WMS SIMPLE V2 - SEED DATA (DYNAMIC MASTER DATA & TRANSACTIONS)
-- ============================================================================

-- 1. Master Cargo Types (Bulky, Curah Kering, Curah Cair, General Cargo, Hazmat)
INSERT INTO master_cargo_types (id, code, name, category, handling_instructions, requires_weighbridge, requires_temperature_control) VALUES
('10000000-0000-0000-0000-000000000001', 'GENERAL_CARGO', 'General Packaged Goods', 'PACKAGED', 'Penanganan standar, susun sesuai tanda arah panah', FALSE, FALSE),
('10000000-0000-0000-0000-000000000002', 'BULKY_HEAVY', 'Bulky & Heavy Lift Cargo', 'BULKY', 'Gunakan Forklift > 5 Ton / Crane, pastikan tumpuan rata', TRUE, FALSE),
('10000000-0000-0000-0000-000000000003', 'DRY_BULK', 'Curah Kering (Grains / Fertilizer / Sugar)', 'BULK_DRY', 'Timbang jembatan timbang, hindari kelembapan dan kontak air', TRUE, FALSE),
('10000000-0000-0000-0000-000000000004', 'LIQUID_BULK', 'Curah Cair (CPO / Oil / Chemical)', 'BULK_LIQUID', 'Gunakan pompa hisap & selang pipa makanan/kimia, cek segel tangki', TRUE, FALSE),
('10000000-0000-0000-0000-000000000005', 'TEMPERATURE_CONTROLLED', 'Cold Chain & Frozen Food', 'SPECIAL', 'Pertahankan suhu -18C s.d 4C, catat log suhu', FALSE, TRUE);

-- 2. Master Packaging Types (Jumbo Bag, Drum, Pallet, Sack, Tank, Silo, Loose)
INSERT INTO master_packaging_types (id, code, name, is_bulk_container, tare_weight_kg, nominal_capacity_kg, nominal_capacity_liter) VALUES
('20000000-0000-0000-0000-000000000001', 'JUMBO_BAG_1T', 'Jumbo Bag FIBC 1.000 KG', TRUE, 2.50, 1000.00, 1200.00),
('20000000-0000-0000-0000-000000000002', 'STEEL_DRUM_200L', 'Steel Drum 200 Liter', TRUE, 18.00, 200.00, 200.00),
('20000000-0000-0000-0000-000000000003', 'WOODEN_PALLET', 'Standard Wooden Pallet (120x100cm)', FALSE, 20.00, 1500.00, 0.00),
('20000000-0000-0000-0000-000000000004', 'SACK_50KG', 'Karung Anyaman PP 50 KG', FALSE, 0.15, 50.00, 60.00),
('20000000-0000-0000-0000-000000000005', 'SACK_25KG', 'Karung Anyaman PP 25 KG', FALSE, 0.10, 25.00, 30.00),
('20000000-0000-0000-0000-000000000006', 'LOOSE_BULK', 'Curah Bebas / Tanpa Kemasan', TRUE, 0.00, 30000.00, 35000.00),
('20000000-0000-0000-0000-000000000007', 'CARTON_BOX', 'Karton Box Standar', FALSE, 0.50, 25.00, 35.00);

-- 3. Master UOM
INSERT INTO master_uom (id, code, name, base_category, is_base_unit) VALUES
('30000000-0000-0000-0000-000000000001', 'KG', 'Kilogram', 'WEIGHT', TRUE),
('30000000-0000-0000-0000-000000000002', 'TON', 'Metric Ton', 'WEIGHT', FALSE),
('30000000-0000-0000-0000-000000000003', 'LTR', 'Liter', 'VOLUME', TRUE),
('30000000-0000-0000-0000-000000000004', 'M3', 'Meter Kubik (CBM)', 'VOLUME', FALSE),
('30000000-0000-0000-0000-000000000005', 'JUMBO_BAG', 'Jumbo Bag Unit', 'PACKAGING', FALSE),
('30000000-0000-0000-0000-000000000006', 'DRUM', 'Drum Unit', 'PACKAGING', FALSE),
('30000000-0000-0000-0000-000000000007', 'SACK', 'Karung / Sack', 'PACKAGING', FALSE),
('30000000-0000-0000-0000-000000000008', 'CTN', 'Carton Box', 'PACKAGING', FALSE),
('30000000-0000-0000-0000-000000000009', 'PCS', 'Pieces / Unit', 'PIECES', TRUE);

-- UOM Conversions
INSERT INTO master_uom_conversions (from_uom_id, to_uom_id, conversion_multiplier, notes) VALUES
('30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 1000.0, '1 TON = 1000 KG'),
('30000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001', 1000.0, '1 Jumbo Bag Standar = 1000 KG'),
('30000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000003', 200.0, '1 Drum Standar = 200 Liter'),
('30000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000001', 50.0, '1 Karung Pupuk/Beras = 50 KG');

-- 4. Master Warehouse Types
INSERT INTO master_warehouse_types (id, code, name, can_store_bulk, can_cross_dock) VALUES
('40000000-0000-0000-0000-000000000001', 'MAIN_HUB', 'Main Consolidation & Fulfillment Hub', TRUE, TRUE),
('40000000-0000-0000-0000-000000000002', 'TRANSIT_SPOKE', 'Transit Spoke Warehouse', FALSE, TRUE),
('40000000-0000-0000-0000-000000000003', 'BULK_TERMINAL', 'Terminal Curah & Tangki Timbun', TRUE, TRUE);

-- 5. Master Document Types (Untuk Cross-Doc Re-issuance)
INSERT INTO master_document_types (id, code, name, category, is_cross_doc_eligible) VALUES
('50000000-0000-0000-0000-000000000001', 'SJ_SUPPLIER', 'Surat Jalan Supplier / Vendor Asal', 'INBOUND', TRUE),
('50000000-0000-0000-0000-000000000002', 'SJ_PENGIRIMAN', 'Surat Jalan Pengiriman Resmi (WMS)', 'OUTBOUND', TRUE),
('50000000-0000-0000-0000-000000000003', 'MASTER_AWB', 'Master Airway Bill / Master B/L', 'CROSS_DOC', TRUE),
('50000000-0000-0000-0000-000000000004', 'HOUSE_AWB', 'House Airway Bill (Sub-AWB Penerima Akhir)', 'CROSS_DOC', TRUE),
('50000000-0000-0000-0000-000000000005', 'DELIVERY_NOTE_BLIND', 'Blind Delivery Note (Tanpa Nama Vendor)', 'OUTBOUND', TRUE);

-- 6. Master Vehicle Types (Spesifikasi Lengkap Armada Indonesia)
INSERT INTO master_vehicle_types (id, code, name, body_type, axle_count, max_payload_kg, max_volume_cbm, length_cm, width_cm, height_cm, door_type, fuel_type, avg_fuel_consumption_km_per_liter) VALUES
('60000000-0000-0000-0000-000000000001', 'CDE_BOX', 'Colt Diesel Engkel (CDE) 4 Roda Box', 'BOX', 2, 2500.00, 10.00, 310, 170, 170, 'REAR', 'SOLAR', 5.50),
('60000000-0000-0000-0000-000000000002', 'CDD_BOX', 'Colt Diesel Double (CDD) 6 Roda Box', 'BOX', 2, 5000.00, 18.00, 430, 200, 200, 'REAR', 'SOLAR', 4.50),
('60000000-0000-0000-0000-000000000003', 'CDD_LONG', 'CDD Long Chassis 6 Roda Box', 'BOX', 2, 6000.00, 24.00, 560, 200, 210, 'REAR', 'SOLAR', 4.00),
('60000000-0000-0000-0000-000000000004', 'FUSO_BAK', 'Fuso Bak Terbuka Drop Side', 'BAK_TERBUKA', 2, 10000.00, 30.00, 650, 240, 180, 'REAR', 'SOLAR', 3.50),
('60000000-0000-0000-0000-000000000005', 'TRONTON_WINGBOX', 'Tronton Wingbox 10 Roda', 'WINGBOX', 3, 18000.00, 48.00, 940, 245, 240, 'WING_SIDE', 'SOLAR', 2.80),
('60000000-0000-0000-0000-000000000006', 'DUMP_TRUCK_CURAH', 'Dump Truck Curah Kering 24 M3', 'DUMP_TRUCK', 3, 22000.00, 24.00, 700, 240, 150, 'BOTTOM_DUMP', 'SOLAR', 2.50),
('60000000-0000-0000-0000-000000000007', 'TANKER_CPO_30KL', 'Truk Tangki Cairan CPO / BBM 30 KL', 'TANKER', 3, 26000.00, 30.00, 850, 240, 200, 'TOP_HATCH', 'SOLAR', 2.60),
('60000000-0000-0000-0000-000000000008', 'TRAILER_40FT', 'Tractor Head Trailer 40 Feet Flatbed', 'FLATBED', 4, 32000.00, 65.00, 1220, 245, 250, 'REAR', 'SOLAR', 2.20);

-- 7. Warehouses (Main Hub Jakarta + Transit Bali + Transit Balikpapan)
INSERT INTO warehouses (id, code, name, warehouse_type_id, address, city, has_weighbridge, has_debulking_facility, contact_name, contact_phone) VALUES
('a0000000-0000-0000-0000-000000000001', 'WH-JKT-01', 'Gudang Utama Jakarta Hub & Terminal Bulky', '40000000-0000-0000-0000-000000000001', 'Kawasan Industri Cakung Blok A1-4', 'Jakarta Timur', TRUE, TRUE, 'Bambang Sudiro', '081122334455'),
('a0000000-0000-0000-0000-000000000002', 'WH-DPS-01', 'Gudang Transit Denpasar Spoke', '40000000-0000-0000-0000-000000000002', 'Jl. Bypass Ngurah Rai No. 88', 'Denpasar', FALSE, FALSE, 'I Made Wardana', '081299887766'),
('a0000000-0000-0000-0000-000000000003', 'WH-BPN-01', 'Gudang Transit Balikpapan Spoke', '40000000-0000-0000-0000-000000000002', 'Jl. Mulawarman Km. 13 Batakan', 'Balikpapan', TRUE, FALSE, 'Rahmat Hidayat', '081377665544');

-- 8. Warehouse Locations
INSERT INTO warehouse_locations (id, warehouse_id, zone, aisle, rack, bin, location_type, max_weight_capacity_kg, max_volume_capacity_cbm) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'BULKY-ZONE', 'BAY-01', 'FLOOR-01', 'BIN-BULK-01', 'FLOOR_STAGING', 50000.00, 100.00),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'SILO-ZONE', 'SILO-A', 'BAY-01', 'SILO-DRY-01', 'BULK_SILO', 100000.00, 150.00),
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'ZONE-A', 'AISLE-01', 'RACK-01', 'BIN-01', 'STANDARD_RACK', 2000.00, 4.00),
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'CROSSDOCK', 'STAGE-01', 'BAY-01', 'BIN-CD1', 'CROSSDOCK_BAY', 15000.00, 30.00);

-- 9. Customers
INSERT INTO customers (id, code, name, type, contact_name, contact_phone, contact_email, address) VALUES
('c0000000-0000-0000-0000-000000000001', 'CUST-A1', 'PT Logistik Prima Mandiri (Grup A.1)', 'INTERNAL', 'Hendra Setiawan', '081512345678', 'hendra@prima.logistics.com', 'Jakarta Pusat'),
('c0000000-0000-0000-0000-000000000002', 'CUST-A2', 'PT Agro Pangan Nusantara (Grup A.2)', 'INTERNAL', 'Dewi Lestari', '081623456789', 'dewi@agropangan.co.id', 'Jakarta Barat'),
('c0000000-0000-0000-0000-000000000003', 'CUST-A3', 'PT Industri Kimia & Pupuk (Grup A.3)', 'INTERNAL', 'Agus Prayitno', '081734567890', 'agus@kimiapupuk.com', 'Surabaya');

-- 10. Users
INSERT INTO users (id, username, full_name, email, password_hash, role, warehouse_id, customer_id) VALUES
('d0000000-0000-0000-0000-000000000001', 'superadmin', 'System Super Administrator', 'superadmin@wms-simple.local', '$2a$10$w099g67G32tWqXhRkP/73u9T1o2v9vFkG0uA4e7D8I9L.qR1kXw0S', 'SUPER_ADMIN', NULL, NULL),
('d0000000-0000-0000-0000-000000000002', 'admin_adm', 'Siti Rahmawati (Admin Adm)', 'admin@wms-simple.local', '$2a$10$w099g67G32tWqXhRkP/73u9T1o2v9vFkG0uA4e7D8I9L.qR1kXw0S', 'ADMIN_ADM', 'a0000000-0000-0000-0000-000000000001', NULL),
('d0000000-0000-0000-0000-000000000003', 'mgr_jkt', 'Bambang Sudiro (WH Manager JKT)', 'mgr.jkt@wms-simple.local', '$2a$10$w099g67G32tWqXhRkP/73u9T1o2v9vFkG0uA4e7D8I9L.qR1kXw0S', 'WH_MANAGER', 'a0000000-0000-0000-0000-000000000001', NULL),
('d0000000-0000-0000-0000-000000000004', 'staff_jkt', 'Joko Susanto (WH Staff JKT)', 'staff.jkt@wms-simple.local', '$2a$10$w099g67G32tWqXhRkP/73u9T1o2v9vFkG0uA4e7D8I9L.qR1kXw0S', 'WH_STAFF', 'a0000000-0000-0000-0000-000000000001', NULL),
('d0000000-0000-0000-0000-000000000005', 'driver_budi', 'Budi Santoso (Driver Tronton)', 'driver.budi@wms-simple.local', '$2a$10$w099g67G32tWqXhRkP/73u9T1o2v9vFkG0uA4e7D8I9L.qR1kXw0S', 'DRIVER', 'a0000000-0000-0000-0000-000000000001', NULL),
('d0000000-0000-0000-0000-000000000006', 'gate_officer', 'Sersan Hendro (Satpam Gerbang)', 'satpam@wms-simple.local', '$2a$10$w099g67G32tWqXhRkP/73u9T1o2v9vFkG0uA4e7D8I9L.qR1kXw0S', 'GATE_OFFICER', 'a0000000-0000-0000-0000-000000000001', NULL);

-- 11. Products / SKUs (Contoh Bulky Parent & Child Curah)
INSERT INTO products (id, sku_code, name, description, cargo_type_id, default_packaging_type_id, default_uom_id, weight_kg_per_unit, volume_m3_per_unit, is_debulking_target, parent_bulky_product_id, min_stock_qty) VALUES
-- 11.1 Bulky Parent Item: Gula Rafinasi Jumbo Bag 1 Ton
('e0000000-0000-0000-0000-000000000001', 'BULK-SUGAR-1T', 'Gula Pasir Rafinasi Jumbo Bag 1 Ton (Bulky)', 'Gula rafinasi industri kemasan Jumbo Bag 1000 kg', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 1000.00, 1.2000, FALSE, NULL, 5),

-- 11.2 Child Item 1 (Hasil Dicurah / Bagging): Gula Karung 25 KG
('e0000000-0000-0000-0000-000000000002', 'SUGAR-SACK-25KG', 'Gula Pasir Rafinasi Karung 25 KG (Retail/Distribusi)', 'Hasil repack bagging-off dari Jumbo Bag 1 Ton', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000007', 25.00, 0.0300, TRUE, 'e0000000-0000-0000-0000-000000000001', 50),

-- 11.3 Child Item 2 (Curah Lepas): Gula Pasir Curah Loose KG
('e0000000-0000-0000-0000-000000000003', 'SUGAR-LOOSE-KG', 'Gula Pasir Curah Lepas (Silo / Bulk Tank)', 'Gula curah simpan di Silo untuk truk tangki curah', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000001', 1.00, 0.0012, TRUE, 'e0000000-0000-0000-0000-000000000001', 1000),

-- 11.4 Packaged General Cargo: Elektronik TV
('e0000000-0000-0000-0000-000000000004', 'ELEC-TV-43', 'Smart LED TV 43 Inch FHD', 'Televisi LED 43 Inch with Smart OS', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000009', 8.50, 0.0850, FALSE, NULL, 20);

-- 12. Vehicles (Fleet Master)
INSERT INTO vehicles (id, plate_number, vehicle_type_id, brand, model, year_made, current_driver_id, assigned_warehouse_id, status, last_odometer_km) VALUES
('f0000000-0000-0000-0000-000000000001', 'B 9188 WMS', '60000000-0000-0000-0000-000000000005', 'Mitsubishi', 'Fighter FN 62 F Tronton Wingbox', 2022, 'd0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'AVAILABLE', 45200.00),
('f0000000-0000-0000-0000-000000000002', 'B 9845 WMS', '60000000-0000-0000-0000-000000000006', 'Hino', 'Profia Dump Truck 24M3 Curah', 2021, NULL, 'a0000000-0000-0000-0000-000000000001', 'AVAILABLE', 78900.00),
('f0000000-0000-0000-0000-000000000003', 'B 9012 WMS', '60000000-0000-0000-0000-000000000002', 'Isuzu', 'Giga CDD Box 6 Roda', 2023, NULL, 'a0000000-0000-0000-0000-000000000001', 'AVAILABLE', 23150.00);

-- 13. Initial Stock Levels
INSERT INTO stock_levels (warehouse_id, product_id, qty_on_hand, qty_reserved, qty_in_transit, uom_id) VALUES
('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 20.00, 0.00, 0.00, '30000000-0000-0000-0000-000000000005'), -- 20 Jumbo Bags @ 1 Ton
('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 200.00, 0.00, 0.00, '30000000-0000-0000-0000-000000000007'), -- 200 Karung 25kg
('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 120.00, 10.00, 0.00, '30000000-0000-0000-0000-000000000009'); -- 120 TV
