# AI Handoff & Knowledge Base: WMS Simple Enterprise

**Date:** 2026-09-07  
**Project:** WMS Simple Enterprise (`/Users/anasfikri/Documents/Projects/ber5/wms-simple`)  
**Version:** 3.0.0  
**Current Milestone:** Flow v3.0.0 Docs-First (Universal Waybill & Dual Gate-Out, ADR-11) Finalized — Implementation Backlog Open  

---

## 1. State of the Project (Ground Truth)

1. **Database Stack (Host PostgreSQL):**
   - Target database resmi: PostgreSQL 16 di Host Machine (`127.0.0.1:5432`, nama DB: `wms_simple_db`, user: `postgres`, pass: `password`).
   - Seluruh tabel relasional (`schema_v2.sql`) dan data master (`seed_v2.sql`) telah aktif dan tervalidasi di database host.
   - Data pendukung khusus KDMP (`APPLIANCE_COLD_CHAIN`, `BAST_KDMP`, `CDE_BOX_TAILLIFT`, SKU Showcase 300L & Chest Freezer 500L) telah terisi dan aktif.

2. **Dokumentasi & Blueprint Publikasi:**
   - 10 Dokumen Spesifikasi Operasional lengkap di `docs/`.
   - 5 Dokumen Standar Rekayasa di `docs/standards/` (Development, OWASP & OWASP AI Security, Testing, Audit, Versioning).
   - Master PDF Terpadu Resmi: `docs/WMS_Simple_Enterprise_Master_Documentation.pdf` (v2.4.1, 6 halaman rapat, diagram SVG tajam, tanpa syntax error).
   - Dokumen Protokol AI: `AGENTS.md` di root `wms-simple/`.

3. **Status Kode Saat Ini (Scaffolding / Proof of Concept):**
   - `backend/` (Hono REST API): Menyediakan route dasar, db pool connection, dan basic services.
   - `frontend/` (Nuxt 3 Mobile PWA): Menyediakan mobile layouts, thumb-zone bottom navigation, touch signature pad component, dan halaman form operasional (Gate Pass, Dock Receive, De-bulking, Driver POD, Stock).
   - **Catatan:** Kode ini adalah prototipe struktural awal (PoC) dan siap memasuki tahap implementasi produksi penuh + automated test suites.

---

## 1.5 Pembaruan v3.0.0 (2026-09-07): Universal Waybill & Dual Gate-Out

Alur operasional disesuaikan (docs-first, ADR-11):
1. Tanpa timbangan truk sama sekali (v3.2.0: timbang masuk & keluar dihapus dari alur gudang); berat muatan dari dokumen pengiriman dan tally fisik.
2. SJ baru + nomor resi auto-generate untuk SEMUA pengiriman keluar (tabel `waybills`, endpoint `POST /api/outbound/:id/issue-waybill`); cross-doc swap jadi varian blind shipping.
3. Dual gate-out di pos satpam: Jalur A armada pool (gate pass) & Jalur B truk vendor (tabel `vendor_vehicle_exit_logs`: nama vendor, nopol, resi wajib); truk vendor tidak wajib kembali.
4. Rantai transaksi sampai PENERIMAAN PEMBAYARAN (v3.2.0): POD terverifikasi → faktur `invoices` (INV-XXXX) → pembayaran `payments` → LUNAS menutup transaksi; kembali ke pool hanya catatan armada.
5. Revisi v3.1.0: semua barang masuk disimpan ke rak dulu (kecuali cross-dock); repacking ON-DEMAND setelah permintaan kirim/alokasi (barang induk dipick dari rak, `POST /api/stock/convert`), hasilnya langsung masuk penerbitan SJ + resi.

Dokumen terdampak: `docs/09` (flowchart+sequence), `docs/05` (gate dual), `docs/06` (waybill universal + billing), `docs/ai/decisions.md` (ADR-11), master PDF & PNG diregenerasi. Implementasi backend/frontend mengikuti backlog di `docs/ai/current-task.md` §0.

---

## 2. Immediate Next Steps for Next Developer / Agent

Ketika user menginstruksikan untuk memulai tahap development produksi:
1. **Tahap 1 (Backend Core Hardening):**
   - Buat middleware validasi request dengan Zod Schema kaku per endpoint.
   - Implementasikan global error handler terstandarisasi RFC 7807 problem details.
   - Pasang JWT authentication & scoped warehouse RBAC middleware.
2. **Tahap 2 (Automated Test Suites - Vitest):**
   - Tulis unit & integration tests untuk 4 skenario kritis:
     - Skenario De-bulking & toleransi susut (Shrinkage Rate % calculation & high alert trigger).
     - Skenario Double-Entry Stock Ledger (hukum kekekalan massa & pencegahan saldo negatif).
     - Skenario Gate Pass (validasi Odometer In >= Odometer Out & auto distance calculation).
     - Skenario Checkpoint Chain (kontinuitas `prev_checkpoint_id` dan mandatory nama petugas).
3. **Tahap 3 (Full Frontend Nuxt 3 Integration):**
   - Pasang Pinia Store untuk state management reaktif.
   - Hubungkan form mobile ke backend API dengan penanganan loading/error state yang mulus.
   - Implementasikan barcode camera scanner + hardware keydown laser listener + audio/haptic feedback.
4. **Tahap 4 (End-to-End Verification):**
   - Jalankan verifikasi alur operasional penuh dari Inbound hingga POD.
