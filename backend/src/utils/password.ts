import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Hash a plaintext password using Node's built-in scrypt (OWASP A02 aligned).
 * Format: scrypt$N$r$p$saltHex$hashHex
 */
export function hashPassword(password: string): string {
  const N = 16384, r = 8, p = 1;
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

/**
 * Verify a plaintext password against a stored hash.
 * Supports legacy rows where password_hash is a plain string.
 */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    if (stored.startsWith('scrypt$')) {
      const [, nStr, rStr, pStr, saltHex, hashHex] = stored.split('$');
      const hash = scryptSync(password, Buffer.from(saltHex, 'hex'), hashHex.length / 2, {
        N: parseInt(nStr, 10), r: parseInt(rStr, 10), p: parseInt(pStr, 10)
      });
      return timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
    }
    // Legacy plaintext fallback (seed accounts) — reject unless equal
    return password === stored;
  } catch {
    return false;
  }
}
