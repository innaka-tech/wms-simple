# 03_Testing_and_Quality_Assurance_Standard.md

**Document:** Software Testing, Verification, & Quality Assurance Standards  
**Scope:** Unit Tests, Integration Tests, End-to-End Tests, Load Testing, Automated CI Gates  
**Version:** 1.0.0  
**Status:** MANDATORY STANDARD  

---

## 1. Piramida Pengujian Perangkat Lunak (Test Pyramid)

WMS Simple menerapkan strategi piramida pengujian terstruktur untuk menjamin kehandalan sistem sebelum dirilis ke lingkungan staging/produksi:

```
                  ┌───────────────┐
                  │  E2E Tests    │  10% (Playwright - Mobile Flows)
                  ├───────────────┤
                  │  Integration  │  30% (Hono Supertest + PostgreSQL)
                  ├───────────────┤
                  │  Unit Tests   │  60% (Vitest - Services & Calculations)
                  └───────────────┘
```

---

## 2. Skenario Pengujian Wajib untuk Modul Kritis (High-Risk Modules)

### 2.1 Modul De-bulking & Konversi Stok (Susut / Shrinkage Test)
- **Kasus Uji DEB-01 (Kalkulasi Susut Wajar):**
  Input 1.000 KG Bulky, Output 995 KG Karung (Susut 5 KG = 0.50%).  
  *Ekspektasi:* Status `COMPLETED`, tidak ada alert, saldo bulky berkurang 1, saldo karung bertambah 39.8 sak.
- **Kasus Uji DEB-02 (Deteksi Susut Melebihi Batas Toleransi):**
  Input 1.000 KG Bulky, Output 980 KG Karung (Susut 20 KG = 2.00% > Toleransi 1.00%).  
  *Ekspektasi:* Status `COMPLETED`, terbit baris alert `DEBULKING_SHRINKAGE_HIGH` pada tabel `alerts`.
- **Kasus Uji DEB-03 (Hukum Kekekalan Massa / Conservation of Mass):**
  Total berat output + total susut wajib persis sama dengan total berat input:
  $$\text{Total Input} = \text{Total Output} + \text{Susut}$$

### 2.2 Modul Gate Pass Pos Satpam (Odometer & Dokumen Test)
- **Kasus Uji GATE-01 (Validasi Odometer Masuk Lebih Kecil dari Keluar):**
  Odometer Keluar: `45.200 KM`, Input Odometer Masuk: `45.100 KM`.  
  *Ekspektasi:* Sistem menolak transaksi dengan HTTP 400: *"Odometer In tidak boleh lebih kecil dari Odometer Out"*.
- **Kasus Uji GATE-02 (Pencegahan Double Departure):**
  Kendaraan yang sudah berstatus `IN_USE` dicoba didaftarkan keluar lagi.  
  *Ekspektasi:* Sistem menolak dengan pesan: *"Kendaraan sedang berstatus IN_USE (belum ada log kembali)"*.
- **Kasus Uji GATE-03 (Kalkulasi Jarak Tempuh Otomatis):**
  Odometer Keluar: `45.200 KM`, Odometer Masuk: `45.450.5 KM`.  
  *Ekspektasi:* `distance_travelled_km` tersimpan persis `230.5 KM`.

### 2.3 Modul Buku Besar Stok (Double-Entry Ledger Test)
- **Kasus Uji STK-01 (Pencegahan Saldo Negatif):**
  Stok fisik on-hand 10 unit, pesanan outbound mencoba melakukan pick 15 unit.  
  *Ekspektasi:* Database Rollback, pesan error *"Stok tidak mencukupi"*, tidak ada mutasi parsial yang tersimpan.
- **Kasus Uji STK-02 (Integritas Cross-Dock Inter-Hub):**
  Barang dimuat di Hub Jakarta: `on_hand -50`, `in_transit +50`.  
  Barang diterima di Hub Bali: `in_transit -50`, `on_hand_bali +50`.  
  *Ekspektasi:* Saldo total konsolidasi perusahaan tetap 50 unit.

### 2.4 Modul Rantai Audit Checkpoint (Chain Link Continuity Test)
- **Kasus Uji AUD-01 (Kontinuitas Pointer `prev_checkpoint_id`):**
  Langkah 1 (PO Created, ID: A) -> Langkah 2 (PO Received, ID: B, prev_id: A) -> Langkah 3 (Putaway, ID: C, prev_id: B).  
  *Ekspektasi:* Rantai link tidak terputus; verifikasi query rekursif berhasil merekonstruksi alur 100%.
- **Kasus Uji AUD-02 (Wajib Nama Petugas):**
  Request tanpa parameter `actor_name` atau string kosong (`""`).  
  *Ekspektasi:* Sistem menolak dengan HTTP 400: *"Nama petugas pelaksana wajib diisi"*.

---

## 3. Target Cakungan Kode (Code Coverage Targets)

| Layer Komponen | Minimum Code Coverage | Tooling |
|---|:---:|---|
| **Domain & Business Logic Services** | **≥ 90%** | Vitest |
| **API Transport & Route Handlers** | **≥ 80%** | Supertest / Hono Client |
| **Database Migrations & Constraints** | **100%** | Schema Integrity Assertion |
| **Frontend Mobile Critical Components** | **≥ 75%** | Vitest + Vue Test Utils |

---

## 4. Gerbang Kualitas Otomatis CI/CD (Quality Gates)

Setiap Pull Request (PR) wajib melewati tahapan pemeriksaan otomatis:
1. **Linter & Formatting:** `npm run lint` (ESLint + Prettier) - *0 Errors Allowed*.
2. **Type Checking:** `npm run typecheck` (`tsc --noEmit`) - *0 Type Errors Allowed*.
3. **Security Audit:** `npm audit --audit-level=high` - *0 High/Critical Vulnerabilities*.
4. **Test Suite Execution:** `npm run test` - *100% Tests Passed*.
