# 04_Audit_and_Compliance_Standard.md

**Document:** Audit Trail, Operational Compliance, & Regulatory Standards  
**Scope:** Checkpoint Chain Verifiability, Data Tamper Detection, Access Reviews, SLA Audit  
**Version:** 1.0.0  
**Status:** MANDATORY STANDARD  

---

## 1. Standar Integritas Rantai Audit Checkpoint (Tamper-Evident Trail)

WMS Simple menerapkan prinsip *Append-Only Immutable Ledger* pada tabel `checkpoint_logs`. Tidak ada query `UPDATE` atau `DELETE` yang diizinkan pada tabel ini.

### 1.1 Algoritma Verifikasi Integritas Rantai (Chain Verification Query)
Untuk membuktikan bahwa riwayat suatu transaksi tidak disisipkan atau dimanipulasi, auditor internal dapat menjalankan query rekursif berikut untuk memvalidasi urutan mata rantai:

```sql
WITH RECURSIVE checkpoint_chain AS (
    -- Root checkpoint (Langkah Pertama, prev_id IS NULL)
    SELECT id, entity_type, entity_id, step_code, actor_name, prev_checkpoint_id, created_at, 1 AS chain_depth
    FROM checkpoint_logs
    WHERE entity_type = 'CROSS_DOCK_MANIFEST' 
      AND entity_id = 'MNF_UUID_HERE'
      AND prev_checkpoint_id IS NULL

    UNION ALL

    -- Rekursi mata rantai berikutnya
    SELECT c.id, c.entity_type, c.entity_id, c.step_code, c.actor_name, c.prev_checkpoint_id, c.created_at, cc.chain_depth + 1
    FROM checkpoint_logs c
    INNER JOIN checkpoint_chain cc ON c.prev_checkpoint_id = cc.id
)
SELECT * FROM checkpoint_chain ORDER BY chain_depth ASC;
```

*Jika jumlah baris hasil query rekursif tidak sama dengan total log entitas tersebut, maka sistem mendeteksi adanya anomali / pemutusan mata rantai audit.*

---

## 2. Standar Akuntabilitas & Bukti Digital (Digital Evidence Standard)

Setiap tahapan kritis wajib menyimpan bukti digital (*evidence*) dengan spesifikasi:
1. **Bukti Foto Fisik (*Physical Photographic Evidence*):**
   - Format: JPG / WebP (Maksimal 2 MB per foto).
   - Metadata tersimpan: Timestamp ISO 8601, koordinat GPS (jika tersedia), nama pengunggah.
   - Disimpan di secure cloud object storage (S3/R2) dengan URL bertanda tangan (*Pre-signed URL*).
2. **Bukti Tanda Tangan Digital (*Digital Signature Capture*):**
   - Format: PNG transparan berbasis vector path / canvas data URL.
   - Disertai nama jelas penerima (*recipient_name*) yang diverifikasi oleh pengemudi dan admin.

---

## 3. Matriks Audit Kepatuhan Berkala (Periodic Compliance Schedule)

| Periode | Aktivitas Audit | Pelaksana | Output / Bukti Audit |
|---|---|---|---|
| **Harian (Daily)** | Rekonsiliasi Saldo Stok On-Hand vs Fisik & Pengecekan Armada Overdue | WH Manager & Security Lead | Laporan Harian Gate Pass & Mutasi Stok |
| **Mingguan (Weekly)** | Review Alert Susut De-bulking & Selisih (*Variance*) Cross-Dock | Operational Manager | Berita Acara Evaluasi Susut Kargo Curah |
| **Bulanan (Monthly)** | User Access Review (Pencabutan akun staf/driver yang sudah resign / mutasi) | IT Security / Admin Adm | Matriks Hak Akses Terverifikasi |
| **Triwulanan (Quarterly)**| Vulnerability Assessment & Automated Dependency Audit (`npm audit`) | Technical Lead | Laporan Mitigasi Kerentanan Sistem |
| **Tahunan (Annual)** | Penetration Testing Independen & Audit Kepatuhan ISO 27001 / SOC 2 | Certified 3rd-Party Auditor | Sertifikat Kepatuhan & Remediation Plan |
