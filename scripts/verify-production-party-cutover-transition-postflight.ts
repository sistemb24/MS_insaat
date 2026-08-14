import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import {
  createProductionPartyCutoverPostflightPrismaRepository,
} from "../src/lib/production-party-cutover-postflight-prisma-repository";
import {
  evaluateProductionPartyCutoverPostflightGate,
  runProductionPartyCutoverPostflight,
} from "../src/lib/production-party-cutover-postflight";
import { createProductionPartyCutoverPreflightPrismaRepository } from
  "../src/lib/production-party-cutover-preflight-prisma-repository";
import { runProductionPartyCutoverPreflight } from
  "../src/lib/production-party-cutover-preflight";
import {
  readProductionPartyCutoverInventoryDatabaseUrl,
  readProductionPartyCutoverTransitionConfig,
} from "../src/lib/production-party-cutover-transition";

async function main() {
  const config = readProductionPartyCutoverTransitionConfig(process.env);
  const inventory = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: readProductionPartyCutoverInventoryDatabaseUrl(process.env),
    }),
  });
  try {
    const preflight = await runProductionPartyCutoverPreflight({
      config: { ...config, databaseUrl: "[redacted]" },
      localMigrationNames: await readLocalMigrationNames(),
      repository: createProductionPartyCutoverPreflightPrismaRepository(inventory),
    });
    const postflight = await runProductionPartyCutoverPostflight({
      config,
      repository: createProductionPartyCutoverPostflightPrismaRepository(
        inventory,
      ),
    });
    const result = evaluateProductionPartyCutoverPostflightGate({
      config,
      postflight,
      preflight,
    });
    console.log(JSON.stringify(result));
    if (!result.ready) process.exitCode = 1;
  } finally {
    await inventory.$disconnect().catch(() => undefined);
  }
}

async function readLocalMigrationNames() {
  const entries = await readdir(resolve(process.cwd(), "prisma", "migrations"), {
    withFileTypes: true,
  });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

void main().catch(() => {
  console.error("Party cutover production transition postflight fail-closed durdu.");
  process.exitCode = 1;
});
