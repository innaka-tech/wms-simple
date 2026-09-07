import crypto from 'node:crypto';

// Alfabet tanpa huruf ambigu (I, O) agar nomor mudah dibacakan petugas lapangan
const CODE_ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 8;

/**
 * Generate nomor dokumen pengiriman: `SJ-XXXXXXXX` (Surat Jalan) atau
 * `RESI-XXXXXXXX` (Nomor Resi). Unik secara probabilitas (33^8 kombinasi);
 * endpoint penerbit tetap wajib mengecek keunikan di database sebelum INSERT.
 */
export function generateWaybillNumber(prefix: 'SJ' | 'RESI'): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `${prefix}-${code}`;
}
