import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { Client } from "pg";

import { readStagingDatabaseUrl } from "../src/lib/staging-backup";
import {
  createNodePostgresConnectionString,
  evaluateStagingRecoverySource,
} from "../src/lib/staging-recovery";
import { readStagingRecoveryInventory } from "../src/lib/staging-recovery-postgres";

async function main() {
  const databaseUrl = readStagingDatabaseUrl(process.env);
  const expectedMigrationCount = await countMigrationDirectories();
  const client = new Client({
    connectionString: createNodePostgresConnectionString(databaseUrl),
  });

  try {
    await client.connect();
    const result = evaluateStagingRecoverySource(
      await readStagingRecoveryInventory(client, expectedMigrationCount),
    );

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

void main();
