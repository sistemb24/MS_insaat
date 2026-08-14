import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import {
  asPartyCutoverPrismaClient,
  createPartyCutoverPrismaRepository,
} from "../src/lib/party-cutover-prisma-repository";
import { createProductionPartyCutoverPreflightPrismaRepository } from
  "../src/lib/production-party-cutover-preflight-prisma-repository";
import { runProductionPartyCutoverPreflight } from
  "../src/lib/production-party-cutover-preflight";
import {
  readProductionPartyCutoverInventoryDatabaseUrl,
  readProductionPartyCutoverTransitionConfig,
  readProductionPartyCutoverWriteDatabaseUrl,
  runProductionPartyCutoverTransition,
} from "../src/lib/production-party-cutover-transition";

async function main() {
  const config = readProductionPartyCutoverTransitionConfig(process.env);
  const inventory = createClient(
    readProductionPartyCutoverInventoryDatabaseUrl(process.env),
  );
  const writer = createClient(readProductionPartyCutoverWriteDatabaseUrl(process.env));
  try {
    const preflight = await runProductionPartyCutoverPreflight({
      config: { ...config, databaseUrl: "[redacted]" },
      localMigrationNames: await readLocalMigrationNames(),
      repository: createProductionPartyCutoverPreflightPrismaRepository(inventory),
    });
    const result = await runProductionPartyCutoverTransition({
      config,
      preflight,
      repository: createPartyCutoverPrismaRepository(
        asPartyCutoverPrismaClient(writer),
      ),
    });
    console.log(JSON.stringify(result));
  } finally {
    await Promise.all([
      inventory.$disconnect().catch(() => undefined),
      writer.$disconnect().catch(() => undefined),
    ]);
  }
}

function createClient(connectionString: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

async function readLocalMigrationNames() {
  const entries = await readdir(resolve(process.cwd(), "prisma", "migrations"), {
    withFileTypes: true,
  });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

void main().catch(() => {
  console.error("Party cutover production transition fail-closed durdu.");
  process.exitCode = 1;
});
