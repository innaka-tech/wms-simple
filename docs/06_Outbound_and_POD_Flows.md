# 06_Outbound_and_POD_Flows.md

**Document:** Outbound Fulfillment & Digital POD Flow Specification  
**Operations Area:** Order Processing, Waybill & Resi Issuance, Bin Picking, Packing/Boxing, Shipping, Delivery POD, Billing Handoff  
**Version:** 3.1.0  
**Status:** LOCKED & ACTIVE  

---

## 1. Prinsip Dasar (v3.1.0)

1. **Satu titik penerbitan dokumen untuk SEMUA pengiriman keluar.** Baik barang dari stok gudang, hasil repacking (de-bulking), cross-dock antar-hub, maupun KDMP — sistem **otomatis menerbitkan Surat Jalan Baru + Nomor Resi** saat barang mau keluar. Cross-Doc Swap (blind shipping) menjadi salah satu varian penerbitan, bukan satu-satunya jalur.
2. **Nomor resi auto-generate sistem** dengan format `RESI-XXXXXXXX` dan SJ `SJ-XXXXXXXX`, tertaut ke order dan tercatat di checkpoint audit. Pencetakan struk thermal tersedia via modul ESC/POS.
3. **Timbang truk keluar** untuk muatan curah/berat: gross − tare = berat muatan bersih, tercatat sebagai tiket jembatan timbang saat barang keluar. Tidak ada timbang truk masuk di alur ini.
4. **Akhir transaksi tunggal: POD terverifikasi admin → SIAP DITAGIH.** Kembalinya truk ke pool adalah catatan armada (lihat `05_Fleet_Exit_and_Security_Gate_Flows.md`), bukan penutup transaksi barang.
5. **Truk pengangkut bisa pool atau vendor.** Untuk vendor: nama vendor + nopol + resi wajib tercatat di pos satpam (Jalur B, doc 05).

---

## 2. Diagram Alur Outbound (Flowchart)

```mermaid
flowchart TD
    classDef action fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef staff fill:#e8f5e9,stroke:#388e3c,stroke-width:2px;
    classDef gate fill:#f3f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef pod fill:#fff3e0,stroke:#f57c00,stroke-width:2px;
    classDef alert fill:#ffebee,stroke:#c62828,stroke-width:2px;
    classDef waybill fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef finalNode fill:#e8f5e9,stroke:#2e7d32,stroke-width:3px;

    REQ(["Order Pelanggan / Permintaan Kirim (Semua Jenis: Stok, Repacking, Cross-Dock, KDMP)"]) --> STEP1["1. Order Dibuat di Sistem (Validasi: Stok Tersedia on_hand dikurangi reserved)"]:::action

    STEP1 --> DEBULK_Q{"Barang perlu Pecah Ulang / Kemas Ulang? (Repacking On-Demand dari Rak)"}:::action

    DEBULK_Q -->|Ya| REPICK["2A. Ambil Barang Induk dari Rak lalu Repacking (Potong stok Jumbo Bag, Tambah stok Karung siap kirim, Hitung Susut)"]:::staff
    DEBULK_Q -->|Tidak| STEP2["2B. Picking Langsung dari Lokasi Rak / Bin (Stock: on_hand berkurang, reserved bertambah)"]:::staff

    REPICK --> STEP3
    STEP2 --> STEP3["3. Packing, Box Sealing, Labeling (Input: box_code, weight_kg, dimensions)"]:::staff

    STEP2 --> STEP3["3. Packing, Box Sealing, Labeling (Input: box_code, weight_kg, dimensions)"]:::staff

    STEP3 --> STEP4["4. Sistem Terbitkan Surat Jalan Baru + Nomor Resi Otomatis (SJ-XXXX / RESI-XXXX, cetak thermal)"]:::waybill

    STEP4 --> WB_OUT["5. Timbang Truk Keluar untuk Muatan Curah / Berat (Gross dikurangi Tare = Muatan Bersih)"]:::action

    WB_OUT --> STEP6["6. Pos Satpam Gerbang Keluar: Pool (Gate Pass Odometer/BBM) atau Vendor (Nama Vendor + Nopol + Resi Wajib) (Status Order: SHIPPED)"]:::gate

    STEP6 --> STEP7["7. Pengiriman Last-Mile ke Penerima (Actor: DRIVER Pool atau Vendor)"]:::action

    STEP7 --> STEP8["8. Serah Terima dan Submit POD Digital - TTD Layar Sentuh dan Foto Fisik (Status: DELIVERED)"]:::pod

    STEP8 --> STEP9["9. Verifikasi Dokumen POD oleh Admin (Status: POD_VERIFIED)"]:::action

    STEP9 --> COMPLETED(["AKHIR TUNGGAL: SIAP DITAGIH (Billing) - POD Terverifikasi"]):::finalNode

    %% SLA Alert
    ALERT_SLA["Alert: POD Belum Diverifikasi (Lewat H+1 dari Delivered)"]:::alert -.-> STEP9
```

---

## 3. Diagram Sequence Outbound & POD (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Cust as Customer / Admin
    actor Picker as WH Staff (Picker)
    actor Packer as WH Staff (Packer)
    actor Satpam as Satpam Pos Gerbang
    actor Driver as Driver (Pool / Vendor)
    actor Recipient as Penerima Barang
    actor Admin as Admin Adm
    participant API as WMS Simple API
    participant DB as Host PostgreSQL

    Cust->>API: POST /api/outbound (Order ORD-XXXX)
    API->>DB: INSERT INTO outbound_orders & outbound_items (Status: CREATED)
    API->>DB: INSERT INTO checkpoint_logs (ORDER_CREATED)

    alt Barang perlu Pecah Ulang / Kemas Ulang (Repacking On-Demand)
        Picker->>API: POST /api/stock/convert (Ambil Barang Induk dari Rak, Input Hasil: 1.000 KG Jadi 995 KG)
        API->>DB: INSERT INTO stock_conversions (Potong stok Jumbo Bag, Tambah stok Karung siap kirim)
        API->>DB: INSERT INTO checkpoint_logs (REPACKING_COMPLETED, hitung susut 5 KG)
    else Barang siap kirim langsung (Stok Utuh / Cross-Dock)
        Picker->>API: POST /api/outbound/:id/pick (Ambil dari Bin)
        API->>DB: UPDATE stock_levels (on_hand -, reserved +)
        API->>DB: INSERT stock_movements (OUTBOUND_PICK)
        API->>DB: INSERT INTO checkpoint_logs (PICKING_COMPLETED)
    end

    Packer->>API: POST /api/outbound/:id/pack (Kemas & Segel)
    API->>DB: INSERT INTO packages (box_code, weight_kg)
    API->>DB: INSERT INTO checkpoint_logs (PACKING_COMPLETED)

    Note over Cust,API: TERBIT SURAT JALAN + RESI (SEMUA JENIS PENGIRIMAN)
    Cust->>API: POST /api/outbound/:id/issue-waybill
    API->>API: Generate SJ-XXXX dan RESI-XXXX otomatis
    API->>DB: INSERT INTO waybills (sj_number, resi_number, outbound_order_id, Status: ISSUED)
    API->>DB: INSERT INTO checkpoint_logs (WAYBILL_ISSUED)
    API-->>Cust: SJ + Resi siap dicetak (thermal ESC/POS)

    opt Muatan Curah / Berat
        Satpam->>API: POST /api/weighbridge (Timbang Truk Keluar: Gross - Tare)
        API->>DB: INSERT INTO weighbridge_logs (reference_type: OUTBOUND_ORDER)
    end

    Note over Driver,Satpam: Pos Satpam Keluar: Pool = Gate Pass (Odometer/BBM), Vendor = Log Vendor (Nama Vendor + Nopol + Resi)
    Satpam->>API: POST /api/fleet/departure atau /api/fleet/vendor-exit
    API->>DB: UPDATE outbound_orders (Status: SHIPPED, shipped_at: NOW)
    API->>DB: INSERT INTO checkpoint_logs (FLEET_DEPARTED / VENDOR_EXIT)

    Driver->>Recipient: Antar Barang ke Alamat Tujuan
    Recipient->>Driver: Tanda Tangan Digital & Terima Fisik

    Driver->>API: POST /api/outbound/:id/pod
    Note over Driver,API: Upload Foto Serah Terima & TTD Digital Penerima
    API->>DB: INSERT INTO pod_documents (Status: ACCEPTED)
    API->>DB: UPDATE outbound_orders (Status: DELIVERED)
    API->>DB: INSERT INTO checkpoint_logs (DELIVERED)

    Admin->>API: POST /api/outbound/:id/verify-pod (Verifikasi Admin)
    API->>DB: UPDATE pod_documents (verified_at: NOW)
    API->>DB: UPDATE outbound_orders (Status: POD_VERIFIED, billing_ready: TRUE)
    API->>DB: INSERT INTO checkpoint_logs (POD_VERIFIED, actor_name: Admin)
    API-->>Admin: AKHIR TUNGGAL: Order Siap Ditagih (Billing)
```

---

## 4. Dampak ke Aplikasi (Rencana Implementasi Backend)

1. **Tabel baru `waybills`:** `id, sj_number (SJ-XXXXXXXX, unique), resi_number (RESI-XXXXXXXX, unique), reference_type (OUTBOUND_ORDER | CROSS_DOCK_MANIFEST), reference_id, issued_by_id, issued_by_name, issued_at, status (ISSUED | PRINTED | IN_TRANSIT | POD_VERIFIED | VOID), notes, created_at`. Cross-doc `cross_documents.target_document_number` tetap dipertahankan sebagai varian blind shipping; waybill generik menjadi penerbitan utama semua jalur.
2. **Endpoint baru:** `POST /api/outbound/:id/issue-waybill` (auto-generate SJ + resi; dipanggil setelah pack atau langsung pada jalur cross-dock/KDMP), `GET /api/waybills?status=`, opsional `POST /api/waybills/:id/void`.
3. **Kolom `billing_ready`** pada `outbound_orders` (true saat `POD_VERIFIED`) sebagai penanda tunggal untuk modul penagihan.
4. **Frontend:** tombol "Terbitkan SJ + Resi" di halaman outbound (setelah packing) dengan struk thermal; halaman POD menampilkan nomor resi; daftar waybill dengan filter status.
5. **Checkpoint audit:** `WAYBILL_ISSUED` masuk rantai checkpoint dengan nama petugas penerbit wajib (kepatuhan `Mandatory Petugas Name`).
