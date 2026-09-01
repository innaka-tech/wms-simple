# 08_Mobile_First_UI_UX_Design_System.md

**Dokumen:** Panduan Sistem Desain & Ergonomi Layar Sentuh (Mobile-First UI/UX)  
**Perangkat Target:** HP Android (Supir/Petugas), Tablet, Scanner Genggam Zebra/Honeywell, Desktop Web (Mode Shell)  
**Teknologi:** Nuxt 3 (Progressive Web App), Tailwind CSS, VueUse  
**Versi:** 2.4.0 (Simplified Logistics Jargon)  
**Status:** DOKUMEN ACUAN UTAMA  

---

## 1. Alasan Mengapa WMS Wajib "Mobile-First"

Di dunia logistik dan pergudangan nyata, **lebih dari 85% pekerjaan terjadi jauh dari meja komputer kantor**:
- **Tim Gudang (Checker/Tally):** Jalan ke lorong rak, menghitung koli di atas palet, membongkar karung, sambil pegang HP/Scanner.
- **Sopir Armada (Driver):** Lapor di pos gerbang atau minta tanda tangan serah terima barang di lokasi tujuan.
- **Satpam Gerbang (Gate Security):** Berdiri di pos memeriksa fisik truk, mencatat kilometer odometer, dan melihat sisa BBM.

Oleh karena itu, sistem WMS Simple ini dirancang dengan pendekatan **Mobile-Frame Shell**. Jika dibuka di HP, layarnya penuh (*full-screen*). Jika dibuka di komputer kantor (Desktop Web), tampilannya akan muncul di tengah layar seukuran bingkai HP. Hal ini menjamin **Zero Learning Curve** (tampilan di kantor dan lapangan 100% sama).

---

## 2. Model Navigasi Hibrida (Hybrid Navigation Model)

Untuk mengakomodasi banyaknya menu sistem Enterprise tanpa mengorbankan kecepatan kerja di lapangan, kita menggunakan tata letak layar lapis ganda:

1. **Jalur Cepat Bawah (Bottom Navigation Bar):**
   Terletak di bagian paling bawah layar. Hanya berisi 4-5 tombol yang **paling sering dipencet setiap jam** (Misal: *Home, Inbound, Gate Pass, Stok, e-POD*). Ini berada tepat di **Zona Jempol (Thumb-Zone)** sehingga operator bisa memencet pakai satu tangan tanpa meleset.
2. **Menu Samping Lengkap (App Drawer / Hamburger Menu):**
   Terletak di sudut kiri atas layar (Garis Tiga ☰). Jika ditekan, menu lengkap akan meluncur dari samping. Ini berisi menu yang **jarang dipakai tapi penting** (Misal: *Ganti Profil, Logout, Repacking, Laporan Lengkap*).

---

## 3. 6 Pilar Desain Anti-Gagal di Lapangan

1. **Tombol Raksasa (Large Touch Targets min. 48px):** Semua tombol di layar berukuran besar. Pekerja yang sedang memakai sarung tangan kerja tetap bisa memencet dengan mudah tanpa takut meleset (*fat-finger error*).
2. **Tombol "Tahan Bentar" (Sticky Action Bar):** Tombol eksekusi krusial seperti "Buka Palang", "Simpan", atau "Tukar Surat Jalan" selalu menempel di bagian bawah layar. Tidak perlu *scroll* jauh ke bawah hanya untuk mencari tombol Simpan.
3. **Mode Scan Barcode Ganda:**
   - **Kamera HP Biasa:** Pakai lensa kamera bawaan HP untuk scan nomor seri atau surat jalan.
   - **Tombol Laser Scanner (Hardware Wedge):** Jika memakai alat scanner industri (Zebra/Honeywell), pencet pelatuk laser fisik maka layar otomatis terisi data tanpa perlu disentuh.
4. **Respon Bunyi & Getar (Audio / Haptic Feedback):**
   - *Tit! (Getar Pendek):* Barang benar, jumlah pas.
   - *Tot-Tot-Tot! (Getar Panjang 3x):* Barang salah, jumlah kelebihan, atau alert bahaya nyala.
5. **Anti-Silau Matahari (High Contrast UI):** Layar pakai warna dasar gelap (*Dark Mode*) dengan tulisan sangat kontras (Putih/Biru Terang). Satpam di luar ruangan kena panas terik tetap bisa membaca tulisan Odometer dengan jelas.
6. **Layar Tanda Tangan & Foto Otomatis (Touch Signature & Camera):** Layar HP bisa langsung berubah jadi kanvas tanda tangan (untuk bukti serah terima / e-POD) dan langsung menjepret foto barang lengkap dengan titik koordinat GPS.

---

## 4. Gambaran Layar (Wireframe Layout Hibrida)

### 4.1 Kerangka Utama (The App Shell)

```
┌──────────────────────────────────────┐
│ [☰] WMS SIMPLE       WH-JKT-01 [●]   │ <- Atas: Tombol App Drawer & Status Sinyal
├──────────────────────────────────────┤
│                                      │
│                                      │
│                                      │
│         (Area Form & Tabel)          │
│       Bisa di-scroll naik turun      │
│                                      │
│                                      │
│                                      │
├──────────────────────────────────────┤
│ 🏠 Home  🚛 Gate  📥 In  📊 Stok     │ <- Bawah: Bottom Nav (Zona Jempol Cepat)
└──────────────────────────────────────┘
```

### 4.2 Saat Menu Samping (App Drawer) Dibuka

```
┌──────────────────────────────────────┐
│ ┌─────────────────────────┐          │
│ │ [W] WMS Simple      [✕] │          │
│ │ ─────────────────────── │  Layar   │
│ │ 👤 Budi (Checker)       │          │
│ │ ─────────────────────── │  Utama   │
│ │ 🏠 Dashboard            │          │
│ │ 📥 Penerimaan (Inbound) │  Gelap   │
│ │ 🚛 Pos Satpam Keluar    │          │
│ │ ⚡ Cross-Dock (Tukar SJ)│ (Di-blur)│
│ │ ⚖️ Repacking (De-bulk)  │          │
│ │ 📊 Kartu Stok           │          │
│ │ 🚪 Keluar (Logout)      │          │
│ └─────────────────────────┘          │
└──────────────────────────────────────┘
```
