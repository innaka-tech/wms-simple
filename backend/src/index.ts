import { serve } from '@hono/node-server';
import dotenv from 'dotenv';
import { app } from './app.js';

dotenv.config();

const port = parseInt(process.env.PORT || '3000');
console.log(`🚀 WMS Simple Enterprise Server running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
