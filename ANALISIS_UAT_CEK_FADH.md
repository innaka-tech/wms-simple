# Laporan Analisis Hasil Pengujian Lapangan (UAT) & Rencana Perbaikan Sistem
**Dokumen Referensi:** `Cek Fadh.docx` & Tangkapan Layar Inbound (`/inbound/receive`)  
**Sistem:** WMS Simple Enterprise (Universal Warehousing & 3PL Logistics)  
**Tanggal Analisis:** 18 September 2026  
**Status:** DRAFT ACTION PLAN / SIAP EKSEKUSI  

---

## 1. Ringkasan Eksekutif (Executive Summary)

Berdasarkan berkas pengujian awal **`Cek Fadh.docx`** dan bukti visual tangkapan layar antarmuka Inbound, telah dilakukan audit menyeluruh terhadap 11 temuan operasional. Seluruh temuan telah ditelusuri akar masalahnya (*Root Cause Analysis*) hingga ke tingkat baris kode sumber frontend (`Vue 3 / Nuxt 3 / Pinia`) dan backend (`Hono / PostgreSQL`).

### Peta Matriks Keterlacakan Temuan (Traceability Matrix)

| No | Poin Temuan UAT | Modul / Halaman Terdampak | Tingkat Keparahan | Status Logika Sistem |
|:---:|---|---|:---:|---|
| **1** | **Menu Inbound terputus (tidak ada menu Putaway)** | Sidebar Navigasi / Inbound | **P1 (Struktur Navigasi)** | Submenu Putaway belum didaftarkan di nav store; alur dock dan rak tercampur di `receive.vue`. |
| **2** | **Setelah klik Putaway, tombol tetap bisa diklik berkali-kali** | Inbound Receiving & Putaway | **P0 (Kritis - Dobel Stok)** | Tombol tidak disembunyikan saat `PUTAWAY_COMPLETED`; backend tidak memvalidasi status sehingga stok terus bertambah (*phantom stock*). |
| **3** | **Tombol proses Picking DO/SJ stuck saat dikonfirmasi** | Outbound Delivery Order | **P0 (Kritis - Blocker)** | `syncFeedback()` di frontend mengabaikan `outboundStore.errorMessage`, sehingga pesan gagal (misal stok kurang) tertelan tanpa feedback. |
| **4** | **Fitur Cetak Lembar belum jalan** | Stock Opname & TMS Trips | **P1 (Fitur Error)** | Prop dikirim `:data` padahal komponen mewajibkan `:receipt-data`; parser struk opname belum diimplementasikan di thermal printer. |
| **5** | **Sequence Opname belum jalan (diharapkan OPNAME + ID Gudang)** | Stock Opname Cycle Count | **P2 (Standardisasi)** | Penomoran masih menggunakan string acak `OPNAMEXXXXXX`, belum menggunakan format urut berbasis kode gudang dan tanggal. |
| **6** | **Istilah "Peran" disarankan diganti menjadi "Role"** | Master Pengguna & RBAC | **P3 (Standar Istilah)** | Form di `users.vue` dan middleware masih menggunakan kata bahasa Indonesia "Peran", belum seragam dengan "Role (RBAC)". |
| **7** | **Belum ada fitur Delete di Master Warehouse & Master SKU** | Master Data Gudang & Produk | **P1 (Fitur Belum Lengkap)** | Belum tersedia tombol aksi dan endpoint backend untuk nonaktifkan/hapus Gudang dan SKU. |
| **8** | **Kode Customer disarankan auto-generate (misal CUST001)** | Master Customer | **P2 (Kemudahan Operasional)** | Input kode customer masih manual `text-entry` bebas tanpa penomoran otomatis berurutan dari sistem. |
| **9** | **Input transaksi apakah masih pakai jam sistem?** | Seluruh Checkpoint Logistik | **P2 (Kepatuhan Audit)** | Transaksi fisik menggunakan waktu server riil (`CURRENT_TIMESTAMP`) demi integritas audit anti-*backdate* ISO/OWASP. |
| **10** | **POD/Delivery: Apakah harus TTD digital & Qty fisik free-entry** | Outbound Delivery & e-POD | **P1 (Integritas Data)** | Input qty fisik bersifat bebas tanpa batas maks (bisa melebihi order); TTD digital dikunci wajib mutlak di backend. |
| **11** | **Dibayar 50.000 padahal tagihan 0** | Modul Billing & Faktur | **P1 (Validasi Keuangan)** | Nominal faktur bersifat opsional (bisa tersimpan `NULL` / Rp 0), namun pencatatan pembayaran tetap memproses Rp 50.000 hingga berstatus LUNAS. |

---

## 2. Analisis Mendalam & Rekomendasi Solusi Teknis

---

### 1. Menu Inbound Terputus & Ketiadaan Menu Putaway
* **Deskripsi Temuan:**  
  Pada sidebar menu di bawah grup **Inbound (Barang Masuk)**, hanya terdapat menu *Receiving (Penerimaan Dock)* dan *Cross-Dock Antar-Gudang*. Menu *Putaway (Penempatan Rak)* tidak ada sehingga menu tampak terputus/kurang lengkap.
* **Akar Masalah (Root Cause):**  
  Pada file [`frontend/stores/auth.ts`](file:///c:/laragon/www/wms-wilog/frontend/stores/auth.ts#L88-L100), item submenu Inbound hanya memiliki 2 entri:
  ```typescript
  {
    name: 'Inbound (Barang Masuk)',
    path: '/inbound/receive',
    icon: 'inbound',
    children: [
      { name: 'Receiving (Penerimaan Dock)', path: '/inbound/receive', ... },
      { name: 'Cross-Dock Antar-Gudang', path: '/crossdock', ... }
    ]
  }
  ```
  Di operasional gudang, *Receiving* (bongkar dock & tally kedatangan) dilakukan oleh petugas dock, sedangkan *Putaway* (penempatan barang dari dock ke rak penyimpanan) dilakukan oleh staf gudang/operator forklift. Sebelumnya kedua fungsi ini digabungkan secara paksa di dalam satu halaman accordion di `receive.vue`.
* **Rekomendasi Solusi Teknis:**
  1. Daftarkan menu resmi **Putaway (Penempatan Rak)** pada `frontend/stores/auth.ts` dengan rute `/inbound/putaway`.
  2. Buat halaman khusus `frontend/pages/inbound/putaway.vue` yang menampilkan daftar PO berstatus `RECEIVED` untuk dialokasikan ke nomor rak/bin gudang.
  3. Kembalikan halaman `frontend/pages/inbound/receive.vue` agar murni menangani pembuatan PO baru dan penerimaan fisik kedatangan di staging dock (`CREATED` $\rightarrow$ `RECEIVED`).

---

### 2. Tombol Putaway Bisa Diklik Berkali-kali (Risiko Penggandaan Stok)
* **Deskripsi Temuan:**  
  Setelah proses putaway diselesaikan, banner hijau sukses muncul dan status berubah menjadi `Putaway Completed - stok masuk`. Namun tombol biru besar **`Selesaikan Putaway (stok masuk rak)`** tetap muncul di dalam kartu PO dan bisa ditekan berkali-kali.
* **Akar Masalah (Root Cause):**
  1. **Frontend ([`frontend/pages/inbound/receive.vue`](file:///c:/laragon/www/wms-wilog/frontend/pages/inbound/receive.vue#L147-L151)):**
     Tombol dirender menggunakan logika ternary sederhana:
     ```vue
     <button type="button" @click="po.status === 'CREATED' ? submitReceive(po) : submitPutaway(po)">
       {{ po.status === 'CREATED' ? 'Konfirmasi Receiving Fisik' : 'Selesaikan Putaway (stok masuk rak)' }}
     </button>
     ```
     Ketika status sudah `PUTAWAY_COMPLETED`, kondisi `po.status === 'CREATED'` bernilai *false*, sehingga tombol tetap merender label putaway dan tetap mengeksekusi `submitPutaway(po)`.
  2. **Backend ([`backend/src/routes/inbound.ts`](file:///c:/laragon/www/wms-wilog/backend/src/routes/inbound.ts#L209-L265)):**
     Endpoint `POST /api/inbound/:id/putaway` tidak memiliki validasi status order awal. Setiap kali endpoint ini dipanggil, fungsi `adjustStock({ movement_type: 'INBOUND_PUTAWAY', qty_change: item.storage_qty })` dieksekusi ulang. Akibatnya, saldo stok fisik di buku besar gudang bertambah dua kali lipat atau lebih (*phantom inventory*).
* **Rekomendasi Solusi Teknis:**
  1. **Proteksi Backend:** Tambahkan pengecekan status sebelum transaksi dimulai:
     ```typescript
     if (order.status === 'PUTAWAY_COMPLETED') {
       return c.json({ success: false, message: 'PO ini sudah berstatus PUTAWAY_COMPLETED' }, 409);
     }
     if (order.status !== 'RECEIVED') {
       return c.json({ success: false, message: 'Barang belum dilakukan penerimaan fisik di dock' }, 400);
     }
     ```
  2. **Proteksi Frontend:** Sembunyikan tombol putaway bila status PO sudah `PUTAWAY_COMPLETED`. Gantikan dengan lencana hijau permanen *"Barang Sudah di Rak Penyimpanan"*.

---

### 3. Tombol Proses Picking DO/SJ Stuck Saat Dikonfirmasi
* **Deskripsi Temuan:**  
  Pada daftar Delivery Order / Surat Jalan (`/outbound`), tombol "Proses Picking" dapat dibuka. Namun ketika tombol "Konfirmasi Picking Selesai" diklik, modal tidak tertutup dan tidak ada reaksi maupun feedback pesan sama sekali.
* **Akar Masalah (Root Cause):**  
  Pada [`frontend/pages/outbound/index.vue`](file:///c:/laragon/www/wms-wilog/frontend/pages/outbound/index.vue#L604-L608):
  ```javascript
  function syncFeedback() {
    if (waybillStore.errorMessage) feedback.value = { type: 'error', text: waybillStore.errorMessage }
    else if (waybillStore.successMessage) feedback.value = { type: 'ok', text: waybillStore.successMessage }
    else if (outboundStore.successMessage) feedback.value = { type: 'ok', text: outboundStore.successMessage }
    // BUG: outboundStore.errorMessage sama sekali tidak diperiksa!
  }
  ```
  Ketika backend menolak permintaan picking (misalnya stok di rak gudang tidak mencukupi: `Stok tidak mencukupi untuk SKU...`), fungsi `outboundStore.pickOrder()` menangkap error tersebut dan menyimpannya di `outboundStore.errorMessage`. Karena `syncFeedback()` tidak membaca variabel tersebut, pesan error tidak pernah tampil ke antarmuka pengguna, dan modal dibiarkan menggantung.
* **Rekomendasi Solusi Teknis:**
  1. Perbaiki `syncFeedback()` agar memprioritaskan pengecekan `outboundStore.errorMessage`:
     ```javascript
     if (outboundStore.errorMessage) feedback.value = { type: 'error', text: outboundStore.errorMessage }
     else if (waybillStore.errorMessage) feedback.value = { type: 'error', text: waybillStore.errorMessage }
     ```
  2. Tampilkan notifikasi error interaktif (SweetAlert2 atau kotak alert merah) langsung di dalam modal picking agar petugas langsung mengetahui detail kendala stok.

---

### 4. Fitur Cetak Lembar Belum Jalan
* **Deskripsi Temuan:**  
  Tombol "Cetak Lembar Kerja" pada Stock Opname dan Surat Tugas TMS tidak merespon saat ditekan.
* **Akar Masalah (Root Cause):**
  1. Pada [`frontend/pages/stock/opname.vue`](file:///c:/laragon/www/wms-wilog/frontend/pages/stock/opname.vue#L240), data dikirim dengan nama prop `:data="{...}"`.
  2. Komponen [`frontend/components/ThermalPrintButton.vue`](file:///c:/laragon/www/wms-wilog/frontend/components/ThermalPrintButton.vue#L24) mendefinisikan prop bernama `:receipt-data="receiptData"`, sehingga pembacaan payload bernilai `undefined`.
  3. `ThermalPrintButton` saat ini hanya mengimplementasikan driver ESC/POS untuk jenis `GATE_PASS` dan `SURAT_JALAN_SWAP`. Belum ada template data untuk lembar kerja Stock Opname.
* **Rekomendasi Solusi Teknis:**
  1. Samakan nama prop menjadi `:receipt-data` di seluruh pemanggil (`opname.vue` dan `trips.vue`).
  2. Tambahkan handler template cetak lembar kerja opname pada [`useThermalPrinter.ts`](file:///c:/laragon/www/wms-wilog/frontend/composables/useThermalPrinter.ts).
  3. Sediakan tombol pendamping cetak standar A4/HVS (`window.print()`) karena lembar hitung fisik opname di lorong rak umumnya dicetak pada lembar kertas lebar untuk diisi catatan manual oleh petugas lapangan.

---

### 5. Format Nomor Dokumen Stock Opname (Sequence)
* **Deskripsi Temuan:**  
  Nomor dokumen stock opname belum menggunakan penomoran urut berbasis ID/kode gudang.
* **Akar Masalah (Root Cause):**  
  Pada [`backend/src/routes/stock.ts`](file:///c:/laragon/www/wms-wilog/backend/src/routes/stock.ts#L393), sistem membuat nomor sesi dengan generator alfanumerik acak:
  `const opnameNumber = generateDocumentNumber('OPNAME', 6);` $\rightarrow$ contoh: `OPNAME48K9D2`.
* **Rekomendasi Solusi Teknis:**
  Ubah generator nomor sesi opname agar mengambil kode gudang dan nomor urut transaksi:
  * **Format Baku:** `OPNAME-{KODE_GUDANG}-{YYYYMMDD}-{URUT}`
  * **Contoh Hasil:** `OPNAME-WHJKT01-20260918-001`
  * Format ini memudahkan pengarsipan dokumen fisik dan pelacakan audit tahunan.

---

### 6. Standardisasi Istilah: "Peran" Disarankan Jadi "Role"
* **Deskripsi Temuan:**  
  Terdapat inkonsistensi penggunaan bahasa antara istilah "Peran" dan "Role (RBAC)".
* **Akar Masalah (Root Cause):**  
  Pada [`frontend/pages/master/users.vue`](file:///c:/laragon/www/wms-wilog/frontend/pages/master/users.vue#L124), label input form tertulis `Peran (RBAC) *`, subtitle halaman menyebut "peran (RBAC)", dan middleware `auth.global.ts` memunculkan pesan `Peran '...' tidak memiliki izin`. Sementara di tabel data sudah menggunakan `Role (RBAC)`.
* **Rekomendasi Solusi Teknis:**
  Standardisasi seluruh label formulir, placeholder, tabel, dan pesan validasi sistem menjadi **Role (RBAC)** agar seragam dengan modul teknis dan standar industri pergudangan modern.

---

### 7. Fitur Delete di Master Warehouse & Master SKU
* **Deskripsi Temuan:**  
  Tidak ada tombol maupun fungsi untuk menghapus/menonaktifkan gudang atau barang SKU yang sudah tidak digunakan.
* **Akar Masalah (Root Cause):**  
  Halaman [`master/warehouses.vue`](file:///c:/laragon/www/wms-wilog/frontend/pages/master/warehouses.vue) dan [`master/products.vue`](file:///c:/laragon/www/wms-wilog/frontend/pages/master/products.vue) hanya menyediakan aksi "Ubah" dan "Lihat Rak". Backend [`backend/src/routes/master.ts`](file:///c:/laragon/www/wms-wilog/backend/src/routes/master.ts) juga belum memiliki endpoint `DELETE /warehouses/:id` dan `DELETE /products/:id`.
* **Rekomendasi Solusi Teknis (Governance Guard):**
  Dalam sistem WMS Enterprise, data master yang telah memiliki catatan transaksi/buku besar stok **tidak boleh di-hard-delete** dari database karena akan merusak integritas relasi tabel (*foreign key constraint failure*).
  * **Pola Solusi Aman (Soft-Deactivate):**
    1. Tambahkan endpoint `DELETE /warehouses/:id` dan `DELETE /products/:id`.
    2. Cek apakah entitas tersebut memiliki saldo stok atau riwayat transaksi di ledger:
       * Jika **belum pernah ada mutasi** $\rightarrow$ lakukan penghapusan baris (*hard-delete*).
       * Jika **sudah memiliki riwayat transaksi** $\rightarrow$ lakukan nonaktifkan (*soft-deactivate* dengan mengubah flag `is_active = false`).
    3. Pasang tombol "Hapus / Nonaktifkan" di UI dengan konfirmasi dialog SweetAlert2.

---

### 8. Auto-Generate Kode Customer (Format CUST001)
* **Deskripsi Temuan:**  
  Saat menambahkan customer/vendor baru, petugas harus memikirkan dan mengetik kode customer secara manual.
* **Akar Masalah (Root Cause):**  
  Input kode customer di [`frontend/pages/master/customers.vue`](file:///c:/laragon/www/wms-wilog/frontend/pages/master/customers.vue#L104) berupa kolom input teks bebas tanpa nilai bawaan otomatis.
* **Rekomendasi Solusi Teknis:**
  1. Buat helper penomoran otomatis yang menghitung jumlah customer terdaftar dan menghasilkan format berurutan: `CUST001`, `CUST002`, dst.
  2. Isi kode tersebut secara default saat modal tambah customer dibuka, serta sediakan tombol "Generate Kode Otomatis" di samping kolom input.

---

### 9. Analisis Waktu Transaksi: Jam Sistem vs Input Manual
* **Deskripsi Temuan / Pertanyaan:**  
  *"Inputnya masih pakai jam system?"*
* **Prinsip Arsitektur & Kepatuhan Keamanan (Audit Trail Compliance):**
  * Sesuai ketentuan **OWASP Web Security A04** dan **Immutable Checkpoint Chain** pada [`docs/07_Checkpoint_Chain_and_Audit.md`](file:///c:/laragon/www/wms-wilog/docs/07_Checkpoint_Chain_and_Audit.md), seluruh mutasi fisik (stempel gerbang satpam, bongkar muat dock, putaway, verifikasi POD) **wajib menggunakan jam server riil (`CURRENT_TIMESTAMP`)**. Hal ini bertujuan mencegah pemalsuan jam kedatangan/keberangkatan (*backdating fraud*).
  * Untuk tanggal operasional bisnis yang bersifat perencanaan (contoh: *Estimasi Tanggal Kirim*, *Masa Berlaku STNK/KIR*, *Jadwal Kedatangan PO*), form input tanggal manual tetap disediakan.

---

### 10. Validasi Form POD: Kewajiban TTD Digital & Batasan Qty Fisik
* **Deskripsi Temuan:**  
  *"Di POD/delivery apa harus ada ttd digital? Qty diterima fisik ini bisa beda dari yang awal diterima karena free entry (mungkin bisa dibuat sesuai order diawal)."*
* **Akar Masalah (Root Cause):**
  1. Pada [`frontend/pages/outbound/pod.vue`](file:///c:/laragon/www/wms-wilog/frontend/pages/outbound/pod.vue#L258), input `deliveredQtyInput` berupa teks angka bebas tanpa validasi `max`. Driver bisa salah memasukkan angka sembarang yang melebihi jumlah pesanan.
  2. Backend [`backend/src/routes/outbound.ts`](file:///c:/laragon/www/wms-wilog/backend/src/routes/outbound.ts#L369) mewajibkan foto dan TTD secara mutlak (`if (!pod_photo_url || !signature_photo_url)`). Di kondisi lapangan tertentu (misal barang dititipkan ke security penerima), tanda tangan digital kanvas sulit didapatkan.
* **Rekomendasi Solusi Teknis:**
  1. Kunci nilai default `deliveredQtyInput` sama dengan total barang pesanan (`orderTotalQty`), dan pasang batas atas `:max="orderTotalQty"`.
  2. Berikan toggle centang *"Ada Selisih Fisik / Barang Rusak"* bila barang yang sampai tidak utuh, yang akan memunculkan kolom catatan investigasi.
  3. Berikan opsi *"Diterima Pos Jaga / Diwakilkan"* bila tanda tangan digital tidak memungkinkan, dengan syarat melampirkan foto stempel penerima atau foto KTP/tanda pengenal perwakilan.

---

### 11. Validasi Transaksi Billing: Mencegah Tagihan Rp 0 Dibayar Rp 50.000
* **Deskripsi Temuan:**  
  Invoice berhasil diterbitkan dengan nilai tagihan Rp 0. Kemudian sistem memperbolehkan pencatatan pembayaran sebesar Rp 50.000 dan menandai invoice langsung LUNAS.
* **Akar Masalah (Root Cause):**
  1. Di [`frontend/pages/billing/index.vue`](file:///c:/laragon/www/wms-wilog/frontend/pages/billing/index.vue#L81-L86), input nominal faktur tertulis *"Nilai faktur (Rp, opsional)"*.
  2. Jika admin tidak mengisi angka, nilai dikirim sebagai `NULL` ke backend [`backend/src/routes/billing.ts`](file:///c:/laragon/www/wms-wilog/backend/src/routes/billing.ts#L90) dan disimpan sebagai `amount = NULL`.
  3. Di daftar faktur, nilai `NULL` diformat menjadi `Rp 0`.
  4. Logika pelunasan di [`backend/src/routes/billing.ts`](file:///c:/laragon/www/wms-wilog/backend/src/routes/billing.ts#L195) membaca:
     ```typescript
     const lunas = invoice.amount == null ? true : totalPaid >= Number(invoice.amount);
     ```
     Karena `amount == null`, pembayaran berapa pun (termasuk Rp 50.000 terhadap tagihan Rp 0) langsung dianggap memenuhi syarat pelunasan.
* **Rekomendasi Solusi Teknis:**
  1. **Validasi Wajib Nominal:** Ubah kolom nominal faktur menjadi `required` dengan nilai minimal `min="1"`. Backend menolak penerbitan faktur bernilai `NULL` atau $\le 0$.
  2. **Auto-Fill Nilai Faktur:** Sistem secara otomatis menghitung estimasi nilai tagihan berdasarkan total item barang delivery order atau tarif standar ekspedisi, sehingga admin tidak perlu menghitung manual dan mencegah terjadinya faktur kosong.

---

## 3. Rencana Tahapan Eksekusi (Action Plan Sprints)

### Sprint 1: Kritis Operasional & Perbaikan Inbound (P0 & P1)
* [ ] Daftarkan submenu **Putaway (Penempatan Rak)** di `frontend/stores/auth.ts`.
* [ ] Bangun halaman antarmuka `/inbound/putaway.vue`.
* [ ] Pasang guard backend pada `inbound.ts` dan sembunyikan tombol putaway bila status sudah selesai.
* [ ] Perbaiki pembacaan `outboundStore.errorMessage` di `frontend/pages/outbound/index.vue`.
* [ ] Wajibkan input nominal faktur $> 0$ pada modul Billing.

### Sprint 2: Operasional Lapangan & Perangkat Keras (P1 & P2)
* [ ] Samakan prop `:receipt-data` dan tambahkan handler lembar kerja Stock Opname di driver printer thermal.
* [ ] Sediakan opsi cetak lembar kerja opname standar A4 (`window.print()`).
* [ ] Kunci nilai default kuantitas fisik e-POD sesuai jumlah pesanan (`max` limit).
* [ ] Terapkan format penomoran opname urut: `OPNAME-{KODE_GUDANG}-{YYYYMMDD}-{URUT}`.

### Sprint 3: Master Data & Standardisasi UI (P2 & P3)
* [ ] Tambahkan tombol dan endpoint Soft-Deactivate / Hapus di Master Gudang dan Master SKU.
* [ ] Tambahkan fitur penomoran otomatis kode customer (format `CUST001`).
* [ ] Ubah seluruh istilah "Peran" menjadi "Role (RBAC)" pada form dan middleware pengguna.
* [ ] Jalankan seluruh rangkaian uji otomatis Vitest (191+ test passing) dan uji kompilasi produksi Nuxt 3.
