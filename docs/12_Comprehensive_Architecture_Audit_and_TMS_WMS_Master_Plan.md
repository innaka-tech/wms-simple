# 12_Comprehensive_Architecture_Audit_and_TMS_WMS_Master_Plan.md

**Dokumen:** Audit Arsitektur Mendalam, Relasi Aplikasi-Database, Analisis Alur Terputus, dan Master Plan Integrasi WMS + TMS  
**Sistem:** WMS Simple Enterprise + Integrated TMS (Transportation Management System)  
**Database:** Host PostgreSQL (`wms_simple_db` & `wms_simple_test_db` on `127.0.0.1:5432`)  
**Versi Dokumen:** 5.0.0-PROPOSAL  
**Status Dokumen:** REVIEW & STRATEGIC BLUEPRINT (DOKUMEN PERENCANAAN — BELUM DIEKSEKUSI KE KODE)  

---

## 1. Eksekutif Ringkasan & Latar Belakang Audit

Sistem **WMS Simple Enterprise** telah berhasil mengimplementasikan fondasi operasional inti: PostgreSQL 16 host native, autentikasi RBAC 6 peran, 144/144 automated tests passing, serta alur dasar penerimaan, debulking, pengiriman, dan billing.

Namun, untuk memenuhi standar industri logistik pergudangan skala enterprise yang terintegrasi dengan **TMS (Transportation Management System)** secara kokoh, anti-perubahan mendadak di masa depan, dan tanpa relasi data yang terputus, dilakukan audit menyeluruh pada 5 pilar utama:
1. **Relasi Aplikasi ↔ Database:** Menjamin 36 tabel tidak hanya ada di skema SQL, tetapi terhubung utuh di backend route dan frontend UI tanpa data mengambang (*orphan data*).
2. **Kelengkapan Menu:** Menutup kekosongan modul penting yang saat ini belum memiliki halaman visual.
3. **Kelengkapan Alur (End-to-End Flow):** Mengatasi alur kritis yang "setengah jalan" (misal: Gate-In satpam belum ada di UI, alur penolakan POD tanpa karantina barang, packing tanpa data koli fisik).
4. **Penguatan Alur Bisnis Termasuk TMS:** Merancang arsitektur perencanaan rute pengantaran (*Trip Planning / Multi-Drop Manifest*), proteksi kelebihan muatan (*Overload Guard*), pelacakan armada dalam perjalanan (*Trip Tracking*), dan logistik balik (*Reverse Logistics/Retur*).
5. **Detail Gap Krusial:** Memetakan tingkat urgensi (P0, P1, P2) beserta akar masalah teknis dan rencana penyelesaiannya.

---

## 2. Matriks Audit 36 Tabel Database ↔ Aplikasi

Pemeriksaan silang terhadap seluruh 36 tabel yang ada di skema database PostgreSQL (`pg-schema.ts`) menghasilkan pemetaan status relasi berikut:

| No | Nama Tabel di Database | Status Relasi DB | Status di Backend API | Status di Frontend UI | Analisis Gap & Relasi Terputus |
|:---|:---|:---:|:---:|:---:|:---|
| 1 | `master_cargo_types` | ✅ FK Valid | ✅ GET, POST | ⚠️ Hanya Dropdown | Tidak ada halaman CRUD untuk mengelola instruksi penanganan & aturan suhu kargo. |
| 2 | `master_packaging_types` | ✅ FK Valid | ✅ GET | ⚠️ Hanya Dropdown | Tidak ada UI untuk mengelola tara berat dan kapasitas kontainer kemasan. |
| 3 | `master_uom` | ✅ FK Valid | ✅ GET | ⚠️ Hanya Dropdown | Tidak ada UI untuk menambah/mengedit satuan ukur standar logistik. |
| 4 | `master_uom_conversions` | ✅ FK Valid | ⚠️ GET only | ❌ Terputus | **TERPUTUS:** Tabel konversi ada di DB, tapi modul debulking/stock tidak membaca tabel ini untuk auto-kalkulasi rasio satuan. |
| 5 | `master_warehouse_types` | ✅ FK Valid | ✅ GET | ⚠️ Hanya Dropdown | Tidak ada UI untuk konfigurasi tipe fasilitas (Hub vs Spoke). |
| 6 | `master_document_types` | ✅ FK Valid | ✅ GET | ⚠️ Hanya Dropdown | Tidak ada UI untuk mengelola jenis surat jalan / dokumen legal trade. |
| 7 | `master_vehicle_types` | ✅ FK Valid | ✅ GET | ⚠️ Hanya Dropdown | Tidak ada UI untuk mengelola spesifikasi armada (CDE/CDD/Fuso/Tronton, dimensi PxLxT, kubikasi CBM, tonase max). |
| 8 | `warehouses` | ✅ FK Valid | ✅ CRUD | ✅ Halaman Tersedia | Terhubung penuh. |
| 9 | `warehouse_locations` | ✅ FK Valid | ✅ CRUD API | ⚠️ Sangat Terbatas | **SETENGAH TERPUTUS:** Lokasi rak/bin ada di DB, tapi form Inbound Putaway dan Outbound Picking tidak memilih rak (default `null`). Stok per rak tidak tampil di tabel stok. |
| 10 | `customers` | ✅ FK Valid | ✅ CRUD | ✅ Halaman Tersedia | Terhubung penuh. |
| 11 | `users` | ✅ FK Valid | ✅ CRUD + RBAC | ✅ Halaman Tersedia | Terhubung penuh dengan token JWT. |
| 12 | `products` | ✅ FK Valid | ✅ CRUD | ✅ Halaman Tersedia | Terhubung penuh. |
| 13 | `vehicles` | ✅ FK Valid | ✅ CRUD | ✅ Halaman Tersedia | Master armada ada, tapi status kendaraan terkunci `IN_USE` karena Gate-In absen di UI. |
| 14 | `stock_levels` | ✅ FK Valid | ✅ Query API | ✅ Halaman Tersedia | Terhubung penuh (on_hand, reserved, in_transit). |
| 15 | `stock_movements` | ✅ FK Valid | ✅ Auto-Ledger | ⚠️ Tidak Ada UI Tab | Buku besar mutasi stok berjalan di backend, namun UI belum memiliki tab riwayat mutasi detail (*ledger viewer*). |
| 16 | `stock_conversions` | ✅ FK Valid | ✅ CRUD API | ✅ Halaman Tersedia | Terhubung ke outbound order. |
| 17 | `stock_conversion_items_in` | ✅ FK Valid | ✅ Auto-Insert | ✅ Tampil di Detail | Terhubung penuh. |
| 18 | `stock_conversion_items_out`| ✅ FK Valid | ✅ Auto-Insert | ✅ Tampil di Detail | Terhubung penuh. |
| 19 | `weighbridge_logs` | ✅ FK Valid | ✅ API Tersedia | ❌ Tidak Ada Halaman | **TERPUTUS:** Tabel & route timbang truk ada di backend, namun tidak ada halaman antarmuka sama sekali. |
| 20 | `inbound_orders` | ✅ FK Valid | ✅ CRUD API | ✅ Halaman Tersedia | Terhubung penuh (PO Masuk). |
| 21 | `inbound_items` | ✅ FK Valid | ✅ CRUD API | ✅ Halaman Tersedia | Terhubung penuh. |
| 22 | `cross_dock_manifests` | ✅ FK Valid | ✅ CRUD API | ✅ Halaman Tersedia | Terhubung penuh. |
| 23 | `cross_dock_items` | ✅ FK Valid | ✅ CRUD API | ✅ Halaman Tersedia | Terhubung penuh. |
| 24 | `cross_documents` | ✅ FK Valid | ✅ CRUD API | ✅ Halaman Tersedia | Terhubung penuh (Surat Jalan Swap). |
| 25 | `cross_document_items` | ✅ FK Valid | ✅ CRUD API | ✅ Halaman Tersedia | Terhubung penuh. |
| 26 | `outbound_orders` | ✅ FK Valid | ✅ CRUD API | ✅ Halaman Tersedia | Terhubung penuh. |
| 27 | `outbound_items` | ✅ FK Valid | ✅ CRUD API | ✅ Halaman Tersedia | Terhubung penuh. |
| 28 | `packages` | ✅ FK Valid | ⚠️ Model Ada | ❌ Terputus di UI | **TERPUTUS:** Tabel penyimpanan data koli/karton/box hasil packing ada di DB, tapi form packing di UI tidak pernah mengisi tabel ini. |
| 29 | `pod_documents` | ✅ FK Valid | ✅ CRUD API | ✅ Halaman Tersedia | Terhubung penuh. |
| 30 | `fleet_exit_logs` | ✅ FK Valid | ✅ Departure/Return API | ⚠️ Hanya Gate-Out | **KRUSIAL TERPUTUS:** Form pos satpam hanya bisa Gate-Out. Fungsi Gate-In armada kembali tidak ada di frontend! |
| 31 | `invoices` | ✅ FK Valid | ✅ CRUD API | ✅ Halaman Tersedia | Terhubung penuh. |
| 32 | `payments` | ✅ FK Valid | ✅ CRUD API | ✅ Halaman Tersedia | Terhubung penuh. |
| 33 | `vendor_vehicle_exit_logs` | ✅ FK Valid | ✅ CRUD API | ✅ Halaman Tersedia | Terhubung penuh. |
| 34 | `checkpoint_logs` | ✅ FK Valid | ✅ Auto-Chain | ✅ Halaman Tersedia | Rantai audit tak terputus (*immutable*). |
| 35 | `alerts` | ✅ FK Valid | ✅ API Generator | ❌ Tidak Ada UI | **TERPUTUS:** Alert susut & gate overdue tercipta di database, tapi tidak ada panel UI/lonceng notifikasi untuk melihat dan menyelesaikan alert. |
| 36 | `waybills` | ✅ FK Valid | ✅ CRUD API | ✅ Halaman Tersedia | Terhubung penuh (SJ & Resi). |

---

## 3. Evaluasi & Desain Struktur Menu Lengkap (WMS + TMS)

### 3.1 Menu yang Saat Ini Absen / Hilang
1. **Modul TMS (Transportation Management System):**
   * *Trip Planning & Multi-Drop Manifest* (Perencanaan muatan beberapa DO ke dalam 1 rute armada).
   * *Fleet Dispatch & Live Trip Status* (Status perjalanan armada: Dispatched $\rightarrow$ En Route $\rightarrow$ Delivered $\rightarrow$ Returned).
   * *Gate-In Armada Kembali* (Pencatatan kilometer dan BBM kembali di pos satpam).
2. **Modul Inventory & Warehouse Operations Lanjutan:**
   * *Stock Opname / Physical Cycle Count* (Penjadwalan hitung fisik stok rak vs sistem dan rekonsiliasi selisih).
   * *Penyimpanan Rak (Bin Location Explorer)* (Melihat isi barang per lorong, rak, dan tingkat penyimpanan).
   * *Area Karantina & Retur Barang (Reverse Logistics)* (Pengelolaan barang ditolak saat POD / barang rusak saat inbound).
3. **Modul Manajemen Referensi Master Data:**
   * Pengelolaan Master Tipe Kargo, Tipe Kemasan, Satuan UOM & Rasio Konversi, Tipe Kendaraan (kapasitas berat & kubikasi), serta Tipe Dokumen.
4. **Pusat Notifikasi & Alert Operasional:**
   * Lonceng notifikasi pada header dan halaman resolusi alert operasional.

### 3.2 Rekomendasi Struktur Menu Enterprise (Terintegrasi Penuh)

```
├── 1. DASHBOARD & MONITORING
│   ├── Beranda (Logistics Control Tower Telemetry)
│   ├── Stock on Hand & Kartu Stok (Termasuk Filter Rak & Status)
│   ├── Audit Trail Dokumen (Immutable Checkpoint Chain)
│   └── Pusat Notifikasi & Alert Operasional (Overdue & Overload Alert)  <-- [BARU]
│
├── 2. INBOUND LOGISTICS (BARANG MASUK)
│   ├── PO Inbound & Receiving (Penerimaan Fisik di Dock)
│   ├── Alokasi Rak & Putaway (Penyimpanan ke Rak / Bin Lokasi)         <-- [DIPERTALIKAN]
│   └── Cross-Docking Antar-Hub (Manifest Transit Cepat)
│
├── 3. WAREHOUSE OPERATIONS (PENGELOLAAN INTERNAL)
│   ├── Debulking, Repacking & Bagging-Off (Work Order Susut)
│   ├── Stock Opname & Penyesuaian Fisik (Cycle Counting)               <-- [BARU]
│   └── Karantina & Retur Barang (Reverse Logistics / RMA)               <-- [BARU]
│
├── 4. OUTBOUND FULFILLMENT (PENGIRIMAN GUDANG)
│   ├── Delivery Order (Buat & Kelola DO)
│   ├── Picking Slip (Petunjuk Lokasi Ambil Barang di Rak)              <-- [DIPERTALIKAN]
│   ├── Packing & Boxing (Pencatatan Koli, Berat, & Dimensi)            <-- [DIPERTALIKAN]
│   ├── Terbitkan Surat Jalan & Resi (Universal Waybill)
│   └── Cross-Doc (Swap Surat Jalan 3PL / Blind Shipping)
│
├── 5. TRANSPORTATION MANAGEMENT SYSTEM (TMS)                            <-- [MODUL UTAMA LENGKAP]
│   ├── Rencana Muatan & Trip Multi-Drop (Trip Dispatcher)              <-- [BARU]
│   ├── Monitoring Perjalanan Armada (Live Trip Tracking)               <-- [BARU]
│   ├── Pos Satpam Gerbang (Gate-Out Keberangkatan & Gate-In Kembali)   <-- [DISEMPURNAKAN]
│   └── Bukti Serah Terima (Digital POD / BAST Desa & Foto)
│
├── 6. BILLING & FINANCE HANDOFF
│   ├── Faktur Penagihan (Invoices Otomatis IDR)
│   └── Catat Pembayaran & Piutang (Status LUNAS)
│
└── 7. MASTER DATA MANAGEMENT
    ├── Master Barang (SKU, Volume, Berat, & Aturan Kargo)
    ├── Master Fasilitas Gudang & Lokasi Rak (Zonasi & Rak)
    ├── Master Pelanggan, Vendor & Shipper
    ├── Master Armada Truk & Pengemudi (Pool Kendaraan)
    ├── Master Referensi Sistem (Kargo, Kemasan, UOM, Tipe Truk)         <-- [BARU]
    └── Manajemen Pengguna & Hak Akses (RBAC 6 Peran)
```

---

## 4. Analisis Mendalam Keterputusan Alur (Flow Incompleteness)

### 4.1 Alur Gate-In Armada Pool Pos Satpam (KRUSIAL)
* **Kondisi Saat Ini:**
  * Satpam mencatat armada keluar di `/gate-pass` (Jalur A).
  * Backend menandai armada sebagai `IN_USE` di tabel `vehicles` dan status log `DEPARTED`.
  * Tidak ada tombol, tab, atau form pada frontend untuk mencatat kepulangan armada.
* **Konsekuensi Sistem:**
  * Truk yang sudah kembali ke pangkalan tidak bisa diberangkatkan lagi karena filter `availableVehicles` hanya mengambil armada dengan status `AVAILABLE`.
  * Odometer terakhir mobil tidak pernah diperbarui dari kepulangan.
  * Jarak tempuh riil dan efisiensi konsumsi BBM trip tidak terhitung.
* **Solusi Desain:**
  * Tambahkan tab **"Armada Kembali (Gate-In)"** pada halaman `/gate-pass`.
  * Menampilkan daftar armada yang sedang berada di luar (`status = 'DEPARTED'`).
  * Satpam mengklik "Catat Kembali", memasukkan:
    * Odometer Masuk (validasi wajib $\ge$ Odometer Keluar).
    * Level BBM Kembali.
    * Catatan Pemeriksaan Fisik & Kebersihan Kendaraan.
    * Foto Kilometer / Kendaraan.
  * Sistem mengeksekusi `POST /api/fleet/logs/:id/return`, mengubah log menjadi `RETURNED`, menghitung total jarak KM, dan mengembalikan armada ke status `AVAILABLE`.

### 4.2 Alur POD Ditolak & Kebocoran Stok In-Transit (KRUSIAL)
* **Kondisi Saat Ini:**
  * Ketika pesanan dikirim, sistem memotong stok `reserved` dan menambah stok `in_transit`.
  * Pada halaman `/outbound/pod`, jika admin menolak BAST/POD (misal: toko tutup, barang rusak parah, atau ditolak customer), status order diubah menjadi `CANCELLED`.
  * Namun, backend tidak pernah mengeksekusi mutasi ledger pengembalian barang!
* **Konsekuensi Sistem:**
  * Stok barang tetap mengendap selamanya di ember `in_transit` (stok hantu).
  * Buku besar stok tidak lagi seimbang dengan fisik di gudang.
* **Solusi Desain:**
  * Pada endpoint penolakan POD (`rejectPod`), tambahkan alur pengembalian otomatis:
    * Opsi A: `REVERSE_LOGISTICS_RESTOCK` $\rightarrow$ Barang kembali ke gudang asal, stok `in_transit` dipindahkan kembali ke `on_hand`.
    * Opsi B: `REVERSE_LOGISTICS_QUARANTINE` $\rightarrow$ Barang rusak masuk ke area karantina (`quarantine_qty`), menunggu keputusan apakah akan dimusnahkan (*write-off*) atau direkondisi.

### 4.3 Alur Alokasi Rak (Putaway & Picking) yang Terputus
* **Kondisi Saat Ini:**
  * Tabel `warehouse_locations` menyimpan hierarki rak (Zone $\rightarrow$ Aisle $\rightarrow$ Rack $\rightarrow$ Shelf $\rightarrow$ Bin).
  * Saat Inbound Putaway di `/inbound/receive`, pengguna hanya menginput kuantitas tanpa memilih rak tujuan.
  * Saat Outbound Picking di `/outbound`, petugas tidak diberikan petunjuk di rak mana barang harus diambil.
* **Konsekuensi Sistem:**
  * WMS kehilangan esensi utamanya sebagai *Location Management System*. Petugas gudang harus mencari barang secara manual di lapangan.
* **Solusi Desain:**
  * **Inbound Putaway:** Tampilkan dropdown/scanner rak tujuan penyimpanan berdasarkan gudang yang aktif.
  * **Outbound Picking:** Saat order berstatus `CREATED`, sistem otomatis menampilkan lokasi rak penyimpanan yang memiliki saldo stok untuk SKU tersebut (*Suggested Pick Location*).

### 4.4 Alur Kemasan Fisik Koli (Packages / Boxing)
* **Kondisi Saat Ini:**
  * Tabel `packages` dirancang untuk merekam kode koli (misal: `BOX-001`, `BOX-002`), jenis kemasan (Kardus, Pallet, Karung), berat timbang riil, dan dimensi.
  * Saat tombol "Proses Packing" diklik di `/outbound`, sistem hanya mengubah status tanpa menyimpan satu baris pun data paket.
* **Konsekuensi Sistem:**
  * Resi pengiriman tidak memiliki informasi berapa jumlah koli fisik yang dibawa truk.
  * Supir dan satpam tidak bisa memverifikasi jumlah koli fisik saat memuat barang ke truk.
* **Solusi Desain:**
  * Buat modal/drawer Packing interaktif: Petugas mengemas item ke dalam koli, memberi kode box/seal, memilih jenis kemasan dari `master_packaging_types`, dan mencatat berat koli.

---

## 5. Blueprint Bisnis TMS (Transportation Management System)

Untuk memperkuat kapabilitas TMS agar dapat menangani distribusi skala besar tanpa perombakan arsitektur di masa depan, sistem diperluas dengan spesifikasi berikut:

```
[Delivery Orders: PACKED]
         │
         ▼
[1. TMS Trip Planner / Multi-Drop Builder]
         │ (Validasi Kapasitas Berat & Kubikasi vs Max Armada)
         ▼
[2. Terbitkan Surat Tugas / Trip Manifest] (TRIP-XXXX)
         │
         ▼
[3. Loading Barang ke Truk] (LIFO Sequence)
         │
         ▼
[4. Gate-Out Pos Satpam] (Validasi Trip Manifest, Odo Out, BBM Out)
         │
         ▼
[5. Monitoring Perjalanan Armada] (Status: EN_ROUTE / IN_TRANSIT)
         │
   ┌─────┴────────────────┐
   ▼                      ▼
[Drop 1: E-POD]        [Drop 2: E-POD]
   └─────┬────────────────┘
         │
         ▼
[6. Gate-In Pos Satpam] (Odo In, BBM In, Cek Fisik, Serah Terima Surat Jalan)
         │
         ▼
[7. Trip Settlement] (Hitung Total Jarak KM & Armada kembali AVAILABLE)
```

### 5.1 Spesifikasi Trip Manifest (Multi-Drop)
1. **Entitas Baru: `trips` dan `trip_stops`:**
   * `trip_number`: Nomor unik penugasan (contoh: `TRIP-2026-09-0001`).
   * `vehicle_id` & `driver_id`: Armada dan supir yang ditugaskan.
   * `status`: `PLANNED` $\rightarrow$ `LOADING` $\rightarrow$ `DEPARTED` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `COMPLETED`.
   * Relasi ke beberapa `outbound_orders` atau `cross_dock_manifests` sebagai titik drop (Stop 1, Stop 2, Stop 3).
2. **Auto-Guard Overload (Proteksi Kelebihan Muatan):**
   * Sebelum trip disetujui, sistem menjumlahkan total berat barang ($\sum \text{kg}$) dan volume ($\sum \text{CBM}$).
   * Jika $\sum \text{berat} > \text{max\_payload\_kg}$ armada, sistem menolak dan memberikan peringatan bahaya kelebihan beban (kepatuhan regulasi ODOL — *Over Dimension Over Load*).
3. **Trip Dispatcher UI:**
   * Antarmuka visual untuk menyeret (*drag-and-drop*) atau memilih DO yang siap kirim ke dalam satu rute perjalanan truk.

---

## 6. Daftar Rinci Kesenjangan Krusial (Crucial Gaps)

Berikut adalah ringkasan kesenjangan sistemik terurut berdasarkan tingkat keparahan:

### P0 — Blocker Operasional (Harus Diselesaikan Pertama)
1. **P0-1: Ketiadaan UI Gate-In Armada Kembali di Pos Satpam:**
   * *Akar Masalah:* Route API `POST /api/fleet/logs/:id/return` ada di backend, tetapi tidak memiliki form di frontend `/gate-pass`.
   * *Dampak:* Semua armada pool terkunci `IN_USE` setelah keberangkatan pertama.
2. **P0-2: Stok Terkatung-katung pada Penolakan POD (In-Transit Leak):**
   * *Akar Masalah:* Saat POD ditolak (`CANCELLED`), mutasi pembalikan stok dari `in_transit` tidak pernah dipicu.
   * *Dampak:* Saldo stok sistem tidak mencerminkan fisik gudang.

### P1 — Celah Fungsional Utama (Standar Enterprise)
3. **P1-1: Integrasi Lokasi Rak (Putaway & Picking):**
   * *Akar Masalah:* Kolom `location_id` diizinkan `null`, UI tidak menyediakan pemilih rak lokasi.
   * *Dampak:* Gudang beroperasi tanpa peta lokasi rak (*blind warehouse*).
4. **P1-2: Ketiadaan Modul TMS Multi-Drop Trip Planning:**
   * *Akar Masalah:* Gate Pass hanya mendukung 1 order per kendaraan.
   * *Dampak:* Tidak dapat menangani rute pengiriman gabungan (*milk-run / multi-drop*).
5. **P1-3: Ketiadaan Modul Retur & Karantina Barang:**
   * *Akar Masalah:* Tidak ada entitas untuk menampung barang retur dari customer atau barang rusak.
   * *Dampak:* Barang retur tidak terlacak dan rentan tercampur dengan barang layak jual.

### P2 — Penyempurnaan Tata Kelola & Master Data
6. **P2-1: CRUD Master Lookup Data Terputus:**
   * *Akar Masalah:* 7 tabel lookup master hanya di-seed di DB tanpa halaman manajemen.
   * *Dampak:* Penambahan tipe kargo baru, jenis kemasan, satuan ukur, atau tipe armada harus melalui query SQL langsung.
7. **P2-2: Ketiadaan UI Notifikasi & Resolusi Alert:**
   * *Akar Masalah:* Backend mendeteksi anomali operasional ke tabel `alerts`, tapi tidak ada notifikasi visual di header/layar operator.
   * *Dampak:* Manajer gudang terlambat mengetahui adanya susut debulking abnormal atau armada terlambat kembali.

---

## 7. Rencana Tahapan Eksekusi (Implementation Roadmap)

Perbaikan menyeluruh ini direncanakan melalui 4 fase bertahap yang aman tanpa merusak fungsionalitas yang telah berjalan:

### Fase 1: Perbaikan Gap Kritis Lapangan (P0 Core Fixes)
* [x] Standarisasi format seluruh nomor dokumen & kode SKU tanpa tanda hubung `-` (Format gabung padat: `BULKSUGAR1T`, `ELECTV43`, `KDMPCHILLER300L`, `SUGARSACK25KG`, `PO...`, `SJ...`, `RESI...`, `ORD...`, `GATEOUT...`, `VENDOUT...`, `INV...`).
* [x] Implementasikan antarmuka **Gate-In Armada Kembali** di `/gate-pass` lengkap dengan form input odometer masuk, level BBM, catatan kondisi fisik, dan kalkulasi jarak KM otomatis.
* [x] Implementasikan penanganan stok otomatis saat POD ditolak: kembalikan stok `in_transit` ke `on_hand` gudang asal (Restock) atau alihkan ke status Karantina.
* [x] Hubungkan pemilihan lokasi rak pada form Inbound Putaway (`/inbound/receive`) dan tampilkan informasi rak saat Outbound Picking.

### Fase 2: Pembangunan Modul TMS (Trip Planning & Dispatcher)
* [x] Buat skema tabel `trips` dan `trip_stops` di backend PostgreSQL.
* [x] Implementasikan validasi kapasitas armada (Overload Guard: Berat KG & Volume CBM vs Tipe Armada).
* [x] Bangun halaman **TMS Trip Dispatcher** (`/tms/trips`): Penggabungan beberapa DO ke dalam satu rute perjalanan, penerbitan Surat Tugas Jalan, dan pelacakan status perjalanan.

### Fase 3: Modul Karantina, Retur & Stock Opname
* [x] Bangun modul **Retur & Karantina** (`/stock/quarantine`): Pencatatan barang retur dari pelanggan, pemeriksaan QC, dan berita acara pemusnahan/restock.
* [x] Bangun modul **Stock Opname** (`/stock/opname`): Siklus hitung fisik berkala per rak, deteksi selisih, dan rekonsiliasi buku besar.

### Fase 4: Konsol Master Referensi & Pusat Alert
* [x] Bangun halaman terpadu **Master Referensi** (`/master/references`): Pengelolaan Tipe Kargo, Tipe Kemasan, Satuan UOM & Konversi, Tipe Armada, dan Tipe Dokumen.
* [x] Bangun komponen **Pusat Notifikasi / Lonceng Alert** di header antarmuka untuk notifikasi real-time anomali operasional.
* [x] Perbarui dokumentasi master, diagram arsitektur, dan laksanakan pengujian e2e menyeluruh.

---

## 8. Sintesis Spesifikasi Lapangan: Proyek Strategis Nasional KDMP AUCMA & Kepatuhan SOP Multi-Komoditas

Berdasarkan analisis silang terhadap dokumen spesifikasi teknis dan berkas rencana distribusi nasional (`10_KDMP_Showcase_and_Chiller_Logistics.md` dan `AUCMA_Skema_Import_dan_Kebutuhan_Gudang_KDKMP (1).xlsx`), berikut adalah batasan teknis riil yang wajib diakomodasi oleh arsitektur WMS + TMS:

### 8.1 Parameter Mega-Proyek Distribusi KDMP AUCMA (80.000 Unit)
1. **Skala Distribusi:**
   * **Target Sasaran:** 20.000 Koperasi Desa / Kelurahan Merah Putih di seluruh Indonesia (3.000 Jawa, 17.000 Luar Jawa).
   * **Total Kargo:** 80.000 Unit alat pendingin komersial:
     * 40.000 Unit Chest Freezer (`SD-616AIC`) — Dimensi kemasan: $1,78\text{ m} \times 0,776\text{ m}$, berat $\sim 75\text{ kg}$, suhu $-18^\circ\text{C}$ s/d $-25^\circ\text{C}$.
     * 40.000 Unit Showcase Chiller (`SC-469`) — Dimensi kemasan: $0,721\text{ m} \times 0,775\text{ m}$, berat $\sim 65\text{ kg}$, suhu $+2^\circ\text{C}$ s/d $+8^\circ\text{C}$.
   * **Paket Alokasi per Balai Desa:** **2 Unit Freezer + 2 Unit Showcase Chiller (Total 4 Unit per Kopdes)**.
2. **Topologi Jaringan Pergudangan (Hub & Spoke Staging):**
   * **Cikarang Distribution Center:** Kapasitas tetap $7.000\text{ m}^2$ (Hub Konsolidasi Impor Tanjung Priok, staging Jawa Barat, Sumatera & Nasional).
   * **Surabaya Hub:** Kapasitas tetap $3.500\text{ m}^2$ (Hub Konsolidasi Impor Tanjung Perak, staging Jawa Timur, Bali, NTB, NTT).
   * **Total Area Staging Tetap:** $10.500\text{ m}^2$ dengan target *Dwelling Time* maksimal **7 hari dari kedatangan impor**.
   * **Buffer Overflow Opsional:** $2.500 - 4.000\text{ m}^2$ pada masa kedatangan puncak (*peak arrival* 40.000 unit/bulan).

### 8.2 Aturan Kritis Penanganan Fisik (Handling Constraints)
* **Upright Only (Wajib Tegak):** Kargo showcase pendingin dilarang dimiringkan $> 45^\circ$ pada semua tahapan (unloading, staging, loading truk, dan delivery) guna mencegah oli kompresor bocor ke pipa evaporator.
* **No Double Stacking:** Dilarang menumpuk unit tanpa sangkar kayu struktural pabrikan.
* **Serial Number & Barcode Binding:** Setiap unit memiliki barcode nomor seri unik pabrikan yang wajib dipindai saat *Inbound GRN* dan diverifikasi saat *POD Serah Terima Balai Desa*.
* **Armada Khusus Truk CDE/CDD Tail-Lift:** Pengiriman ke desa wajib menggunakan armada bertangga hidrolik (*hydraulic liftgate*) karena balai desa tidak memiliki dermaga bongkar (*loading dock*).
* **Resting Time 2-4 Jam:** Wajib masa istirahat oli sebelum unit pendingin dicolok ke instalasi listrik desa saat commissioning BAST.

### 8.3 Konservasi Massa & Kekekalan Saldo Buku Besar Stok
Berdasarkan `06_Stock_and_Checkpoint_Chain.md`, sistem WMS mengunci rumus kekekalan stok mutlak:
$$\text{Saldo Akhir} = \text{Saldo Awal} + \sum (\text{INBOUND} + \text{CROSS\_DOCK\_IN} + \text{ADJUSTMENT}) - \sum (\text{OUTBOUND\_SHIP} + \text{CROSS\_DOCK\_OUT})$$
* **Kondisi Saldo:** $\text{qty\_on\_hand} \ge 0$, $\text{qty\_reserved} \ge 0$, $\text{qty\_in\_transit} \ge 0$ (Sistem menolak mutasi yang menyebabkan saldo negatif).
* **Siklus Three-Bucket:**
  $$\text{Total Fisik Terdaftar} = \text{qty\_on\_hand} + \text{qty\_reserved} + \text{qty\_in\_transit}$$
* **Ambang Batas Peringatan Sistem (SLA Alerts):**
  * Alert Susut Debulking Curah: $\text{Susut} > 1.00\%$ $\rightarrow$ Terbitkan Alert Severity `CRITICAL`.
  * Alert Gate Overdue: Waktu sekarang $> \text{expected\_return\_time}$ $\rightarrow$ Terbitkan Alert Satpam & Manajer Gudang.
  * Alert Selisih Inbound: $\text{received\_qty} \ne \text{ordered\_qty}$ $\rightarrow$ Terbitkan Alert Discrepancy PO.

---

## 9. Konvensi Penomoran Tanpa Tanda Hubung (Strict Non-Hyphen / Seamless Alphanumeric Standard)

Sesuai arahan operasional lapangan dan optimasi pemindaian barcode fisik (scanner Honeywell, Zebra, camera PDA), **seluruh nomor transaksi, nomor dokumen, kode barang (SKU), dan kode referensi TIDAK BOLEH menggunakan tanda hubung/strip (`-`)**. Seluruh karakter digabungkan secara padat (*seamless alphanumeric concatenation*).

### 9.1 Alasan Teknis & Operasional
1. **Kecepatan & Akurasi Barcode Scanner:** Karakter simbol khusus seperti tanda `-` sering menimbulkan *misread* atau karakter substitusi pada konfigurasi keyboard wedge scanner industri (Code 128 / Code 39 / QR Code).
2. **Efisiensi Input Manual Lapangan:** Petugas satpam dan checker di HP/PDA tidak perlu beralih ke layout keyboard simbol untuk mengetikkan tanda strip `-`.
3. **Standarisasi Enterprise:** Menghilangkan disparitas format antar modul sistem.

### 9.2 Matriks Standardisasi Format Penomoran (Before vs After)

| Kategori | Format Lama (Dengan Strip) | Format Baku Baru (Tanpa Strip / Digabung) | Contoh Format Baru |
|---|---|---|---|
| **Kode Barang / SKU** | `BULK-SUGAR-1T` | `BULKSUGAR1T` | `BULKSUGAR1T` |
| **Kode Barang / SKU** | `ELEC-TV-43` | `ELECTV43` | `ELECTV43` |
| **Kode Barang / SKU** | `KDMP-CHILLER-300L` | `KDMPCHILLER300L` | `KDMPCHILLER300L` |
| **Kode Barang / SKU** | `SUGAR-SACK-25KG` | `SUGARSACK25KG` | `SUGARSACK25KG` |
| **Purchase Order (PO)** | `PO-XXXXXXXX` / `PO-2026-09-0001` | `POXXXXXXXX` / `POYYYYMMDDXXXX` | `PO2026090001` |
| **Outbound Order (DO)** | `ORD-XXXXXXXX` | `ORDXXXXXXXX` | `ORD2026090001` |
| **Surat Jalan (SJ)** | `SJ-XXXXXXXX` | `SJXXXXXXXX` | `SJ2026090001` |
| **Nomor Resi (RESI)** | `RESI-XXXXXXXX` | `RESIXXXXXXXX` | `RESI2026090001` |
| **Proof of Delivery (POD)** | `POD-XXXXXXXX` | `PODXXXXXXXX` | `POD2026090001` |
| **Gate Pass Armada Pool** | `GATE-OUT-XXXXXXXX` | `GATEOUTXXXXXXXX` | `GATEOUT2026090001` |
| **Log Keluar Truk Vendor** | `VEND-OUT-XXXXXXXX` | `VENDOUTXXXXXXXX` | `VENDOUT2026090001` |
| **Manifest Cross-Dock** | `MNF-XXXXXXXX` | `MNFXXXXXXXX` | `MNF2026090001` |
| **Cross-Document Titipan** | `XDOC-XXXXXXXX` | `XDOCXXXXXXXX` | `XDOC2026090001` |
| **Perintah Debulking** | `DEBULK-XXXXXXXX` | `DEBULKXXXXXXXX` | `DEBULK2026090001` |
| **Tiket Jembatan Timbang** | `WB-XXXXXXXX` | `WBXXXXXXXX` | `WB2026090001` |
| **Stock Opname** | `OPNAME-XXXXXX` | `OPNAMEXXXXXX` | `OPNAME20260901` |
| **Faktur / Invoice** | `INV-XXXXXXXX` | `INVXXXXXXXX` | `INV2026090001` |
| **Surat Perjalanan TMS** | `TRIP-2026-09-0001` | `TRIPXXXXXXXX` | `TRIP2026090001` |
| **Serial Number Mesin** | `SN-998811` | `SN998811` | `SN998811` |
| **Tag Aset KDMP** | `KDMP-BALI-DPS-0012` | `KDMPBALIDPS0012` | `KDMPBALIDPS0012` |

### 9.3 Rencana Implementasi Teknis
1. **Generator Dokumen:** Perbarui fungsi `generateDocumentNumber(prefix, length)` pada `backend/src/utils/waybill.ts` dari template `${prefix}-${code}` menjadi `${prefix}${code}`.
2. **Master Data & Seeder:** Perbarui `database/seed_v2.sql` dan `backend/src/pg-schema.ts` untuk seluruh SKU barang default.
3. **Frontend Validation & Display:** Hilangkan placeholder bertanda hubung di seluruh form dan pastikan pencarian/filter di antarmuka mendukung format seamless alphanumeric.
4. **Automated Test Updates:** Perbarui assertion regex pengujian Vitest (misal: `/^PO[0-9A-Z]+/`) agar tetap 100% lulus.


