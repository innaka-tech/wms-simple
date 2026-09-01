# Project Context: WMS Simple Enterprise

**System:** WMS Simple Enterprise  
**Version:** 2.3.0  
**Status:** In Progress (Phase 1 Blueprint & Standards 100% Complete, Ready for Production Implementation)  
**Database Target:** Host PostgreSQL 16 (`wms_simple_db` on `127.0.0.1:5432`)  
**Backend:** Hono (Node.js & TypeScript)  
**Frontend:** Nuxt 3 (Tailwind CSS, VueUse, Pinia, Mobile PWA-Ready)  

---

## 1. Executive Summary & Purpose

WMS Simple Enterprise adalah platform sistem manajemen pergudangan dan logistik *domain-agnostic* yang dirancang untuk menangani operasional pergudangan *multi-hub* (Main Central Hub Jakarta + Transit Regional Spokes seperti Bali, Balikpapan, Pekanbaru) dengan kehandalan tinggi dan alur deterministik.

Sistem mencakup penanganan:
1. **General & FMCG Packaged Goods:** Tracking barcode SKU, koli, box packaging, FIFO/FEFO putaway.
2. **Kargo Bulky & Heavy Lift:** Jumbo bag 1 ton, steel coil, mesin industri dengan penanganan forklift besar.
3. **Kargo Curah Kering & Cair:** Gula curah, semen, pupuk di Silo, dan minyak CPO di Tangki Timbun terintegrasi Jembatan Timbang Truk (*Weighbridge*).
4. **Modul De-bulking / Breakdown:** Work order pencurahan barang bulky parent menjadi kemasan child retail dengan kalkulasi susut otomatis (*shrinkage loss %*) dan alert toleransi.
5. **Cross-Docking & Cross-Document (SJ Swap):** Transfer antar-hub kecepatan tinggi dan penerbitan ulang Surat Jalan (Blind Shipping 3PL / Sub-AWB).
6. **Distribusi Khusus Peralatan Rantai Dingin (KDMP):** Dukungan pengiriman Showcase Display, Chiller, dan Deep Chest Freezer untuk program Koperasi Desa/Kelurahan Merah Putih (aturan *Upright Only*, *Serial Number Tracking*, *Resting Time*, *Truk CDE Tail-Lift*, dan *Digital BAST Desa*).
7. **Pencatatan Armada Keluar-Masuk (Security Gate Pass):** Inspeksi Odometer Keluar/Masuk, level BBM, validasi surat jalan sah, foto truk, dan monitoring armada terlambat (*Overdue SLA*).
8. **Double-Entry Stock Ledger & Immutable Checkpoint Chain:** Buku besar mutasi stok anti-saldo negatif dan rantai audit tertaut (*linked list*) dengan nama petugas fisik wajib.

---

## 2. Struktur Peta Dokumentasi Resmi (`docs/`)

- [`docs/00_Index_and_Roadmap.md`](../00_Index_and_Roadmap.md) — Master Index & Roadmap Proyek
- [`docs/01_Business_Overview.md`](../01_Business_Overview.md) — Gambaran Bisnis & Kapabilitas Universal
- [`docs/01_Strategic_Framework_and_6_Pillars.md`](../01_Strategic_Framework_and_6_Pillars.md) — 6 Pilar Strategis & Rationale Hono
- [`docs/02_Bulky_Curah_and_Debulking.md`](../02_Bulky_Curah_and_Debulking.md) — Kargo Bulky, Curah, De-bulking & Susut %
- [`docs/03_CrossDock_and_CrossDocument.md`](../03_CrossDock_and_CrossDocument.md) — Cross-Docking & Standar Cross-Doc Swap
- [`docs/04_Dynamic_Master_Data_and_Fleet.md`](../04_Dynamic_Master_Data_and_Fleet.md) — Master Data Dinamis & Spesifikasi Armada Indonesia
- [`docs/05_Fleet_Exit_and_Security_Gate_Flows.md`](../05_Fleet_Exit_and_Security_Gate_Flows.md) — Pos Satpam Gate Pass & Odometer
- [`docs/06_Outbound_and_POD_Flows.md`](../06_Outbound_and_POD_Flows.md) — Outbound Order, Picking, Packing, Digital POD
- [`docs/07_Checkpoint_Chain_and_Audit.md`](../07_Checkpoint_Chain_and_Audit.md) — Rantai Audit Checkpoint Tak Terputus
- [`docs/08_Mobile_First_UI_UX_Design_System.md`](../08_Mobile_First_UI_UX_Design_System.md) — Desain Sistem Antarmuka Mobile-First PWA
- [`docs/09_Master_End_to_End_Flow_and_Sequence.md`](../09_Master_End_to_End_Flow_and_Sequence.md) — Master Flowchart & Sequence Diagram Menyeluruh
- [`docs/10_KDMP_Showcase_and_Chiller_Logistics.md`](../10_KDMP_Showcase_and_Chiller_Logistics.md) — Spesifikasi Khusus Distribusi Showcase KDMP
- [`docs/standards/01_Development_and_Coding_Standard.md`](../standards/01_Development_and_Coding_Standard.md) — Standar Coding, Clean Architecture & TypeScript
- [`docs/standards/02_Security_Standard_OWASP_and_OWASP_AI.md`](../standards/02_Security_Standard_OWASP_and_OWASP_AI.md) — Kepatuhan OWASP Web & OWASP AI
- [`docs/standards/03_Testing_and_Quality_Assurance_Standard.md`](../standards/03_Testing_and_Quality_Assurance_Standard.md) — Standar Pengujian & Quality Gates
- [`docs/standards/04_Audit_and_Compliance_Standard.md`](../standards/04_Audit_and_Compliance_Standard.md) — Standar Audit & Bukti Digital
- [`docs/standards/05_Versioning_and_Release_Standard.md`](../standards/05_Versioning_and_Release_Standard.md) — SemVer 2.0.0 & Database Migration
- [`docs/WMS_Simple_Enterprise_Master_Documentation.pdf`](../WMS_Simple_Enterprise_Master_Documentation.pdf) — Dokumen Master PDF Publikasi Resmi v2.4.0
