# 01_Development_and_Coding_Standard.md

**Document:** Software Engineering, Architecture, & Coding Standards  
**Scope:** Frontend (Nuxt 3 / TypeScript), Backend (Hono / TypeScript), Database (Host PostgreSQL)  
**Version:** 1.0.0  
**Status:** MANDATORY STANDARD  

---

## 1. Git Workflow & Version Control Standard

### 1.1 Branching Strategy (Trunk-Based Development with Short-Lived Feature Branches)
```
main (Production Ready / Stable)
  ├── staging (Integration & QA Environment)
  └── feat/<module>-<description> (e.g. feat/gate-pass-odometer, feat/debulking-calc)
  └── fix/<issue-description>     (e.g. fix/stock-movement-rounding)
```

- **Protected Branches:** Branch `main` dan `staging` wajib diproteksi. Tidak diperkenankan `git push --force` atau direct commit.
- **Merge Requirements:** Minimal 1 Code Review approval + CI Pipeline Hijau (Linting + Typecheck + Unit Tests passed).

### 1.2 Conventional Commits Specification
Format commit wajib mengikuti standar [Conventional Commits](https://www.conventionalcommits.org/):
$$\text{<type>(<scope>): <short description>}$$

- **Tipe Commit:**
  - `feat`: Penambahan fitur baru (misal: `feat(fleet): add gate return odometer validation`).
  - `fix`: Perbaikan bug (misal: `fix(stock): prevent negative balance on outbound pick`).
  - `docs`: Pembaruan dokumentasi/arsitektur (misal: `docs(security): add OWASP AI threat model`).
  - `refactor`: Perapian kode tanpa mengubah fungsionalitas.
  - `test`: Penambahan atau perbaikan unit/integration tests.
  - `chore`: Konfigurasi build tool, dependencies, CI/CD.

---

## 2. Standar Arsitektur Kode (Clean Modular Architecture)

Sistem wajib menerapkan **Separation of Concerns** secara tegas dengan struktur 3-Layer:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. TRANSPORT / ROUTE LAYER (Hono Routes / Nuxt Pages)       │
│    - Validasi Input (Zod Schema Validation)                 │
│    - Autentikasi & Otorisasi Guard                          │
│    - HTTP Status Code & Response Serializer                 │
├─────────────────────────────────────────────────────────────┤
│ 2. DOMAIN / SERVICE LAYER (Pure TypeScript Business Logic)   │
│    - Aturan Bisnis (Kalkulasi Susut, Validasi Tonase)       │
│    - Checkpoint Chain Logger Trigger                        │
│    - Framework-Agnostic (Bisa di-unit test tanpa mock HTTP) │
├─────────────────────────────────────────────────────────────┤
│ 3. DATA ACCESS LAYER (PostgreSQL Driver / Repository)        │
│    - Parameterized SQL Queries (Anti-SQL Injection)         │
│    - Database Transaction Management (BEGIN, COMMIT, ROLL)  │
│    - Entity Mapping & Constraint Handling                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Standar Penulisan Kode (Coding Guidelines)

### 3.1 TypeScript Strict Mode
- `tsconfig.json` **wajib** mengaktifkan `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`.
- **Dilarang menggunakan tipe `any`** untuk data bisnis. Semua entitas wajib memiliki interface/type yang jelas:
  ```typescript
  // ❌ BURUK
  function processDebulking(data: any) { ... }

  // ✅ BAIK
  interface DebulkingInput {
    productId: string;
    warehouseId: string;
    qtyUsed: number;
    uomId: string;
    weightKg: number;
  }
  function processDebulking(input: DebulkingInput): Promise<DebulkingResult> { ... }
  ```

### 3.2 Error Handling Terstandarisasi (RFC 7807 Problem Details)
Seluruh error API wajib menghasilkan format JSON terstruktur yang seragam:
```json
{
  "success": false,
  "error": {
    "code": "STOCK_INSUFFICIENT",
    "message": "Stok on-hand tidak mencukupi untuk alokasi pengeluaran ini.",
    "details": {
      "product_id": "e0000000-0000-0000-0000-000000000001",
      "available": 20,
      "requested": 25
    },
    "timestamp": "2026-08-31T22:00:00.000Z"
  }
}
```

### 3.3 Penamaan (Naming Conventions)
- **File & Folder:** `kebab-case` (contoh: `stock-movement.ts`, `fleet-exit-log.vue`).
- **Class / Type / Interface:** `PascalCase` (contoh: `StockMovementService`, `VehicleType`).
- **Variable / Function:** `camelCase` (contoh: `calculateShrinkageLoss`, `fetchActiveAlerts`).
- **Database Tables & Columns:** `snake_case` (contoh: `stock_conversions`, `departure_time`).
- **Constants / Enums Code:** `UPPER_SNAKE_CASE` (contoh: `INBOUND_RECEIVE`, `BULKY_HEAVY`).

---

## 4. Standar Database & Query Performance

1. **Wajib Transaksi Database untuk Operasi Multi-Tabel:**
   Semua operasi yang mengubah lebih dari satu tabel (misal: update status order + insert log mutasi stok + insert checkpoint) wajib dibungkus dalam blok `BEGIN ... COMMIT` dengan penanganan `ROLLBACK` otomatis saat terjadi kegagalan.
2. **Anti-Blind Update pada Saldo Stok:**
   Dilarang melakukan `UPDATE stock_levels SET qty_on_hand = 100` tanpa mencatat riwayat delta perubahan di `stock_movements`.
3. **Pemberian Indeks Kolom Pencarian:**
   Setiap kolom foreign key (`warehouse_id`, `product_id`, `vehicle_id`) dan kolom status filter (`status`, `created_at`) wajib memiliki index b-tree.
4. **Idempotency Keys untuk Transaksi Kritis:**
   Endpoint transaksi muat/bongkar/gate-out mendukung *idempotency-key* pada header HTTP untuk mencegah *double submit* akibat koneksi seluler tidak stabil di lapangan.
