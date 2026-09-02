import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { formatProblemDetails, AppError } from './utils/errors.js';

import { authRoutes } from './routes/auth.js';
import { masterRoutes } from './routes/master.js';
import { warehouseRoutes } from './routes/warehouses.js';
import { productRoutes } from './routes/products.js';
import { inboundRoutes } from './routes/inbound.js';
import { debulkingRoutes } from './routes/debulking.js';
import { crossdockRoutes } from './routes/crossdock.js';
import { crossDocRoutes } from './routes/crossdoc.js';
import { outboundRoutes } from './routes/outbound.js';
import { fleetRoutes } from './routes/fleet.js';
import { stockRoutes } from './routes/stock.js';
import { weighbridgeRoutes } from './routes/weighbridge.js';
import { checkpointRoutes } from './routes/checkpoints.js';
import { alertRoutes } from './routes/alerts.js';

export function createApp() {
  const app = new Hono();

  if (process.env.NODE_ENV !== 'test') {
    app.use('*', logger());
  }

  // HTTP Security Headers (OWASP Top 10 A05 Hardening)
  app.use('*', async (c, next) => {
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'SAMEORIGIN');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    await next();
  });

  const corsOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : '*';

  app.use('*', cors({
    origin: corsOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization']
  }));

  // Health Check
  app.get('/api/health', (c) => {
    return c.json({
      status: 'ok',
      system: 'WMS Simple Enterprise API',
      model: 'Modular, High-Reliability Non-Dynamic Logistics Flows',
      database_target: 'Host PostgreSQL (Shared Stack)',
      version: '1.0.8',
      timestamp: new Date().toISOString(),
      supported_cargo: ['GENERAL_PACKAGED', 'BULKY_HEAVY', 'DRY_BULK', 'LIQUID_BULK', 'COLD_CHAIN'],
      modules: [
        'Authentication & Scoped RBAC (JWT)',
        'Master Data (Cargo, Packaging, Fleet, UOM)',
        'Inbound (General, Bulky & Curah + Weighbridge)',
        'De-bulking & Conversion (Bulky to Curah / Bagging)',
        'Cross-Dock Manifest & Inter-Hub Transfer',
        'Cross-Document (Re-issuance, SJ Swap, Sub-AWB)',
        'Outbound Fulfillment (Pick, Pack, Ship, POD)',
        'Fleet Exit Log & Gate Pass (Departure/Return Odometer & Fuel)',
        'Double-Entry Stock Ledger',
        'Immutable Checkpoint Chain Audit Trail'
      ]
    });
  });

  // API Routes
  app.route('/api/auth', authRoutes);
  app.route('/api/master', masterRoutes);
  app.route('/api/warehouses', warehouseRoutes);
  app.route('/api/products', productRoutes);
  app.route('/api/inbound', inboundRoutes);
  app.route('/api/debulking', debulkingRoutes);
  app.route('/api/crossdock', crossdockRoutes);
  app.route('/api/crossdoc', crossDocRoutes);
  app.route('/api/outbound', outboundRoutes);
  app.route('/api/fleet', fleetRoutes);
  app.route('/api/stock', stockRoutes);
  app.route('/api/weighbridge', weighbridgeRoutes);
  app.route('/api/checkpoints', checkpointRoutes);
  app.route('/api/alerts', alertRoutes);

  // Central RFC 7807 Error Handling Middleware
  app.onError((err, c) => {
    if (err instanceof AppError) {
      const problem = formatProblemDetails(c, {
        message: err.message,
        status: err.status,
        code: err.code,
        details: err.details
      });
      return c.json(problem, err.status as any);
    }

    console.error('Unhandled Application Error:', err);
    const problem = formatProblemDetails(c, {
      message: err.message || 'Internal Server Error',
      status: 500,
      code: 'INTERNAL_SERVER_ERROR'
    });
    return c.json(problem, 500);
  });

  return app;
}

export const app = createApp();
