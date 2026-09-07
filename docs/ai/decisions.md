# Architecture Decisions Log (ADR)

**Project:** WMS Simple Enterprise  
**Version:** 3.0.0 (Universal Waybill & Dual Gate-Out)  
**Status:** LOCKED & ACTIVE  

---

### ADR-01: Pragmatic Non-Dynamic Workflow Engine
- **Decision:** Tidak menggunakan visual drag-and-drop flow builder yang dinamis. Menggunakan alur deterministik (*hardcoded high-reliability flows*) untuk Inbound, De-bulking, Cross-Dock, Cross-Doc, Outbound, dan Fleet Gate Pass.
- **Rationale:** Mengurangi overhead komputasi, mencegah human error di level staf lapangan, dan menjamin kepatuhan SLA.

### ADR-02: Dynamic Master Data Lookup Tables (No Hardcoded Enums)
- **Decision:** Menghapus enum kaku dan menggantikannya dengan tabel master data relasional (`master_cargo_types`, `master_packaging_types`, `master_uom`, `master_vehicle_types`, `master_document_types`, `master_warehouse_types`).
- **Rationale:** Memungkinkan manajemen mengelola jenis armada, tipe kargo baru, dan satuan ukur secara mandiri via CRUD/API tanpa perlu migrasi schema berulang.

### ADR-03: Bulky & Curah (Bulk) Handling with De-bulking Module
- **Decision:** Menyediakan modul konversi stok / de-bulking (`stock_conversions`) untuk menangani barang bulky (Jumbo Bag 1 Ton / Drum 200L / ISO Tank) yang dipecah/dicurah menjadi satuan kecil (Karung 25kg / Curah Silo), lengkap dengan kalkulasi persentase susut (*shrinkage loss*) dan alert toleransi.
- **Rationale:** Standar kebutuhan riil industri pergudangan komoditas (gula, beras, pupuk, minyak, semen).

### ADR-04: Cross Document (Re-issuance / Surat Jalan Swap)
- **Decision:** Menyediakan modul `cross_documents` untuk menerbitkan ulang atau menukar dokumen pengiriman (Surat Jalan Supplier -> Surat Jalan Titipan WMS / Sub-AWB / BAST KDMP) sebelum barang diteruskan ke rute cabang/pelanggan akhir.
- **Rationale:** Kebutuhan vital 3PL untuk melindungi data komersial vendor dan memfasilitasi pembagian rute spoke.

### ADR-05: Dedicated Fleet Exit Log (Gate Pass Pos Satpam)
- **Decision:** Mengintegrasikan modul gerbang pos satpam yang mencatat Odometer Keluar/Masuk, Level BBM, Foto Truk, Validasi Dokumen Sah, dan kalkulasi jarak tempuh otomatis.
- **Rationale:** Menutup celah kebocoran BBM, penyalahgunaan armada, dan penyelundupan barang tanpa dokumen resmi.

### ADR-06: Shared Host PostgreSQL Database
- **Decision:** Database WMS Simple (`wms_simple_db`) berada pada instance PostgreSQL host yang berjalan di port 5432.
- **Rationale:** Standarisasi infrastruktur global organisasi dan efisiensi resource.

### ADR-07: Backend Framework Hono (Node.js/TypeScript)
- **Decision:** Menggunakan Hono untuk backend REST API.
- **Rationale:** Ultra-ringan (RAM ~25MB), latensi rendah (<2ms), router tercepat, type-safe RPC ke Nuxt 3, dan kompatibel universal.

### ADR-08: Mobile-First & PWA UI/UX Architecture (Hybrid Navigation)
- **Decision:** Desain frontend mengutamakan smartphone dan rugged barcode terminal Android. Menggunakan tata letak Hibrida: **App Drawer (Menu Samping)** untuk menu lengkap dan **Bottom Navigation (Jalur Cepat Bawah)** untuk aksi operasional inti di area *Thumb-Zone*. Dilengkapi canvas tanda tangan digital sentuh dan dual-mode scanner (Kamera & Hardware laser).
- **Rationale:** Menjamin fleksibilitas menu Enterprise yang banyak, tanpa mengorbankan kecepatan akses satu tangan (*one-handed operation*) di lapangan.

### ADR-09: Enterprise Governance, Security (OWASP Top 10 & OWASP AI) & Testing Standards
- **Decision:** Kepatuhan kaku terhadap Clean Architecture 3-layer, strict TypeScript, parameterized SQL queries (100%), Zod validation untuk output AI, mandatory nama petugas fisik di setiap mutasi stok, serta target cakupan testing &ge;90% pada service kritis.
- **Rationale:** Menjamin keamanan data perusahaan, mencegah fraud, dan memenuhi standar audit perbankan/pemerintah.

### ADR-11: Universal Waybill Issuance & Dual Gate-Out Flow (v3.0.0, direvisi v3.1.0 & v3.2.0)
- **Decision:** (1) Penerbitan Surat Jalan Baru + Nomor Resi otomatis terjadi pada SATU titik yang sama untuk SEMUA pengiriman keluar (stok gudang, repacking, cross-dock antar-hub, KDMP) via tabel `waybills` + endpoint `POST /api/outbound/:id/issue-waybill`; cross-doc swap menjadi varian blind shipping. (2) Pos satpam keluar memakai DUA alur terpisah: Jalur A armada pool (gate pass odometer/BBM) dan Jalur B truk vendor (tabel `vendor_vehicle_exit_logs`: nama vendor, nopol manual, nomor resi wajib; truk vendor tidak wajib kembali). (3) **Revisi v3.2.0: TIDAK ada timbangan truk di alur** — jembatan timbang masuk/keluar dihapus seluruhnya dari proses gudang; berat muatan dicukupi dari dokumen pengiriman dan tally fisik. (4) **Revisi v3.2.0 — rantai transaksi berakhir di PENERIMAAN PEMBAYARAN:** POD terverifikasi admin (`billing_ready: true`) hanya menjadi dasar penerbitan faktur (`invoices`), pembayaran diterima (`payments`, status `PAID`) yang menutup transaksi; kembalinya truk ke pool adalah catatan armada, bukan penutup transaksi. (5) **Revisi v3.1.0 — Repacking ON-DEMAND:** semua barang masuk disimpan ke rak dulu (kecuali cross-dock langsung staging); pecah ulang/kemas ulang hanya dieksekusi SETELAH ada permintaan kirim/alokasi (barang induk dipick dari rak, hasil langsung masuk penerbitan SJ) — tidak ada repacking di dock atau stok repacking menganggur.
- **Rationale:** Menutup kebocoran operasional: tidak ada barang keluar tanpa dokumen resmi, identitas truk vendor terkunci di audit trail, berat muatan nyata terukur (bukan perkiraan), dan siklus penagihan tidak menunggu kembalinya truk vendor yang tidak terkendali.

### ADR-10: Universal Domain-Agnostic Core Engine with Polymorphic Cargo Handling
- **Decision:** WMS dirancang universal untuk segala tipe industri (FMCG, Bulky, Curah, Proyek) dengan perlakuan khusus (seperti Showcase/Chiller KDMP: *Upright Only*, *Resting Time*, *Tail-Lift Truck*) ditangani sebagai profil kargo polimorfik tanpa mengubah kode inti.
- **Rationale:** Skalabilitas jangka panjang untuk melayani berbagai jenis klien komersial maupun program strategis nasional.
