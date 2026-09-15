const { Client, Pool } = require('pg');

async function main() {
  const adminClient = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'fadh',
    database: 'postgres'
  });

  await adminClient.connect();
  console.log('Connected to PostgreSQL as postgres.');

  // Check wms_simple_db
  const checkMain = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = 'wms_simple_db'");
  if (checkMain.rows.length === 0) {
    await adminClient.query('CREATE DATABASE wms_simple_db');
    console.log('Database wms_simple_db created.');
  } else {
    console.log('Database wms_simple_db exists.');
  }

  // Check wms_simple_test_db
  const checkTest = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = 'wms_simple_test_db'");
  if (checkTest.rows.length === 0) {
    await adminClient.query('CREATE DATABASE wms_simple_test_db');
    console.log('Database wms_simple_test_db created.');
  } else {
    console.log('Database wms_simple_test_db exists.');
  }

  await adminClient.end();
}

main().catch(err => {
  console.error('Error setup:', err);
  process.exit(1);
});
