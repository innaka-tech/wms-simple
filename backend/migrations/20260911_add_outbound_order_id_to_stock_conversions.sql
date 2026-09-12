-- Migration: 20260911_add_outbound_order_id_to_stock_conversions
-- docs/09 v3.2.0 Prinsip 2: Repacking / de-bulking hanya dilakukan setelah ada
-- permintaan kirim (alokasi). Kolom ini menautkan work order debulking ke
-- outbound order pemicunya — opsional agar konversi stok non-order tetap bisa
-- dicatat (mis. konversi ulang stok mandiri yang disetujui kepala gudang).
-- Target: Host PostgreSQL wms_simple_db (global stack, bukan container terisolasi).

ALTER TABLE stock_conversions
  ADD COLUMN IF NOT EXISTS outbound_order_id text REFERENCES outbound_orders(id);

CREATE INDEX IF NOT EXISTS idx_stock_conversions_outbound_order
  ON stock_conversions(outbound_order_id);
