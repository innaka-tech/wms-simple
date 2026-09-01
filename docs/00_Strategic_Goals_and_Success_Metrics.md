# 00_Strategic_Goals_and_Success_Metrics.md

**Dokumen:** Sasaran Strategis (Goals) & Indikator Keberhasilan (KPI) Operasional  
**Sistem:** WMS Simple Enterprise (Platform Gudang & Logistik Menyeluruh)  
**Versi:** 1.0.3 (Simplified Logistics Jargon)  
**Status:** DOKUMEN ACUAN UTAMA  

---

## 1. Sasaran Strategis Operasional (Business Goals)

Setiap fitur dalam sistem WMS Simple dibuat untuk memecahkan masalah nyata di gudang dan mencapai target terukur (KPI) berikut:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 MATRIKS TARGET OPERASIONAL GUDANG (GOALS)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ GOAL-01: Akurasi Stok di Atas 99.8% & Tidak Ada Barang Hilang Tanpa Jejak   │
│ GOAL-02: Kecepatan Kirim Lintas Kota (Bongkar Muat Transit < 24 Jam)       │
│ GOAL-03: Kendali Penuh Truk & BBM (100% Truk Lewat Pos Satpam & Odometer)   │
│ GOAL-04: Kontrol Susut Barang Curah (Susut / Shrinkage Tidak Boleh > 1.0%) │
│ GOAL-05: Jaga Rahasia Klien 3PL (Ganti Surat Jalan Asli Jadi Surat Titipan)│
│ GOAL-06: Distribusi Nasional Showcase KDMP (Barang Tiba Aman di Balai Desa)│
│ GOAL-07: Lacak Siapa yang Pegang Barang (Setiap Gerak Stok Wajib Catat Nama)│
└─────────────────────────────────────────────────────────────────────────────┘
```

| ID Sasaran | Target Operasional Gudang | Indikator Keberhasilan (KPI) | Modul & Fitur yang Mengerjakan | Dokumen Acuan |
|---|---|:---:|---|---|
| **GOAL-01** | **Akurasi Stok & Tidak Ada Barang Hilang** | **$\ge 99.8\%$** Akurasi Kartu Stok | **Buku Besar Stok (Kartu Stok Double-Entry)**: Saldo tidak bisa minus, semua pergerakan saling seimbang. | [`06_Outbound_and_POD_Flows.md`](06_Outbound_and_POD_Flows.md) |
| **GOAL-02** | **Kecepatan Kirim Antar Kota (Hub-and-Spoke)** | **$< 24$ Jam** Waktu Singgah Transit | **Transit Cepat (Cross-Docking)**: Tally cepat dan cetak Surat Muat (Manifest) langsung ke truk tujuan. | [`03_CrossDock_and_CrossDocument.md`](03_CrossDock_and_CrossDocument.md) |
| **GOAL-03** | **Anti Kebocoran Truk & BBM** | **$100\%$** Log Keberangkatan Satpam | **Pos Satpam (Gate Pass)**: Satpam wajib catat Surat Jalan, KM Odometer Awal/Akhir, Sisa BBM, & Foto Plat. | [`05_Fleet_Exit_and_Security_Gate_Flows.md`](05_Fleet_Exit_and_Security_Gate_Flows.md) |
| **GOAL-04** | **Kontrol Susut Barang Curah / Karungan** | **$\le 1.00\%$** Batas Susut Barang | **Modul Repacking (De-bulking)**: Hitung otomatis penyusutan saat barang dituang/dikemas ulang. Ada alarm jika susut berlebih. | [`02_Bulky_Curah_and_Debulking.md`](02_Bulky_Curah_and_Debulking.md) |
| **GOAL-05** | **Jaga Rahasia Supplier (Untuk Jasa 3PL)** | **$0\%$** Kebocoran Data Supplier | **Tukar Surat Jalan (Cross-Document)**: Sistem menukar dokumen asli dari pabrik menjadi dokumen kirim resmi pihak jasa pengiriman. | [`03_CrossDock_and_CrossDocument.md`](03_CrossDock_and_CrossDocument.md) |
| **GOAL-06** | **Distribusi Alat Pendingin / Showcase KDMP** | **$100\%$** Surat Terima (BAST) Sah | Aturan muat **Wajib Berdiri (Upright)**, lacak **Nomor Seri Mesin**, truk pakai Pintu Hidrolik (Tail-Lift), dan Tanda Terima Digital di Balai Desa. | [`10_KDMP_Showcase_and_Chiller_Logistics.md`](10_KDMP_Showcase_and_Chiller_Logistics.md) |
| **GOAL-07** | **Lacak Tuntas Siapa Petugas Lapangan** | **$100\%$** Transaksi Punya Nama Petugas | **Riwayat Aktivitas Mutlak (Audit Trail)**: Sistem mengunci nama orang (Checker/Driver) pada setiap langkah barang. Tidak bisa saling melempar tanggung jawab. | [`07_Checkpoint_Chain_and_Audit.md`](07_Checkpoint_Chain_and_Audit.md) |

---

## 2. Sasaran Teknologi & Kualitas IT (Technical Goals)

| ID Sasaran | Target Kualitas Sistem (IT) | Standar Kinerja | Penjelasan Teknis | Dokumen Standar |
|---|---|:---:|---|---|
| **TECH-01** | **Scan Barcode Tanpa Lemot** | **$< 2$ ms** waktu respon server | Menggunakan mesin *Backend Hono* yang sangat ringan (RAM cuma ~25MB) agar scan barcode pakai HP lancar meski sinyal minim. | [`01_Strategic_Framework_and_6_Pillars.md`](01_Strategic_Framework_and_6_Pillars.md) |
| **TECH-02** | **Aman dari Hacker / Keamanan Siber** | **Bebas Celah Kritis (Zero Vulnerability)** | Patuh pada standar dunia **OWASP Top 10**. Semua input teks dibersihkan agar database tidak bisa dibobol (*SQL Injection*). | [`standards/02_Security_Standard_OWASP.md`](standards/02_Security_Standard_OWASP_and_OWASP_AI.md) |
| **TECH-03** | **Sistem Ramah Orang Lapangan (Mobile-First)** | **$100\%$** Fitur bisa dibuka di HP Android | Layar didesain untuk HP/Scanner (Tombol gede minimal 48px, bisa ditekan pakai satu jempol, scan barcode langsung dari kamera HP). | [`08_Mobile_First_UI_UX_Design_System.md`](08_Mobile_First_UI_UX_Design_System.md) |
| **TECH-04** | **Standar Pengujian Aplikasi** | **$\ge 90\%$** Fitur lulus tes otomatis | Kode sistem wajib dites otomatis (Vitest) khusus untuk rumus susut, hitungan Odometer, dan saldo stok sebelum dipakai kerja nyata. | [`standards/03_Testing_and_Quality_Assurance.md`](standards/03_Testing_and_Quality_Assurance_Standard.md) |
| **TECH-05** | **Penyimpanan Data Terpusat** | **Satu Database Kuat** | Menggunakan PostgreSQL 16 di komputer pusat agar data antarcabang tidak pernah bentrok dan tidak ada data yang kembar/hilang. | [`standards/05_Versioning_and_Release.md`](standards/05_Versioning_and_Release_Standard.md) |
