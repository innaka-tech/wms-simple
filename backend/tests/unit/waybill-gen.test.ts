import { describe, it, expect } from 'vitest';
import { generateWaybillNumber } from '../../src/utils/waybill.js';

describe('Waybill Number Generator (SJ-XXXXXXXX / RESI-XXXXXXXX)', () => {
  it('should generate SJ number with correct format', () => {
    const sj = generateWaybillNumber('SJ');
    expect(sj).toMatch(/^SJ-[0-9A-HJ-NP-Z]{8}$/);
  });

  it('should generate RESI number with correct format', () => {
    const resi = generateWaybillNumber('RESI');
    expect(resi).toMatch(/^RESI-[0-9A-HJ-NP-Z]{8}$/);
  });

  it('should never contain ambiguous characters (I, O)', () => {
    for (let i = 0; i < 200; i++) {
      const n = generateWaybillNumber('SJ');
      expect(n).not.toMatch(/[IO]/);
    }
  });

  it('should produce unique numbers across many generations', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) {
      seen.add(generateWaybillNumber('SJ'));
    }
    expect(seen.size).toBe(5000);
  });

  it('should produce independent SJ and RESI codes', () => {
    const sj = generateWaybillNumber('SJ');
    const resi = generateWaybillNumber('RESI');
    expect(sj.slice(3)).not.toBe(resi.slice(5));
  });
});
