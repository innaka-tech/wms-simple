import pg from 'pg';

const host = process.env.DB_HOST || '127.0.0.1';
const port = parseInt(process.env.DB_PORT || '5432', 10);
const user = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASSWORD || 'password';
const defaultDb = process.env.DB_NAME || 'wms_simple_db';
const testDb = 'wms_simple_test_db';

async function connectClient(dbName) {
  const client = new pg.Client({
    host,
    port,
    user,
    password,
    database: dbName
  });
  await client.connect();
  return client;
}

async function main() {
  let client;
  try {
    try {
      client = await connectClient('postgres');
    } catch {
      client = await connectClient(defaultDb);
    }

    const res = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [testDb]
    );
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${testDb}"`);
      console.log(`[init-test-db] Database "${testDb}" berhasil dibuat.`);
    } else {
      console.log(`[init-test-db] Database "${testDb}" sudah ada.`);
    }
  } catch (err) {
    console.warn(`[init-test-db] Warning:`, err.message);
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }
}

main();
