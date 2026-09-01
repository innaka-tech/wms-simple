import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import dotenv from 'dotenv';

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

dotenv.config();

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: '*',
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
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    supported_cargo: ['GENERAL_PACKAGED', 'BULKY_HEAVY', 'DRY_BULK', 'LIQUID_BULK', 'COLD_CHAIN'],
    modules: [
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

// Error Handling
app.onError((err, c) => {
  console.error('Unhandled Application Error:', err);
  return c.json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  }, 500);
});

const port = parseInt(process.env.PORT || '3000');
console.log(`🚀 WMS Simple Enterprise Server running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
