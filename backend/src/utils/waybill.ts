import crypto from 'node:crypto';

// Alfabet tanpa huruf ambigu (I, O) agar nomor mudah dibacakan petugas lapangan
const CODE_ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 8;

/**
 * Generate kode dokumen generik: `PREFIX-XXXXXXXX` (GATE-OUT-..., VEND-OUT-..., ORD-..., POD-...).
 * Unik secara probabilitas; endpoint pemanggil wajib mengecek keunikan di database (retry 5x).
 */
export function generateDocumentNumber(prefix: string, length: number = CODE_LENGTH): string {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `${prefix}-${code}`;
}

/**
 * Generate nomor dokumen: `SJ-XXXXXXXX` (Surat Jalan), `RESI-XXXXXXXX` (Nomor Resi),
 * atau `INV-XXXXXXXX` (Faktur). Unik secara probabilitas (33^8 kombinasi);
 * endpoint penerbit tetap wajib mengecek keunikan di database sebelum INSERT.
 */
export function generateWaybillNumber(prefix: 'SJ' | 'RESI' | 'INV'): string {
  return generateDocumentNumber(prefix);
}
