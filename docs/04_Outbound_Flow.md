# 04_Outbound_Flow.md

**Document:** Outbound Fulfillment & Delivery Flow Specification  
**Flow Sequence:** Order Creation → Picking from Bins → Packing & Boxing → Fleet Exit Gate Pass → Shipping Delivery → Customer POD & Photo → Admin POD Verification  
**Version:** 1.0.0  
**Status:** LOCKED & ACTIVE  

---

## 1. Diagram Alur Outbound (End-to-End Outbound Flow)

```mermaid
flowchart TD
    classDef action fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef evidence fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef gate fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef alert fill:#ffebee,stroke:#c62828,stroke-width:2px;

    REQ([Permintaan Order Pelanggan\nCustomer Request / Sales Order]) --> STEP1[1. Order Created\nActor: ADMIN_ADM / CUSTOMER\nInput: SKU[], Qty, Destination, Recipient]:::action

    STEP1 --> STEP2[2. Picking from Bin Locations\nActor: WH_STAFF\nInput: picked_qty, source_bin\nEvidence: Foto Pengambilan + Nama Petugas\nStock Update: on_hand (-), reserved (+)]:::evidence

    STEP2 --> STEP3[3. Packing & Boxing\nActor: WH_STAFF\nInput: box_code, weight_kg, dimensions\nEvidence: Foto Kardus Tersegel + Nama Petugas]:::evidence

    STEP3 --> STEP4[4. Pencatatan Armada Keluar\nActor: SATPAM / PETUGAS GERBANG\nInput: Odometer Out, BBM, Surat Jalan, Foto Armada\nStatus: DEPARTED]:::gate

    STEP4 --> STEP5[5. Shipping / Delivery in Progress\nActor: DRIVER\nStatus Order: SHIPPED\nStock Update: reserved (-)]:::action

    STEP5 --> STEP6[6. Customer Delivery & POD Signing\nActor: DRIVER + RECIPIENT\nEvidence: Tanda Tangan Penerima + Foto Serah Terima\nStatus: DELIVERED]:::evidence

    STEP6 --> STEP7[7. POD Verification\nActor: ADMIN_ADM\nValidasi: Keabsahan TTD, Foto, Kelengkapan Qty\nStatus: POD_VERIFIED]:::action

    STEP7 --> COMPLETED([Outbound Selesai\nStatus: COMPLETED]):::action

    %% Alert SLA monitoring
    ALERT_POD[⚠ Alert POD Tertunda\nH+1 dari Delivered belum diverifikasi]:::alert -.-> STEP7
```

---

## 2. Rincian Langkah Operasional (Step-by-Step Matrix)

| Step | Nama Tahap | Pelaku (Actor) | Masukan (Input) | Proses & Validasi | Bukti (Evidence) | Dampak Database | Notifikasi |
|:---:|---|---|---|---|---|---|---|
| **1** | **Order Created** | ADMIN_ADM / CUSTOMER | Nama Penerima, Alamat Tujuan, No. Telepon, Daftar SKU & Kuantitas Pesanan | Validasi ketersediaan stok fisik di gudang pengirim. | Dokumen Surat Jalan / Order | `outbound_orders` (status=`CREATED`), `outbound_items` | WH_STAFF, WH_MANAGER |
| **2** | **Picking** | WH_STAFF | Alokasi Bin Lokasi (`warehouse_locations`), Kuantitas Ambil Fisik | Pengambilan barang dari rak penyimpanan (*picking list*). | Foto pengambilan barang di rak, Nama Petugas Picker | `outbound_orders` (status=`PICKING` → `PICKED`), `stock_levels.qty_reserved (+)`, `warehouse_locations.current_qty (-)` | WH_MANAGER |
| **3** | **Packing** | WH_STAFF | Kode Koli/Kardus, Berat Total (kg), Dimensi Kardus | Pengepakan barang, pelabelan alamat, penyegelan kotak (*seal tape*). | Foto kardus tersegel dengan label, Nama Petugas Packer | `outbound_orders` (status=`PACKED`), `packages` | ADMIN_ADM, Pengemudi |
| **4** | **Fleet Exit Logged** | PETUGAS GERBANG (Satpam) | No. Order Outbound, Odometer Out, BBM Out, Foto Kendaraan | Verifikasi fisik koli muatan dengan surat jalan outbound saat melewati gerbang pos satpam. | Foto armada saat gerbang keluar, Nama Petugas Satpam | `fleet_exit_logs` (status=`DEPARTED`), `checkpoint_logs` (`FLEET_DEPARTED`) | ADMIN_ADM, Pelanggan |
| **5** | **Shipping** | DRIVER | Armada Truk / Kurir | Keberangkatan armada menuju alamat pelanggan tujuan. | Status Pengiriman | `outbound_orders` (status=`SHIPPED`, `shipped_at`), `stock_levels.qty_on_hand (-)`, `stock_levels.qty_reserved (-)` | Pelanggan |
| **6** | **Delivered & POD** | DRIVER + RECIPIENT | Nama Jelas Penerima, Foto Serah Terima Fisik, Tanda Tangan Digital | Penyerahan barang di lokasi penerima, pengecekan keutuhan segel koli. | Foto barang di lokasi penerima + Tanda tangan digital penerima | `outbound_orders` (status=`DELIVERED`, `delivered_at`), `pod_documents` | ADMIN_ADM |
| **7** | **POD Verified** | ADMIN_ADM | Review Dokumen POD, Foto, dan TTD | Verifikasi keabsahan dokumen POD untuk penyelesaian order dan dasar *billing/invoicing*. | Verifikasi Admin tercatat di sistem | `outbound_orders` (status=`POD_VERIFIED`), `pod_documents.status='ACCEPTED'` | CUSTOMER, WH_MANAGER |

---

## 3. Aturan Bisnis Outbound (Business Rules)

| Kode Aturan | Deskripsi Aturan | Validasi Sistem | Pesan Kesalahan |
|---|---|---|---|
| **BR-OUT-01** | **Ketersediaan Stok On-Hand:** Pesanan tidak dapat dibuat jika kuantitas pesanan melebihi stok yang tersedia (`qty_on_hand - qty_reserved`). | `ordered_qty <= (stock_levels.qty_on_hand - stock_levels.qty_reserved)` | "Stok on-hand tidak mencukupi untuk memenuhi pesanan ini." |
| **BR-OUT-02** | **Wajib Bukti POD Lengkap:** Status `DELIVERED` tidak dapat disimpan tanpa melampirkan foto serah terima dan tanda tangan penerima. | `pod_photo_url NOT NULL AND signature_photo_url NOT NULL` | "Bukti POD wajib menyertakan foto serah terima dan tanda tangan penerima." |
| **BR-OUT-03** | **SLA Verifikasi POD:** Admin wajib memverifikasi dokumen POD maksimal H+1 setelah status `DELIVERED`. | `now() - delivered_at > 24 hours` | Memicu Alert `CHECKPOINT_TIMEOUT` |
| **BR-OUT-04** | **Wajib Nama Petugas di Setiap Tahap:** Picking, Packing, Satpam Keluar, dan Verifikator POD wajib tercatat identitas namanya. | Checkpoint Actor validation | "Identitas nama petugas pelaksana wajib diisi lengkap." |
