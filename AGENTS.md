<!-- ai-toolkit:protocol:start -->
# WMS Simple Enterprise - AI Agent Protocol & Governance (AGENTS.md)

Dokumen ini adalah **panduan wajib (mandatory protocol)** untuk setiap Agen AI (Claude, Antigravity, Cursor, Codex, OpenCode, Aider, dll.) yang bekerja di dalam workspace `/Users/anasfikri/Documents/Projects/ber5/wms-simple`.

---

## 1. Urutan Wajib Pembacaan Dokumen Sebelum Melakukan Tindakan (Mandatory Reading Order)

Sebelum merancang arsitektur, mengubah dokumen, atau menulis baris kode, setiap agen AI **WAJIB** membaca berkas-berkas berikut secara berurutan:

1. **`docs/00_Index_and_Roadmap.md`** — Peta master indeks seluruh dokumentasi proyek dan tahapan roadmap aktif.
2. **`docs/ai/project-context.md`** & **`docs/ai/decisions.md`** — Konteks proyek, batasan teknologi, dan Architecture Decision Records (ADR).
3. **`docs/ai/current-task.md`** — Sasaran tugas aktif yang sedang dikerjakan dan langkah selanjutnya.
4. **`docs/standards/*`** — Seluruh standar wajib:
   - `docs/standards/01_Development_and_Coding_Standard.md` (Clean Architecture, Strict TypeScript, Conventional Commits)
   - `docs/standards/02_Security_Standard_OWASP_and_OWASP_AI.md` (Kepatuhan OWASP Top 10 Web & OWASP AI)
   - `docs/standards/03_Testing_and_Quality_Assurance_Standard.md` (Skenario pengujian kritis & Quality Gates)
   - `docs/standards/04_Audit_and_Compliance_Standard.md` (Verifikasi rantai audit checkpoint & bukti digital)
   - `docs/standards/05_Versioning_and_Release_Standard.md` (SemVer 2.0.0, Database Migration, URI Versioning)
5. **`ai-state.json`** — Status mesin dan kemajuan persentase proyek.

---

## 2. Aturan Kepatuhan Mutlak bagi Agen AI (Strict AI Guardrails)

Setiap agen AI yang beroperasi di repositori ini terikat pada aturan:

1. **Database Berada di Host Machine:**
   - Target database resmi adalah PostgreSQL di host machine (`127.0.0.1:5432`, nama DB: `wms_simple_db`).
   - Dilarang membuat container PostgreSQL baru yang terisolasi sendiri tanpa mengacu pada global database stack.
2. **Anti-Halusinasi & Ground Truth Data (OWASP AI LLM09):**
   - AI dilarang menebak skema tabel, kolom, atau saldo stok. AI wajib memverifikasi ground truth ke file skema atau query SQL langsung ke database.
3. **Anti-SQL Injection & Parameterized Queries (OWASP Web A03):**
   - Dilarang keras menghasilkan string concatenation pada query SQL (`pg.query(...)`). Wajib menggunakan parameterized queries (`$1, $2, ...`).
4. **Validasi Output AI dengan Zod (OWASP AI LLM05):**
   - Respon terstruktur yang dieksekusi ke backend wajib divalidasi dengan Zod Schema kaku sebelum disimpan.
5. **Mandatory Petugas Name & Checkpoint Continuity (OWASP Web A04):**
   - Setiap mutasi stok dan perpindahan status wajib menyertakan identitas `actor_name` (nama petugas fisik) dan menautkan `prev_checkpoint_id`.
6. **Versioning & Lifecycle Protocol:**
   - Jika melakukan perubahan kode/fitur, perbarui `CHANGELOG.md` dan naikkan versi sesuai SemVer 2.0.0.
   - Perbarui `docs/ai/current-task.md` di awal dan akhir sesi kerja.
   - Sinkronkan progress ke Uteke Knowledge Base MCP dan tanyakan update ke ictnotes.
<!-- ai-toolkit:protocol:end -->
