import type { Client } from "pg";

import {
  normalizeStagingTableNames,
  type StagingRecoverySourceInventory,
} from "./staging-recovery";

export async function readStagingRecoveryInventory(
  client: Client,
  expectedMigrationCount: number,
): Promise<StagingRecoverySourceInventory> {
  const databaseResult = await client.query<{
    database_bytes: string;
    table_names: unknown;
  }>(`
    SELECT
      pg_database_size(current_database())::text AS database_bytes,
      array_agg(tablename::text ORDER BY tablename)
        FILTER (WHERE tablename IS NOT NULL) AS table_names
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
  `);
  const publicTableNames = normalizeStagingTableNames(
    databaseResult.rows[0]?.table_names ?? [],
  );
  const appliedMigrationCount = publicTableNames.includes("_prisma_migrations")
    ? await readAppliedMigrationCount(client)
    : 0;

  return {
    appliedMigrationCount,
    databaseBytes: Number(databaseResult.rows[0]?.database_bytes ?? 0),
    expectedMigrationCount,
    publicTableNames,
  };
}

export async function readTableCount(client: Client, tableName: string) {
  if (!/^[A-Za-z][A-Za-z0-9_]{0,62}$/.test(tableName)) {
    throw new Error("Recovery tablo adı güvenli değil.");
  }
  const result = await client.query<{ count: number }>(
    `SELECT count(*)::integer AS count FROM public."${tableName}"`,
  );
  return result.rows[0]?.count ?? 0;
}

async function readAppliedMigrationCount(client: Client) {
  const result = await client.query<{ count: number }>(`
    SELECT count(*)::integer AS count
    FROM public."_prisma_migrations"
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
  `);
  return result.rows[0]?.count ?? 0;
}
