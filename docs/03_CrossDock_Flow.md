# 03_CrossDock_Flow.md

**Document:** Cross-Dock & Inter-Hub Transit Flow Specification  
**Flow Sequence:** Manifest Creation → Loading to Truck → Fleet Exit Gate Pass → In-Transit Tracking → Receive at Destination Warehouse → Stock Ledger Update  
**Version:** 1.0.0  
**Status:** LOCKED & ACTIVE  

---

## 1. Diagram Alur Cross-Dock & Inter-Hub Transit

```mermaid
flowchart TD
    classDef action fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef decision fill:#fffde7,stroke:#fbc02d,stroke-width:2px;
    classDef evidence fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef gate fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef alert fill:#ffebee,stroke:#c62828,stroke-width:2px;

    REQ([Permintaan Transfer Pelanggan / Alokasi Cross-Dock Inbound]) --> STEP1[1. Manifest Created\nActor: ADMIN_ADM\nInput: Dest WH, Vehicle, Driver, SKU[], Qty]:::action

    STEP1 --> STEP2[2. Physical Loading to Truck\nActor: WH_STAFF + DRIVER\nEvidence: Foto Muatan + Nama Petugas\nStock Update: on_hand Main (-), in_transit (+)]:::evidence

    STEP2 --> STEP3[3. Pencatatan Armada Keluar\nActor: SATPAM / PETUGAS GERBANG\nInput: Odometer, BBM, Surat Jalan, Foto Truk\nStatus: DEPARTED]:::gate

    STEP3 --> STEP4[4. In-Transit Movement\nActor: DRIVER / SYSTEM\nStatus Manifest: IN_TRANSIT\nMonitoring SLA & ETA]:::action

    STEP4 --> STEP5[5. Physical Receive at Destination\nActor: WH_STAFF Transit Hub\nEvidence: Foto Bongkar + Nama Petugas Penerima]:::evidence

    STEP5 --> DECIDE_VAR{Ada Selisih Fisik?\nreceived_qty vs loaded_qty}:::decision
    DECIDE_VAR -->|Variance > 0| ALERT_VAR[⚠ Alert Selisih Transit\nLaporan Investigasi]:::alert
    DECIDE_VAR -->|Sesuai| STEP6
    ALERT_VAR --> STEP6

    STEP6[6. Stock Ledger Updated Transit Hub\nSystem Automatic Ledger\nStock Update: in_transit (-), on_hand Dest (+)]:::action

    STEP6 --> STEP7[7. Gate Return / Pencatatan Armada Kembali\nActor: SATPAM Hub Tujuan/Asal\nInput: Odometer In, BBM In, Status: RETURNED]:::gate

    STEP7 --> COMPLETED([Transfer Cross-Dock Selesai\nStatus: COMPLETED]):::action

    %% Timeout & Delay alerts
    ALERT_DELAY[⚠ Alert Keterlambatan Transit\nLewat ETA + Buffer 3 Jam]:::alert -.-> STEP4
```

---

## 2. Rincian Langkah Operasional (Step-by-Step Matrix)

| Step | Nama Tahap | Pelaku (Actor) | Masukan (Input) | Proses & Validasi | Bukti (Evidence) | Dampak Database | Notifikasi |
|:---:|---|---|---|---|---|---|---|
| **1** | **Manifest Created** | ADMIN_ADM | Hub Asal, Hub Tujuan, No. Polisi Truk, Driver, Daftar SKU & Kuantitas Rencana | Pembuatan nomor manifest resmi, validasi ketersediaan stok/alokasi cross-dock. | Dokumen Surat Muat / Manifest | `cross_dock_manifests` (status=`CREATED`), `cross_dock_items` | WH_STAFF (Asal), DRIVER, WH_MANAGER |
| **2** | **Loaded to Truck** | WH_STAFF + DRIVER | Kuantitas Muat Aktual per SKU | Pemuatan barang ke dalam bak/box truk, penataan muatan, serah terima staf gudang ke pengemudi. | Foto muatan dalam truk, TTD digital/Nama Petugas Muat | `cross_dock_manifests` (status=`LOADED`), `stock_levels` (Main: `qty_on_hand -`, `qty_in_transit +`), `stock_movements` (`CROSS_DOCK_OUT`) | ADMIN_ADM, Pos Satpam Gerbang |
| **3** | **Fleet Exit Logged** | PETUGAS GERBANG (Satpam) | No. Manifest, Odometer Out, Indikator BBM Out, Foto Truk Keluar | Pemeriksaan segel box, kesesuaian surat jalan, pencatatan waktu keluar pos satpam. | Foto gerbang keluar, Nama Petugas Satpam | `fleet_exit_logs` (status=`DEPARTED`), `checkpoint_logs` (`FLEET_DEPARTED`) | ADMIN_ADM, WH_MANAGER Hub Asal & Tujuan |
| **4** | **In-Transit** | DRIVER / SYSTEM | Waktu Keberangkatan, ETA Kedatangan | Perjalanan darat/antar-pulau antar hub logistik. | Log GPS / Checkpoint Waktu | `cross_dock_manifests` (status=`IN_TRANSIT`) | WH_MANAGER (Tujuan) |
| **5** | **Received at Destination** | WH_STAFF (Hub Transit) | Kuantitas Terima Fisik, Pengecekan Kondisi Fisik Kemasan | Pembongkaran muatan di hub transit, penghitungan fisik per koli/unit. | Foto pembongkaran muatan, Nama Petugas Penerima | `cross_dock_manifests` (status=`RECEIVED_DEST`), `cross_dock_items.received_qty` | ADMIN_ADM, WH_MANAGER (Asal & Tujuan) |
| **6** | **Stock Update Transit** | SYSTEM | Data Penerimaan Fisik Hub Transit | Sistem memindahkan status stok dari *in-transit* menjadi stok aktif *on-hand* pada gudang transit tujuan. | Checkpoint Sistem | `stock_levels` (Dest: `qty_on_hand +`, `qty_in_transit -`), `stock_movements` (`CROSS_DOCK_IN`) | ADMIN_ADM (Selesai) |

---

## 3. Aturan Bisnis Cross-Dock (Business Rules)

| Kode Aturan | Deskripsi Aturan | Validasi Sistem | Pesan Kesalahan |
|---|---|---|---|
| **BR-CD-01** | **Batas Muat Stok:** Jumlah barang yang dimuat tidak boleh melebihi stok yang tersedia di gudang asal. | `loaded_qty <= stock_levels.qty_on_hand` | "Kuantitas muat melebihi stok on-hand gudang asal." |
| **BR-CD-02** | **Kapasitas Beban Kendaraan:** Total berat barang yang dimuat tidak boleh melebihi daya angkut maksimal armada (`vehicles.capacity_kg`). | `sum(loaded_qty * product.weight_kg) <= vehicle.capacity_kg` | "Kapasitas muatan melebihi batas tonase armada truk." |
| **BR-CD-03** | **Wajib Gate Pass Keluar:** Armada tidak boleh berstatus *In-Transit* tanpa ada log pencatatan keluar gerbang pos satpam. | `fleet_exit_logs` linked to manifest | "Armada wajib melalui pencatatan Pos Satpam Keluar sebelum berangkat." |
| **BR-CD-04** | **Deteksi Selisih Terima (Variance):** Jika `received_qty != loaded_qty`, sistem langsung mengkalkulasi selisih dan memicu alert audit. | `variance_qty = received_qty - loaded_qty` | "Selisih kuantitas muat vs terima terdeteksi. Wajib mengisi berita acara selisih." |
