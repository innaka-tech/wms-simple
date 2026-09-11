# Deploy Produksi — Server Innaka

Dokumen ini menjelaskan cara aplikasi di-deploy ke server innaka.
**Kredensial asli TIDAK ada di file ini** — tersimpan di server:
`/data/docker-data/wms-simple/CREDENTIALS.md` (di luar repo, permission 600).

---

## 1. Topologi

| Komponen | Nilai |
|---|---|
| Server | innaka (Linode/Akamai) `104.64.221.233` |
| Lokasi deploy | `/data/docker-data/wms-simple/repo` (branch `ans`) |
| URL publik | `http://104.64.221.233:8090` |
| Gateway | nginx (`wms-simple-gateway`) — satu-satunya port yang expose ke internet |
| Backend | Hono/Node 20 (`wms-simple-backend`, internal :3000) |
| Frontend | Nuxt 3 SSR (`wms-simple-frontend`, internal :3000) |
| Database | PostgreSQL global stack host (container `global_postgres`, port `5432` di host) — diakses via `host.docker.internal` |

Referensi pola deploy: `/data/docker-data/dph` (Digital Procurement Hub) — juga
memakai `global_postgres` host dengan DB/user terpisah per aplikasi.

## 2. Database

Database dan user **baru** dibuat khusus untuk WMS (bukan memakai milik proyek lain):

- Database: `wms_simple_db`
- User: `wms_app` (owner database tersebut)
- Schema + seed data diinisialisasi **otomatis** saat backend pertama start
  (`backend/src/pg-schema.ts`, idempotent: `CREATE TABLE IF NOT EXISTS` + seed `ON CONFLICT DO NOTHING`).

## 3. Environment

Salin `.env.example` → `.env` lalu isi nilai aslinya (lihat CREDENTIALS.md di server):

```
WMS_HTTP_PORT=8090
DB_HOST=host.docker.internal
DB_PORT=5432
DB_USER=wms_app
DB_PASSWORD=<lihat CREDENTIALS.md>
DB_NAME=wms_simple_db
JWT_SECRET=<lihat CREDENTIALS.md>
```

`.env` git-ignored — tidak pernah masuk repositori.

## 4. Operasional

```bash
cd /data/docker-data/wms-simple/repo

# Start / stop
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml down

# Update ke versi terbaru
git pull origin ans
docker compose -f docker-compose.prod.yml up -d --build

# Log
docker logs -f wms-simple-backend
```

Health check: `curl http://104.64.221.233:8090/api/health` → `200`.

## 5. Catatan keamanan

- Semua akun seed memakai password lemah (`password123`) untuk kemudahan onboarding —
  **wajib diganti** sebelum dipakai operasional nyata.
- `client_max_body_size 20M` di nginx membatasi ukuran upload foto POD.
- Rate limit API: 30 req/s per IP (zone `api_limit` di `docker/nginx.conf`).
