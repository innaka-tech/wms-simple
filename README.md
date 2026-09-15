# WMS Simple Enterprise (Trucking & 3PL Logistics)

**WMS Simple** adalah Warehouse Management System pragmatis, modular, dan berkehandalan tinggi yang dirancang khusus untuk operasional **Trucking, Distribusi 3PL, dan Hub-and-Spoke Logistics**.

Sistem ini mengeliminasi *overhead* berlebih dari *dynamic visual flow builder* yang rawan *human error*, dan menggantikannya dengan **alur deterministik yang kuat**, **master data dinamis yang dapat dikelola penuh**, dukungan **kargo Bulky & Curah (dengan modul De-bulking)**, **Cross-Document Re-issuance (Surat Jalan Swap / Blind Shipping)**, serta **Pencatatan Armada Keluar-Masuk (Security Gate Pass)**.

---

## 1. Modul Utama Sistem

```
WMS SIMPLE ENTERPRISE
├── 1. Master Data Management (Dinamis via DB/API)
│    ├── Tipe Kargo (Bulky, Curah Kering, Curah Cair, Packaged)
│    ├── Jenis Kemasan (Jumbo Bag, Drum, Pallet, Karung, Silo, Tangki)
│    ├── Master UOM & Konversi Otomatis (KG, TON, Liter, CBM, Sak)
│    ├── Jenis Armada & Spek Teknis (CDE, CDD, Fuso, Tronton Wingbox, Dump Truck, Tanker, Trailer)
│    └── Tipe Dokumen Logistik (SJ Supplier, SJ Pengiriman, Master/House AWB)
├── 2. Inbound Management (Receive -> Weighbridge -> Sort -> Putaway)
├── 3. De-bulking & Conversion (Pencurahan Bulky -> Curah / Karung + Susut %)
├── 4. Cross-Docking & Inter-Hub Transit (Jakarta Main Hub -> Spoke Cabang)
├── 5. Cross-Document Management (Surat Jalan Swap, Re-issuance, Blind Shipping)
├── 6. Outbound Fulfillment (Pick -> Pack -> Ship -> POD Digital Signature & Photo)
├── 7. Pencatatan Armada Keluar-Masuk (Gate Pass Pos Satpam: Odometer, BBM, Surat Jalan Sah)
├── 8. Buku Besar Mutasi Stok Ganda (Double-Entry Stock Ledger)
└── 9. Rantai Audit Checkpoint Tak Terputus (Immutable Linked-List Chain)
```

---

## 2. Kerangka Strategis 6 Pilar

1. **Enabler:** Fondasi master data dinamis, multi-UOM, multi-gudang, dan integrasi database PostgreSQL host.
2. **Accelerator:** *Cross-docking* instan, penerbitan ulang *Cross-Doc* otomatis, dan scanning barcode cepat.
3. **Decision Support:** Validasi kapasitas tonase (kg) & kubikasi (CBM) armada terhadap kargo, toleransi susut de-bulking.
4. **Protector:** Modul Pos Satpam Gerbang (Odometer & BBM), rantai checkpoint audit tak terputus (*immutable*), dan wajib nama petugas fisik.
5. **Business Driver:** Penanganan komoditas bulky, curah basah/kering, dan *blind shipping* untuk menjaga rahasia komersial 3PL.
6. **Terukur (Metrics/KPI):** Pemantauan OTIF, waktu *dock-to-stock*, utilisasi armada, dan *shrinkage rate*.

---

## 3. Tech Stack & Arsitektur

- **Backend API:** [Hono](https://hono.dev/) (Node.js & TypeScript) — *ultra-lightweight, router tercepat (<2ms latency), footprint RAM < 25MB, type-safe RPC*.
- **Database:** PostgreSQL 16 pada Host Machine (Shared Database Stack: `wms_simple_db`).
- **Frontend:** Nuxt 3 (SSR + PWA-Ready) & Tailwind CSS.
- **Audit & Security:** Immutable Linked-List Checkpoint Logger & Pos Satpam Gate Pass.

---

## 4. Konfigurasi Database (Host PostgreSQL)

Sesuai acuan `/Users/anasfikri/Documents/Projects/databases/README.md`, WMS Simple terhubung ke PostgreSQL engine global yang berjalan di host:

```dotenv
PORT=3000
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=wms_simple_db
```

### Menjalankan Backend:
```bash
cd backend
npm install
npm run dev
```

Endpoint Health Check: `http://localhost:3000/api/health`

---

## 5. Deployment Menggunakan Podman (Pengganti Docker)

Aplikasi **WMS Simple Enterprise** mendukung penuh **Podman** sebagai runtime container modern pengganti Docker.

### Mengapa Memilih Podman?
1. **Daemonless Architecture:** Podman tidak membutuhkan daemon background terpusat (`dockerd`), sehingga mengeliminasi *single point of failure*.
2. **Rootless Security (OWASP & Hardening):** Container dapat dijalankan tanpa hak akses root pengguna (*non-root*), sangat aman dari eskalasi hak istimewa (privilege escalation).
3. **Drop-in Replacement:** Perintah CLI kompatibel 1:1 dengan Docker (`alias docker=podman`).
4. **OCI Compliant:** Menggunakan format standar Open Container Initiative untuk image dan container.

### Perbandingan Perintah CLI Docker vs Podman

| Operasi | Perintah Docker | Perintah Podman |
|---|---|---|
| **Build Image** | `docker build -t wms-be ./backend` | `podman build -t wms-be ./backend` |
| **Daftar Container** | `docker ps -a` | `podman ps -a` |
| **Lihat Log** | `docker logs -f wms-backend` | `podman logs -f wms-backend` |
| **Jalankan Compose** | `docker compose up -d` | `podman compose up -d` *(atau `podman-compose up -d`)* |
| **Stop Compose** | `docker compose down` | `podman compose down` *(atau `podman-compose down`)* |
| **Prune Image Usang** | `docker image prune -f` | `podman image prune -f` |

---

### Panduan Langkah Demi Langkah: Migrasi dari Docker ke Podman

#### 1. Persiapan Host (Install Podman & Podman Compose)
```bash
# Ubuntu 24.04 / Debian
sudo apt update && sudo apt install -y podman podman-compose

# Verifikasi instalasi
podman --version
podman-compose --version
```

#### 2. Konfigurasi File Lingkungan (`.env`)
Salin file `.env.example` ke `.env` dan sesuaikan parameter konfigurasi:
```bash
cat << 'EOF' > .env
WMS_HTTP_PORT=8090
DB_HOST=postgres
DB_PORT=5432
DB_USER=wms_app
DB_PASSWORD=wms_secure_password_2026
DB_NAME=wms_simple_db
JWT_SECRET=wms_super_secret_jwt_key_staging_2026_change_in_prod
EOF
```

#### 3. Menjalankan Stack Mandiri dengan Podman Compose
Repositori telah dilengkapi dengan konfigurasi [docker-compose.podman.yml](docker-compose.podman.yml) yang mencakup PostgreSQL 16 terisolasi, backend Hono, frontend Nuxt 3, dan Nginx gateway:

```bash
# Build dan jalankan seluruh stack di latar belakang
podman compose -f docker-compose.podman.yml up -d --build

# ATAU menggunakan podman-compose
podman-compose -f docker-compose.podman.yml up -d --build
```

#### 4. Verifikasi Kesehatan Layanan
```bash
# Periksa container yang sedang berjalan
podman ps

# Periksa status endpoint healthcheck backend
curl -s http://127.0.0.1:8090/api/health
```

#### 5. Pembaruan Aplikasi (Continuous Update)
```bash
git pull origin ans
podman compose -f docker-compose.podman.yml up -d --build
```

---

## 6. Indeks Dokumentasi Lengkap (`docs/`)

- [DEPLOY_PODMAN.md](docs/DEPLOY_PODMAN.md) — Panduan Operasional Khusus Deployment Podman di Server Staging/Produksi.
- [01_Strategic_Framework_and_6_Pillars.md](docs/01_Strategic_Framework_and_6_Pillars.md) — 6 Pilar Strategis & Rationale Kenapa Menggunakan Hono.
- [02_Bulky_Curah_and_Debulking.md](docs/02_Bulky_Curah_and_Debulking.md) — Penanganan Bulky & Curah, De-bulking/Bagging-Off, Susut/Loss %, Jembatan Timbang (Flow & Sequence Diagram).
- [03_CrossDock_and_CrossDocument.md](docs/03_CrossDock_and_CrossDocument.md) — Cross-Docking & Definisi/Alur Cross-Document Swap (Flow & Sequence Diagram).
- [04_Dynamic_Master_Data_and_Fleet.md](docs/04_Dynamic_Master_Data_and_Fleet.md) — Master Data Tanpa Hardcode & Spesifikasi Lengkap Armada Indonesia.
- [05_Fleet_Exit_and_Security_Gate_Flows.md](docs/05_Fleet_Exit_and_Security_Gate_Flows.md) — Prosedur Pos Satpam Gerbang Keluar-Masuk (Flow & Sequence Diagram).
- [06_Outbound_and_POD_Flows.md](docs/06_Outbound_and_POD_Flows.md) — Alur Outbound, Picking, Packing, dan Digital POD (Flow & Sequence Diagram).
- [07_Checkpoint_Chain_and_Audit.md](docs/07_Checkpoint_Chain_and_Audit.md) — Arsitektur Rantai Audit Checkpoint Tak Terputus (Flow & Sequence Diagram).
