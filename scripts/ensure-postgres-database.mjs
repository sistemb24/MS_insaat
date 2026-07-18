import "dotenv/config";

import pg from "pg";

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL ortam değişkeni tanımlı değil.");
}

const targetUrl = new URL(databaseUrl);
const databaseName = decodeURIComponent(targetUrl.pathname.replace(/^\//, ""));

if (!databaseName) {
  throw new Error("DATABASE_URL içinde veritabanı adı bulunamadı.");
}

const maintenanceUrl = new URL(targetUrl);
maintenanceUrl.pathname = "/postgres";

const client = new Client({
  connectionString: maintenanceUrl.toString(),
});

await client.connect();

try {
  const existing = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [databaseName],
  );

  if (existing.rowCount === 0) {
    await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    console.log(`Created PostgreSQL database: ${databaseName}`);
  } else {
    console.log(`PostgreSQL database already exists: ${databaseName}`);
  }
} finally {
  await client.end();
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
