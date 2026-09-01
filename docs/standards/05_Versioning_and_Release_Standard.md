# 05_Versioning_and_Release_Standard.md

**Document:** Versioning, Migration, & Release Management Specification  
**Classification:** MANDATORY ENGINEERING STANDARD  
**Version:** 1.0.0  

---

## 1. Standar Versioning Aplikasi & Kode (Semantic Versioning 2.0.0)

WMS Simple menerapkan standar resmi [SemVer 2.0.0](https://semver.org/lang/id/):

$$\text{Format: MAJOR.MINOR.PATCH (Contoh: 2.1.0)}$$

| Komponen | Pemicu Kenaikan (Trigger) | Contoh Skenario di WMS Simple |
|---|---|---|
| **MAJOR (X.0.0)** | Perubahan arsitektur besar atau *breaking changes* yang tidak kompatibel dengan versi sebelumnya. | Penggantian skema database dari ENUM kaku ke Dynamic Lookup Tables, perombakan struktur payload API. |
| **MINOR (0.Y.0)** | Penambahan fitur baru yang *backwards-compatible* (kompatibel ke belakang). | Penambahan modul baru (misal: Modul Jembatan Timbang Truk, Modul Scan QR di Pos Satpam). |
| **PATCH (0.0.Z)** | Perbaikan bug (*bugfix* / *security patch*) tanpa penambahan fitur baru. | Perbaikan pembulatan angka susut de-bulking, penyesuaian validasi string kosong pada nama petugas. |

---

## 2. Standar Versioning Skema Database (Migration Versioning)

Untuk memastikan konsistensi antara database di Host PostgreSQL (`wms_simple_db`) dan lingkungan produksi, setiap perubahan skema database **wajib** dibuat melalui file migrasi berurutan dalam folder `database/migrations/`:

### 2.1 Format Penamaan File Migrasi
$$\text{database/migrations/YYYYMMDD_HHMMSS_<deskripsi_singkat>.sql}$$

*Contoh:*
- `database/migrations/20260826_100000_create_initial_wms_schema.sql`
- `database/migrations/20260831_210000_add_debulking_and_crossdoc_v2.sql`
- `database/migrations/20260831_220000_add_vehicle_fuel_consumption.sql`

### 2.2 Tabel Pelacak Migrasi Otomatis (`_schema_migrations`)
Setiap migrasi dicatat secara otomatis ke tabel internal:
```sql
CREATE TABLE IF NOT EXISTS _schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) UNIQUE NOT NULL, -- e.g. "20260831_210000"
    description VARCHAR(200) NOT NULL,
    checksum VARCHAR(64) NOT NULL,       -- SHA-256 hash isi file migrasi
    applied_by VARCHAR(100) NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Standar Versioning API (URI-Based Path Versioning)

1. **Prefix Jalur Versi Resmi:** Semua endpoint API yang dirilis untuk integrasi publik/client wajib menggunakan prefix versi:
   ```
   http://localhost:3000/api/v1/inbound
   http://localhost:3000/api/v1/fleet/departure
   http://localhost:3000/api/v1/debulking
   ```
2. **Kebijakan Deprecations:**
   - Jika ada perubahan parameter yang bersifat *breaking*, versi baru dirilis di `/api/v2/...`.
   - Versi lama (`/api/v1/`) tetap dipertahankan selama masa transisi minimal 6 bulan dengan header response:
     ```http
     Sunset: Wed, 31 Dec 2026 23:59:59 GMT
     Deprecation: @1735689600
     Link: </api/v2/inbound>; rel="successor-version"
     ```

---

## 4. Standar Catatan Perubahan (CHANGELOG.md)

Setiap rilis versi wajib mencatat riwayat perubahannya di file [`CHANGELOG.md`](file:///Users/anasfikri/Documents/Projects/ber5/wms-simple/CHANGELOG.md) berdasarkan standar [Keep a Changelog](https://keepachangelog.com/id/1.0.0/):

- `Added`: Untuk fitur baru.
- `Changed`: Untuk perubahan fungsi yang sudah ada.
- `Deprecated`: Untuk fitur yang akan dihapus di rilis mendatang.
- `Removed`: Untuk fitur yang telah dihapus.
- `Fixed`: Untuk perbaikan bug.
- `Security`: Untuk perbaikan celah keamanan (OWASP patch).

---

## 5. Sinkronisasi Status Mesin AI (`ai-state.json`)

Setiap agen AI (Claude, Antigravity, Cursor, Codex) yang mengerjakan tugas pada workspace ini wajib memperbarui state mesin pada [`ai-state.json`](file:///Users/anasfikri/Documents/Projects/ber5/wms-simple/ai-state.json) yang mencatat:
- Versi aktif sistem (`version`).
- Modul yang telah selesai (`modules`).
- Target host database aktif (`database.target`).
- Estimasi persentase kemajuan (`progress`).
