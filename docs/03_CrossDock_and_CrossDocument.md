# 03_CrossDock_and_CrossDocument.md

**Document:** Cross-Docking & Cross-Document Operations  
**Definitions:** Line-Haul Inter-Hub Transfer, Document Swap, Re-issuance, Sub-AWB & Sub-SJ Generation  
**Version:** 2.0.0  
**Status:** LOCKED & ACTIVE  

---

## 1. Definisi & Standar Industri Cross Document

Dalam industri logistik, pergudangan, dan 3PL (*Third-Party Logistics*), **Cross Document (Cross-Doc)** adalah:

> **Proses mengubah, mengganti, atau menerbitkan ulang dokumen pengiriman**—seperti Surat Jalan (SJ), Delivery Note (DN), atau Airway Bill (AWB)—untuk menyesuaikan informasi logistik, alamat tujuan, rute pengiriman, atau menjaga kerahasiaan komersial sebelum barang dikirimkan ke penerima akhir (*consignee*).

### 1.1 Skenario Penggunaan Cross Document
1. **Blind Shipping (Kerahasiaan Vendor Asal):**
   - Supplier mengirim barang ke Gudang Hub dengan Surat Jalan Supplier mencantumkan harga dan nama pabrik.
   - Gudang menerbitkan Surat Jalan Pengiriman Baru (*Blind Delivery Note*) yang ditujukan ke pelanggan akhir tanpa mencantumkan identitas pabrik asal.
2. **De-konsolidasi Sub-Surat Jalan (Hub-and-Spoke Spoke Route):**
   - 1 Master PO/Manifest dari Jakarta membawa 500 koli barang untuk area Bali.
   - Di Gudang Transit Denpasar, dokumen dipecah menjadi 10 Sub-Surat Jalan (*House SJ / Delivery Note*) untuk masing-masing toko retail di Denpasar, Tabanan, Singaraja.
3. **Penyatuan / Konsolidasi Dokumen:**
   - Menggabungkan barang dari 3 supplier berbeda menjadi 1 Surat Jalan Pengiriman Konsolidasi untuk 1 customer besar.

---

## 2. Diagram Alur Cross-Docking & Cross-Document (Flowchart)

```mermaid
flowchart TD
    classDef action fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef xdoc fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef gate fill:#fff3e0,stroke:#e65100,stroke-width:2px;
    classDef transit fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;

    INB(["Barang Tiba di Staging Cross-Dock Hub Jakarta"]):::action --> DECIDE_DOC{"Perlu Cross-Doc? (Ganti Dokumen / Blind SJ / Sub-AWB)"}

    DECIDE_DOC -->|Ya| XDOC_CREATE["1. Terbitkan Cross Document - Swap SJ Asal ke SJ Baru (Blind Shipping / Sub-Distribution)"]:::xdoc
    DECIDE_DOC -->|Tidak| MANIFEST_CREATE

    XDOC_CREATE --> MANIFEST_CREATE["2. Buat Manifest Transfer Antar-Hub (Gudang Tujuan, No Polisi, Driver, SKU)"]:::action

    MANIFEST_CREATE --> LOAD_TRUCK["3. Muat ke Truk dan Tempel Dokumen Baru (Stock: on_hand Main berkurang, in_transit bertambah)"]:::action

    LOAD_TRUCK --> GATE_PASS["4. Pos Satpam Gerbang Keluar - Pencatatan Armada: Odometer, BBM, Surat Jalan Sah (Status: DEPARTED)"]:::gate

    GATE_PASS --> IN_TRANSIT["5. Perjalanan Armada In-Transit - Monitoring Waktu dan ETA"]:::gate

    IN_TRANSIT --> ARRIVAL_DEST["6. Tiba di Gudang Transit Spoke - Bongkar dan Hitung Fisik Barang (Stock: in_transit berkurang, on_hand Transit bertambah)"]:::transit

    ARRIVAL_DEST --> DISPATCH_LOCAL(["7. Distribusi Last-Mile Menggunakan Dokumen Surat Jalan Baru / Sub-SJ"]):::transit
```

---

## 3. Diagram Sequence Cross-Document & Cross-Dock (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin Adm
    actor Staff as WH Staff
    actor Satpam as Pos Satpam Gerbang
    actor Driver as Pengemudi Truk
    participant API as WMS Simple API
    participant DB as Host PostgreSQL

    Note over Admin,API: 1. Proses Cross-Document (Swap Dokumen)
    Admin->>API: POST /api/crossdoc
    Note over Admin,API: Swap Dokumen: SJ Supplier diganti Blind Delivery Note Resmi WMS
    API->>DB: INSERT INTO cross_documents & cross_document_items
    API->>DB: INSERT INTO checkpoint_logs (CROSS_DOC_ISSUED)
    DB-->>API: Cross-Doc Created (XDOC-XXXX)

    Note over Admin,API: 2. Pembuatan Manifest & Pemuatan Truk
    Admin->>API: POST /api/crossdock (Buat Manifest MNF-XXXX)
    Staff->>API: POST /api/crossdock/:id/load (Loading ke Truk Tronton)
    API->>DB: UPDATE stock_levels (Main: on_hand -, in_transit +)
    API->>DB: INSERT stock_movements (CROSS_DOCK_OUT)
    API->>DB: INSERT INTO checkpoint_logs (MANIFEST_LOADED)

    Note over Satpam,API: 3. Gate Pass Keberangkatan
    Satpam->>API: POST /api/fleet/departure
    Note over Satpam,API: Validasi Dokumen XDOC-XXXX & MNF-XXXX, Odometer: 45.200 km, BBM: FULL
    API->>DB: INSERT INTO fleet_exit_logs (Status: DEPARTED)
    API->>DB: UPDATE vehicles SET status = 'IN_USE'
    API->>DB: INSERT INTO checkpoint_logs (FLEET_DEPARTED)

    Note over Driver,Staff: 4. Perjalanan & Penerimaan di Gudang Transit (Bali)
    Driver->>Staff: Truk Tiba di Gudang Transit Bali
    Staff->>API: POST /api/crossdock/:id/receive-dest (Penerimaan Fisik)
    API->>DB: UPDATE stock_levels (Bali: on_hand +, in_transit -)
    API->>DB: INSERT stock_movements (CROSS_DOCK_IN)
    API->>DB: INSERT INTO checkpoint_logs (RECEIVED_AT_DEST)
    API-->>Staff: Konfirmasi Transfer Selesai & Siap Diantar ke Konsumen
```
