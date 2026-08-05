import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { Client } from "pg";

import { readStagingDatabaseUrl } from "../src/lib/staging-backup";
import { evaluateStagingRecoverySource } from "../src/lib/staging-recovery";

async function main() {
  const databaseUrl = readStagingDatabaseUrl(process.env);
  const expectedMigrationCount = await countMigrationDirectories();
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    const databaseResult = await client.query<{
      database_bytes: string;
      table_names: string[] | null;
    }>(`
      SELECT
        pg_database_size(current_database())::text AS database_bytes,
        array_agg(tablename ORDER BY tablename)
          FILTER (WHERE tablename IS NOT NULL) AS table_names
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
    `);
    const publicTableNames = databaseResult.rows[0]?.table_names ?? [];
    const appliedMigrationCount = publicTableNames.includes("_prisma_migrations")
      ? await readAppliedMigrationCount(client)
      : 0;
    const result = evaluateStagingRecoverySource({
      appliedMigrationCount,
      databaseBytes: Number(databaseResult.rows[0]?.database_bytes ?? 0),
      expectedMigrationCount,
      publicTableNames,
    });

    console.log(JSON.stringify({ ...result, status: result.ready ? "ready" : "blocked" }));
    if (!result.ready) {
      throw new Error("Staging recovery kaynağı restore tatbikatına hazır değil.");
    }
  } finally {
    await client.end();
  }
}

async function countMigrationDirectories() {
  const entries = await readdir(resolve(process.cwd(), "prisma", "migrations"), {
    withFileTypes: true,
  });
  return entries.filter((entry) => entry.isDirectory()).length;
}

async function readAppliedMigrationCount(client: Client) {
  const result = await client.query<{ count: number }>(`
    SELECT count(*)::integer AS count
    FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
  `);
  return result.rows[0]?.count ?? 0;
}

void main();
