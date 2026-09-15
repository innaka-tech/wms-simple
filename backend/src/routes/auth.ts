import { Hono } from 'hono';
import { z } from 'zod';
import { query } from '../db.js';
import { generateToken, authenticate, requireRole, UserTokenPayload } from '../middlewares/auth.js';
import { formatProblemDetails } from '../utils/errors.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { recordCheckpoint } from '../services/checkpoint.js';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN_ADM'];

const SYSTEM_ROLES = ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF', 'DRIVER', 'GATE_OFFICER', 'CUSTOMER'] as const;

const createUserSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-z0-9_.]+$/, 'huruf kecil, angka, titik, underscore'),
  full_name: z.string().min(3).max(120),
  email: z.string().email().max(160),
  password: z.string().min(8).max(72),
  role: z.enum(SYSTEM_ROLES),
  warehouse_id: z.string().uuid().nullish(),
  customer_id: z.string().uuid().nullish()
});

const updateUserSchema = z.object({
  full_name: z.string().min(3).max(120).optional(),
  email: z.string().email().max(160).optional(),
  role: z.enum(SYSTEM_ROLES).optional(),
  warehouse_id: z.string().uuid().nullish(),
  customer_id: z.string().uuid().nullish(),
  is_active: z.boolean().optional(),
  new_password: z.string().min(8).max(72).optional()
});

export const authRoutes = new Hono();

// ═══ Rate Limiting & Brute Force Protection (OWASP A07 / ISO 27001 A.8.5) ═══
interface LoginAttempt {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

const loginAttempts = new Map<string, LoginAttempt>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 10 * 60 * 1000; // 10 menit
const LOCKOUT_MS = 15 * 60 * 1000; // 15 menit lockout jika melebihi batas

function getClientIp(c: any): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    '127.0.0.1'
  );
}

function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record) return { allowed: true };

  if (record.blockedUntil && now < record.blockedUntil) {
    const retryAfterSec = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  if (now - record.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedLogin(key: string) {
  const now = Date.now();
  const record = loginAttempts.get(key) || { count: 0, firstAttempt: now };
  record.count++;
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.blockedUntil = now + LOCKOUT_MS;
  }
  loginAttempts.set(key, record);
}

function recordSuccessfulLogin(key: string) {
  loginAttempts.delete(key);
}

// 1. User Login
authRoutes.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { username, password } = body;

  if (!username || !password) {
    const problem = formatProblemDetails(c, {
      message: 'Username dan kata sandi wajib diisi',
      status: 400,
      code: 'MISSING_CREDENTIALS'
    });
    return c.json(problem, 400);
  }

  const clientIp = getClientIp(c);
  const rateLimitKey = `${clientIp}:${username.trim().toLowerCase()}`;
  const rateLimit = checkLoginRateLimit(rateLimitKey);

  if (!rateLimit.allowed) {
    c.header('Retry-After', String(rateLimit.retryAfterSec || 60));
    const problem = formatProblemDetails(c, {
      message: `Terlalu banyak percobaan login gagal. Akun diblokir sementara selama ${Math.ceil((rateLimit.retryAfterSec || 60) / 60)} menit.`,
      status: 429,
      code: 'TOO_MANY_REQUESTS'
    });
    return c.json(problem, 429);
  }

  const userRes = await query(
    `SELECT u.*, w.name AS warehouse_name, w.code AS warehouse_code
     FROM users u
     LEFT JOIN warehouses w ON u.warehouse_id = w.id
     WHERE u.username = $1 AND u.is_active = true`,
    [username.trim()]
  );

  if (userRes.rows.length === 0) {
    recordFailedLogin(rateLimitKey);
    console.warn('[SECURITY] Failed login attempt (user not found):', {
      username: username.trim(),
      clientIp,
      timestamp: new Date().toISOString()
    });
    const problem = formatProblemDetails(c, {
      message: 'Username atau kata sandi tidak cocok',
      status: 401,
      code: 'INVALID_CREDENTIALS'
    });
    return c.json(problem, 401);
  }

  const user = userRes.rows[0];

  // Verifikasi kata sandi kriptografis murni (scrypt / timingSafeEqual)
  const isMatch = verifyPassword(password, user.password_hash);

  if (!isMatch) {
    recordFailedLogin(rateLimitKey);
    console.warn('[SECURITY] Failed login attempt (invalid password):', {
      username: user.username,
      clientIp,
      timestamp: new Date().toISOString()
    });
    const problem = formatProblemDetails(c, {
      message: 'Username atau kata sandi tidak cocok',
      status: 401,
      code: 'INVALID_CREDENTIALS'
    });
    return c.json(problem, 401);
  }

  // Login berhasil: reset counter rate limiting
  recordSuccessfulLogin(rateLimitKey);

  // Upgrade otomatis password legacy (plaintext) ke hash scrypt yang aman
  if (!user.password_hash.startsWith('scrypt$')) {
    try {
      const qPromise = query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hashPassword(password), user.id]);
      if (qPromise && typeof qPromise.catch === 'function') {
        qPromise.catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  const tokenPayload = {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    warehouse_id: user.warehouse_id,
    customer_id: user.customer_id
  };

  const token = await generateToken(tokenPayload);

  return c.json({
    success: true,
    message: 'Login berhasil',
    data: {
      token,
      user: {
        ...tokenPayload,
        warehouse_name: user.warehouse_name,
        warehouse_code: user.warehouse_code
      }
    }
  });
});

// 2. Get Current Authenticated User Profile
authRoutes.get('/me', authenticate, async (c) => {
  const tokenUser = (c.get('user' as any) || {}) as UserTokenPayload;
  const userRes = await query(
    `SELECT u.id, u.username, u.full_name, u.email, u.role, u.warehouse_id, u.customer_id,
            w.name AS warehouse_name, w.code AS warehouse_code
     FROM users u
     LEFT JOIN warehouses w ON u.warehouse_id = w.id
     WHERE u.id = $1`,
    [tokenUser.id]
  );

  if (userRes.rows.length === 0) {
    const problem = formatProblemDetails(c, {
      message: 'Pengguna tidak ditemukan',
      status: 404,
      code: 'USER_NOT_FOUND'
    });
    return c.json(problem, 404);
  }

  return c.json({
    success: true,
    data: userRes.rows[0]
  });
});

// 3. List System Users (include inactive for admin visibility)
authRoutes.get('/users', authenticate, async (c) => {
  const role = c.req.query('role');
  const includeInactive = c.req.query('include_inactive') === 'true';
  let sql = `
    SELECT u.id, u.username, u.full_name, u.email, u.role, u.warehouse_id, u.customer_id, u.is_active,
           w.name AS warehouse_name
    FROM users u
    LEFT JOIN warehouses w ON u.warehouse_id = w.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (!includeInactive) {
    sql += ` AND u.is_active = true`;
  }
  if (role) {
    params.push(role);
    sql += ` AND u.role = $${params.length}`;
  }
  sql += ` ORDER BY u.full_name ASC`;

  const result = await query(sql, params);
  return c.json({ success: true, data: result.rows });
});

// 4. Create System User (admin only)
authRoutes.post('/users', authenticate, requireRole(ADMIN_ROLES), async (c) => {
  const user = c.get('user' as any) as UserTokenPayload;
  const parsed = createUserSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ success: false, message: 'Data tidak valid', details: parsed.error.flatten().fieldErrors }, 400);
  }
  const d = parsed.data;

  const dupRes = await query(
    `SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1`,
    [d.username, d.email]
  );
  if (dupRes.rows.length > 0) {
    return c.json({ success: false, message: 'Username atau email sudah dipakai' }, 409);
  }

  const result = await query(
    `INSERT INTO users (id, username, full_name, email, password_hash, role, warehouse_id, customer_id)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7)
     RETURNING id, username, full_name, email, role, warehouse_id, customer_id, is_active`,
    [d.username, d.full_name, d.email, hashPassword(d.password), d.role, d.warehouse_id || null, d.customer_id || null]
  );
  const created = result.rows[0];

  await recordCheckpoint({
    entity_type: 'SYSTEM_USER',
    entity_id: created.id,
    entity_number: created.username,
    step_code: 'USER_CREATED',
    step_label: 'Akun pengguna dibuat',
    actor_id: user.id,
    actor_name: user.full_name,
    actor_role: user.role,
    notes: `Akun ${created.username} dibuat dengan peran ${created.role}`
  });

  return c.json({ success: true, data: created }, 201);
});

// 5. Update System User (admin only; self role-change blocked)
authRoutes.put('/users/:id', authenticate, requireRole(ADMIN_ROLES), async (c) => {
  const actor = c.get('user' as any) as UserTokenPayload;
  const targetId = c.req.param('id');
  const parsed = updateUserSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ success: false, message: 'Data tidak valid', details: parsed.error.flatten().fieldErrors }, 400);
  }
  const d = parsed.data;

  const targetRes = await query(`SELECT id, username, role, is_active FROM users WHERE id = $1`, [targetId]);
  if (targetRes.rows.length === 0) {
    return c.json({ success: false, message: 'Pengguna tidak ditemukan' }, 404);
  }
  const target = targetRes.rows[0];

  if (actor.id === targetId && (d.role && d.role !== target.role || d.is_active === false)) {
    return c.json({ success: false, message: 'Tidak boleh menurunkan peran atau menonaktifkan akun sendiri' }, 400);
  }

  const sets: string[] = [];
  const params: any[] = [];
  const push = (col: string, val: any) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  if (d.full_name !== undefined) push('full_name', d.full_name);
  if (d.email !== undefined) push('email', d.email);
  if (d.role !== undefined) push('role', d.role);
  if (d.warehouse_id !== undefined) push('warehouse_id', d.warehouse_id || null);
  if (d.customer_id !== undefined) push('customer_id', d.customer_id || null);
  if (d.is_active !== undefined) push('is_active', d.is_active);
  if (d.new_password !== undefined) push('password_hash', hashPassword(d.new_password));
  if (sets.length === 0) {
    return c.json({ success: false, message: 'Tidak ada perubahan yang dikirim' }, 400);
  }
  params.push(targetId);
  sets.push(`updated_at = CURRENT_TIMESTAMP`);

  const result = await query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}
     RETURNING id, username, full_name, email, role, warehouse_id, customer_id, is_active`,
    params
  );
  const updated = result.rows[0];

  await recordCheckpoint({
    entity_type: 'SYSTEM_USER',
    entity_id: updated.id,
    entity_number: updated.username,
    step_code: 'USER_UPDATED',
    step_label: 'Data pengguna diperbarui',
    actor_id: actor.id,
    actor_name: actor.full_name,
    actor_role: actor.role,
    notes: `Perubahan: ${Object.keys(d).filter(k => k !== 'new_password').join(', ')}${d.new_password ? ', password' : ''}`
  });

  return c.json({ success: true, data: updated });
});

// 6. Change Own Password (any authenticated user)
authRoutes.put('/users/me/password', authenticate, async (c) => {
  const actor = c.get('user' as any) as UserTokenPayload;
  const schema = z.object({ current_password: z.string().min(1), new_password: z.string().min(8).max(72) });
  const parsed = schema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ success: false, message: 'Password baru minimal 8 karakter' }, 400);
  }
  const { current_password, new_password } = parsed.data;

  const selfRes = await query(`SELECT id, password_hash FROM users WHERE id = $1`, [actor.id]);
  if (selfRes.rows.length === 0) {
    return c.json({ success: false, message: 'Pengguna tidak ditemukan' }, 404);
  }
  if (!verifyPassword(current_password, selfRes.rows[0].password_hash)) {
    return c.json({ success: false, message: 'Password saat ini salah' }, 400);
  }

  await query(
    `UPDATE users SET password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [actor.id, hashPassword(new_password)]
  );
  return c.json({ success: true, message: 'Password berhasil diganti' });
});
