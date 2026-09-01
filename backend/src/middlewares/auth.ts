import { Context, Next } from 'hono';
import { verify, sign } from 'hono/jwt';
import { formatProblemDetails, AppError } from '../utils/errors.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'wms_simple_enterprise_jwt_secret_key_2026';

export interface UserTokenPayload {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN_ADM' | 'WH_MANAGER' | 'WH_STAFF' | 'DRIVER' | 'GATE_OFFICER' | 'CUSTOMER';
  warehouse_id?: string | null;
  customer_id?: string | null;
  exp?: number;
}

export async function generateToken(payload: Omit<UserTokenPayload, 'exp'>): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24 hours
  return await sign({ ...payload, exp }, JWT_SECRET);
}

/**
 * Authentication Middleware: extracts & verifies Bearer JWT token
 */
export async function authenticate(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const problem = formatProblemDetails(c, {
      message: 'Akses ditolak: Token autentikasi Bearer JWT tidak ditemukan',
      status: 401,
      code: 'UNAUTHORIZED'
    });
    return c.json(problem, 401);
  }

  const token = authHeader.substring(7);
  try {
    const payload = await verify(token, JWT_SECRET, 'HS256') as unknown as UserTokenPayload;
    c.set('user', payload);
    await next();
  } catch (err: any) {
    const problem = formatProblemDetails(c, {
      message: 'Akses ditolak: Token autentikasi tidak valid atau telah kedaluwarsa',
      status: 401,
      code: 'INVALID_TOKEN'
    });
    return c.json(problem, 401);
  }
}

/**
 * Optional Authentication: extracts user if token present, but doesn't block if absent
 */
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = await verify(token, JWT_SECRET) as unknown as UserTokenPayload;
      c.set('user', payload);
    } catch {
      // ignore invalid optional token
    }
  }
  await next();
}

/**
 * Role-Based Access Control (RBAC) Guard
 */
export function requireRole(allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as UserTokenPayload | undefined;
    if (!user) {
      const problem = formatProblemDetails(c, {
        message: 'Pengguna belum terautentikasi',
        status: 401,
        code: 'UNAUTHORIZED'
      });
      return c.json(problem, 401);
    }

    if (user.role === 'SUPER_ADMIN') {
      return await next();
    }

    if (!allowedRoles.includes(user.role)) {
      const problem = formatProblemDetails(c, {
        message: `Akses ditolak: Peran '${user.role}' tidak memiliki izin untuk aksi ini (Membutuhkan: ${allowedRoles.join(', ')})`,
        status: 403,
        code: 'FORBIDDEN'
      });
      return c.json(problem, 403);
    }

    await next();
  };
}

/**
 * Warehouse-Scoped RBAC Guard (Prevents cross-warehouse data leakage)
 */
export function requireWarehouseScope(targetWarehouseParamKey: string = 'warehouse_id') {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as UserTokenPayload | undefined;
    if (!user) return await next();

    // SUPER_ADMIN and global roles can access any warehouse
    if (user.role === 'SUPER_ADMIN') {
      return await next();
    }

    const targetWarehouseId = c.req.query(targetWarehouseParamKey) || c.req.param(targetWarehouseParamKey);

    if (targetWarehouseId && user.warehouse_id && user.warehouse_id !== targetWarehouseId) {
      const problem = formatProblemDetails(c, {
        message: 'Akses ditolak: Anda hanya memiliki otorisasi pada gudang yang ditugaskan',
        status: 403,
        code: 'CROSS_WAREHOUSE_ACCESS_DENIED',
        details: { assignedWarehouse: user.warehouse_id, requestedWarehouse: targetWarehouseId }
      });
      return c.json(problem, 403);
    }

    await next();
  };
}
