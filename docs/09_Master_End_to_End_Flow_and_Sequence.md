# 09_Master_End_to_End_Flow_and_Sequence.md

**Document:** Master Diagram Alur & Urutan Kerja (End-to-End Operational Flow)  
**System:** WMS Simple Enterprise  
**Version:** 2.4.0 (Simplified Logistics Jargon)  
**Status:** ACTIVE  

---

## 1. Diagram Alur Operasional Gudang (Master Flowchart)

Diagram ini menggambarkan seluruh proses fisik barang dari saat truk tiba di gudang utama hingga barang diserahterimakan ke tujuan akhir (toko/balai desa). Bahasa yang digunakan disesuaikan dengan istilah operasional logistik sehari-hari.

```mermaid
flowchart TD
    classDef vendor fill:#e1f5fe,stroke:#0288d1,stroke-width:1.5px;
    classDef mainHub fill:#f3e5f5,stroke:#7b1fa2,stroke-width:1.5px;
    classDef debulk fill:#fff3e0,stroke:#f57c00,stroke-width:1.5px;
    classDef xdoc fill:#fce4ec,stroke:#c2185b,stroke-width:1.5px;
    classDef gate fill:#efebe9,stroke:#5d4037,stroke-width:1.5px;
    classDef transit fill:#e8f5e9,stroke:#388e3c,stroke-width:1.5px;
    classDef outbound fill:#e0f2f1,stroke:#00796b,stroke-width:1.5px;
    classDef alert fill:#ffebee,stroke:#c62828,stroke-width:1.5px;

    VENDOR(["1. Truk Supplier Tiba (Bawa Barang Packaged, Karungan, Curah, atau Showcase)"]):::vendor --> WB_CHECK{"Bawa Barang Curah / Berat?"}
    
    WB_CHECK -->|Ya| WB_IN["Timbang Truk (Weighbridge)"]:::mainHub
    WB_CHECK -->|Tidak| DOCK_RCV["Penerimaan di Dock (Tally Fisik, Scan Barcode, Foto Barang)"]:::mainHub
    WB_IN --> DOCK_RCV

    DOCK_RCV --> SORT_DECISION{"2. Mau Dikemanakan Barangnya?"}

    SORT_DECISION -->|Perlu Dipecah / Dikemas Ulang| DEBULK_WO["3A. Proses Repacking / Pencurahan (Dari Jumbo Bag ke Karung)"]:::debulk
    DEBULK_WO --> DEBULK_CALC["Timbang Hasil Repacking dan Hitung Susut (Shrinkage)"]:::debulk
    DEBULK_CALC --> LOSS_CHECK{"Susut > 1.0%?"}:::debulk
    LOSS_CHECK -->|Ya| ALERT_LOSS["Peringatan: Susut Barang Terlalu Tinggi!"]:::alert
    LOSS_CHECK -->|Tidak| PUTAWAY_STORAGE
    ALERT_LOSS --> PUTAWAY_STORAGE

    SORT_DECISION -->|Simpan ke Rak| PUTAWAY_STORAGE["3B. Simpan Barang (Putaway) ke Lokasi Rak / Area Simpan"]:::mainHub

    SORT_DECISION -->|Transit Cepat (Cross-Dock)| XDOC_CHECK{"Perlu Tukar Surat Jalan?"}
    XDOC_CHECK -->|Ya| XDOC_SWAP["3C. Cetak Surat Jalan Baru / Surat Jalan Titipan (Blind DO)"]:::xdoc
    XDOC_CHECK -->|Tidak| CD_MANIFEST
    XDOC_SWAP --> CD_MANIFEST["4. Buat Surat Muat (Manifest) dan Loading ke Truk Antar-Kota"]:::mainHub

    CD_MANIFEST --> GATE_OUT["5. Pos Satpam Keluar (Cek Surat Jalan, KM Odometer, Sisa BBM)"]:::gate
    GATE_OUT --> TRANSIT_TRIP["6. Truk Berangkat Antar-Kota (In-Transit)"]:::gate
    TRANSIT_TRIP --> ARRIVE_TRANSIT["7. Tiba di Gudang Cabang (Bongkar Muat dan Cek Fisik)"]:::transit

    PUTAWAY_STORAGE --> OUT_ORDER["8. Terima Permintaan Kirim (Sales Order / DO)"]:::outbound
    ARRIVE_TRANSIT --> OUT_ORDER

    OUT_ORDER --> PICK_PACK["9. Ambil Barang dari Rak (Picking) dan Muat (Loading)"]:::outbound
    PICK_PACK --> GATE_OUT_DELIV["10. Pos Satpam Keluar (Gate Pass Pengiriman)"]:::gate
    GATE_OUT_DELIV --> SHIPPING["11. Truk Berangkat Kirim ke Toko / Balai Desa"]:::outbound

    SHIPPING --> POD_SUBMIT["12. Serah Terima Barang (Bukti Kirim Elektronik / e-POD / BAST)"]:::outbound
    POD_SUBMIT --> ADMIN_VERIFY["13. Admin Memeriksa Bukti Kirim (Siap Penagihan/Billing)"]:::mainHub
    SHIPPING --> GATE_IN["14. Truk Kembali ke Pool (Satpam Cek Odometer Akhir)"]:::gate
    GATE_IN --> MASTER_END(["15. Transaksi Selesai dan Kartu Stok Terkunci Mutlak"]):::mainHub
```

---

## 2. Urutan Interaksi Sistem (Sequence Diagram)

Diagram ini menunjukkan interaksi antara tim lapangan, sistem (Hono API), Database (PostgreSQL), dan sistem pelacakan riwayat (Audit Trail/Log Status).

```mermaid
sequenceDiagram
    autonumber
    actor Vendor as Supplier / Driver
    actor Staff as Admin Gudang / Checker
    actor Satpam as Satpam Pos Gerbang
    actor Driver as Sopir WMS
    actor Recipient as Penerima (Toko/Desa)
    actor Admin as Admin Pusat
    participant API as Aplikasi WMS (Backend)
    participant DB as Database (PostgreSQL)
    participant Audit as Log Riwayat Status (Audit Trail)

    Note over Vendor,Audit: FASE 1: PENERIMAAN BARANG MASUK (INBOUND)
    Vendor->>Staff: Truk Supplier tiba di Gudang Utama Jakarta
    opt Jika Bawa Barang Curah / Muatan Besar
        Staff->>API: Catat Timbangan Truk (Gross Weight: 28.500 KG)
        API->>DB: Simpan Data Timbangan (weighbridge)
    end
    Staff->>API: Tally Penerimaan Fisik (Update status Penerimaan, Petugas: Budi)
    API->>DB: Update Status PO menjadi "DITERIMA"
    API->>Audit: Simpan Log: "Barang Diterima oleh Budi"

    Note over Staff,Audit: FASE 2: PEMECAHAN KEMASAN BESAR (REPACKING / DE-BULKING)
    opt Jika Kemasan 1 Ton dipecah ke Karung 25 KG
        Staff->>API: Catat hasil repacking (Input 1.000 KG -> Jadi 995 KG)
        API->>DB: Potong stok Jumbo Bag, Tambah stok Karung
        API->>API: Sistem menghitung susut: 5 KG (Aman, di bawah 1%)
        API->>Audit: Simpan Log: "Proses Repacking Selesai"
    end

    Note over Admin,Audit: FASE 3: TRANSIT CEPAT (CROSS-DOCK) dan GANTI SURAT JALAN
    opt Jika perlu menyembunyikan nama Supplier asli (Blind Shipping)
        Admin->>API: Tukar Surat Jalan (Ganti dengan Surat Jalan Titipan)
        API->>DB: Cetak Dokumen Baru (cross_documents)
        API->>Audit: Simpan Log: "Surat Jalan Titipan Dicetak"
    end
    Admin->>API: Buat Surat Muat Antar-Kota (Manifest ke Bali)
    Staff->>API: Konfirmasi Loading barang ke Truk Tronton
    API->>DB: Update Kartu Stok (Barang statusnya "Dalam Perjalanan")
    API->>Audit: Simpan Log: "Loading Manifest Selesai"

    Note over Driver,Audit: FASE 4: POS SATPAM KELUAR (GATE PASS)
    Driver->>Satpam: Truk tiba di Pos Keluar membawa dokumen jalan
    Satpam->>API: Cek Surat Jalan, Catat Odometer dan Sisa BBM
    API->>DB: Simpan Catatan Keberangkatan Truk
    API->>Audit: Simpan Log: "Truk Keluar Gudang"
    API-->>Satpam: Palang Dibuka, Truk Berangkat

    Note over Driver,Audit: FASE 5: PENGIRIMAN dan SERAH TERIMA (OUTBOUND dan POD)
    Driver->>Recipient: Bongkar barang di lokasi Penerima (Toko / Balai Desa)
    Recipient->>Driver: Tanda tangan di layar HP Sopir dan Foto Barang di Lokasi
    Driver->>API: Submit Bukti Kirim (e-POD / BAST Digital)
    API->>DB: Simpan Dokumen Tanda Terima
    API->>Audit: Simpan Log: "Barang Sukses Dikirim"
    
    Admin->>API: Admin Pusat Validasi Bukti Kirim Asli
    API->>Audit: Simpan Log: "Bukti Kirim Diverifikasi, Siap Ditagih"

    Note over Driver,Audit: FASE 6: TRUK KEMBALI KE POOL
    Driver->>Satpam: Truk kembali ke Pool
    Satpam->>API: Catat Odometer kembali (Sistem hitung total KM otomatis)
    API->>DB: Update Status Truk menjadi "Tersedia"
    API->>Audit: Simpan Log: "Truk Kembali ke Pool"
    API-->>Satpam: Palang Dibuka. Transaksi Selesai.
```
