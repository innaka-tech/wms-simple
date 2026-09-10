# Changelog

Semua perubahan penting pada proyek **WMS Simple Enterprise** didokumentasikan dalam berkas ini.
Format berkas mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan mematuhi [Semantic Versioning](https://semver.org/lang/id/).

---

## [4.3.0] - 2026-09-10

### Added (Halaman Cross-Dock & Cross-Document)

- **`/crossdock` — Transfer Antar-Gudang (Hub → Spoke):** daftar manifest (AppDataTable: pencarian realtime, pagination, kartu mobile), form buat manifest (gudang asal/tujuan, shipper, armada pool / nopol vendor manual, multi-item), modal **Proses Muat** (qty per item → `CROSS_DOCK_OUT`, stok asal berkurang) dan **Terima di Tujuan** (qty per item → `CROSS_DOCK_IN`, stok tujuan bertambah). Semua step wajib `actor_name`.
- **`/crossdoc` — Penerbitan Cross-Document:** daftar dokumen swap/re-issue + form terbitkan dengan dropdown **tipe dokumen asal & baru** dari `master_document_types` (SJ Supplier → SJ Pengiriman, Master AWB → House AWB, dsb.), qty asal → qty diterbitkan ulang per item.
- **Store baru:** `stores/crossdock.ts` (fetchManifests, fetchManifestDetail, createManifest, loadManifest, receiveDest) dan `stores/crossdoc.ts` (fetchDocs, issueDoc).
- **Nav:** dua modul baru sebagai anak grup **Outbound (Barang Keluar)**, role-filter tetap aktif.

### Verified (e2e rantai nyata via API yang dipakai UI)

- `MNF-50063918`: MANIFEST_CREATED → MANIFEST_LOADED → RECEIVED_AT_DEST, `chain_valid: true`, stok chiller JKT 25 → 23, DPS 0 → 2 (ledger double-entry `CROSS_DOCK_OUT` / `CROSS_DOCK_IN`).
- Cross-doc `XDOC-50167044` terbit ISSUED dengan tipe dokumen eksplisit (kolom `source_document_type_id` NOT NULL di DB — kini tersedia di form).

## [4.2.0] - 2026-09-10

### Added (Picking & Packing UI, Buat DO, POD Bukti Nyata)

- **Buat Delivery Order dari UI `/outbound`:** form lengkap (shipper, gudang asal, consignee, alamat, multi-item SKU + qty) yang memanggil `POST /api/outbound` — sebelumnya order hanya bisa dibuat lewat API/curl.
- **Picking & Packing dari UI:** tombol `Proses Picking` (CREATED → PICKED) dan `Proses Packing` (PICKED → PACKED) — dua checkpoint rantai (`ORDER_PICKED`, `ORDER_PACKED`) kini tercapai dari aplikasi, bukan cuma dari test.
- **POD dengan bukti nyata:** halaman `/outbound/pod` kini mengambil foto via kamera/file (`capture="environment"`), kompres ke JPEG ≤900px base64, dan mengirim `pod_photo_url` sungguhan — bukan lagi string mock `uploaded://pod-photo-capture`. Nama penerima wajib diisi.
- **Store actions baru:** `createOrder`, `pickOrder`, `packOrder` di `stores/outbound.ts`.

### Fixed

- **`/billing` tak pernah menampilkan order siap tagih:** filter membandingkan `Number(o.billing_ready) === 1` padahal kolom PostgreSQL bertipe `boolean` → diganti `o.billing_ready === true`.
- **Fallback stok palsu di `/stock` dihapus:** daftar contoh (Gula Pasir, TV, dll.) yang muncul saat API gagal/kosong diganti empty state jujur — sesuai prinsip anti-halusinasi (AGENTS.md / OWASP AI LLM09).

### Changed

- Seluruh copy halaman memakai terminologi warehouse standar (Receiving, Putaway, Picking/Packing, Gate Out/In, Audit Trail, Invoice, Payment Received, dst.) — lanjutan commit `ead3ce6`.
- Sidebar dua tingkat dengan label WMS baku + tombol tampilkan kembali sidebar saat collapsed (`0468b03`).

### Ops

- `backend/vitest.config.ts`: e2e dijalankan serial satu proses (`fileParallelism: false`, `singleFork`) karena dua file e2e berbagi satu DB test fisik.

---

## [4.1.2] - 2026-09-08

### Added (Dev Login Bypass)

- **Bypass keyboard di halaman login:** tekan `D` 3x beruntun (interval < 1,5 detik) untuk masuk instan sebagai Super Admin — hanya aktif di mode development (`import.meta.dev`), tidak ikut ter-build ke produksi.
