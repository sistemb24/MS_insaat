import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { HeadBucketCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Client } from "pg";

import { createR2Client } from "../src/lib/document-storage-r2";
import {
  evaluateProductionMigrationPreflight,
  readProductionRecoveryPreflightConfig,
  type ProductionMigrationRecord,
} from "../src/lib/production-recovery-preflight";
import { createNodePostgresConnectionString } from "../src/lib/staging-recovery";

async function main() {
  const config = readProductionRecoveryPreflightConfig(process.env);
  const databaseClient = new Client({
    connectionString: createNodePostgresConnectionString(config.databaseUrl),
  });
  const documentClient = createR2Client(config.documentStorage);
  const backupClient = createR2Client(config.backupStorage);

  try {
    const localMigrationNames = await readLocalMigrationNames();
    await databaseClient.connect();
    const { migrationTableExists, productionMigrationRecords, publicTableNames } =
      await readProductionMigrationInventory(databaseClient);
    const migration = evaluateProductionMigrationPreflight({
      localMigrationNames,
      migrationTableExists,
      productionMigrationRecords,
      publicTableNames,
    });

    await Promise.all([
      assertReadAccess(documentClient, config.documentStorage.bucket),
      assertReadAccess(backupClient, config.backupStorage.bucket),
    ]);

    console.log(
      JSON.stringify({
        appliedMigrationCount: migration.appliedMigrationCount,
        backupAccess: "read-only-verified",
        backupCreationAllowed: migration.backupCreationAllowed,
        localMigrationCount: migration.localMigrationCount,
        migrationApplyAllowed: migration.migrationApplyAllowed,
        pendingMigrationCount: migration.pendingMigrationCount,
        publicTableCount: migration.publicTableCount,
        readOnly: migration.readOnly,
        releaseId: config.releaseId,
        status: migration.ready ? "ready" : "blocked",
      }),
    );

    if (!migration.ready) {
      throw new Error("Production migration envanteri fail-closed engellendi.");
    }
  } finally {
    await databaseClient.end().catch(() => undefined);
    documentClient.destroy();
    backupClient.destroy();
  }
}

async function readLocalMigrationNames() {
  const entries = await readdir(resolve(process.cwd(), "prisma", "migrations"), {
    withFileTypes: true,
  });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function readProductionMigrationInventory(client: Client) {
  const tableResult = await client.query<{ table_name: string }>(`
    SELECT tablename::text AS table_name
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  const publicTableNames = tableResult.rows.map((row) => row.table_name);
  const migrationTableExists = publicTableNames.includes("_prisma_migrations");
  let productionMigrationRecords: ProductionMigrationRecord[] = [];

  if (migrationTableExists) {
    const migrationResult = await client.query<{
      finished: boolean;
      migration_name: string;
      rolled_back: boolean;
    }>(`
      SELECT
        migration_name,
        finished_at IS NOT NULL AS finished,
        rolled_back_at IS NOT NULL AS rolled_back
      FROM public."_prisma_migrations"
      ORDER BY started_at, migration_name
    `);
    productionMigrationRecords = migrationResult.rows.map((row) => ({
      finished: row.finished,
      migrationName: row.migration_name,
      rolledBack: row.rolled_back,
    }));
  }

  return { migrationTableExists, productionMigrationRecords, publicTableNames };
}

async function assertReadAccess(
  client: ReturnType<typeof createR2Client>,
  bucket: string,
) {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  await client.send(
    new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }),
  );
}

void main();
