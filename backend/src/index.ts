import 'dotenv/config';
import { serve } from '@hono/node-server';
import { app } from './app.js';

const port = parseInt(process.env.PORT || '3000');
console.log(`🚀 WMS Simple Enterprise Server running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
