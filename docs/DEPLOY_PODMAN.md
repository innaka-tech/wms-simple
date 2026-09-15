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

## 4. Konfigurasi Database (PostgreSQL di Level Host OS — Non-Root)

Database PostgreSQL dijalankan langsung di level sistem operasi host (bukan container) untuk kestabilan I/O, persistensi data independen dari siklus container, dan kepatuhan terhadap aturan keamanan hak akses minimum (*least privilege*):

```bash
# 1. Install PostgreSQL 16 di Host Ubuntu/Debian
apt update && apt install -y postgresql postgresql-contrib

# 2. Buat User wms_app (Non-Root, Non-Superuser) dan Database wms_simple_db
sudo -u postgres psql << 'EOF'
CREATE ROLE wms_app WITH LOGIN PASSWORD 'wms_secure_password_2026' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
CREATE DATABASE wms_simple_db OWNER wms_app;
GRANT ALL PRIVILEGES ON DATABASE wms_simple_db TO wms_app;
\c wms_simple_db
ALTER SCHEMA public OWNER TO wms_app;
GRANT ALL ON SCHEMA public TO wms_app;
EOF

# 3. Konfigurasi listen_addresses agar dapat diakses dari bridge network Podman
echo "listen_addresses = '*'" > /etc/postgresql/16/main/conf.d/listen.conf

# 4. Batasi akses otentikasi di pg_hba.conf (Hanya izinkan wms_app dari subnet internal & local)
cat << 'EOF' >> /etc/postgresql/16/main/pg_hba.conf

# WMS Simple Enterprise Container Subnet Access
host    wms_simple_db   wms_app         10.0.0.0/8             scram-sha-256
host    wms_simple_db   wms_app         127.0.0.1/32           scram-sha-256
host    wms_simple_db   wms_app         ::1/128                scram-sha-256
EOF

# 5. Restart service PostgreSQL
systemctl restart postgresql
systemctl status postgresql
```

> [!IMPORTANT]
> **Keamanan Anti-Privilege Escalation:** User `wms_app` memiliki atribut `NOSUPERUSER NOCREATEDB NOCREATEROLE`. Akses `COPY ... TO/FROM PROGRAM` dan eksekusi binary OS diblokir secara mutlak di tingkat database engine, sehingga jika kredensial aplikasi bocor sekalipun, penyerang tidak dapat melakukan eskalasi hak akses ke level root host.

---

## 5. Konfigurasi Environment (`.env`)

Buat berkas `.env` di direktori `/data/wms-simple/repo`:
```bash
cat << 'EOF' > .env
WMS_HTTP_PORT=8090
DB_HOST=host.containers.internal
DB_PORT=5432
DB_USER=wms_app
DB_PASSWORD=wms_secure_password_2026
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

## 7. Operasional Rutin (Update Versi Manual)

Untuk memperbarui aplikasi ke versi terbaru secara manual:
```bash
cd /data/wms-simple/repo
git pull origin ans
podman-compose -f docker-compose.podman.yml up -d --build
```

---

## 8. CI/CD Otomatis: Build Image ke GHCR & Auto-Pull Podman

Alur CI/CD otomatis telah dikonfigurasi melalui GitHub Actions ([`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)):

1. **Trigger:** Setiap `git push` ke branch `main` atau `ans` pada repositori `latiefdole/wms-simple`.
2. **Build & Push ke GHCR:**
   - Image backend di-push ke: `ghcr.io/latiefdole/wms-simple-backend:latest`
   - Image frontend di-push ke: `ghcr.io/latiefdole/wms-simple-frontend:latest`
3. **Auto-Deploy via SSH:**
   - GitHub Actions terhubung ke server `172.237.70.58` menggunakan SSH key dari secrets (`SSH_PRIVATE_KEY`).
   - Server melakukan login ke GHCR dan auto-pull image terbaru:
     ```bash
     podman pull ghcr.io/latiefdole/wms-simple-backend:latest
     podman pull ghcr.io/latiefdole/wms-simple-frontend:latest
     ```
   - Container backend & frontend di-restart dengan image baru tanpa mematikan database PostgreSQL.
   - Script memvalidasi respon healthcheck HTTP 200 OK.
