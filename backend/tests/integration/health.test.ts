import { describe, it, expect } from 'vitest';
import { app } from '../../src/app.js';

describe('Health Check API Integration Tests', () => {
  it('GET /api/health should return system status ok and full module metadata', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.system).toBe('WMS Simple Enterprise API');
    expect(body.supported_cargo).toContain('COLD_CHAIN');
    expect(body.supported_cargo).toContain('BULKY_HEAVY');
    expect(body.modules).toBeInstanceOf(Array);
    expect(body.modules.length).toBeGreaterThanOrEqual(8);
  });
});
