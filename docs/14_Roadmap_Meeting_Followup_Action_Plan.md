# 14. Action Plan & Roadmap Lanjutan Hasil Meeting (Roadmap Sesi Berikutnya)

Dokumen ini mendokumentasikan rincian butir-butir evaluasi dan kesepakatan hasil meeting operasional WMS-TMS, memetakan status pekerjaan yang telah selesai, serta menyusun rincian rencana eksekusi sistematis (*backlog*) untuk dikerjakan pada sesi berikutnya.

---

## 1. Matriks Status Ringkasan Kebutuhan Hasil Meeting

| No | Kebutuhan / Butir Meeting | Kategori | Status Saat Ini | Rencana Eksekusi Sesi Berikutnya |
|:---:|---|:---:|:---:|---|
| 1 | **OCR untuk Scan PDF & Dokumen Customer** | Outbound / OCR | ✅ **Selesai (v5.5.0)** | Ekstraksi teks spasial koordinat Y/X, pemetaan SKU master, validasi split-screen. |
| 2 | **PDF Sebisa Mungkin Fleksibel** | Outbound / Parser | ✅ **Selesai (v5.5.0)** | Mendukung format PO/DO beragam (Excel, PDF digital, Scan foto Tesseract OCR). |
| 3 | **Stok On-Hand Real-time Saat Buat DO** | Outbound / UI | ✅ **Selesai (v5.5.0)** | Indikator stok tersedia di modal customer maupun form manual DO. |
| 4 | **ASN = PO & JRN = Goods Received** | Inbound / Standar | ⏳ **Backlog Tahap 1** | Penyesuaian label visual, singkatan resmi PO/ASN dan BAST Dock / JRN. |
| 5 | **Picking Berdasarkan Order Number & Barcode** | Outbound / Scan | ⏳ **Backlog Tahap 2** | Pemindaian barcode laser/kamera untuk Order Number dan SKU fisik saat picking. |
| 6 | **Picking $\rightarrow$ Surat Jalan Otomatis** | Outbound / TMS | ⏳ **Backlog Tahap 2** | Transisi mulus dari picking selesai langsung membuka cetak SJ & Resi. |
| 7 | **Setiap Kode Penomoran Memiliki Barcode** | UI / Printing | ⏳ **Backlog Tahap 3** | Penambahan komponen barcode Code128 di seluruh kartu dokumen dan print-out. |
| 8 | **Klasifikasi Gudang: Rak vs Floor Staging** | Master Data | ⏳ **Backlog Tahap 4** | Metadata tipe gudang (Rak bertingkat vs Lantai/Bulk Floor) & kalkulasi kapasitas. |
| 9 | **Area Storage Dinamis Berdasarkan Customer** | Master / Storage | ⏳ **Backlog Tahap 4** | Penugasan dinamis zona/rak khusus shipper/customer dengan batas alokasi. |
| 10 | **Inventory Versi Visual (Denah Digital Twin)** | Stock / Visual | ⏳ **Backlog Tahap 5** | Peta interaktif denah inventori per zona, lorong, dan tingkat keterisian. |
| 11 | **POD Berdasarkan SJ & Tanda Tangan Penerima** | Outbound / e-POD | ⏳ **Backlog Tahap 6** | Penguncian validasi POD ke SJ, kanvas TTD wajib, dan foto serah terima. |
| 12 | **Aplikasi Mobile Men-support GPS Tracking** | Mobile / Driver | ⏳ **Backlog Tahap 6** | Penangkapan otomatis koordinat Latitude & Longitude saat submit bukti POD. |
| 13 | **Invoicing Sederhana: Order No, Tujuan, Nilai Freetext** | Billing / Invoice | ⏳ **Backlog Tahap 7** | Formulir pembuatan faktur kilat dengan nominal ongkir/jasa freetext fleksibel. |
| 14 | **Incoming Alert (Peringatan Barang Masuk)** | Inbound / Alert | ⏳ **Backlog Tahap 8** | Notifikasi visual & lonceng alert saat jadwal kedatangan PO / truk mendekati dock. |
| 15 | **Modul Dokumen Ekspor & Impor** | Perdagangan / Dok | ⏳ **Backlog Tahap 9** | Pengelolaan dokumen BL, Packing List Ekspor, PIB/PEB, dan kontainer seal. |
| 16 | **Peningkatan UI/UX, Font Scaling & Laporan** | UI/UX & Analytics | ⏳ **Backlog Tahap 10** | Penyesuaian ukuran ergonomis form (*gedein dikit*), dashboard & laporan eksekutif. |

---

## 2. Rincian Rencana Kerja Bertahap (Step-by-Step Backlog)

### Tahap 1: Standardisasi Terminologi Inbound (ASN / PO & JRN)
- **Tujuan:** Menyelaraskan seluruh label antarmuka dan laporan agar sesuai dengan konvensi gudang klien.
- **Tindakan:**
  1. Halaman `/inbound`: Ubah label referensi pembelian menjadi **`PO / ASN (Advance Shipping Notice)`**.
  2. Penerimaan Dock: Beri label resmi **`JRN (Goods Received Note / Surat Penerimaan Barang)`**.
  3. Dokumen cetak penerimaan barang menyematkan nomor JRN resmi (format: `JRN{whCode}{YYYYMMDD}{seq}`).

### Tahap 2: Scanner Barcode Terpadu pada Picking (Order & SKU Verification)
- **Tujuan:** Menghilangkan kesalahan pengambilan barang (*zero mispick*) di lorong rak.
- **Tindakan:**
  1. Modal Picking di `/outbound`: Tambahkan kotak input scanner pemindai barcode fisik kargo.
  2. Saat operator scan barcode box/SKU:
     - Jika SKU cocok: kuantitas counter bertambah otomatis (+1) dengan audio feedback *BEEP-BEEP*.
     - Jika SKU salah/tidak ada di daftar order: muncul visual merah dan suara error peringatan (*BUZZER*).
  3. Alur langsung: Begitu picking selesai 100%, sistem otomatis memunculkan tombol shortcut **`[ 📄 Terbitkan Surat Jalan + Resi ]`**.

### Tahap 3: Visual Barcode Generator pada Seluruh Nomor Dokumen
- **Tujuan:** Mempermudah petugas scanner satpam, checker dock, dan driver memindai nomor dokumen langsung dari layar HP atau lembar cetak.
- **Tindakan:**
  1. Integrasi `jsbarcode` untuk merender barcode SVG/Canvas pada seluruh komponen nomor dokumen:
     - Nomor Order (`ORD...`)
     - Nomor Surat Jalan (`SJ...`)
     - Nomor Resi (`RESI...`)
     - Nomor Manifest Cross-Dock (`MNF...`)
     - Nomor Faktur Billing (`INV...`)
  2. Tombol *"Tampilkan Barcode"* (modal popup pembesar barcode) di setiap kartu dokumen.

### Tahap 4: Tipe Gudang (Rak vs Floor) & Storage Dinamis per Customer
- **Tujuan:** Mendukung fleksibilitas gudang yang memiliki area rak selektif (Pallet Racks) maupun gudang curah/staging lantai (*Bulk Floor Staging*).
- **Tindakan:**
  1. Master Gudang (`/master/warehouses`):
     - Tambah opsi konfigurasi: `Model Penyimpanan: [ Gudang Rak Bertingkat | Gudang Floor Staging / Los ]`.
     - Konfigurasi batas kapasitas maksimum (Tonase & Kubikasi $M^3$).
  2. Master Zona / Area (`/master/racks`):
     - Tambah fitur penugasan area khusus customer (*Dedicated Customer Storage Zone*), misal: *Zona KDMP (Chiller)*, *Zona Logistik Prima Mandiri (Dry)*.
     - Mode dinamis: jika slot customer penuh, sistem dapat mengalokasikan rak bersama (*Shared Buffer Zone*).

### Tahap 5: Dashboard Inventori & Peta Spasial Digital Twin
- **Tujuan:** Menampilkan visualisasi keterisian inventori gudang secara interaktif dan real-time.
- **Tindakan:**
  1. Menu baru `/stock/visual` atau ekspansi di `/master/racks`:
     - Tampilan 2D grid tata letak denah gudang tampak atas (Top-Down Bird's Eye View).
     - Indikator warna okupansi rak: 🟢 Tersedia ($<50\%$), 🟡 Cukup Penuh ($50-80\%$), 🔴 Kritis ($>80\%$).
     - Hover/klik untuk melihat SKU yang tersimpan, bobot, dan nama customer pemilik barang.

### Tahap 6: Mobile e-POD dengan GPS Geolocation & Tanda Tangan Penerima
- **Tujuan:** Bukti serah terima hukum yang sah (*legally defensible proof of delivery*) dengan koordinat titik lokasi fisik.
- **Tindakan:**
  1. Form Serah Terima (`/outbound/pod`):
     - Wajib mengaitkan nomor Surat Jalan resmi (`waybill_number`).
     - Kanvas tanda tangan digital wajib ditandatangani oleh penerima fisik di lokasi.
     - Pemanfaatan Web Geolocation API (`navigator.geolocation.getCurrentPosition`):
       - Menyimpan data `latitude`, `longitude`, dan `accuracy_meters`.
       - Link peta interaktif ke Google Maps (`https://maps.google.com/?q={lat},{lng}`) di kartu verifikasi admin.

### Tahap 7: Formulir Invoicing Cepat (Billing Freetext Ongkir)
- **Tujuan:** Mengakomodasi kesepakatan nilai kirim yang fleksibel per order/rute pengiriman.
- **Tindakan:**
  1. Menu Billing (`/billing`):
     - Buat Faktur baru cukup memilih Nomor Order (`order_number`) $\rightarrow$ sistem otomatis mengunci nama customer dan kota tujuan.
     - Kolom `Nilai Jasa / Biaya Pengiriman (Rp)` dibuat berupa input teks bebas (*freetext / custom currency input*), tanpa rumus tarif yang mengunci admin.
     - Cetak faktur tagihan IDR resmi siap kirim ke bagian keuangan shipper.

### Tahap 8: Incoming Alert & Telemetry Peringatan Dini
- **Tujuan:** Memberikan peringatan proaktif kepada supervisor dock saat truk pengirim akan tiba.
- **Tindakan:**
  1. Popover Alert Center di Header:
     - Peringatan PO Inbound terjadwal yang belum masuk dock dalam rentang $\pm 2$ jam dari estimasi kedatangan (ETA).
     - Badge warna berdenyut (Pulse animation) dan bunyi notifikasi singkat jika ada armada inbound yang telah tiba di pos gerbang (*Gate In*).

### Tahap 9: Pengelolaan Dokumen Ekspor & Impor (Kargo Internasional)
- **Tujuan:** Mendukung kargo transhipment dan logistik ekspor-impor seperti proyek AUCMA / KDMP.
- **Tindakan:**
  1. Tab khusus di Master / Outbound:
     - Nomor Kontainer (FCL/LCL 20ft / 40ft) & Nomor Segel Pelayaran (Seal Number).
     - Input dokumen pelengkap: Bill of Lading (B/L), Packing List Ekspor, Dokumen Bea Cukai (PIB / PEB).

### Tahap 10: Optimasi Ergonomi UI/UX & Pelaporan Terpadu
- **Tujuan:** Kenyamanan operator lapangan saat menggunakan tablet atau layar sentuh.
- **Tindakan:**
  1. Penyesuaian ukuran font form dan tombol aksi (*touch targets*) minimal 44px agar ramah jempol (*thumb-friendly*).
  2. Modul Laporan Eksekutif (`/reports`):
     - Laporan Mutasi Buku Besar Stok (Double-Entry Stock Movement Report).
     - Laporan Efisiensi Lead Time Picking & Packing.
     - Laporan Rekap Tagihan & Umur Piutang Usaha (AR Aging Summary).
     - Tombol ekspor data ke format Excel (`.xlsx`) dan PDF.

---

## 3. Catatan Teknis & Kepatuhan Arsitektur

1. **Prinsip Double-Entry Stock Ledger:** Setiap pergerakan stok dari picking maupun penyesuaian wajib mencatat mutasi berpasangan (*mass conservation*).
2. **Kepatuhan Audit OWASP A04:** Seluruh tindakan operasional (simpan order, picking, penerbitan SJ, POD, dan billing) wajib menyertakan identitas petugas fisik (`actor_name`) dan rantai stempel waktu `CURRENT_TIMESTAMP`.
3. **Database Ground Truth:** Seluruh query tetap mengacu langsung ke PostgreSQL Host Machine (`127.0.0.1:5432`, database: `wms_simple_db`).
4. **Git Protocol:** Dilarang melakukan `git push` tanpa instruksi eksplisit dari user dalam sesi yang bersangkutan.
