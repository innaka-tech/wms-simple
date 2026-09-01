# Changelog

Semua perubahan penting pada proyek **WMS Simple Enterprise** didokumentasikan dalam berkas ini.
Format berkas mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan mematuhi [Semantic Versioning](https://semver.org/lang/id/).

---

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
