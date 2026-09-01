import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../src/db.js';
import { app } from '../../src/app.js';
import { generateToken } from '../../src/middlewares/auth.js';

vi.mock('../../src/db.js', () => ({
  query: vi.fn(),
  pool: { connect: vi.fn() }
}));

describe('Auth & Scoped RBAC API Routes Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/auth/login should fail if credentials missing', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '' })
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('MISSING_CREDENTIALS');
  });

  it('POST /api/auth/login should fail on invalid credentials', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ rows: [] } as any);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nonexistent', password: 'wrongpassword' })
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('INVALID_CREDENTIALS');
  });

  it('POST /api/auth/login should succeed and return JWT token and user info', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{
        id: 'u-1',
        username: 'staff_jkt',
        full_name: 'Joko Susanto',
        email: 'staff.jkt@wms-simple.local',
        role: 'WH_STAFF',
        warehouse_id: 'wh-jkt',
        warehouse_name: 'Main Hub Jakarta',
        password_hash: 'password123',
        is_active: true
      }]
    } as any);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'staff_jkt', password: 'password123' })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.username).toBe('staff_jkt');
    expect(body.data.user.role).toBe('WH_STAFF');
  });

  it('GET /api/auth/me should reject without Bearer token', async () => {
    const res = await app.request('/api/auth/me');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/auth/me should return user details with valid Bearer token', async () => {
    const token = await generateToken({
      id: 'u-1',
      username: 'staff_jkt',
      full_name: 'Joko Susanto',
      email: 'staff.jkt@wms-simple.local',
      role: 'WH_STAFF',
      warehouse_id: 'wh-jkt'
    });

    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{
        id: 'u-1',
        username: 'staff_jkt',
        full_name: 'Joko Susanto',
        email: 'staff.jkt@wms-simple.local',
        role: 'WH_STAFF',
        warehouse_id: 'wh-jkt',
        warehouse_name: 'Main Hub Jakarta'
      }]
    } as any);

    const res = await app.request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.username).toBe('staff_jkt');
  });

  it('GET /api/auth/users should return list of active users', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [
        { id: 'u-1', username: 'staff_jkt', full_name: 'Joko Susanto', role: 'WH_STAFF' },
        { id: 'u-2', username: 'gate_officer', full_name: 'Sersan Hendro', role: 'GATE_OFFICER' }
      ]
    } as any);

    const res = await app.request('/api/auth/users');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
  });
});
