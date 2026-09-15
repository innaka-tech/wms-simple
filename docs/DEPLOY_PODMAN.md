# Deploy WMS Simple Enterprise — Podman (Server: 172.237.70.58)

Panduan ini mendokumentasikan langkah deployment aplikasi **WMS Simple Enterprise** menggunakan container runtime **Podman** pada server baru `172.237.70.58` (SSH Alias: `wms`).

---

## 1. Akses Server (SSH Alias: `wms`)

Kunci SSH telah disiapkan di mesin lokal:
- **Private Key:** `~/.ssh/id_ed25519_wms`
- **Public Key:** `~/.ssh/id_ed25519_wms.pub`
- **Konfigurasi SSH (`~/.ssh/config`):**
  ```ssh-config
  Host wms 172.237.70.58
      HostName 172.237.70.58
      User root
      IdentityFile ~/.ssh/id_ed25519_wms
      IdentitiesOnly yes
  ```

---

## 2. Prasyarat di Server `172.237.70.58`

Pastikan `podman` dan `podman-compose` terinstall di server:

```bash
# Ubuntu / Debian
apt update && apt install -y podman podman-compose git

# Verifikasi
podman --version
podman-compose --version
```

---

## 3. Clone Repositori

```bash
mkdir -p /data/wms-simple
cd /data/wms-simple

git clone -b ans https://github.com/innaka-tech/wms-simple.git repo
cd repo
```

---

## 4. Konfigurasi Database (PostgreSQL)

Jika database PostgreSQL dijalankan via Podman di server:
```bash
# Buat volume dan jalankan container PostgreSQL
podman volume create pg_wms_data

podman run -d \
  --name wms-postgres \
  --restart always \
  --network host \
  -e POSTGRES_DB=wms_simple_db \
  -e POSTGRES_USER=wms_app \
  -e POSTGRES_PASSWORD=WmsSecurePassword2026! \
  -v pg_wms_data:/var/lib/postgresql/data \
  docker.io/library/postgres:16-alpine
```

---

## 5. Konfigurasi Environment (`.env`)

Buat berkas `.env` di direktori `/data/wms-simple/repo`:
```bash
cat << 'EOF' > .env
WMS_HTTP_PORT=8090
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=wms_app
DB_PASSWORD=WmsSecurePassword2026!
DB_NAME=wms_simple_db
JWT_SECRET=wms_super_secret_jwt_key_staging_2026_change_in_prod
EOF
```

---

## 6. Build & Jalankan dengan Podman

```bash
cd /data/wms-simple/repo

# Jalankan dengan podman compose
podman compose -f docker-compose.prod.yml up -d --build

# ATAU menggunakan podman-compose
podman-compose -f docker-compose.prod.yml up -d --build
```

### Memeriksa Status Container & Health:
```bash
podman ps

# Cek log backend
podman logs -f wms-simple-backend

# Cek health check endpoint
curl -s http://127.0.0.1:8090/api/health
```

---

## 7. Operasional Rutin (Update Versi)

Untuk memperbarui aplikasi ke versi terbaru:
```bash
cd /data/wms-simple/repo
git pull origin ans
podman compose -f docker-compose.prod.yml up -d --build
```
