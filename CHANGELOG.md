# Changelog

Semua perubahan penting pada proyek **WMS Simple Enterprise** didokumentasikan dalam berkas ini.
Format berkas mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan mematuhi [Semantic Versioning](https://semver.org/lang/id/).

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
