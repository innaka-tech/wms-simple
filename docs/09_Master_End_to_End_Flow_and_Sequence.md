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
    actor Driver as Sopir (Pool / Vendor)
    actor Satpam as Satpam Pos Gerbang
    actor Recipient as Penerima (Toko/Desa)
    actor Admin as Admin Pusat
    actor Staff as Admin Gudang / Checker
    participant API as Aplikasi WMS (Backend)
    participant DB as Database
    participant Audit as Log Riwayat Status (Audit Trail)

    Note over Vendor,Audit: FASE 1 — PENERIMAAN & PENYIMPANAN (INBOUND)
    Vendor->>Satpam: Truk supplier tiba di gudang
    Staff->>API: Tally penerimaan fisik (petugas: Budi)
    API->>DB: Status PO jadi DITERIMA
    API->>Audit: Log: "Barang diterima oleh Budi"
    Staff->>API: Putaway ke rak (cross-dock: langsung staging)
    API->>DB: Stok masuk lokasi rak
    API->>Audit: Log: "Barang disimpan oleh Budi"

    Note over Vendor,Audit: FASE 2 — PERMINTAAN KIRIM, REPACKING ON-DEMAND, TERBIT SJ + RESI
    Admin->>API: Buat order kirim (stok / cross-dock / KDMP)
    alt Perlu pecah ulang (diambil dari rak)
        Staff->>API: Ambil barang induk dari rak
        Staff->>API: Input hasil repacking (1.000 KG jadi 995 KG)
        API->>DB: Potong jumbo bag, tambah karung siap kirim
        API->>API: Hitung susut 5 KG (aman < 1%)
        API->>Audit: Log: "Repacking selesai (on-demand order)"
    else Stok utuh / cross-dock: kirim langsung
        API->>DB: Alokasi stok dari rak / staging
    end
    API->>API: Generate SJ + No. Resi otomatis (SJ-XXXX / RESI-XXXX)
    API->>DB: Simpan SJ + resi (tertaut order)
    API->>Audit: Log: "SJ & resi diterbitkan"
    opt Blind shipping
        API->>DB: Cetak SJ titipan tanpa identitas pabrik
        API->>Audit: Log: "SJ titipan dicetak"
    end

    Note over Vendor,Audit: FASE 3 — LOADING
    Staff->>API: Loading selesai, SJ + resi diserahkan ke sopir
    API->>DB: Kartu stok: DALAM PERJALANAN
    API->>Audit: Log: "Dokumen diserahterimakan"

    Note over Vendor,Audit: FASE 4 — POS SATPAM KELUAR (DUAL JALUR)
    alt Truk pool sendiri (gate pass)
        Driver->>Satpam: Truk pool di pos keluar
        Satpam->>API: Cek SJ sah, catat odometer + BBM
        API->>DB: Simpan gate pass (fleet_exit_logs, truk IN_USE)
        API->>Audit: Log: "Truk pool keluar bawa resi"
    else Truk vendor sewa / ekspedisi
        Driver->>Satpam: Truk vendor di pos keluar
        Satpam->>API: Catat vendor, nopol, resi/SJ dibawa
        API->>DB: Simpan log keluar truk vendor
        API->>Audit: Log: "Truk vendor keluar bawa resi"
    end
    API-->>Satpam: Dokumen sah, palang dibuka

    Note over Vendor,Audit: FASE 5 — KIRIM, POD, TAGIH, LUNAS (AKHIR TUNGGAL)
    Driver->>Recipient: Bongkar barang di lokasi
    Recipient->>Driver: TTD layar HP sopir + foto barang
    Driver->>API: Submit e-POD / BAST digital
    API->>DB: Simpan dokumen tanda terima
    API->>Audit: Log: "Barang sukses dikirim"
    Admin->>API: Validasi bukti kirim
    API->>DB: Terbitkan faktur (dasar: POD terverifikasi)
    API->>Audit: Log: "Faktur diterbitkan, menunggu bayar"
    Recipient->>API: Pelanggan bayar
    API->>DB: Catat pembayaran (status PAID)
    API->>Audit: Log: "Pembayaran diterima — LUNAS"

    Note over Vendor,Audit: FASE 6 — OPSIONAL: CATATAN ARMADA (BUKAN AKHIR TRANSAKSI)
    alt Truk pool
        Driver->>Satpam: Truk pool kembali
        Satpam->>API: Catat odometer masuk (total KM otomatis)
        API->>DB: Status truk: TERSEDIA
        API->>Audit: Log: "Truk pool kembali"
    else Truk vendor
        Note over Satpam,Audit: Truk vendor tidak wajib kembali — log ditutup apa adanya.
    end
```
