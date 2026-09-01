# 05_Fleet_Exit_Log.md

**Document:** Fleet Exit & Gate Pass Module Specification (Pencatatan Armada Keluar-Masuk)  
**System Role:** Security Gate Control, Vehicle Inspection, Audit Log, Anti-Theft & Cost Control  
**Version:** 1.0.0  
**Status:** LOCKED & ACTIVE  

---

## 1. Urgensi & Analisis Standar Industri Pencatatan Armada Keluar

Di industri trucking dan pergudangan skala menengah-besar di Indonesia, pos keamanan/gerbang (*Security Gate*) adalah garis pertahanan terakhir dalam kontrol fisik barang dan armada. Tanpa modul pencatatan armada keluar yang terintegrasi langsung dengan WMS:
1. **Penyalahgunaan Armada & Penggelapan Bahan Bakar (*Fuel & Vehicle Abuse*):** Armada digunakan untuk keperluan di luar operasional resmi tanpa pengawasan kilometer (odometer) dan level BBM.
2. **Penyelundupan Barang Keluar (*Cargo Leakage*):** Barang keluar gudang tanpa dokumen surat jalan resmi atau jumlah koli tidak sesuai dengan muatan di dalam bak truk.
3. **Ketidaktahuan Status Armada (*Fleet Blindspot*):** Manajemen gudang tidak mengetahui berapa unit truk yang sedang beroperasi di luar, kapan perkiraan kembali, dan armada mana yang *overdue*.

Modul **Pencatatan Armada Keluar (Fleet Exit Log)** pada WMS Simple menutup celah ini dengan mengintegrasikan setiap pergerakan fisik armada dengan dokumen muatan resmi (**Cross-Dock Manifest** atau **Outbound Delivery Order**).

---

## 2. Diagram Alur Pencatatan Armada Keluar & Masuk (Gate Pass Flow)

```mermaid
flowchart TD
    classDef gate fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef action fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef decision fill:#fffde7,stroke:#fbc02d,stroke-width:2px;
    classDef alert fill:#ffebee,stroke:#c62828,stroke-width:2px;

    DOC[Dokumen Terbit:\nCross-Dock Manifest / Outbound Order / Maintenance] --> GATE_OUT[1. Pos Satpam Keluar (Gate-Out Inspection)\nActor: PETUGAS GERBANG (Satpam)\nCek: Surat Jalan, Fisik Muatan, Segel Box]:::gate

    GATE_OUT --> LOG_DEPART[2. Submit Log Keluar\nInput: Odometer Out, BBM Out, Foto Truk di Pos\nStatus: DEPARTED]:::action

    LOG_DEPART --> TRIP[3. Armada Beroperasi di Luar Gudang\nStatus Kendaraan: IN_USE]:::action

    TRIP --> TIME_CHECK{Waktu > expected_return_time?}:::decision
    TIME_CHECK -->|Ya (Terlambat)| ALERT_OVERDUE[⚠ Alert Armada Overdue\nNotifikasi Manager Gudang & Admin]:::alert
    TIME_CHECK -->|Tidak| GATE_IN

    ALERT_OVERDUE --> GATE_IN

    GATE_IN[4. Pos Satpam Masuk (Gate-In Inspection)\nActor: PETUGAS GERBANG (Satpam)\nCek: Kondisi Fisik Armada, Sisa Muatan/Retur]:::gate

    GATE_IN --> LOG_RETURN[5. Submit Log Kembali\nInput: Odometer In, BBM In, Foto Truk Kembali\nPerhitungan Otomatis: Jarak Tempuh (KM)\nStatus: RETURNED]:::action

    LOG_RETURN --> COMPLETED([Armada Selesai & Parkir\nStatus Kendaraan: AVAILABLE]):::action
```

---

## 3. Struktur Data & Form Pencatatan Gerbang

### 3.1 Data Keberangkatan (Departure / Gate-Out)
- **No. Log Gate Pass (`log_number`):** Dihasilkan otomatis sistem (Format: `GATE-OUT-YYYYMMDD-XXXX`).
- **Nomor Polisi Kendaraan (`vehicle_id`):** Terkoneksi ke master armada.
- **Nama Pengemudi (`driver_name` / `driver_id`):** Nama sopir yang bertugas.
- **Tujuan / Keperluan (`purpose`):**
  - `CROSS_DOCK_DELIVERY` (Pengantaran transfer ke gudang transit)
  - `OUTBOUND_DELIVERY` (Pengantaran pesanan ke pelanggan)
  - `EMPTY_RETURN` (Kembali kosong / reposisi armada)
  - `MAINTENANCE` (Perbaikan / servis bengkel)
  - `OTHER` (Keperluan operasional lainnya)
- **Referensi Dokumen (`reference_type` & `reference_number`):** No. Manifest atau No. Outbound Order yang sah.
- **Kilometer Awal (`odometer_out`):** Angka odometer saat melintasi pos gerbang keluar.
- **Indikator Bahan Bakar Awal (`fuel_level_out`):** `EMPTY` / `1/4` / `1/2` / `3/4` / `FULL`.
- **Nama Petugas Satpam Keluar (`departure_security_officer`):** Akuntabilitas personel gerbang.
- **Foto Keberangkatan (`departure_photo_url`):** Foto tampak depan truk dan nomor plat di pos satpam.

### 3.2 Data Kepulangan (Return / Gate-In)
- **Waktu Kembali Aktual (`actual_return_time`):** Dicatat otomatis saat satpam menyimpan log masuk.
- **Kilometer Akhir (`odometer_in`):** Angka odometer saat tiba di gerbang masuk.
- **Jarak Tempuh Total (`distance_travelled_km`):** Dihitung otomatis: `odometer_in - odometer_out`.
- **Indikator Bahan Bakar Akhir (`fuel_level_in`):** Pengecekan konsumsi BBM wajar.
- **Nama Petugas Satpam Masuk (`return_security_officer`):** Personel yang memeriksa saat masuk.
- **Foto Kepulangan (`return_photo_url`):** Foto fisik truk saat kembali (memastikan tidak ada kerusakan bodi baru).
- **Catatan Kembali (`return_notes`):** Catatan khusus mengenai kendala perjalanan atau kondisi armada.

---

## 4. Aturan Bisnis & Validasi Gerbang (Gate Rules)

| Kode Aturan | Deskripsi Aturan | Validasi Sistem | Pesan Kesalahan |
|---|---|---|---|
| **BR-FLEET-01** | **Wajib Surat Jalan Sah:** Armada bermuatan tidak boleh keluar tanpa mencantumkan nomor manifest atau outbound order yang valid. | `purpose IN ('CROSS_DOCK_DELIVERY', 'OUTBOUND_DELIVERY') => reference_number NOT NULL` | "Pengeluaran armada untuk pengiriman wajib menyertakan nomor dokumen yang sah." |
| **BR-FLEET-02** | **Validasi Logika Odometer:** Kilometer saat kembali tidak boleh lebih kecil dari kilometer saat keluar. | `odometer_in >= odometer_out` | "Kilometer kembali (Odometer In) tidak boleh lebih kecil dari kilometer awal (Odometer Out)." |
| **BR-FLEET-03** | **Wajib Identitas Petugas Keamanan:** Nama petugas satpam pencatat wajib diisi lengkap. | `departure_security_officer NOT NULL AND return_security_officer NOT NULL` | "Nama petugas satpam pos gerbang wajib diisi." |
| **BR-FLEET-04** | **Pencegahan Double Departure:** Kendaraan yang masih berstatus `DEPARTED` tidak dapat didaftarkan keluar kembali sebelum diinput log kembali (`RETURNED`). | `vehicles.status = 'AVAILABLE'` | "Kendaraan ini masih tercatat berada di luar gudang (Belum ada log kembali)." |
| **BR-FLEET-05** | **Deteksi Otomatis Overdue:** Jika `now() > expected_return_time` dan status masih `DEPARTED`, sistem otomatis mengubah status log menjadi `OVERDUE` dan memicu alert ke manajer operasional. | Cron / Scheduler check | Alert `FLEET_OVERDUE` |
