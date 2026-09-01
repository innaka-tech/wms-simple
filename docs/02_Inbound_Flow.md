# 02_Inbound_Flow.md

**Document:** Inbound Operational Flow Specification  
**Flow Sequence:** Customer Request → PO Creation → PO Physical Receive → Sorting Decision → Putaway / Staging → Stock Ledger Update  
**Version:** 1.0.0  
**Status:** LOCKED & ACTIVE  

---

## 1. Diagram Alur Inbound (End-to-End Inbound Flow)

```mermaid
flowchart TD
    classDef action fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef decision fill:#fffde7,stroke:#fbc02d,stroke-width:2px;
    classDef evidence fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef alert fill:#ffebee,stroke:#c62828,stroke-width:2px;

    REQ([Permintaan Pelanggan / PO Masuk\nEmail / Dokumen Fisik / Telepon]) --> STEP1[1. PO Created\nActor: ADMIN_ADM\nInput: Customer, SKU[], Qty, ETA]:::action
    
    STEP1 --> STEP2[2. PO Physical Receive\nActor: WH_STAFF\nInput: received_qty, condition, truck_plate\nEvidence: Foto Kedatangan + Nama Petugas]:::evidence

    STEP2 --> DECIDE_QTY{Validasi Kuantitas?\nreceived_qty vs ordered_qty}:::decision
    DECIDE_QTY -->|Shortage / Overage| ALERT_VAR[⚠ Alert Selisih PO\nNotifikasi Admin]:::alert
    DECIDE_QTY -->|Sesuai| STEP3
    ALERT_VAR --> STEP3

    STEP3[3. Sorting Decision\nActor: WH_STAFF\nAlokasi: cross_dock_qty & storage_qty]:::decision

    STEP3 -->|cross_dock_qty > 0| STEP3_CD[Alokasi Cross-Dock\nPindahkan ke Staging Hub\nSiap Dibuatkan Manifest]:::action
    STEP3 -->|storage_qty > 0| STEP3_PUT[Alokasi Storage Putaway\nActor: WH_STAFF\nInput: location_id / Bin\nEvidence: Foto Rak + Nama Petugas]:::evidence

    STEP3_CD --> STEP4[4. Stock Ledger Updated\nSystem Automatic Ledger]:::action
    STEP3_PUT --> STEP4

    STEP4 --> COMPLETED([Inbound Selesai\nStatus: PUTAWAY_COMPLETED]):::action

    %% Timeout monitoring
    ALERT_TIMEOUT[⚠ Inbound Timeout Alert\nH+1 dari ETA tanpa Receive]:::alert -.-> STEP2
```

---

## 2. Rincian Langkah Operasional (Step-by-Step Matrix)

| Step | Nama Tahap | Pelaku (Actor) | Masukan (Input) | Proses & Validasi | Bukti (Evidence) | Dampak Database | Notifikasi |
|:---:|---|---|---|---|---|---|---|
| **1** | **PO Created** | ADMIN_ADM | No. PO, Pelanggan, Daftar SKU, Jumlah Pesanan, Estimasi Waktu Tiba (ETA) | Pembuatan dokumen PO sistem, penentuan gudang penerima (Main Hub). | Nomor PO resmi | `inbound_orders` (status=`CREATED`), `inbound_items` | WH_MANAGER, WH_STAFF |
| **2** | **PO Received** | WH_STAFF | No. Plat Truk Pengirim, Nama Sopir Pengirim, Kuantitas Fisik Barang, Kondisi Barang | Penghitungan fisik barang (*tally count*), pengecekan kerusakan kemasan, pencatatan identitas staf pemeriksa. | Foto barang saat dibongkar, Nama Petugas | `inbound_orders` (status=`RECEIVED`, `actual_received_at`), `inbound_items.received_qty` | ADMIN_ADM, WH_MANAGER |
| **3** | **Sorting Decision** | WH_STAFF | Alokasi Cross-Dock Qty vs Storage Qty | Menentukan barang yang langsung ditransfer ke cabang luar kota vs disimpan di rak gudang utama. | Catatan staging area | `inbound_orders` (status=`SORTED`), `inbound_items.cross_dock_qty`, `inbound_items.storage_qty` | ADMIN_ADM |
| **4** | **Storage Putaway** | WH_STAFF | ID Lokasi Bin/Rak (`warehouse_locations`) | Menempatkan barang ke rak penyimpanan sesuai kapasitas bin. | Foto barang di dalam rak, Nama Petugas | `warehouse_locations.current_qty (+)`, `inbound_items.location_id` | WH_MANAGER |
| **5** | **Stock Update** | SYSTEM | Data putaway & cross-dock | Sistem secara otomatis mencatat mutasi stok dan memperbarui saldo on-hand. | Checkpoint Log Sistem | `stock_levels.qty_on_hand (+)`, `stock_movements` (type=`INBOUND_PUTAWAY`) | ADMIN_ADM |

---

## 3. Aturan Bisnis Inbound (Business Rules)

| Kode Aturan | Deskripsi Aturan | Validasi Sistem | Pesan Kesalahan |
|---|---|---|---|
| **BR-INB-01** | **Wajib Nama Petugas:** Setiap tindakan *receive* dan *putaway* wajib menyertakan nama personel. | `actor_name NOT NULL AND length(actor_name) >= 3` | "Nama petugas pemeriksa wajib diisi lengkap." |
| **BR-INB-02** | **Integritas Alokasi:** Total kuantitas *cross-dock* ditambah *storage* harus sama persis dengan kuantitas yang diterima fisik. | `cross_dock_qty + storage_qty = received_qty` | "Jumlah Cross-Dock + Storage harus sama dengan jumlah yang diterima fisik." |
| **BR-INB-03** | **Kapasitas Lokasi Penyimpanan:** Jumlah barang yang disimpan ke bin tidak boleh melebihi sisa kapasitas bin. | `locations.current_qty + storage_qty <= locations.capacity_units` | "Kapasitas rak/bin lokasi penyimpanan tidak mencukupi." |
| **BR-INB-04** | **Urutan Status Terkunci:** Status tidak boleh melompati tahapan (misal dari `CREATED` langsung ke `PUTAWAY_COMPLETED`). | Status transition validation | "Perubahan status tidak valid. Alur harus urut: CREATED → RECEIVED → SORTED → PUTAWAY_COMPLETED." |

---

## 4. Penanganan Pengecualian (Exception Handling)

1. **Barang Kurang (*Shortage*):** `received_qty < ordered_qty`
   - Sistem menandai item dengan kondisi `SHORTAGE`.
   - PO masuk status parsial dan sistem memicu alert ke ADMIN_ADM untuk konfirmasi sisa barang apakah akan dikirim susulan atau ditutup.
2. **Barang Lebih (*Overage*):** `received_qty > ordered_qty`
   - Barang lebih dipisahkan di area karantina.
   - ADMIN_ADM mengonfirmasi apakah dibuatkan PO Tambahan atau diretur ke vendor pengirim.
3. **Barang Rusak (*Damaged*):**
   - Diunggah foto kerusakan ke sistem. Item dikarantina terpisah dan tidak dimasukkan ke stok *on-hand* yang dapat dijual/didistribusikan.
