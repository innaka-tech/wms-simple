# Changelog

Semua perubahan penting pada proyek **WMS Simple Enterprise** didokumentasikan dalam berkas ini.
Format berkas mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan mematuhi [Semantic Versioning](https://semver.org/lang/id/).

---

## [5.4.1] - 2026-09-19

### Fixed
- **Penguncian Otomatis Qty Diterima Fisik pada e-POD (`/outbound/pod`):**
  - Mengunci input `deliveredQtyInput` secara *read-only* dengan nilai bawaan sesuai total order Surat Jalan (`orderTotalQty`) untuk mencegah *free entry* dan salah ketik saat serah terima kargo normal.
  - Membuka hak edit kolom kuantitas secara kondisional hanya bila petugas/driver mencentang opsi *"Ada Selisih Fisik / Kerusakan Barang"*.
  - Mewajibkan pengisian catatan selisih (`discrepancyNotes`) bila opsi selisih diaktifkan sebelum BAST digital dapat dikirim.
  - Memproteksi formulir serah terima (foto, nama penerima, TTD, submit BAST) dengan status `disabled` apabila dokumen Surat Jalan / nomor order belum dimuat (`!matchedOrder`).
- **Penyambungan Rantai Alur Operasional End-to-End (Outbound → Gate Pass → e-POD → Billing):**
  - **Daftar Kargo Siap POD (`/outbound/pod`):** Menambahkan panel *quick-pick* pesanan aktif dalam pengiriman (`SHIPPED`) sehingga pengemudi/petugas cukup 1-klik untuk memuat formulir e-POD tanpa perlu mengetik manual nomor pesanan.
  - **Shortcut Pasca Verifikasi POD ke Billing (`/outbound/pod`):** Menyediakan tombol tindakan langsung `[ 📄 Lanjutkan ke Menu Billing & Buat Faktur ➔ ]` setelah BAST digital di-ACC.
  - **Auto-Highlight & Pre-Select Faktur (`/billing`):** Menangkap parameter `?order=...` untuk langsung menyorot kartu order yang baru diverifikasi dan mengisi estimasi nominal tagihan secara otomatis.
  - **Shortcut Antara Outbound & Gate Pass (`/outbound`):** Menyediakan tautan cepat `[ 🚚 Pos Satpam (Gate Pass) ➔ ]` pada order yang telah menerbitkan Surat Jalan, dan `[ ✍️ Serah Terima (e-POD) ➔ ]` saat kargo sedang di jalan (`SHIPPED`).
  - **Tautan Cepat Pasca Gate Out (`/gate-pass`):** Menambahkan tombol langsung `[ Buka e-POD ➔ ]` pada banner keberangkatan armada pool dan truk vendor.
  - **Aset Ikon:** Menambahkan ikon `file-text` pada `frontend/components/AppIcon.vue` untuk standarisasi representasi visual dokumen faktur/billing.

## [5.4.0] - 2026-09-18

### Added
- **Enterprise Visual Rack Digital Twin & Spatial Layout (`/master/racks`):**
  - Halaman terdedikasi `frontend/pages/master/racks.vue` untuk pemantauan denah spasial gudang, kapasitas tonase, dan tingkat okupansi rak secara real-time.
  - Komponen visual interaktif `WarehouseRackVisualizer.vue` dengan pemisahan Zona Fisik (Zona A Dry Pallet Racks bertingkat, Zona B Heavy Staging 5 Ton, Zona C Cold Storage Chiller -2°C s/d +4°C, Zona D Fast-Moving Transit).
  - Tampilan visual multi-tier rak (Level A/B/C), indikator ketersediaan slot (🟢 Kosong, 🟡 Terisi Sebagian, 🔴 Penuh), dan label SKU tersimpan.
  - Fitur Batch Generator Rak Massal (`POST /api/warehouses/:id/locations/batch`) untuk mempercepat pembuatan lorong, bay, dan tier tanpa input manual berulang.
  - Pendaftaran menu `Denah & Tata Letak Rak` di bawah Master Data pada `frontend/stores/auth.ts`.
  - Tautan cepat "🗺️ Denah Spasial Rak" di setiap kartu gudang pada `master/warehouses.vue`.
- **Smart Putaway Suggestion Engine (`/inbound/putaway`):**
  - Algoritma rekomendasi cerdas penempatan kargo berbasis karakteristik fisik barang (KDMP dingin ke Zona C Chiller, kargo curah/1 ton ke Zona B Heavy Floor Staging, sembako/karton ke Zona A Dry Pallet Rack).
  - Modal Interactive Visual Bin Picker dengan preview slot dan satu tombol "Gunakan Rekomendasi".

### Fixed
- **Resolusi Data Item Inbound & Putaway:**
  - Menambahkan subquery agregat JSON `items` pada `GET /api/inbound` di `backend/src/routes/inbound.ts` sehingga daftar SKU dan kuantitas barang fisik diterima dock selalu dimuat lengkap ke antarmuka Putaway.

## [5.3.0] - 2026-09-18

### Added
- **Menu & Halaman Putaway Mandiri (`/inbound/putaway`):**
  - Mendaftarkan submenu "Putaway (Penempatan Rak)" di bawah modul Inbound pada `frontend/stores/auth.ts`.
  - Halaman terdedikasi `frontend/pages/inbound/putaway.vue` dengan tab status (Menunggu Putaway vs Selesai), pemilahan alokasi Cross-Docking vs Storage Rak Gudang, pemilihan lokasi bin/rak, dan konfirmasi dialog SweetAlert2.
  - Shortcut akses cepat Putaway pada dashboard utama (`frontend/pages/index.vue`).
- **Driver Cetak Lembar Kerja & Dokumen Lapangan:**
  - Driver printer thermal ESC/POS untuk Lembar Kerja Stock Opname (`printOpnameWorksheet`), Surat Tugas & Manifest TMS Trip (`printTmsTripManifest`), dan Resi Standar (`printGenericReceipt`) di `frontend/composables/useThermalPrinter.ts`.
  - Tombol cetak browser format A4 / HVS (`window.print()`) dengan stylesheet `@media print` rapi untuk lembar hitung fisik lorong rak opname di `frontend/pages/stock/opname.vue`.
- **Soft-Deactivate & Hapus Master Data:**
  - Endpoint `DELETE /api/warehouses/:id` dan `DELETE /api/products/:id` dengan audit integritas relasi: jika entitas memiliki riwayat ledger/transaksi, sistem melakukan *soft-deactivation* (`is_active = false`), dan menolak jika masih ada stok aktif.
  - Aksi "Hapus / Nonaktifkan" dengan dialog SweetAlert2 di `master/warehouses.vue` dan `master/products.vue`.
- **Penomoran Otomatis Master Customer:**
  - Auto-generate kode customer terurut (`CUST001`, `CUST002`, dst.) dan tombol regenerasi di `master/customers.vue`.
- **Fleksibilitas e-POD & Catatan Selisih Fisik:**
  - Pilihan metode serah terima e-POD: Tanda Tangan Kanvas Digital vs Diwakilkan / Pos Satpam / Stempel Toko di `outbound/pod.vue`.
  - Toggle pencatatan kerusakan/selisih barang fisik dan integrasi catatan ke audit checkpoint.

### Fixed
- **Double-Putaway Inbound Guard:**
  - Proteksi backend di `POST /api/inbound/:id/putaway` untuk menolak status `PUTAWAY_COMPLETED` (409 Conflict) dan non-`RECEIVED` (400), mencegah mutasi saldo fisik berulang.
  - Sembunyikan tombol putaway di halaman receiving dan gantikan dengan badge hijau permanen serta tautan ke halaman Putaway.
- **Unfreezing Outbound Picking Confirmation:**
  - Memperbaiki penanganan `outboundStore.errorMessage` pada `syncFeedback()` di `outbound/index.vue`, memunculkan alert merah interaktif di dalam modal saat stok di rak tidak mencukupi.
  - Menampilkan stok on-hand gudang secara real-time pada modal konfirmasi picking.
- **Normalisasi Prop ThermalPrintButton:**
  - Mendukung prop ganda `:receipt-data` dan `:data` di `ThermalPrintButton.vue` dengan auto-routing template agar cetak di Stock Opname dan TMS Trip tidak gagal diam-diam.
- **Sequence Penomoran Sesi Stock Opname:**
  - Standardisasi format penomoran sesi opname berbasis kode gudang dan tanggal berurut (`OPNAME{WH_CODE}{YYYYMMDD}{SEQ}`) di `backend/src/routes/stock.ts`.
- **Standardisasi Istilah Role (RBAC):**
  - Menyeragamkan label "Peran" menjadi "Role (RBAC)" di formulir, subtitle, dan middleware otentikasi.
- **Validasi Nilai Faktur & Pelunasan Billing:**
  - Mewajibkan nominal faktur $> 0$ sebelum diterbitkan, menyediakan tombol estimasi tagihan otomatis berbasis kargo/tarif standar di `billing/index.vue`.
  - Menolak penerimaan pembayaran jika nilai faktur bernilai Rp 0 di backend `billing.ts`.
- **Validasi Kuantitas Diterima e-POD:**
  - Membatasi kuantitas fisik e-POD (`delivered_qty`) dengan batas atas `:max="orderTotalQty"` dan validasi backend agar tidak melampaui jumlah pesanan.

---

## [5.2.0] - 2026-09-15

### Added
- **Konsol Master Referensi Sistem Terpadu (Fase 4):**
  - CRUD lengkap untuk Tipe Kargo (`master_cargo_types`), Tipe Kemasan (`master_packaging_types`), Satuan UOM (`master_uom`), Tipe Armada (`master_vehicle_types`), Tipe Dokumen (`master_document_types`), dan Template Cetak (`master_print_templates`).
  - Modul Aturan Konversi UOM (`master_uom_conversions`): Dukungan pendefinisian rasio pengali satuan antar-UOM dengan rumus operasional (misal: 1 TON = 1.000 KG) untuk perhitungan otomatis debulking dan stok gudang.
  - Halaman terpadu `/master/references` dengan tab navigasi, Add/Edit modals, dan validasi kode *non-hyphen*.
  - Konfirmasi hapus dan notifikasi feedback modern terintegrasi dengan composable SweetAlert2 (`useSwal`).
- **Pusat Notifikasi & Operational Alert Center (Fase 4):**
  - Backend alert center: `POST /api/alerts` (pembuatan alert baru), `POST /api/alerts/scan-overdue` (deteksi otomatis armada terlambat kembali), `POST /api/alerts/resolve-all` (batch resolution), dan `GET /api/alerts/summary` (ringkasan status alert).
  - Popover Alert Center di header antarmuka (`AppHeader.vue`): Filter per tingkat keparahan (Semua, Kritis, Peringatan), tombol pemindaian anomali proaktif, dan aksi resolusi cepat.
- **Redesign Antarmuka & Standardisasi Desain:**
  - Dark theme sidebar (`bg-slate-900`), simplifikasi header breadcrumb, dan penggantian seluruh alert native browser dengan SweetAlert2.
- **Pengujian Integrasi Vitest Baru:**
  - `alerts.routes.test.ts` (6/6 tests passed).
  - Perluasan `master.routes.test.ts` (13/13 tests passed).
  - Total pengujian: 28 test suites, 191 tests passing (100% pass rate).

---

## [5.1.0] - 2026-09-15

### Added
- **Pengujian Integrasi Karantina & Stock Opname (Fase 3):**
  - Suite pengujian integrasi Vitest baru `quarantine.routes.test.ts` (7/7 tests): pengujian alur hold karantina, nomor tiket non-hyphen `QRN...`, disposisi restock dan pemusnahan scrap, serta rantai checkpoint.
  - Suite pengujian integrasi Vitest baru `stock-opname.routes.test.ts` (8/8 tests): pengujian inisialisasi sesi, snapshot stok instan per rak, pencatatan hitung fisik, kalkulasi otomatis selisih varians, dan rekonsiliasi buku besar ganda.
- **Integrasi Reverse Logistics POD Ditolak $\rightarrow$ Karantina:**
  - Penambahan enum `rejection_disposition: 'RESTOCK' | 'QUARANTINE'` pada endpoint verifikasi POD (`/outbound/:id/verify-pod`).
  - Penanganan mutasi stok `POD_REJECT_QUARANTINE` untuk mengosongkan saldo in-transit barang rusak dan menerbitkan tiket karantina `QRN...` secara otomatis.
  - Penambahan radio selector di halaman UI `/outbound/pod` untuk memilih alokasi fisik barang saat admin menolak BAST/POD.

### Fixed
- **Pencegahan Kebocoran Transaksi Mutasi Stok (`txClient`):**
  - Memastikan seluruh pemanggilan `adjustStock` pada alur Karantina, Inspeksi QC, dan Rekonsiliasi Opname meneruskan `txClient: client` bersama untuk menjamin kepatuhan ACID dan mencegah lock contention di PostgreSQL.
- **TypeScript Strict Compliance:**
  - Memperbaiki penanganan tipe `id as string` pada pencatatan checkpoint di rute karantina dan opname (`npx tsc --noEmit` bersih).

---

## [5.0.0] - 2026-09-14

### Added
- **Fase 5: Penutupan Penuh Operasional & Fisik (Jembatan Timbang Truk, Packing Koli Fisik & KDMP, Alokasi Rak Picking, Auto-Konversi Debulking):**
  - **Modul Jembatan Timbang Truk / Weighbridge Station Console (Gap Tabel 19):**
    - Backend API di `backend/src/routes/weighbridge.ts`: `GET /api/weighbridge` (filter gudang & status OPEN/COMPLETED), `POST /api/weighbridge` (Timbang Masuk Gross dengan nomor tiket non-hyphen `WBXXXXXXXX`), `PUT /api/weighbridge/:id/second-weight` (Timbang Keluar Tare & auto-kalkulasi Net Cargo Weight).
    - Halaman antarmuka **Konsol Jembatan Timbang** (`frontend/pages/weighbridge/index.vue`): Simulator sensor timbangan digital RS-232, tombol Zero/Tare/Gross, tab tiket aktif vs riwayat selesai, modal pencatatan timbang masuk & keluar, serta cetak struk tiket thermal (`printWeighbridgeReceipt` di `useThermalPrinter.ts`).
    - Pinia store baru `frontend/stores/weighbridge.ts` dan integrasi menu navigasi di `frontend/stores/auth.ts`.
    - Pengujian integrasi Vitest (`backend/tests/integration/weighbridge.routes.test.ts`) 100% lulus (5/5 tests).
  - **Modul Packing Interaktif & Pencatatan Koli Fisik (Gap Tabel 28 & Pelacakan Unit KDMP):**
    - Backend API `POST /api/outbound/:id/pack` diperluas untuk menyimpan `packaging_type_id` ke tabel `packages`.
    - Modal interaktif **Packing & Koli Fisik** di `frontend/pages/outbound/index.vue`: input multi-koli/box dengan kode non-hyphen (`BOX...`), pilihan tipe kemasan dari `master_packaging_types`, berat riil (KG), dimensi (PxLxT cm), serta pengikatan Serial Number (`SN...`) dan Tag Aset Balai Desa (`KDMP...`) untuk kargo chiller pendingin.
    - Panel expandable rincian item order & daftar koli fisik pada daftar delivery order.
  - **Saran Lokasi Rak Saat Outbound Picking (Gap Tabel 9):**
    - Modal picking interaktif di `frontend/pages/outbound/index.vue` menampilkan daftar lokasi rak gudang (`warehouse_locations`) untuk alokasi pengambilan barang tanpa *blind warehouse*.
  - **Auto-Kalkulasi Rasio Konversi UOM pada Debulking (Gap Tabel 4):**
    - Menghubungkan tabel `master_uom_conversions` ke formulir Debulking (`frontend/pages/debulking/index.vue`).
    - Fitur 1-klik "Terapkan Rasio UOM" untuk mengonversi kuantitas parent bulky menjadi kuantitas output kemasan ritel secara presisi.
- **Rangkaian Pengujian Kualitas:**
  - Vitest: 24 test suites, 155/155 tests passing (0 failures).
  - Nuxt 3 Client & Server Build: 1.76 MB clean bundle tanpa error.

## [4.8.0] - 2026-09-14

### Added
- **Standardisasi Penomoran Tanpa Tanda Hubung (Strict Non-Hyphen Concatenation):**
  - Seluruh generator dokumen (`generateDocumentNumber` di `waybill.ts`) menghapus tanda strip `-` dan menghasilkan format alphanumeric padat: `POXXXXXXXX`, `SJXXXXXXXX`, `RESIXXXXXXXX`, `ORDXXXXXXXX`, `PODXXXXXXXX`, `GATEOUTXXXXXXXX`, `VENDOUTXXXXXXXX`, `INVXXXXXXXX`, `WBXXXXXXXX`, `DEBULKXXXXXXXX`, `MNFXXXXXXXX`, `XDOCXXXXXXXX`, `OPNAMEXXXXXX`, `TRIPXXXXXXXX`, `QRNXXXXXXXX`.
  - Seluruh SKU produk di database dan seeder distandarisasi tanpa tanda hubung: `BULKSUGAR1T`, `SUGARSACK25KG`, `KDMPCHILLER300L`, `ELECTV43`.
- **Fase 1: P0 Core Fixes (Gate-In Pos Satpam, POD Rejection Stock Reversal, Lokasi Rak):**
  - Antarmuka **Gate-In Armada Kembali** di `/gate-pass`: input odometer masuk, tingkat BBM, catatan kondisi fisik, dan kalkulasi jarak tempuh KM otomatis.
  - Pemulihan stok saat POD ditolak (`POD_REJECT_REVERSAL`): mengembalikan stok `in_transit` ke `on_hand` gudang asal dengan pencatatan buku besar ganda (*double-entry ledger*).
  - Integrasi lokasi rak gudang (`location_id`) pada Inbound Putaway `/inbound/receive`.
- **Fase 2: Modul TMS (Transportation Management System):**
  - Skema tabel PostgreSQL `trips` dan `trip_stops`.
  - Backend API TMS (`backend/src/routes/tms.ts`): rute konsolidasi order siap kirim (`available-orders`), pembuatan surat tugas jalan, keberangkatan armada (`dispatch`), dan serah terima per titik drop (`stops/:stopId/complete`).
  - **Overload Guard Proteksi ODOL**: Validasi real-time berat kargo ($\sum \text{kg}$) dan volume ($\sum \text{CBM}$) terhadap kapasitas maksimal tipe armada truk.
  - Halaman antarmuka **TMS Trip Dispatcher** (`frontend/pages/tms/trips.vue`) dengan visual overload gauge dan pelacakan multi-drop.
  - Rangkaian pengujian integrasi TMS (`backend/tests/integration/tms.routes.test.ts`) 100% lulus.
- **Fase 3: Karantina, Retur & Stock Opname:**
  - Skema tabel PostgreSQL `quarantine_records`, `stock_opname_sessions`, dan `stock_opname_items`.
  - Backend API rute Karantina & QC disposisi (`RETURN_TO_STOCK`, `RETURN_TO_VENDOR`, `DISPOSE_SCRAP`) serta Stock Opname (snapshot saldo sistem, hitung fisik, rekonsiliasi buku besar).
  - Halaman antarmuka **Karantina & Retur Barang (QC)** (`frontend/pages/stock/quarantine.vue`) dan **Stock Opname Cycle Count** (`frontend/pages/stock/opname.vue`).
- **Fase 4: Master Referensi Terpadu & Pusat Peringatan Operasional (Alert Center):**
  - Halaman antarmuka **Master Referensi Sistem** (`frontend/pages/master/references.vue`): Tipe Kargo, Tipe Kemasan, Satuan UOM & Konversi, Tipe Armada, dan Tipe Dokumen lengkap dengan endpoint CRUD di `backend/src/routes/master.ts`.
  - Komponen **Pusat Peringatan (Alert Center)** pada `AppHeader.vue`: tombol lonceng notifikasi dengan pulsing badge alert aktif, popover daftar peringatan real-time, dan tombol penyelesaian anomali langsung.
  - Integrasi menu navigasi baru di `frontend/stores/auth.ts`.



### Added
- **Thermal Printer Browser Fallback (`useThermalPrinter.ts` & `ThermalPrintButton.vue`):** Fallback cetak struk otomatis melalui dialog cetak browser (iframe terisolasi bergaya receipt 80mm monospaced) saat Web Bluetooth tidak terhubung atau perangkat desktop digunakan; menggantikan modal `alert()` dengan status visual non-blocking.
- **Active Warehouse Switcher (`AppHeader.vue`):** Dropdown pemilih gudang aktif dinamis pada header desktop dan mobile, terhubung ke `authStore.setWarehouse()` dan `masterStore.warehouses`.
- **Database Initializer & Seeder (`backend/scripts/migrate-and-seed.mjs`):** Script idempotent inisialisasi schema (36 tabel) dan seeder data master pada PostgreSQL host (`wms_simple_db` dan `wms_simple_test_db`).

### Fixed
- **Integrasi Gate-Out Pool Jalur A ke Outbound SHIPPED (`gatePass.ts` & `pages/gate-pass/index.vue`):** Pemilihan order/manifest pada keberangkatan armada pool kini mengirimkan `reference_type` (`OUTBOUND_ORDER` / `CROSS_DOCK_MANIFEST`) dan `reference_id`, sehingga order otomatis beralih ke status `SHIPPED` di backend dan dapat dilanjutkan ke alur POD tanpa error 409 Conflict. Data statis nopol/sopir/odometer di pos satpam dibersihkan.
- **POD Dynamic Qty & Display (`pages/outbound/pod.vue`):** Menghapus hardcode `delivered_qty: 1`. Jumlah barang terkirim kini reaktif sesuai item order riil dan dapat dikonfirmasi oleh petugas. Kotak SOP Cold Chain KDMP kini tampil dinamis berdasarkan kebutuhan kontrol suhu produk (`requires_temperature_control`).
- **Pembersihan Default Hardcoded UUID:**
  - `backend/src/routes/stock.ts`: Dummy reference ID `00000000-0000-0000-0000-000000000001` pada stock adjustment diganti dengan `crypto.randomUUID()`.
  - `frontend/pages/inbound/receive.vue`: Menghapus fallback UUID gudang statis (`a0000000-0000-0000-0000-000000000001`).
- **Sinkronisasi Port API Dev Lokal:** Menyesuaikan port fallback frontend dari port 8000 ke port 3000 pada `nuxt.config.ts` dan `useWmsApi.ts`.
- **Environment & PostgreSQL Test Harness:** Menambahkan `import 'dotenv/config'` di `backend/src/db.ts` dan sinkronisasi kredensial database lokal, menyelesaikan 100% rangkaian pengujian otomatis (22 test suites, 144 passed).

## [4.6.0] - 2026-09-11

### Fixed (State Machine Outbound + Model Stok Three-Bucket)

- **State machine ketat di seluruh rantai outbound** (menutup lubang: pick gagal tetapi pack → SJ → POD → invoice → LUNAS tetap bisa lolos):
  - `pick` hanya dari `CREATED`; `product_id` item kini diresolusi dari DB (payload client tidak dipercaya) + item wajib milik order tsb.
  - `pack` hanya dari `PICKED` + semua item wajib sudah ter-pick (409 jika ada item picked_qty = 0).
  - `issue-waybill` hanya sebelum terkirim (sudah ada, dipertahankan).
  - `POD` hanya dari `SHIPPED` (truk sudah keluar gerbang) — jalur liar POD tanpa gate-out kini ditolak 409.
  - `verify-pod` hanya dari `DELIVERED`.
- **Model stok three-bucket sesuai docs/09 v3.2.0 (menghapus double deduction):**
  - `OUTBOUND_PICK`: `on_hand` turun, `reserved` naik (barang keluar rak, menunggu keberangkatan).
  - `OUTBOUND_SHIP`: `reserved` pindah ke `in_transit` saat barang berangkat (DELIVERED) — on_hand tidak dipotong dua kali.
  - `POD_VERIFIED_SHIP` (baru): `in_transit` dikosongkan saat POD terverifikasi admin.
  - Pack kini mengisi `packed_qty` (dari picked) dan POD mengisi `delivered_qty` — kolom yang semula selalu 0 kini terpelihara; fallback `picked_qty` untuk order lama.
- Recon ledger: reserved orphan 2 unit (sisa era double deduction) dinormalisasi dengan entry `ADJUSTMENT` ber-catat eksplisit.

### Changed

- Test: mock integration/e2e outbound disesuaikan urutan query baru; skenario guard "issue-waybill setelah terkirim" kini lewat jalur legal penuh (SJ → gate-out → POD → verify).

## [4.5.0] - 2026-09-11

### Added (Sinkronisasi Flow docs/09 v3.2.0 dengan Aplikasi)

- **Repacking On-Demand (Prinsip 2):** work order debulking kini dapat tertaut ke outbound order.
  - Migrasi `20260911_add_outbound_order_id_to_stock_conversions.sql` (kolom `outbound_order_id` + FK + index).
  - `POST /api/debulking` menerima `outbound_order_id` (opsional) dengan validasi: order harus ada, belum DELIVERED/POD_VERIFIED/CANCELLED, dan belum punya work order repacking lain (409).
  - `GET /api/debulking` mendukung filter `?outbound_order_id=` dan mengembalikan `outbound_order_number`.
  - Halaman `/debulking` dirombak: pilih Delivery Order terbuka (CREATED/PICKED/PACKED), Parent/Child SKU diambil dari master data (tidak ada lagi UUID hardcode demo), berat @ unit mengikuti master, preselect child SKU via relasi `parent_bulky_product_id`.
- **SJ Universal untuk Cross-Dock (Prinsip 3):** tombol **Terbitkan SJ** di daftar manifest cross-dock (status LOADED) memanggil `POST /outbound/:id/issue-waybill` dengan `reference_type=CROSS_DOCK_MANIFEST`; daftar manifest menampilkan tanda SJ sudah terbit (join `waybills`, anti-duplikat).
- **Kartu stok DALAM PERJALANAN (FASE 3 sequence):** saat POD disubmit (barang berangkat → DELIVERED), ledger mencatat mutasi `OUTBOUND_SHIP` per item (qty packed) — tipe ledger yang sebelumnya dideklarasikan tapi tak pernah dipakai kini aktif.

### Changed

- **Weighbridge dinonaktifkan dari alur utama:** endpoint `/api/weighbridge` diberi status deprecated (read-only list + pencatatan manual kargo curah/bulky via API saja, tanpa UI) sesuai docs/09 v3.2.0 yang menghapus tahap timbang truk.
- `docs/00_Index_and_Roadmap.md`: deskripsi doc 09 diperbarui ke v3.2.0 (POD bukan akhir transaksi, weighbridge nonaktif).
- `docs/02_Bulky_Curah_and_Debulking.md`: catatan versi 3.2.0 tentang status weighbridge dan kewajiban link debulking-order.
- Perbaikan type error `fleet.ts:433` (Hono `ContentfulStatusCode`) — `err.status as any`.

## [4.4.0] - 2026-09-10

### Added (Verifikasi POD di UI — ACC/Tolak sebelum Penagihan)

- **Panel Verifikasi Admin di `/outbound/pod`:** setelah cari nomor order, panel BAST Digital menampilkan bukti foto, tanda tangan penerima, consignee, qty, status verifikasi, dan nama verifikator. Admin dapat **ACC POD (POD_VERIFIED)** atau **Tolak POD** (alasan wajib, maks 500 karakter → order CANCELLED, `billing_ready` tetap false).
- **Store `verifyPod`:** action baru di `stores/outbound.ts` memanggil `POST /api/outbound/:id/verify-pod` (Zod-validated).
- Ini menutup rantai terakhir yang sebelumnya hanya bisa lewat API: DELIVERED → **POD_VERIFIED** → billing_ready=true → INVOICE → LUNAS, semuanya kini dapat dijalankan dari aplikasi.

### Fixed

- **`pickOrder` mengirim POST tanpa body:** endpoint `/outbound/:id/pick` butuh `items` (id, product_id, picked_qty) + `actor_name` — sekarang store memuat detail order lalu memetakan items otomatis (fallback `picked_qty = ordered_qty`). Sebelumnya tombol Proses Picking selalu gagal "items is not iterable".
- **`packOrder` tanpa `actor_name`:** kini selalu mengirim nama petugas dari sesi (audit trail wajib).

### Verified (e2e rantai nyata)

- `ORD-NSAYFV79`: ORDER_CREATED → PICKING_COMPLETED → PACKING_COMPLETED → WAYBILL_ISSUED (SJ-BRK0S1S0 + RESI-DA07UCNJ) → DELIVERED → **POD_VERIFIED** (ACC via API) → **INVOICE_ISSUED** (INV-K6D7BW85, currency **IDR**), `chain_valid: true`, 7 checkpoint.
- Jalur tolak teruji: REJECTED dengan alasan → order CANCELLED, `billing_ready=false`.

## [4.3.0] - 2026-09-10

### Added (Halaman Cross-Dock & Cross-Document)

- **`/crossdock` — Transfer Antar-Gudang (Hub → Spoke):** daftar manifest (AppDataTable: pencarian realtime, pagination, kartu mobile), form buat manifest (gudang asal/tujuan, shipper, armada pool / nopol vendor manual, multi-item), modal **Proses Muat** (qty per item → `CROSS_DOCK_OUT`, stok asal berkurang) dan **Terima di Tujuan** (qty per item → `CROSS_DOCK_IN`, stok tujuan bertambah). Semua step wajib `actor_name`.
- **`/crossdoc` — Penerbitan Cross-Document:** daftar dokumen swap/re-issue + form terbitkan dengan dropdown **tipe dokumen asal & baru** dari `master_document_types` (SJ Supplier → SJ Pengiriman, Master AWB → House AWB, dsb.), qty asal → qty diterbitkan ulang per item.
- **Store baru:** `stores/crossdock.ts` (fetchManifests, fetchManifestDetail, createManifest, loadManifest, receiveDest) dan `stores/crossdoc.ts` (fetchDocs, issueDoc).
- **Nav:** dua modul baru sebagai anak grup **Outbound (Barang Keluar)**, role-filter tetap aktif.

### Verified (e2e rantai nyata via API yang dipakai UI)

- `MNF-50063918`: MANIFEST_CREATED → MANIFEST_LOADED → RECEIVED_AT_DEST, `chain_valid: true`, stok chiller JKT 25 → 23, DPS 0 → 2 (ledger double-entry `CROSS_DOCK_OUT` / `CROSS_DOCK_IN`).
- Cross-doc `XDOC-50167044` terbit ISSUED dengan tipe dokumen eksplisit (kolom `source_document_type_id` NOT NULL di DB — kini tersedia di form).

## [4.2.0] - 2026-09-10

### Added (Picking & Packing UI, Buat DO, POD Bukti Nyata)

- **Buat Delivery Order dari UI `/outbound`:** form lengkap (shipper, gudang asal, consignee, alamat, multi-item SKU + qty) yang memanggil `POST /api/outbound` — sebelumnya order hanya bisa dibuat lewat API/curl.
- **Picking & Packing dari UI:** tombol `Proses Picking` (CREATED → PICKED) dan `Proses Packing` (PICKED → PACKED) — dua checkpoint rantai (`ORDER_PICKED`, `ORDER_PACKED`) kini tercapai dari aplikasi, bukan cuma dari test.
- **POD dengan bukti nyata:** halaman `/outbound/pod` kini mengambil foto via kamera/file (`capture="environment"`), kompres ke JPEG ≤900px base64, dan mengirim `pod_photo_url` sungguhan — bukan lagi string mock `uploaded://pod-photo-capture`. Nama penerima wajib diisi.
- **Store actions baru:** `createOrder`, `pickOrder`, `packOrder` di `stores/outbound.ts`.

### Fixed

- **`/billing` tak pernah menampilkan order siap tagih:** filter membandingkan `Number(o.billing_ready) === 1` padahal kolom PostgreSQL bertipe `boolean` → diganti `o.billing_ready === true`.
- **Fallback stok palsu di `/stock` dihapus:** daftar contoh (Gula Pasir, TV, dll.) yang muncul saat API gagal/kosong diganti empty state jujur — sesuai prinsip anti-halusinasi (AGENTS.md / OWASP AI LLM09).

### Changed

- Seluruh copy halaman memakai terminologi warehouse standar (Receiving, Putaway, Picking/Packing, Gate Out/In, Audit Trail, Invoice, Payment Received, dst.) — lanjutan commit `ead3ce6`.
- Sidebar dua tingkat dengan label WMS baku + tombol tampilkan kembali sidebar saat collapsed (`0468b03`).

### Ops

- `backend/vitest.config.ts`: e2e dijalankan serial satu proses (`fileParallelism: false`, `singleFork`) karena dua file e2e berbagi satu DB test fisik.

---

## [4.1.2] - 2026-09-08

### Added (Dev Login Bypass)

- **Bypass keyboard di halaman login:** tekan `D` 3x beruntun (interval < 1,5 detik) untuk masuk instan sebagai Super Admin — hanya aktif di mode development (`import.meta.dev`), tidak ikut ter-build ke produksi.
