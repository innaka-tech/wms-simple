# Changelog

Semua perubahan penting pada proyek **WMS Simple Enterprise** didokumentasikan dalam berkas ini.
Format berkas mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan mematuhi [Semantic Versioning](https://semver.org/lang/id/).

---

## [4.6.4] - 2026-09-12

### Fixed (Code Review & End-to-End Operational Lifecycle Hardening)

- **Audit Trail Alias Resolution (`backend/src/routes/checkpoints.ts`):**
  - Mengimplementasikan resolusi otomatis untuk pencarian timeline dokumen melalui nomor Surat Jalan (`SJ-`), nomor Resi (`RESI-`), nomor Faktur (`INV-`), maupun pencarian string metadata checkpoint.
  - Menghilangkan galat 404 saat pengguna menelusuri nomor resi atau faktur pada portal `/checkpoints`.
  - Menambahkan pengujian integrasi unit untuk resolusi alias waybill dan invoice.

- **Gate Pass Auto-Linking & Armada Distance Tracking (`backend/src/routes/fleet.ts`):**
  - Memperbaiki pencatatan `distance_travelled_km` pada `fleet_exit_logs` saat armada pool kembali (gate-in), yang sebelumnya bernilai NULL.
  - Memperbarui `last_odometer_km` kendaraan di tabel `vehicles` secara otomatis saat armada tiba kembali di pool (`status = 'AVAILABLE'`).
  - Menambahkan auto-resolusi `reference_type` dan `reference_id` dari tabel `waybills` pada rute `POST /api/fleet/departure` dan `POST /api/fleet/vendor-exit`, memastikan status order berpindah ke `SHIPPED` meskipun petugas gerbang hanya memasukkan nomor Surat Jalan/Resi.

- **Dangling Transaction Prevention (`backend/src/routes/debulking.ts`):**
  - Memindahkan pra-validasi `outbound_order_id` (keberadaan order, status terkunci, duplikasi work order) ke luar blok transaksi (`client.query('BEGIN')`), mencegah potensi *uncommitted transaction leak* pada koneksi pool.

- **Preservasi Boolean Native PostgreSQL (`backend/src/db.ts`):**
  - Menghapus konversi peninggalan SQLite `if (typeof p === 'boolean') return p ? 1 : 0` pada `normalizeParams` sehingga parameter bertipe boolean dikirimkan sebagai nilai asli (`true`/`false`) ke PostgreSQL.

- **Frontend UI State & Form Hardening:**
  - **Billing Portal (`frontend/pages/billing/index.vue`):** Menyaring daftar `readyToBill` agar order yang fakturnya sudah diterbitkan tidak lagi muncul ganda pada tabel "Order Siap Dibilling".
  - **POD Portal (`frontend/pages/outbound/pod.vue`):** Memperluas pencarian order agar dapat mengenali input berbasis `order_number`, `sj_number`, maupun `resi_number`.
  - **Gate Pass Portal (`frontend/pages/gate-pass/index.vue`):** Menambahkan `datalist` opsi dokumen keberangkatan dan mengotomatiskan penerusan nomor waybill pada form keberangkatan armada pool serta truk vendor.

## [4.6.3] - 2026-09-12

### Security (OWASP Top 10 Web, OWASP AI, & ISO/IEC 27001 Hardening)

- **A07 & ISO 27001 A.9.4.3 (Password Authenticator & Defense-in-Depth):**
  - Menghapus celah backdoor password hardcode (`password === 'password123' || password === 'admin123'`) pada `backend/src/routes/auth.ts`.
  - Mengimplementasikan verifikasi kata sandi kriptografis berbasis algoritma `scrypt` (Node.js `crypto.scrypt`) dengan garam (*salt*) acak dan perbandingan waktu-konstan (`crypto.timingSafeEqual`).
  - Menyediakan mekanisme migrasi otomatis: hash kata sandi lama/plaintext diperbarui ke format `scrypt` secara asinkron saat otentikasi pertama berhasil.
  - Menambahkan *in-memory rate limiter* untuk mencegah serangan *brute-force* pada endpoint `/api/auth/login` (maksimal 5 kali percobaan gagal per username per jendela 10 menit, dengan periode penguncian 15 menit).
  - Menambahkan audit log terstruktur bertanda `[SECURITY]` untuk setiap upaya login yang gagal.

- **A01 & ISO 27001 A.9.1 (Broken Access Control & Scoped RBAC):**
  - Memasang guard otorisasi peran pada rute mutasi yang sebelumnya terbuka:
    - `POST /api/billing/:orderId/invoice` dan `POST /api/billing/invoices/:invoiceId/payments` dibatasi untuk peran `SUPER_ADMIN`, `ADMIN_ADM`, dan `WH_MANAGER`.
    - `POST /api/master/cargo-types` dibatasi untuk peran `SUPER_ADMIN` dan `ADMIN_ADM`, dilengkapi validasi Zod `cargoTypeSchema`.
    - `POST /api/alerts/:id/resolve` dilindungi dengan `optionalAuth` dan pengecekan peran otoritas gudang/manajemen.
  - **Frontend RBAC Fallback:** Memperbaiki `frontend/stores/auth.ts` agar `canAccess`, `allowedNavParents`, dan `allowedBottomNavItems` mengembalikan `false` atau array kosong saat status belum terotentikasi (`!state.user`), meniadakan fallback default ke `SUPER_ADMIN`.
  - **Harden Login UI:** Membatasi fitur 1-click role switcher dan prefill kredensial pada `frontend/pages/login.vue` hanya saat mode pengembangan (`isDevBypassEnabled`).

- **A05 & ISO 27001 A.12.1.2 (Security Misconfiguration & Error Sanitization):**
  - Mensanitasi pesan error 500 internal server pada `backend/src/app.ts` di lingkungan produksi untuk mencegah kebocoran informasi skema DB dan *stack trace*.
  - Menambahkan peringatan keamanan eksplisit pada `backend/src/middlewares/auth.ts` jika `JWT_SECRET` belum diatur pada lingkungan produksi.
  - Menambahkan log keamanan untuk upaya akses yang ditolak (HTTP 401 dan 403).

- **Resiliensi Pengujian Lokal & CI/CD:**
  - Menambahkan pengecekan ketersediaan PostgreSQL pada `backend/tests/e2e/transaction-chain.e2e.test.ts` dan `backend/tests/e2e/inbound-crossdock-chain.e2e.test.ts` sehingga suite e2e DB nyata dilewati secara aman saat pengujian dijalankan di mesin lokal tanpa PostgreSQL, dan tetap berjalan 100% pada container CI/CD.

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
