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
7. **Git Push Protocol (Strict):**
   - `git push` HANYA boleh dilakukan atas permintaan EKSPLISIT dari user dalam sesi tersebut. Jangan pernah push atas inisiatif sendiri, termasuk setelah commit.
   - Konfirmasi branch target ke user (`main`, `ans`, atau branch lain) jika belum disebutkan spesifik, dan push HANYA ke branch yang diinstruksikan/disetujui oleh user.
   - `git commit` bebas dilakukan sesuai kebutuhan; yang dibatasi hanya push.

---

## 3. Kredensial Pengujian & UAT Resmi (Official UAT & Testing Credentials)

Untuk kebutuhan **User Acceptance Testing (UAT)**, pengujian otomatis, dan verifikasi alur operasional di server **Innaka Cloud**, gunakan akun resmi yang telah disiapkan pada database:

* **URL UAT Publik (Cloudflare Tunnel HTTPS):** `https://wms.innaka.dev/login`
* **URL Fallback Host Gateway:** `http://104.64.221.233:8090/login`
* **Password Default Semua Akun UAT:** `password123`

| No | Username | Password | Role Code | Nama Petugas / Identitas Fisik | Cakupan Modul & Pengujian UAT |
|:---:|---|---|---|---|---|
| 1 | **`superadmin`** | `password123` | `SUPER_ADMIN` | System Super Administrator | Akses penuh seluruh modul, konfigurasi master data, fleet, user management, dan audit log. |
| 2 | **`admin_adm`** | `password123` | `ADMIN_ADM` | Siti Rahmawati (Admin Adm & Billing) | Inbound PO, Outbound Delivery Order, terbitkan Waybill/Resi/SJ, verifikasi POD, Billing & Invoice LUNAS. |
| 3 | **`mgr_jkt`** | `password123` | `WH_MANAGER` | Bambang Sudiro (Warehouse Manager) | Monitoring buku besar stok, persetujuan kerja repacking debulking, dashboard telemetry, dan penanganan alert. |
| 4 | **`staff_jkt`** | `password123` | `WH_STAFF` | Joko Susanto (WH Staff JKT) | Penerimaan fisik Inbound di dock, putaway ke rak, picking barang, packing kargo, dan manifest cross-dock. |
| 5 | **`gate_officer`** | `password123` | `GATE_OFFICER` | Sersan Hendro (Satpam Gerbang) | Pos Satpam Gate Pass: inspeksi fisik truk, catat odometer/BBM keberangkatan & kepulangan, vendor-exit log. |
| 6 | **`driver_budi`** | `password123` | `DRIVER` | Budi Santoso (Supir Tronton) | Penerimaan manifest jalan, bukti tanda terima BAST Desa / POD mobile dengan tanda tangan kanvas digital. |

> [!NOTE]
> Seluruh kata sandi di atas disimpan menggunakan algoritma hashing kriptografis **`scrypt`** dengan *salt* acak dan perbandingan waktu-konstan (*constant-time comparison*) untuk kepatuhan OWASP A07 & ISO/IEC 27001 A.9.4.3.
<!-- ai-toolkit:protocol:end -->
