# AI Operating Model & Governance

**Project:** WMS Simple Enterprise  
**Applies To:** All AI Agents (Antigravity, Claude, Cursor, Codex, OpenCode, Aider)  
**Version:** 2.0.0  

---

## 1. Single Source of Truth Hierarchy

Setiap agen AI wajib memperlakukan berkas-berkas berikut sebagai acuan hierarkis tertinggi:

1. **`AGENTS.md` & `docs/00_Index_and_Roadmap.md`:** Panduan tata kelola dan peta master seluruh dokumentasi.
2. **`docs/ai/decisions.md`:** Keputusan arsitektur yang telah disepakati (ADR-01 hingga ADR-10). Dilarang mengubah arah arsitektur tanpa persetujuan eksplisit.
3. **`docs/standards/*`:** Seluruh standar baku (Coding, OWASP & OWASP AI, Testing, Audit, Versioning).
4. **`docs/ai/current-task.md` & `ai-state.json`:** Status aktif pekerjaan saat ini dan persentase kemajuan mesin.
5. **Database Ground Truth:** Skema dan data ground truth di Host PostgreSQL (`wms_simple_db` di `127.0.0.1:5432`).

---

## 2. Aturan Siklus Kerja AI (Agent Lifecycle Protocol)

1. **Awal Sesi (Session Start):**
   - Baca `docs/ai/current-task.md` dan `docs/ai/decisions.md`.
   - Verifikasi status database host PostgreSQL (`127.0.0.1:5432`).
2. **Selama Bekerja (Execution Guardrails):**
   - 100% Parameterized SQL Queries (`$1, $2`). Dilarang raw SQL string concatenation.
   - Validasi output terstruktur AI menggunakan Zod Schema kaku.
   - Wajib menyertakan `actor_name` (nama petugas fisik) pada setiap mutasi stok dan perpindahan status.
   - Mengikuti Semantic Versioning 2.0.0 (`v2.3.0`) dan pencatatan riwayat di `CHANGELOG.md`.
3. **Akhir Sesi (Session Close):**
   - Perbarui `docs/ai/current-task.md` dan `docs/ai/handoff.md`.
   - Mutakhirkan `ai-state.json` dengan modul dan persentase kemajuan terkini.
   - Sinkronkan ringkasan kemajuan ke Uteke Knowledge Base MCP (`uteke_remember`).
   - Tanyakan kepada pengguna: *"mau update ke ictnotes.?"*
