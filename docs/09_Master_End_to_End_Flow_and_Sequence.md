# 09_Master_End_to_End_Flow_and_Sequence.md

**Document:** Master Diagram Alur & Urutan Kerja (End-to-End Operational Flow)  
**System:** WMS Simple Enterprise  
**Version:** 3.2.0 (Repacking On-Demand & Siklus Penagihan Penuh)  
**Status:** ACTIVE  

---

## 1. Diagram Alur Operasional Gudang (Master Flowchart)

Diagram ini menggambarkan seluruh proses fisik barang dari saat truk tiba di gudang utama hingga bukti kirim terverifikasi dan siap ditagih. Prinsip alur ini:

1. **Semua barang masuk disimpan dulu ke rak (putaway)** — satu-satunya pengecualian adalah cross-dock yang langsung pindah ke area staging kirim. Tidak ada proses repacking di dock penerimaan.
2. **Pecah ulang / kemas ulang (repacking / de-bulking) hanya dilakukan setelah ada permintaan kirim / alokasi** — barang diambil dari rak, dipecah, timbang hasil + hitung susut, lalu langsung masuk proses penerbitan surat jalan. Tidak ada stok repacking yang menganggur.
3. **Surat jalan baru + nomor resi diterbitkan untuk SEMUA pengiriman keluar** — termasuk hasil repacking (cross-document), stok gudang, cross-dock antar-hub, dan KDMP. Sistem otomatis membuat Surat Jalan baru dan Nomor Resi saat barang mau keluar.
4. **Pos satpam keluar mencatat identitas truk secara lengkap** — untuk truk vendor (sewa/ekspedisi) wajib dicatat: nama vendor, nomor polisi, dan nomor resi/surat jalan yang dibawa.
5. **Truk vendor tidak wajib kembali** — hanya armada milik pool yang dicatat kembali (gate-in odometer). Truk vendor cukup tercatat di log keluar.
6. **Rantai transaksi berakhir di PENERIMAAN PEMBAYARAN (LUNAS):** POD terverifikasi menjadi dasar penerbitan faktur, pembayaran diterima menutup transaksi. Pergerakan truk kembali ke pool hanyalah catatan logistik armada.

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
    classDef waybill fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef billing fill:#ede7f6,stroke:#4527a0,stroke-width:2px;
    classDef finalNode fill:#e8f5e9,stroke:#2e7d32,stroke-width:3px;

    VENDOR(["1. Truk Supplier Tiba<br/>(Bawa Barang Packaged, Karungan,<br/>Curah, atau Showcase)"]):::vendor --> DOCK_RCV["2. Penerimaan di Dock<br/>(Tally Fisik, Scan Barcode, Foto Barang)"]:::mainHub

    DOCK_RCV --> SORT_DECISION{"3. Langsung Kirim atau Simpan?"}

    SORT_DECISION -->|Simpan ke Rak| PUTAWAY_STORAGE["4. Simpan Barang (Putaway)<br/>ke Lokasi Rak / Area Simpan"]:::mainHub
    SORT_DECISION -->|"Langsung Lanjut (Cross-Dock)"| XDOC_STAGING["4X. Barang Langsung Pindah<br/>ke Area Staging Kirim"]:::xdoc

    PUTAWAY_STORAGE --> OUT_REQUEST
    XDOC_STAGING --> OUT_REQUEST

    OUT_REQUEST["5. Terima Permintaan Kirim / Alokasi<br/>(Semua Jenis: Stok Gudang, Repacking,<br/>Cross-Dock, KDMP)"]:::outbound
    OUT_REQUEST --> DEBULK_CHECK{"Perlu Pecah Ulang / Kemas Ulang?<br/>(Jumbo Bag ke Karung Kecil)"}:::debulk

    DEBULK_CHECK -->|Ya| PICK_PARENT["6A. Ambil Barang Induk dari Rak<br/>(Pick Jumbo Bag / Drum / Pack Besar)"]:::debulk
    PICK_PARENT --> DEBULK_WO["6B. Proses Repacking / Pencurahan<br/>(Dari Jumbo Bag ke Karung)"]:::debulk
    DEBULK_WO --> DEBULK_CALC["Timbang Hasil Repacking<br/>dan Hitung Susut"]:::debulk
    DEBULK_CALC --> LOSS_CHECK{"Susut > 1.0%?"}:::debulk
    LOSS_CHECK -->|Ya| ALERT_LOSS["Peringatan: Susut Barang Terlalu Tinggi!"]:::alert
    LOSS_CHECK -->|Tidak| ISSUE_WAYBILL
    ALERT_LOSS --> ISSUE_WAYBILL

    DEBULK_CHECK -->|Tidak| ISSUE_WAYBILL["7. Sistem Terbitkan Surat Jalan Baru + Nomor Resi<br/>(Otomatis untuk SEMUA Pengiriman Keluar,<br/>termasuk Hasil Repacking / Cross-Document)"]:::waybill
    ISSUE_WAYBILL -.->|"Opsi Blind Shipping: identitas<br/>pabrik asal ditutup"| XDOC_SWAP["Cross-Doc Swap / Sub-AWB"]:::xdoc

    ISSUE_WAYBILL --> LOAD_TRUCK["8. Loading Barang ke Truk<br/>(Surat Jalan + Resi Diserahterimakan ke Sopir)"]:::mainHub

    LOAD_TRUCK --> GATE_FORK{"Jenis Truk Pengangkut?"}

    GATE_FORK -->|"Truk Milik Pool Sendiri"| GATE_OUT_POOL["9A. Pos Satpam Keluar: Gate Pass Armada<br/>(Odometer, BBM, Foto Truk, Bawa Resi)"]:::gate
    GATE_FORK -->|"Truk Vendor (Sewa / Ekspedisi)"| GATE_OUT_VENDOR["9B. Pos Satpam Keluar: Truk Vendor<br/>(Wajib Catat: Nama Vendor, Nomor Polisi,<br/>Nomor Resi / Surat Jalan yang Dibawa)"]:::gate

    GATE_OUT_POOL --> TRIP_SHIP["10. Truk Berangkat<br/>(Antar-Kota ke Cabang atau Kirim ke Pelanggan)"]:::transit
    GATE_OUT_VENDOR --> TRIP_SHIP

    TRIP_SHIP --> POD_SUBMIT["11. Serah Terima Barang<br/>(Foto + Tanda Tangan Digital / e-POD / BAST)"]:::outbound
    POD_SUBMIT --> ADMIN_VERIFY{"12. Admin Periksa Bukti Kirim:<br/>POD Lengkap dan Sah?"}:::mainHub
    ADMIN_VERIFY -->|Tidak Sah| POD_REWORK["Dikembalikan ke Sopir untuk Dilengkapi"]:::alert
    POD_REWORK --> POD_SUBMIT
    ADMIN_VERIFY -->|Sah| ISSUE_INVOICE["13. Terbitkan Faktur / Tagihan ke Pelanggan<br/>(POD Terverifikasi sebagai Dasar Penagihan)"]:::billing
    ISSUE_INVOICE --> PAYMENT_END(["14. AKHIR TUNGGAL: Penerimaan Pembayaran Diterima<br/>(Transaksi LUNAS dan Tertutup)"]):::finalNode

    GATE_OUT_POOL -.->|"Catatan logistik armada:<br/>truk pool kembali"| FLEET_RETURN["Log Armada: Truk Pool Kembali ke Pool<br/>(Satpam Cek Odometer Masuk, Jarak KM)"]:::gate
    GATE_OUT_VENDOR -.->|"Truk vendor tidak wajib kembali"| FLEET_NO_RETURN["Log Armada: Truk Vendor Ditutup<br/>(Cukup Tercatat di Log Keluar Vendor)"]:::gate
```

---

## 2. Urutan Interaksi Sistem (Sequence Diagram)

Diagram ini menunjukkan interaksi antara tim lapangan, sistem (Hono API), Database, dan sistem pelacakan riwayat (Audit Trail/Log Status). Perhatikan: penerbitan Surat Jalan + Resi terjadi pada **satu titik yang sama untuk semua jenis pengiriman**, dan rantai transaksi berakhir di **penerimaan pembayaran (LUNAS)** — POD terverifikasi hanyalah dasar penagihan, bukan akhir transaksi.

```mermaid
sequenceDiagram
    autonumber
    actor Vendor as Supplier / Driver Vendor
    actor Staff as Admin Gudang / Checker
    actor Satpam as Satpam Pos Gerbang
    actor Driver as Sopir (Pool atau Vendor)
    actor Recipient as Penerima (Toko/Desa)
    actor Admin as Admin Pusat
    participant API as Aplikasi WMS (Backend)
    participant DB as Database
    participant Audit as Log Riwayat Status (Audit Trail)

    Note over Vendor,Audit: FASE 1: PENERIMAAN DAN PENYIMPANAN BARANG (INBOUND)
    Vendor->>Satpam: Truk Supplier tiba di Gudang Utama Jakarta
    Staff->>API: Tally Penerimaan Fisik (Update status Penerimaan, Petugas: Budi)
    API->>DB: Update Status PO menjadi "DITERIMA"
    API->>Audit: Simpan Log: "Barang Diterima oleh Budi"
    Staff->>API: Simpan Barang ke Rak (Putaway, kecuali Cross-Dock langsung Staging)
    API->>DB: Update Lokasi Stok ke Rak / Area Simpan
    API->>Audit: Simpan Log: "Barang Disimpan ke Rak oleh Budi"

    Note over Admin,Audit: FASE 2: PERMINTAAN KIRIM, REPACKING ON-DEMAND, TERBIT SJ + RESI
    Admin->>API: Buat Order Pengiriman (Stok Gudang / Cross-Dock / KDMP)
    alt Barang perlu Pecah Ulang / Kemas Ulang (diambil dari rak)
        Staff->>API: Ambil Barang Induk dari Rak (Pick Jumbo Bag / Drum)
        Staff->>API: Catat hasil repacking (Input 1.000 KG -> Jadi 995 KG)
        API->>DB: Potong stok Jumbo Bag, Tambah stok Karung siap kirim
        API->>API: Sistem menghitung susut: 5 KG (Aman, di bawah 1%)
        API->>Audit: Simpan Log: "Proses Repacking Selesai (On-Demand untuk Order)"
    else Barang siap kirim langsung (stok utuh / cross-dock)
        API->>DB: Alokasi stok dari Rak / Staging ke Order
    end
    API->>API: Generate Surat Jalan Baru + Nomor Resi Otomatis (SJ-XXXX / RESI-XXXX)
    API->>DB: Simpan Dokumen Surat Jalan dan Resi (tertaut ke order)
    API->>Audit: Simpan Log: "Surat Jalan dan Resi Diterbitkan"
    opt Jika perlu menyembunyikan nama Supplier asli (Blind Shipping)
        API->>DB: Cetak Dokumen Titipan Tanpa Identitas Pabrik (cross_documents)
        API->>Audit: Simpan Log: "Surat Jalan Titipan Dicetak"
    end

    Note over Driver,Audit: FASE 3: LOADING BARANG KE TRUK
    Staff->>API: Konfirmasi Loading barang ke Truk (Serahkan SJ + Resi ke Sopir)
    API->>DB: Update Kartu Stok (Barang statusnya "Dalam Perjalanan")
    API->>Audit: Simpan Log: "Loading Selesai, Dokumen Diserahterimakan"

    Note over Satpam,Audit: FASE 4: POS SATPAM KELUAR (DUA JALUR: ARMADA POOL ATAU TRUK VENDOR)
    alt Truk Milik Pool Sendiri (Gate Pass)
        Driver->>Satpam: Truk Pool tiba di Pos Keluar
        Satpam->>API: Cek Surat Jalan Sah, Catat Odometer dan Sisa BBM
        API->>DB: Simpan Gate Pass (fleet_exit_logs, Truk status IN_USE)
        API->>Audit: Simpan Log: "Truk Pool Keluar Bawa Resi XXXX"
    else Truk Vendor Sewa / Ekspedisi
        Driver->>Satpam: Truk Vendor tiba di Pos Keluar
        Satpam->>API: Catat Nama Vendor, Nomor Polisi, dan Nomor Resi/SJ yang Dibawa
        API->>DB: Simpan Log Keluar Truk Vendor (tanpa mengubah status armada pool)
        API->>Audit: Simpan Log: "Truk Vendor Keluar Bawa Resi XXXX"
    end
    API-->>Satpam: Dokumen Sah. Palang Dibuka, Truk Berangkat

    Note over Driver,Audit: FASE 5: PENGIRIMAN, SERAH TERIMA, DAN PENAGIHAN — AKHIR TUNGGAL TRANSAKSI
    Driver->>Recipient: Bongkar barang di lokasi Penerima (Toko / Balai Desa)
    Recipient->>Driver: Tanda tangan di layar HP Sopir dan Foto Barang di Lokasi
    Driver->>API: Submit Bukti Kirim (e-POD / BAST Digital)
    API->>DB: Simpan Dokumen Tanda Terima
    API->>Audit: Simpan Log: "Barang Sukses Dikirim"
    Admin->>API: Admin Pusat Validasi Bukti Kirim Asli
    API->>DB: Terbitkan Faktur / Tagihan ke Pelanggan (Dasar: POD Terverifikasi)
    API->>Audit: Simpan Log: "Faktur Diterbitkan, Menunggu Pembayaran"
    Recipient->>API: Pelanggan Melakukan Pembayaran
    API->>DB: Catat Penerimaan Pembayaran (payment_received, Status: PAID)
    API->>Audit: Simpan Log: "Pembayaran Diterima, Transaksi LUNAS (Akhir Transaksi)"

    Note over Driver,Audit: FASE 6 (OPSIONAL): CATATAN ARMADA — BUKAN AKHIR TRANSAKSI
    alt Jika Truk Milik Pool
        Driver->>Satpam: Truk Pool kembali ke Pool
        Satpam->>API: Catat Odometer kembali (Sistem hitung total KM otomatis)
        API->>DB: Update Status Truk menjadi "Tersedia"
        API->>Audit: Simpan Log: "Truk Pool Kembali ke Pool"
    else Jika Truk Vendor
        Note over Satpam,Audit: Truk Vendor tidak wajib kembali. Log keluar vendor ditutup apa adanya.
    end
```
