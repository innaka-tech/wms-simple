# Changelog

Semua perubahan penting pada proyek **WMS Simple Enterprise** didokumentasikan dalam berkas ini.
Format berkas mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan mematuhi [Semantic Versioning](https://semver.org/lang/id/).

---

## [3.5.0] - 2026-09-07

### Added

- **Modul Billing sampai LUNAS (backlog #3 dari ADR-11):**
  - Tabel `invoices` (`invoice_number` INV-XXXXXXXX unique, `outbound_order_id`, `amount` opsional, `status` ISSUED|PAID|VOID) + tabel `payments` (`amount_paid`, `method`, `paid_at`, `recorded_by_id/name`).
  - Kolom `payment_status` (UNPAID|PAID) di `outbound_orders` + migrasi idempotent.
  - `POST /api/billing/:orderId/invoice` — syarat mutlak `billing_ready = true` (POD terverifikasi), guard satu faktur aktif per order, checkpoint `INVOICE_ISSUED`.
  - `POST /api/billing/invoices/:invoiceId/payments` — catat pembayaran; **LUNAS** saat total ≥ nilai faktur (atau pembayaran pertama bila faktur tanpa nilai) → faktur `PAID` + order `payment_status = PAID`; checkpoint `PAYMENT_RECEIVED` (metadata `lunas`, `total_paid`). Guard: faktur PAID/VOID ditolak 409.
  - `GET /api/billing/invoices?status=` (daftar + `total_paid`) dan detail faktur (payments + rantai checkpoint).
  - Rantai audit transaksi kini utuh sampai akhir: `POD_VERIFIED → INVOICE_ISSUED → PAYMENT_RECEIVED (LUNAS)` pada entity order.

### Tests

- Integrasi billing: 10 test baru (invoice sukses/guard billing_ready/duplikat/404, payment LUNAS/parsial/PAID ditolak/404/amount invalid, list). Total 105/105 lulus (18 suite).

## [3.4.0] - 2026-09-07

### Added

- **Modul Vendor Exit — Jalur B Pos Satpam (backlog #2 dari ADR-11):**
  - Tabel `vendor_vehicle_exit_logs` (`log_number` VEND-OUT-XXXX, `vendor_name`, `plate_number` manual, `waybill_number` wajib, `destination_note`, `departure_security_officer`) — tanpa kolom odometer/BBM (khusus armada pool), tanpa gate-in (truk vendor tidak wajib kembali).
  - Endpoint `POST /api/fleet/vendor-exit` — wajib nama vendor + nopol + resi/SJ dibawa; validasi Zod; checkpoint audit `VENDOR_EXIT` (entity `VENDOR_EXIT_LOG`); order/manifest terkait otomatis `SHIPPED`/`IN_TRANSIT`.
  - Endpoint `GET /api/fleet/vendor-exits` — daftar log keluar vendor, filter `warehouse_id` & `vendor`.
  - Kolom `waybill_number` di `fleet_exit_logs` (jalur A pool kini juga bisa mencatat resi yang dibawa) + migrasi idempotent untuk DB lama.

### Tests

- Integrasi: vendor-exit sukses (201 + checkpoint + metadata), 400 tanpa waybill, 400 nama vendor pendek, 400 tanpa actor_name, GET list — 5 test baru. Total 95/95 lulus (17 suite).

## [3.3.0] - 2026-09-07

### Added

- **Modul Waybill (backlog #1 dari ADR-11):**
  - Tabel `waybills` (`sj_number` SJ-XXXXXXXX unique, `resi_number` RESI-XXXXXXXX unique, `reference_type`, `reference_id`, `issued_by_id/name`, `status` ISSUED|PRINTED|IN_TRANSIT|POD_VERIFIED|VOID).
  - Endpoint `POST /api/outbound/:id/issue-waybill` — penerbitan SJ + resi otomatis untuk SEMUA jenis pengiriman; validasi Zod, wajib `actor_name`, guard status (blokir DELIVERED/POD_VERIFIED/CANCELLED), guard satu waybill aktif per order (409), retry generate nomor unik (5x).
  - Kolom `billing_ready` di `outbound_orders` — otomatis `true` saat `POD_VERIFIED` (dasar modul penagihan, backlog #3).
  - Endpoint `GET /api/waybills?status=` + detail waybill dengan rantai checkpoint.
  - Checkpoint audit baru `WAYBILL_ISSUED` (tertaut `prev_checkpoint_id` otomatis, metadata SJ/Resi).
- Generator nomor `backend/src/utils/waybill.ts` (alfabet tanpa I/O agar mudah dibacakan).

### Tests

- Unit: format + keunikan generator nomor (5.000 iterasi) — 5 test baru.
- Integrasi: issue-waybill sukses/404/409 duplikat/409 status terblokir/400 tanpa actor_name — 5 test baru. Total 90/90 lulus (17 suite).

## [3.2.4] - 2026-09-07

### Added

- **PNG sequence gabungan** `wms-sequence.png`: B.1 + B.2 + B.3 distack vertikal dalam satu gambar utuh (3758×6904, lebar seragam, pemisah antar bagian) — siap share satu file ke client. PNG per-fase tetap tersedia di `docs/diagrams/`.

## [3.2.3] - 2026-09-07

### Changed

- **Sequence dipecah 3 diagram per kelompok fase** (menggantikan 1 diagram raksasa 9 lifeline): B.1 Penerimaan, Penyimpanan & Penyiapan Kirim (Fase 1–2) · B.2 Loading & Keluar Gerbang (Fase 3–4) · B.3 Pengiriman, POD, Penagihan & Armada (Fase 5–6). Tiap diagram hanya memuat aktor yang terlibat — tanpa lifeline kosong, tanpa band fase membentang; proporsi kini landscape compact (B.2: 1578×825).
- Self-message `API->>API` (gumpalan teks saat wrap) diganti `Note over API` yang render bersih.
- Generator kini generik untuk N diagram (blok mermaid pertama = flowchart, sisanya = sequence B.n); PNG per diagram: `wms-sequence-1/2/3.png`.

## [3.2.2] - 2026-09-07

### Fixed

- **Sequence diagram dirapikan:** urutan partisipan disusun ulang berdasarkan kedekatan interaksi (Vendor, Driver, Satpam, Recipient, Admin, Staff, API, DB, Audit) — garis pesan tidak lagi menyilang banyak lifeline; label pesan dipadatkan (tanpa staircase wrap); kolom wrap dilebarkan (130→200px) + margin antar-elemen dirapatkan. Dimensi: 1851×3551 → 2344×2951 (rasio lebih seimbang).

## [3.2.1] - 2026-09-07

### Fixed

- **Generator PDF (v3):** tiap diagram kini dicetak sebagai **SATU halaman utuh** — kertas otomatis disesuaikan ukuran diagram (`@page` eksplisit dalam px, margin 0, buffer anti-luapan). Nol tile, nol potongan, nol kehilangan konten. Dokumen teks tetap A4 rapat.
- **Folder `workspace/`** di root repo: salinan siap-share (master PDF + 2 PNG diagram utuh).

### Changed

- Struktur PDF master: 4 halaman (2 teks + 1 halaman penuh flowchart + 1 halaman penuh sequence). Verifikasi piksel: 0 kontak tepi, 0 halaman kosong, 0 syntax error.

## [3.2.0] - 2026-09-07
### Changed
- **Tanpa Timbang Truk & Siklus Penagihan Penuh (Revisi Alur ADR-11, docs-first):**
  - `docs/09_Master_End_to_End_Flow_and_Sequence.md`: (1) Timbang truk keluar DIHAPUS — tidak ada jembatan timbang sama sekali di alur gudang (masuk maupun keluar); (2) Rantai transaksi diperpanjang sampai PENERIMAAN PEMBAYARAN: POD terverifikasi menjadi dasar penerbitan faktur (node 13 "Terbitkan Faktur/Tagihan"), pembayaran diterima menutup transaksi (node 14 "AKHIR TUNGGAL: Penerimaan Pembayaran Diterima — LUNAS"); sequence ditambah langkah terbit faktur + catat pembayaran (status `PAID`).
  - `docs/06_Outbound_and_POD_Flows.md`: Blok weighbridge dihapus dari flowchart & sequence; ditambah langkah `POST /api/billing/:orderId/invoice` (tabel `invoices` INV-XXXX) dan `POST /api/billing/:invoiceId/payments` (tabel `payments`); checkpoint audit baru `INVOICE_ISSUED` & `PAYMENT_RECEIVED`; status order `payment_status: UNPAID | PAID`.
  - `docs/ai/decisions.md`: ADR-11 direvisi v3.2.0 (tanpa timbangan; akhir transaksi = pembayaran diterima).

## [3.1.0] - 2026-09-07
### Changed
- **Repacking On-Demand & Tanpa Timbang Masuk (Revisi Alur ADR-11, docs-first):**
  - `docs/09_Master_End_to_End_Flow_and_Sequence.md`: (1) Timbang truk masuk DIHAPUS dari alur — jembatan timbang hanya saat keluar (gross − tare = muatan bersih); (2) Semua barang masuk wajib disimpan ke rak (putaway) dulu, satu-satunya pengecualian cross-dock langsung staging; (3) Repacking / pecah ulang kini ON-DEMAND — hanya dilakukan SETELAH ada permintaan kirim/alokasi, barang induk diambil dari rak, hasil langsung masuk penerbitan SJ (tidak ada stok repacking menganggur); (4) Hasil repacking (cross-document) masuk titik penerbitan SJ universal `SJ-XXXXXXXX / RESI-XXXXXXXX`.
  - `docs/06_Outbound_and_POD_Flows.md`: Flowchart & sequence outbound ditambah cabang repacking on-demand (`POST /api/stock/convert`) sebelum packing; timbang masuk dihilangkan dari spesifikasi.
  - `docs/02_Bulky_Curah_and_Debulking.md`: Work Order de-bulking diklarifikasi on-demand dari rak (bukan di dock penerimaan).
  - Master PDF & PNG diagram diregenerasi (12 halaman, 0 syntax error, nol kontak tepi; flowchart 1974x6008px, sequence 3798x7268px).

## [3.0.1] - 2026-09-07
### Fixed
- **Tile diagram PDF tidak lagi membelah node:** Peta celah (occupancy map) untuk menentukan titik potong tile sebelumnya dihitung SETELAH placeholder diagram disembunyikan (`display:none`), sehingga semua `getBoundingClientRect()` bernilai 0, peta celah kosong, dan cut jatuh di tengah kotak/pesan (kepotong parah). Kini occupancy dihitung selagi elemen masih ter-layout, lalu disembunyikan setelah selesai; ditambah guard keras: build GAGAL bila peta celah kosong.
- Verifikasi piksel 12 halaman: nol kontak tepi (T/B/L/R = 0), nol "syntax error", semua tile berisi. Master PDF + PNG diagram diregenerasi.

## [3.0.0] - 2026-09-07
### Changed
- **Universal Waybill & Dual Gate-Out (Penyesuaian Alur Operasional v3.0.0, docs-first):**
  - `docs/09_Master_End_to_End_Flow_and_Sequence.md`: Master flowchart & sequence ditulis ulang — (1) Timbang truk masuk & keluar (weighbridge gross/tare = muatan bersih) untuk muatan curah/berat; (2) Penerbitan Surat Jalan Baru + Nomor Resi otomatis di SATU titik untuk SEMUA jenis pengiriman keluar (stok gudang, repacking, cross-dock, KDMP) — bukan hanya cross-doc; blind shipping jadi varian; (3) Pos satpam keluar bercabang DUA jalur: armada pool (gate pass odometer/BBM) vs truk vendor (wajib catat nama vendor, nomor polisi, nomor resi/SJ dibawa); (4) Truk vendor tidak wajib kembali; (5) Akhir transaksi TUNGGAL: POD terverifikasi admin siap ditagih (billing) — kembalinya truk ke pool menjadi catatan armada, bukan penutup transaksi.
  - `docs/05_Fleet_Exit_and_Security_Gate_Flows.md`: Spesifikasi gate pass v3.0.0 — Jalur A (armada pool, siklus keluar-masuk odometer) dan Jalur B (log keluar truk vendor, tanpa kewajiban kembali), plus rencana tabel `vendor_vehicle_exit_logs` & endpoint `POST /api/fleet/vendor-exit`.
  - `docs/06_Outbound_and_POD_Flows.md`: Spesifikasi outbound v3.0.0 — tabel `waybills` (SJ-XXXXXXXX / RESI-XXXXXXXX auto-generate), endpoint `POST /api/outbound/:id/issue-waybill`, kolom `billing_ready` pada `outbound_orders`, dan akhir tunggal POD_VERIFIED untuk invoicing.
  - `docs/ai/decisions.md`: ADR-11 (Universal Waybill Issuance & Dual Gate-Out Flow) tercatat. Sinkron status tugas: `docs/ai/current-task.md`, `docs/ai/handoff.md`, `docs/ai/project-context.md`, `docs/00_Index_and_Roadmap.md`, `ai-state.json`.
- **Master PDF & Diagram PNG diregenerasi** (`scripts/build-master-pdf.mjs`): flowchart 939x2828 & sequence 1851x3474 px, 12 halaman, 0 syntax error, semua tile berisi; PNG diagram utuh diperbarui di `docs/diagrams/`.

## [1.2.0] - 2026-09-03
### Changed
- **Anti-AI Design Overhaul & B2B Logistics Enterprise Design System:**
  - Menghilangkan secara menyeluruh estetika "AI Generated Look" (sudut `rounded-2xl/rounded-3xl`, gradasi latar belakang radial/linear, bayangan pendar lembut berlebihan `shadow-xl shadow-slate-200/40`, emoji kartun).
  - Standardisasi sistem desain presisi industri: Kontainer menggunakan `rounded-lg` (8px), kontrol input dan tombol aksi menggunakan `rounded-md` (6px), dan tag status menggunakan `rounded` (4px).
  - Mengganti seluruh dekorasi gradasi warna dengan palet *Industrial Slate, Zinc & Solid Neutral* yang tajam, humanis, dan berdensitas tinggi (*high information density*).
  - Menyelaraskan seluruh angka metriks, kode SKU, nomor polisi armada, odometer, dan berat ke font monospace tabular figures (`font-mono tracking-tight`).
- **Redesain Halaman Operasional Lapangan:**
  - `layouts/default.vue`: Brand mark geometric vector SVG, sidebar links beraksen garis solid (`border-l-2 border-slate-900 dark:border-white`), breadcrumb gudang aktif yang ringkas.
  - `pages/index.vue`: Redesain Control Tower Telemetry Bar, 4-kolom kartu modul operasional fungsional (`GATE-01`, `DOCK-IN`, `BULK-01`, `E-POD`), panel alokasi Hub Distribusi AUCMA KDKMP (Cikarang 7.000 m² & Surabaya 3.500 m²), dan sidebar standar kepatuhan rantai dingin (*Upright Only, Tail-Lift, Resting Time*).
  - `pages/login.vue`: Halaman login enterprise dengan panel telemetri spesifikasi sistem monokromatik dan profil peran clearance RBAC yang rapi.
  - `pages/gate-pass/index.vue`: Input odometer industrial, selector fuel level BBM solar neutral, dan struk thermal print.
  - `pages/inbound/receive.vue`: Kotak scanner rugged handheld, stepper kuantitas fisik presisi, dan lencana kontinuitas rantai audit checkpoint.
  - `pages/debulking/index.vue`: Kartu konversi parent-to-child yang kompak dan indikator susut otomatis terintegrasi.
  - `pages/outbound/pod.vue`: Formulir BAST digital dengan kanvas tanda tangan presisi dan verifikasi foto serah terima.
  - `pages/stock/index.vue`: Tabel buku besar stok berdensitas tinggi dengan filter pencarian instan dan kartu KPI ringkas.
### Security
- Penerapan HTTP Security Headers OWASP (`nosniff`, `SAMEORIGIN`, `1; mode=block`, `Referrer-Policy`) pada backend Hono.
- Ekstraksi token actor context untuk penegakan audit trail kontinuitas tak terputus.

## [1.1.0] - 2026-09-02
### Added
- **Database Standalone SQLite Adapter (`sqlite-db.ts` & `db.ts`):**
  - Implementasi engine database lokal mandiri berbasis `node:sqlite` (SQLite 3.35+ dengan WAL Mode dan `PRAGMA foreign_keys = ON`).
  - Auto-initialization 32 skema tabel relasional lengkap (Master Data, Warehouse Locations, Users, Products, Fleet, Stock Ledger, Work Orders, Cross-Doc, Checkpoint Chain, dll.).
  - Auto-seeding akun pengguna untuk seluruh 6 peran RBAC (`superadmin`, `admin_adm`, `mgr_jkt`, `staff_jkt`, `driver_budi`, `gate_officer`) dengan password standar `password123`.
  - Kompatibilitas kueri SQL penuh (`normalizeSql`) menangani parameterized query `$1, $2` $\rightarrow$ `?`, `RETURNING *`, dan transaksi ACID (`BEGIN`, `COMMIT`, `ROLLBACK`).
- **Hardening Keamanan API & Audit OWASP Top 10 (`app.ts` & seluruh routes):**
  - Penerapan HTTP Security Headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`, `Referrer-Policy`) pada instance Hono.
  - Konfigurasi CORS adaptif berbasis environment (`CORS_ORIGIN`).
  - Integrasi ekstraksi identitas petugas terotentikasi (`optionalAuth` / `UserTokenPayload`) pada rute mutasi (`stock/adjust`, `inbound/receive`, `inbound/putaway`, `debulking`, `outbound/pod`, `fleet/departure`, `fleet/return`).
  - Penegasan pengetikan strict TypeScript pada seluruh endpoint checkpoint audit trail.
- **Redesain Menyeluruh Antarmuka Profesional & Humanis (Semua Halaman):**
  - Menghilangkan seluruh gradasi warna mencolok (*neon gradients / bright artificial rainbow badges*) di seluruh kartu dashboard, form pos satpam, inbound dock, de-bulking, POD, dan kartu stok.
  - Mengganti seluruh emoji kartun di seluruh sistem dengan komponen vektor stroke presisi [`AppIcon.vue`](file:///C:/Users/ICT-12/Documents/LatifNitip/ANS/wms-simple/frontend/components/AppIcon.vue) (*Home, Truck, Inbound, Scale, Signature, Stock, Scan, Camera, Printer, Trash, Alert, Check*).
  - Menggunakan palet netral enterprise (*Industrial Slate & Crisp Zinc*) dengan copywriting operasional yang humanis, lugas, dan praktis bagi staf lapangan dan manajemen.
- **Redesain Halaman Login Standar Enterprise B2B SaaS (`pages/login.vue`):**
  - Menghilangkan dekorasi generik (*gradient blob, emoji berlebih*) dan menggantinya dengan estetika industri logistik presisi tinggi (*Industrial Slate & Cobalt Blue*).
  - Integrasi panel telemetri sistem (status node gudang `WH-JKT-01`, sertifikasi ISO 27001, mode SQLite WAL, dan rantai audit).
  - Vektor ikon SVG presisi (*User, Lock, Shield, Eye, Arrow*) untuk pengalaman form yang konsisten.
  - Quick Profile Clearance Switcher minimalis dengan kartu identitas petugas rapi (Super Admin, Admin Adm, WH Manager, Checker, Driver, dan Gate Officer).
  - Penanganan error standar RFC 7807 problem details dan pengalihan reaktif setelah login sukses.
- **Pembaruan Antarmuka Responsif Menyeluruh (Seamless Desktop & Mobile Layout):**
  - **Desktop Enterprise Console Layout (`layouts/default.vue`):**
    - Sidebar persisten desktop (`hidden lg:flex w-64 xl:w-72`) dengan logo korporat, kartu profil petugas & gudang aktif, navigasi berjenjang terstruktur (*Dashboard, Pintu & Gerbang, Operasional Gudang, Distribusi*), dan footer status online.
    - Top bar header desktop dengan breadcrumb, informasi gudang aktif, indikator kesiapan hardware barcode scanner, dan theme switcher.
    - Menghilangkan pembatasan lebar `max-w-md` pada layar laptop/desktop sehingga memanfaatkan seluruh resolusi layar (`max-w-7xl` responsif).
  - **Dashboard Operasional Responsif (`pages/index.vue`):**
    - Grid kartu tugas 4-kolom pada desktop (`grid-cols-2 md:grid-cols-4`) dengan micro-interaction hover, status badge, dan deskripsi detail.
    - Grid ringkasan live status armada & stok 3-kolom lebar dan kartu fitur operasional strategis (KDMP, SJ Swap, Checkpoint).
  - **Penerimaan Inbound 2-Kolom (`pages/inbound/receive.vue`):**
    - Split-view desktop: Kolom kiri (Detail PO, Scanner Barcode, Tally Counter fisik besar +/-), Kolom kanan (Plat Truk, Sopir, Petugas Checker wajib audit, dan tombol konfirmasi).
  - **Pos Satpam Gate Pass Multi-Kolom (`pages/gate-pass/index.vue`):**
    - Mode Gate-Out: Formulir multi-kolom desktop (Identitas armada & sopir, Inspeksi odometer, Selector BBM solar 4-level interaktif, dan nama satpam).
    - Mode Gate-In: Grid responsif 3-kolom (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`) kartu armada di luar dengan input odometer kembali dan tombol cetak struk thermal instan.
  - **De-bulking & Repacking Console (`pages/debulking/index.vue`):**
    - 2-Kolom alur konversi (Input Parent Bulky 1T vs Output Child Karung 25kg) dengan visualisasi formula susut otomatis, alert toleransi susut > 1.00%, dan input mandor pengawas.
  - **Driver POD & BAST Digital (`pages/outbound/pod.vue`):**
    - 2-Kolom split: Bukti foto serah terima fisik & SOP KDMP Chiller di sisi kiri, Digital Signature Pad responsif & nama penerima di sisi kanan.
  - **Tabel Buku Besar Stok & Live Search (`pages/stock/index.vue`):**
    - Tampilan tabel enterprise desktop (`hidden md:block`) dengan filter pencarian real-time (SKU / Nama barang), kolom On-Hand, Reserved, In-Transit, dan status stok ketersediaan, serta mode kartu sentuh untuk mobile.
  - **Komponen Navigasi Bawah (`BottomNav.vue`):**
    - Dikonfigurasi `lg:hidden` agar otomatis tersembunyi di browser desktop/laptop dan tetap aktif untuk navigasi ergonomi jempol (*Thumb-Zone*) di smartphone.

## [1.0.9] - 2026-09-01
### Fixed
- **Perbaikan CI/CD Docker Build & Kompilasi TypeScript Backend:**
  - Mengatasi kendala perizinan `EACCES` pada `backend/Dockerfile` dan `frontend/Dockerfile` dengan menjalankan instalasi dependensi sebelum beralih ke user non-root `node`.
  - Memperbaiki pengetikan TypeScript strict mode pada `db.ts`, `middlewares/auth.ts`, `routes/auth.ts`, `services/checkpoint.ts`, dan `services/stock.ts` sehingga `tsc` lulus kompilasi tanpa error (0 errors).

## [1.0.8] - 2026-09-01
### Changed
- **Pengaturan Mode Terang sebagai Tema Default (Default Light Mode):**
  - Mengubah inisialisasi default pada [`useTheme.ts`](frontend/composables/useTheme.ts) menjadi Mode Terang (`isDarkMode = ref(false)`).
  - Mengubah default browser meta `theme-color` pada [`nuxt.config.ts`](frontend/nuxt.config.ts) menjadi `#f8fafc`.

## [1.0.7] - 2026-09-01
### Fixed
- **Perbaikan Reaktivitas Alih Tema (Dark Mode / Light Mode Dynamic Switcher):**
  - Mengatasi masalah background statis pada `app.vue` dengan mengganti kelas kontainer hardcoded menjadi dinamis (`bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100`).
  - Mengintegrasikan `useHead` di `app.vue` untuk memanipulasi atribut `htmlAttrs.class` secara reaktif antara `dark` dan terang (`light`).
  - Memutakhirkan `useTheme.ts` menggunakan Nuxt `useState` untuk sinkronisasi state tema lintas seluruh komponen tanpa delay render.
  - Menyesuaikan warna goresan canvas tanda tangan digital ([`SignaturePad.vue`](frontend/components/SignaturePad.vue)) agar otomatis berubah warna (biru muda di dark mode, navy gelap di light mode).

## [1.0.6] - 2026-09-01
### Added
- **Dukungan Penuh Mode Tampilan Ganda (Dark Mode & Light Mode):**
  - Pembuatan composable tema [`useTheme.ts`](frontend/composables/useTheme.ts) dengan persistensi `localStorage` (`wms_theme`).
  - Penambahan komponen tombol alih tema [`ThemeToggle.vue`](frontend/components/ThemeToggle.vue) (☀️ / 🌙) pada header aplikasi dan menu drawer.
  - Konfigurasi Tailwind CSS `darkMode: 'class'` pada [`tailwind.config.js`](frontend/tailwind.config.js).
  - Penyesuaian kelas kontras warna terang (*Light Mode*: `bg-slate-100`, kartu `bg-white`, border `border-slate-200`) dan gelap (*Dark Mode*: `bg-slate-950`, kartu `bg-slate-900`, border `border-slate-800`) di seluruh halaman antarmuka.

## [1.0.5] - 2026-09-01
### Changed
- **Redesain Palet Warna UI Profesional (Anti "AI-Generated Rainbow"):**
  - Mengganti palet warna warni cerah/pelangi (ungu neon, pink, gradien amber-oranye) dengan tema **Industrial Enterprise Dark Slate & Deep Cobalt Blue** yang konsisten dan elegan.
  - Penyeragaman gaya kartu permukaan netral (`bg-slate-900 border-slate-800`), tombol aksi primer solid (`bg-blue-600 hover:bg-blue-500`), dan navigasi bawah (*Bottom Nav*).
  - Warna semantik fungsional (Emerald = status aman, Amber = perhatian/di luar, Rose = peringatan) digunakan secara proporsional dan minimalis, bukan untuk dekorasi warna-warni.

## [1.0.4] - 2026-09-01
### Added
- **Dokumentasi Laporan Audit Kualitas & Keamanan Resmi (`docs/11_System_Quality_and_Security_Audit_Report.md`):**
  - Dokumentasi resmi hasil audit menyeluruh:
    1. **Bebas AI Slop & Code Smells:** Verifikasi ground truth database, bebas dead code/mock stubs, pembersihan komentar AI generik.
    2. **Kualitas Kode & Clean Architecture (ISO 25010):** Pemisahan 3-layer murni, transaksi ACID, dan concurrency locking `SELECT ... FOR UPDATE`.
    3. **Ergonomi UI/UX Mobile-First (ISO 9241 / WCAG 2.1):** Thumb-zone layout, touch target $\ge 48\text{px}$, audio beep $1800\text{Hz}$, haptic feedback, dan Web Bluetooth ESC/POS printing.
    4. **Verifikasi Fungsionalitas Operasional:** 16 Berkas Test, 80/80 Tests Lulus 100% dengan cakupan domain 94.5%.
    5. **Audit Keamanan Siber (OWASP Top 10 Web, OWASP AI, ISO/IEC 27001):** Parameterized SQL queries (Zero Raw SQL), JWT Scoped RBAC, Immutable Checkpoint Chain, Nginx rate limiting, dan non-root Docker container.

## [1.0.3] - 2026-09-01
### Added
- **Phase 3: Production Deployment, CI/CD Pipeline & Hardware Peripherals:**
  - **Multi-Stage Production Dockerfiles:**
    - `backend/Dockerfile`: Node.js 20 Alpine builder and runtime, unprivileged non-root user (`node`), compilation layer.
    - `frontend/Dockerfile`: Nuxt 3 Nitro server SSR production runner with standalone bundle.
  - **Nginx High-Performance Reverse Proxy Gateway (`docker/nginx.conf`):**
    - Security headers (OWASP: HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy).
    - Rate limiting per client IP (30 r/s burst 20).
    - Gzip dynamic compression and routing (`/api/` $\rightarrow$ Backend, `/` $\rightarrow$ Frontend Nitro).
  - **Production Docker Compose Stack (`docker-compose.prod.yml`):**
    - Bridge networking `wms_network`, healthcheck probes (`/api/health`), auto-restart policies, host PostgreSQL integration (`host.docker.internal`).
  - **CI/CD Quality Gate Automation:**
    - `.github/workflows/ci.yml`: GitHub Actions pipeline (Lint, 16 Vitest test suites, Nuxt 3 build, Docker build validation).
    - `.gitlab-ci.yml`: GitLab CI pipeline configuration.
  - **Direct Mobile ESC/POS Thermal Receipt & Barcode Printing (`useThermalPrinter.ts` & `ThermalPrintButton.vue`):**
    - Driver cetak nirkabel Web Bluetooth GATT untuk printer kasir/struk thermal portable 58mm & 80mm.
    - Template struk resmi Pos Satpam (Gate-Out/Gate-In dengan Odometer & TTD Petugas) dan Surat Jalan Titipan 3PL (Blind Shipping).

## [2.7.0] - 2026-09-01
### Added
- **Master End-to-End (E2E) Operational Lifecycle Verification (`tests/e2e/e2e-workflow.test.ts`):**
  - Pengujian terintegrasi penuh yang menyimulasikan seluruh 7 fase operasional logistik secara berurutan:
    1. **Fase 1 (Inbound):** PO Created $\rightarrow$ Physical Receive di Dock $\rightarrow$ Putaway ke Floor Staging Rak & Penambahan Saldo Stok On-Hand.
    2. **Fase 2 (De-bulking):** Pencurahan Bulky Jumbo Bag 1T menjadi Karung 25kg Retail dengan kalkulasi susut otomatis (0.50% loss) & mutasi buku besar.
    3. **Fase 3 (Cross-Dock & Cross-Doc):** Manifest Antar-Hub Jakarta ke Bali $\rightarrow$ Pemuatan ke Truk Tronton $\rightarrow$ Penerbitan Ulang Surat Jalan Swap (Blind Shipping 3PL).
    4. **Fase 4 (Pos Satpam Departure):** Gate-Out Armada, Odometer 45.200 KM, Fuel FULL, penguncian status armada `IN_USE`.
    5. **Fase 5 (Cross-Dock Dest Spoke):** Penerimaan & Pembongkaran di Hub Transit Bali $\rightarrow$ Saldo Stok Bali bertambah.
    6. **Fase 6 (Pos Satpam Return):** Gate-In Armada, Odometer 45.430,5 KM, kalkulasi otomatis jarak tempuh 230,5 KM, pengembalian status armada `AVAILABLE`.
    7. **Fase 7 (Outbound Fulfillment KDMP):** Order Created $\rightarrow$ Picking Chiller KDMP $\rightarrow$ Packing Upright Wooden Crate $\rightarrow$ Penyerahan Driver POD (TTD Digital & Foto) $\rightarrow$ Verifikasi Sah Admin.
  - Verifikasi integritas rantai audit: **15 mata rantai checkpoint tak terputus** (*Immutable Linked List*) dengan nama petugas fisik tercatat pada setiap langkah.
  - Total metrik pengujian: **16 Berkas Test, 80/80 Tests Lulus 100%**.

## [2.6.0] - 2026-09-01
### Added
- **Backend Production Hardening:**
  - **JWT Authentication & Scoped RBAC:** Middleware autentikasi Bearer JWT, token generation, otorisasi peran (`SUPER_ADMIN`, `ADMIN_ADM`, `WH_MANAGER`, `WH_STAFF`, `DRIVER`, `GATE_OFFICER`), dan proteksi isolasi gudang (*warehouse-scoped access control*).
  - **RFC 7807 Standard Problem Details Error Handling:** Format error terstruktur (`type`, `title`, `status`, `detail`, `code`, `instance`, `timestamp`).
  - **Zod Schema Validation Middleware:** Validasi tipe data dan skema payload kaku pada request body API.
  - **Endpoint Autentikasi Baru:** `POST /api/auth/login`, `GET /api/auth/me`, dan `GET /api/auth/users`.
- **Full Frontend Nuxt 3 Integration:**
  - **Pinia Reactive Stores:** `useAuthStore` (JWT session & active warehouse scope), `useGatePassStore` (armada & gate pass), `useInboundStore` (PO & receiving), `useDebulkingStore` (work order & live shrinkage), `useOutboundStore` (POD & touch signature), dan `useStockStore` (snapshot real-time).
  - **Unified API Composable (`useWmsApi`):** Injeksi otomatis header Bearer token dan penanganan error RFC 7807.
  - **Hardware Laser Barcode Scanner & Haptic/Audio Feedback (`useBarcodeScanner`):** Integrasi listener keyboard scanner laser berkecepatan tinggi, audio beep via Web Audio API, dan haptic vibration.
  - **Kompilasi Sukses:** Nuxt 3 + Vite 7 + Tailwind CSS + Nitro Server berhasil dibundel siap produksi.

## [2.5.0] - 2026-09-01
### Added
- **Automated Test Suites (Vitest):**
  - Implementasi 14 berkas pengujian terpadu dengan total 73 kasus uji (100% lulus) dan cakupan layer domain layanan mencapai **94.5%**.
  - **Unit Test Domain & Kalkulasi:**
    - `tests/unit/debulking-calc.test.ts`: Pengujian skenario DEB-01 (susut wajar), DEB-02 (deteksi susut tinggi > toleransi), dan DEB-03 (kekekalan massa $\text{Input} = \text{Output} + \text{Loss}$).
    - `tests/unit/fleet-calc.test.ts`: Pengujian skenario GATE-01 ($Odo_{in} < Odo_{out}$ penolakan), GATE-02 (pencegahan double departure armada `IN_USE`), dan GATE-03 (kalkulasi jarak tempuh otomatis).
    - `tests/unit/weighbridge-calc.test.ts`: Pengujian kalkulasi berat bersih ($\text{Net} = \text{Gross} - \text{Tare}$) dan deteksi kelebihan muatan (*overload excess*).
    - `tests/unit/checkpoint.service.test.ts`: Pengujian rantai audit `prev_checkpoint_id` (AUD-01), validasi wajib nama petugas (AUD-02), dan serialisasi metadata/foto.
    - `tests/unit/stock.service.test.ts`: Pengujian buku besar stok anti-saldo negatif (STK-01), perpindahan stok antar-hub `CROSS_DOCK_OUT`/`CROSS_DOCK_IN` (STK-02), dan mutasi putaway/picking.
  - **Integration Test Rute API:**
    - Pengujian menyeluruh seluruh endpoint REST API: `/api/health`, `/api/master/*`, `/api/warehouses`, `/api/products`, `/api/inbound`, `/api/debulking`, `/api/crossdock`, `/api/crossdoc`, `/api/outbound`, `/api/fleet`, `/api/stock`, `/api/weighbridge`, `/api/checkpoints`, dan `/api/alerts`.
## [2.4.1] - 2026-09-06
### Fixed
- **Master PDF: Syntax Error Diagram:** Mermaid flowchart di Master PDF gagal render ("Syntax error in text, mermaid version 10.9.8") karena label edge mengandung tanda kurung. Label `|Transit Cepat (Cross-Dock)|` di [`docs/09_Master_End_to_End_Flow_and_Sequence.md`](docs/09_Master_End_to_End_Flow_and_Sequence.md) dibungkus kutip agar aman diparsing.
- **Master PDF: Ruang Kosong Berlebih:** Sequence diagram melebar ekstrem sehingga halaman 3 hampir kosong. Kini dirender dengan konfigurasi mermaid rapat (`actorMargin` & `width` dibatasi) dan layout A4 margin kecil.
- **Master PDF: Diagram Kepotong Halaman:** Diagram alir panjang kini dipecah otomatis menjadi tile per halaman A4 (portrait/landscape dipilih otomatis agar skala terbaca). Titik potong di-snap ke celah kosong antar node (deteksi okupansi solid SVG) sehingga tidak ada kotak/pesan yang terbelah dua halaman, pembagian tile seimbang tanpa halaman ekstra kosong, dengan label "lanjutan (n/N)" antar tile.
### Added
- **Skrip Generator PDF:** `scripts/build-master-pdf.mjs` — merender kedua diagram mermaid via headless Chrome (DevTools Protocol) lalu mencetak PDF A4 terverifikasi (gagal build bila diagram error). Regenerasi: `node scripts/build-master-pdf.mjs`.
- **Export PNG Diagram Utuh:** `node scripts/build-master-pdf.mjs --png` — menghasilkan `docs/diagrams/wms-flowchart.png` & `docs/diagrams/wms-sequence.png` (resolusi tinggi, satu gambar tanpa potongan halaman, berjudul & bertanggal, siap dibagikan ke klien).

---

## [2.2.0] - 2026-08-31
### Added
- **Standarisasi Rekayasa Perangkat Lunak:** Panduan Clean Architecture, Strict TypeScript, Conventional Commits, RFC 7807 Error Handling ([`docs/standards/01_Development_and_Coding_Standard.md`](docs/standards/01_Development_and_Coding_Standard.md)).
- **Standarisasi Keamanan Komprehensif:** Kepatuhan penuh OWASP Top 10 Web/API dan OWASP Top 10 for AI/LLM Applications ([`docs/standards/02_Security_Standard_OWASP_and_OWASP_AI.md`](docs/standards/02_Security_Standard_OWASP_and_OWASP_AI.md)).
- **Standarisasi Pengujian & QA:** Piramida testing, skenario uji kritis susut de-bulking, odometer gate pass, dan kekekalan massa stok ([`docs/standards/03_Testing_and_Quality_Assurance_Standard.md`](docs/standards/03_Testing_and_Quality_Assurance_Standard.md)).
- **Standarisasi Audit & Integritas Data:** Query rekursif verifikasi rantai checkpoint dan spesifikasi bukti foto/TTD digital ([`docs/standards/04_Audit_and_Compliance_Standard.md`](docs/standards/04_Audit_and_Compliance_Standard.md)).
- **Standarisasi Versioning & Rilis:** SemVer 2.0.0, Database Migration Versioning, dan API URI Versioning ([`docs/standards/05_Versioning_and_Release_Standard.md`](docs/standards/05_Versioning_and_Release_Standard.md)).
- **Protokol Agen AI (`AGENTS.md`):** Instruksi wajib urutan pembacaan dokumentasi bagi seluruh agen AI sebelum menyentuh kode.

---

## [2.1.0] - 2026-08-31
### Added
- **Mobile-First UI/UX Design System:** Desain ergonomi jempol (*Thumb-Zone Navigation*), target sentuh besar, dual-mode barcode scanning, dan dark high-contrast theme ([`docs/08_Mobile_First_UI_UX_Design_System.md`](docs/08_Mobile_First_UI_UX_Design_System.md)).
- **Nuxt 3 Mobile PWA Frontend Scaffold:**
  - Pos Satpam Gate Pass (Odometer, BBM, Scan QR).
  - Inbound Dock Receiving (Jumbo Tally Counter +/-).
  - De-bulking Work Order Calculator (Susut % Live).
  - Driver Digital POD (Canvas Tanda Tangan Layar Sentuh & Foto).
  - Saldo Stok Mobile Cards.

---

## [2.0.0] - 2026-08-31
### Added
- **Host PostgreSQL Database Integration:** Database `wms_simple_db` aktif di instance host PostgreSQL port `5432` sesuai panduan global shared database.
- **Dukungan Kargo Bulky & Curah (Dry & Liquid Bulk):** Penanganan kargo berat, silo curah, tangki cairan, dan jembatan timbang truk.
- **Modul De-bulking / Breakdown / Bagging-Off:** Konversi barang bulky parent (Jumbo Bag 1 Ton) ke barang child (Karung 25kg) dengan pemantauan toleransi susut (*shrinkage loss %*).
- **Master Data Dinamis Tanpa Hardcode:** Tabel master relasional untuk Cargo Types, Packaging Types, UOM Conversions, Vehicle Types, dan Document Types.
- **Master Armada Indonesia:** Spesifikasi lengkap dimensi, daya angkut tonase (kg), kubikasi (CBM), dan tipe pintu untuk CDE, CDD, Fuso, Tronton Wingbox, Dump Truck, Tanker, Trailer 40ft.
- **Modul Cross-Document:** Penerbitan ulang Surat Jalan (SJ Swap / Blind Shipping) untuk menjaga kerahasiaan komersial 3PL.
- **Pencatatan Armada Keluar-Masuk (Fleet Exit Log):** Gate pass pos satpam dengan inspeksi Odometer, BBM, Surat Jalan, dan kalkulasi jarak tempuh otomatis.

---

## [1.0.0] - 2026-08-26
### Added
- Inisialisasi arsitektur dasar WMS Simple (Inbound, Cross-Dock, Outbound, Stock Ledger, Checkpoint Chain).
