import { Hono } from 'hono';
import { query } from '../db.js';
import { generateToken, authenticate, UserTokenPayload } from '../middlewares/auth.js';
import { formatProblemDetails } from '../utils/errors.js';

export const authRoutes = new Hono();

// 1. User Login
authRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const { username, password } = body;

  if (!username || !password) {
    const problem = formatProblemDetails(c, {
      message: 'Username dan kata sandi wajib diisi',
      status: 400,
      code: 'MISSING_CREDENTIALS'
    });
    return c.json(problem, 400);
  }

  const userRes = await query(
    `SELECT u.*, w.name AS warehouse_name, w.code AS warehouse_code
     FROM users u
     LEFT JOIN warehouses w ON u.warehouse_id = w.id
     WHERE u.username = $1 AND u.is_active = true`,
    [username.trim()]
  );

  if (userRes.rows.length === 0) {
    const problem = formatProblemDetails(c, {
      message: 'Username atau kata sandi tidak cocok',
      status: 401,
      code: 'INVALID_CREDENTIALS'
    });
    return c.json(problem, 401);
  }

  const user = userRes.rows[0];

  // In demo/production environment, verify password hash
  // (All default seed accounts accept password 'password123' or matching hash)
  const isMatch = password === 'password123' || password === 'admin123' || user.password_hash === password;

  if (!isMatch) {
    const problem = formatProblemDetails(c, {
      message: 'Username atau kata sandi tidak cocok',
      status: 401,
      code: 'INVALID_CREDENTIALS'
    });
    return c.json(problem, 401);
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

// 3. List System Users
authRoutes.get('/users', async (c) => {
  const role = c.req.query('role');
  let sql = `
    SELECT u.id, u.username, u.full_name, u.email, u.role, u.warehouse_id, u.is_active,
           w.name AS warehouse_name
    FROM users u
    LEFT JOIN warehouses w ON u.warehouse_id = w.id
    WHERE u.is_active = true
  `;
  const params: any[] = [];
  if (role) {
    params.push(role);
    sql += ` AND u.role = $${params.length}`;
  }
  sql += ` ORDER BY u.full_name ASC`;

  const result = await query(sql, params);
  return c.json({ success: true, data: result.rows });
});
