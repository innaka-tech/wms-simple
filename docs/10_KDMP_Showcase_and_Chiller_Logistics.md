# 10_KDMP_Showcase_and_Chiller_Logistics.md

**Document:** Logistics & Warehouse Handling Specification for KDMP (Koperasi Desa/Kelurahan Merah Putih)  
**Commodity Focus:** Commercial Display Showcases, Chest Freezers, Food Chillers, & Cold Chain Infrastructure  
**Version:** 2.3.0  
**Status:** APPROVED STRATEGIC SPECIFICATION  

---

## 1. Analisis Konteks: Apa, Siapa, Mengapa, dan Bagaimana KDMP

### 1.1 Apa itu KDMP (Koperasi Desa/Kelurahan Merah Putih)?
**Koperasi Desa/Kelurahan Merah Putih (KDMP / KDKMP)** adalah program strategis nasional pemerintah Indonesia (era Presiden Prabowo Subianto) yang menargetkan pembentukan dan revitalisasi koperasi multiusaha di lebih dari **70.000 desa dan kelurahan di seluruh Indonesia**.

KDMP bertindak sebagai **pusat distribusi kebutuhan pokok (sembako)** sekaligus **penyerap hasil panen (off-taker)** petani, peternak ayam/sapi, dan nelayan lokal. KDMP juga menjadi simpul penyedia bahan baku bagi program nasional **Makan Bergizi Gratis (MBG)**.

### 1.2 Siapa Aktor yang Terlibat (Stakeholders Matrix)?
1. **Regulator & Pengarah:** Kementerian Koperasi, Bapanas (Badan Pangan Nasional), Kementerian Koordinator Bidang Pangan, Kementerian Desa.
2. **Holding BUMN & Pemasok:** ID FOOD (Holding BUMN Pangan), Perum BULOG, Pabrikan Elektronik Pendingin (RSA, GEA, Sanden, Panasonic, Polytron, Modena).
3. **Penyedia Logistik & WMS (3PL & Ekspedisi Trucking):** Mengelola staging barang di gudang utama, pengangkutan antar-pulau/antar-hub, dan *last-mile delivery* hingga ke balai desa.
4. **Penerima Lapangan (Consignee):** Pengurus KDMP, Kepala Desa/Lurah (*ex-officio* pengawas), Komite Logistik Desa.

### 1.3 Mengapa Butuh Showcase & Chiller di Tingkat Desa?
- **Menekan Kerusakan Pascapanen (*Post-Harvest Food Loss*):** Tanpa pendingin, produk hewani (daging ayam, sapi, ikan segar) dan susu cepat membusuk di iklim tropis desa.
- **Penyimpanan Bahan Baku Program MBG:** Menjaga pasokan protein beku tetap higienis dan segar sebelum diolah di dapur sentral gizi desa.
- **Memotong Rantai Tengkulak:** Koperasi dapat menampung ikan dan daging dari nelayan/peternak dengan harga stabil karena memiliki fasilitas penyimpanan beku (*cold chain*).

---

## 2. Karakteristik Fisik Kargo & Batasan Penanganan Khusus (*Handling Constraints*)

Showcase dan Chiller komersial **BUKAN** kargo general biasa; barang ini tergolong **Heavy Fragile Appliance with Sensitive Refrigeration System**.

```
┌─────────────────────────────────────────────────────────────┐
│          ATURAN EMAS PENANGANAN SHOWCASE & CHILLER          │
├─────────────────────────────────────────────────────────────┤
│ 1. ⬆️ WAJIB TEGAK (UPRIGHT ONLY): Dilarang dimiringkan > 45° │
│    agar oli kompresor tidak mengalir ke pipa evaporator.    │
│ 2. 🚫 DILARANG TUMPUK (NO DOUBLE STACKING) kecuali pallet   │
│    pabrikan dengan sangkar kayu struktural (wooden crate).  │
│ 3. 🔍 SERIAL NUMBER & IMEI TRACKING: Setiap unit memiliki   │
│    barcode Serial Number unik untuk garansi dan aset BMN.   │
│ 4. ⏳ RESTING TIME 2-4 JAM: Wajib diistirahatkan sebelum     │
│    dicolok ke listrik saat instalasi di balai desa.         │
│ 5. 🚛 TRUK TAIL-LIFT (LIFTGATE): Wajib armada dengan lift   │
│    hidrolik untuk bongkar muat aman di lokasi tanpa dock.   │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Matriks Tipe Unit Showcase & Chiller KDMP

| Kategori Unit | Dimensi Fisik (P x L x T cm) | Berat Bersih | Suhu Kerja | Unit Kemasan | Syarat Armada Khusus |
|---|---|---|---|---|---|
| **Display Showcase 1-Pintu (250L - 350L)** | 55 x 58 x 170 | 55 – 65 KG | +2°C s/d +8°C | Dus + Styrofoam + Pallet Kayu | CDE / CDD Box Tertutup |
| **Display Showcase 2-Pintu (800L - 1000L)**| 110 x 68 x 200 | 110 – 135 KG | +2°C s/d +8°C | Wooden Crate Heavy Duty | CDD / Fuso Box Tail-Lift |
| **Chest Freezer Protein Daging/Ikan (300L - 500L)** | 130 x 70 x 85 | 60 – 80 KG | -18°C s/d -25°C | Dus + Base Wood Skid | CDE / CDD Box |
| **Upright Bio-Chiller Vaksin & Susu Segar** | 60 x 65 x 185 | 75 – 90 KG | +2°C s/d +6°C | Full Foam + Wooden Frame | CDD Box Shock Absorber |

---

## 3. Penyesuaian Master Data & Skema Database WMS Simple

Untuk mendukung pengiriman Showcase KDMP tanpa mengubah arsitektur inti, ditambahkan master lookup baru:

### 3.1 Penambahan Master Cargo Type & Handling Code
```sql
-- 1. Kategori Kargo Khusus
INSERT INTO master_cargo_types (id, code, name, description, requires_temperature_control, max_stacking_layers, handling_instructions)
VALUES 
('c0000000-0000-0000-0000-000000000004', 'APPLIANCE_COLD_CHAIN', 'Commercial Chiller & Showcase', 'Peralatan pendingin komersial showcase dan chest freezer KDMP', false, 1, 'WAJIB TEGAK (UPRIGHT ONLY), JANGAN DIBANTING, HINDARI BENTURAN KACA, BONGKAR DENGAN TAIL-LIFT');

-- 2. Tipe Dokumen BAST KDMP
INSERT INTO master_document_types (id, code, name, category, is_legal_compliance)
VALUES
('d0000000-0000-0000-0000-000000000005', 'BAST_KDMP', 'Berita Acara Serah Terima KDMP', 'OUTBOUND_POD', true);
```

### 3.2 Pelacakan Nomor Seri Mesin (*Unit Serial Number Tracking*)
Pada level `outbound_items` dan `packages`, setiap unit showcase mencatat:
- `serial_number`: Nomor seri unik kompresor/unit (misal: `RSA-CF300-20260901-0889`).
- `brand_model`: Merk dan tipe (misal: `GEA EXPO-37FA / RSA CF-310`).
- `asset_tag_kdmp`: Nomor register aset Koperasi Desa (misal: `KDMP-BALI-DPS-0012`).

---

## 4. Diagram Alur Distribusi Logistik Showcase & Chiller KDMP (Flowchart)

```mermaid
flowchart TD
    classDef mfg fill:#e1f5fe,stroke:#0288d1,stroke-width:1.5px;
    classDef hub fill:#f3e5f5,stroke:#7b1fa2,stroke-width:1.5px;
    classDef fleet fill:#efebe9,stroke:#5d4037,stroke-width:1.5px;
    classDef village fill:#e8f5e9,stroke:#388e3c,stroke-width:1.5px;
    classDef alert fill:#ffebee,stroke:#c62828,stroke-width:1.5px;

    MFG(["1. Inbound dari Pabrikan (RSA / GEA / Polytron)\nBatch Alokasi Pengadaan KDMP"]):::mfg --> STAGING_IN["2. Penerimaan di Central Hub Jakarta\nInspeksi Kaca, Cek Serial Number, Cek Label Tegak"]:::hub

    STAGING_IN --> DAMAGE_CHECK{"Ada Kaca Retak / Bodi Penyok?"}
    DAMAGE_CHECK -->|Ya| CLAIM_MFG["Klaim Penggantian Pabrik / Asuransi"]:::alert
    DAMAGE_CHECK -->|Tidak| LINEHAUL_PLAN

    LINEHAUL_PLAN["3. Konsolidasi Antar-Hub (Line-Haul)\nMuat ke Tronton Wingbox (Kapasitas: 40-50 Unit Tegak)\nStock: in_transit Antar-Pulau"]:::hub --> GATE_OUT_MAIN["4. Gate-Out Pos Satpam Hub Utama\nOdometer, Segel Box, Surat Jalan Induk"]:::fleet

    GATE_OUT_MAIN --> TRANSIT_SPOKE["5. Tiba di Gudang Transit Spoke (e.g. Bali / Balikpapan)\nCross-Docking De-konsolidasi per Rute Kecamatan"]:::hub

    TRANSIT_SPOKE --> LAST_MILE_LOAD["6. Muat ke Truk CDE / CDD Tail-Lift\n(Khusus Jalan Sempit Pedesaan, Max 6-10 Unit per Truk)"]:::fleet

    LAST_MILE_LOAD --> VILLAGE_ARRIVE["7. Tiba di Balai Desa / Kantor KDMP\nBongkar Menggunakan Hydraulic Tail-Lift"]:::village

    VILLAGE_ARRIVE --> COMMISSIONING["8. Prosedur Serah Terima & SOP Commissioning:\n- Unboxing & Cek Fisik Bersama Kades / Pengurus\n- Penempelan Sticker Tag Aset KDMP\n- Edukasi: Diamkan 2-4 Jam Sebelum Colok Listrik!"]:::village

    COMMISSIONING --> DIGITAL_BAST["9. Submit Digital BAST & POD:\n- Scan Barcode Serial Number Mesin\n- Tanda Tangan Digital Ketua KDMP / Kepala Desa\n- Foto GPS Depan Kantor Balai Desa Merah Putih"]:::village

    DIGITAL_BAST --> COMPLETE(["10. Aset Resmi Aktif & Tercatat di Sistem Pusat"]):::village
```

---

## 5. Diagram Sequence Alur Distribusi Showcase ke Balai Desa KDMP

```mermaid
sequenceDiagram
    autonumber
    actor Driver as Driver Ekspedisi KDMP
    actor Kades as Kepala Desa / Ketua KDMP
    actor Satpam as Pos Satpam Gerbang
    actor Admin as Admin Logistik Pusat
    participant API as WMS Simple API
    participant DB as Host PostgreSQL
    participant Audit as Checkpoint Chain Logger

    Note over Admin,API: 1. Perencanaan Distribusi Rute Desa
    Admin->>API: POST /api/v1/outbound (Order Batch KDMP Desa Sukamaju)
    Note over Admin,API: SKU: SHOWCASE-GEA-300L (Qty: 2), Serial: SN-998811, SN-998812
    API->>DB: INSERT INTO outbound_orders (Tipe: KDMP_DEPLOYMENT)
    API->>Audit: recordCheckpoint(KDMP_ORDER_PLANNED)

    Note over Driver,Satpam: 2. Keberangkatan Truk CDE Tail-Lift
    Satpam->>API: POST /api/v1/fleet/departure
    Note over Satpam,API: Truk B 9012 WMS (CDE Box Tail-Lift), Odometer: 12.400 km
    API->>DB: INSERT INTO fleet_exit_logs (Status: DEPARTED)
    API->>Audit: recordCheckpoint(FLEET_DEPARTED, actor: Satpam)

    Note over Driver,Kades: 3. Tiba di Balai Desa & SOP Bongkar Muat
    Driver->>Kades: Tiba di Lokasi Kantor Koperasi Desa Merah Putih
    Driver->>Driver: Turunkan Showcase menggunakan Hydraulic Tail-Lift (Posisi Tegak)
    Driver->>Kades: Buka Dus, Cek Kaca Utuh, Rak Lengkap, Kartu Garansi Ada
    Driver->>Kades: Edukasi SOP: Jangan langsung dicolok listrik, tunggu 3 jam agar oli kompresor stabil!

    Note over Driver,API: 4. Serah Terima Digital BAST & POD
    Driver->>API: POST /api/v1/outbound/:id/pod
    Note over Driver,API: Upload Foto Showcase di Depan Balai Desa + TTD Digital Kepala Desa
    API->>DB: INSERT INTO pod_documents (doc_type: BAST_KDMP, recipient: Kades_Wayan)
    API->>DB: UPDATE outbound_orders (Status: DELIVERED)
    API->>Audit: recordCheckpoint(KDMP_BAST_SIGNED, actor: Driver)

    Note over Admin,API: 5. Verifikasi Aset oleh Admin Pusat
    Admin->>API: POST /api/v1/outbound/:id/verify-pod
    API->>DB: UPDATE outbound_orders (Status: ASSET_REGISTERED)
    API->>Audit: recordCheckpoint(ASSET_VERIFIED, actor: Admin)
    API-->>Admin: Aset KDMP Sukses Terdaftar & Rantai Audit Terkunci
```

---

## 6. Checklist SOP Pengemudi & Teknisi Serah Terima KDMP

1. **Pemeriksaan Kemiringan Selama Pengiriman:**
   - Pastikan *lashing strap* terikat kencang pada dinding box truk sehingga showcase tidak bergeser atau miring saat melewati jalanan desa bergelombang.
2. **Uji Nyala Setelah *Resting Time*:**
   - Setelah didiamkan minimal 2–4 jam, unit dapat dicolokkan ke sumber listrik stabil (220V) untuk memastikan kipas berputar dan kompresor mulai mendinginkan.
3. **Penyimpanan Berkas Fisik & Digital:**
   - Buku petunjuk dan kartu garansi diserahkan langsung ke bendahara/pengurus KDMP.
   - Foto bukti BAST wajib memperlihatkan papan nama resmi *"Koperasi Desa Merah Putih"* di latar belakang.
