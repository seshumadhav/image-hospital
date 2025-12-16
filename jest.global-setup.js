const { Client } = require('pg');

/**
 * Jest global setup
 *
 * Creates a fresh ephemeral PostgreSQL database for tests.
 * The database name is taken from PG_TEST_DATABASE or defaults
 * to `image_hospital_test`.
 */
module.exports = async () => {
  const dbName = process.env.PG_TEST_DATABASE || 'image_hospital_test';
  const host = process.env.PG_HOST || 'localhost';
  const port = parseInt(process.env.PG_PORT || '5432', 10);
  const user = process.env.PG_USER || process.env.USER || 'postgres';
  const password = process.env.PG_PASSWORD || '';

  const client = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
  });

  await client.connect();

  // Terminate existing connections to the test DB, then drop and recreate it
  try {
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
      [dbName],
    );
  } catch {
    // If pg_stat_activity is unavailable or fails, continue; DROP DATABASE will handle it
  }

  await client.query(`DROP DATABASE IF EXISTS ${JSON.stringify(dbName)}`);
  await client.query(`CREATE DATABASE ${JSON.stringify(dbName)}`);

  await client.end();
};


