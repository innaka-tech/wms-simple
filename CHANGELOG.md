# Changelog

Semua perubahan penting pada proyek **WMS Simple Enterprise** didokumentasikan dalam berkas ini.
Format berkas mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan mematuhi [Semantic Versioning](https://semver.org/lang/id/).

---

## [4.6.2] - 2026-09-12

### Fixed (CI/CD Quality Gate & Vitest Test Suite Hardening)

- **PostgreSQL Service Container di CI/CD (`.github/workflows/ci.yml` & `.gitlab-ci.yml`):**
  - Menambahkan service container `postgres:16-alpine` pada job `backend-test-and-lint`.
  - Menambahkan script `backend/scripts/init-test-db.js` untuk membuat database test `wms_simple_test_db` secara otomatis dan idempotent.
  - Memasang hook `pretest` dan `pretest:coverage` pada `backend/package.json`.
- **Penanganan Unhandled Rejection pada `backend/src/db.ts`:**
  - Mengubah inisialisasi skema menjadi lazy (`ensureSchema`) saat query atau connect pertama kali dipanggil, menghindari floating unhandled promise rejection saat modul dimuat.
- **Isolasi Health Check Test (`backend/tests/integration/health.test.ts`):**
  - Menambahkan mock `db.js` seperti halnya 15 integration test suite lainnya agar tidak bergantung pada koneksi database aktif saat menguji endpoint non-DB `/api/health`.
- **Migrasi Vitest 4 Pool Options (`backend/vitest.config.ts`):**
  - Memindahkan `poolOptions.forks` ke level atas `forks: { singleFork: true }` untuk menghilangkan peringatan deprecation Vitest 4.

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
