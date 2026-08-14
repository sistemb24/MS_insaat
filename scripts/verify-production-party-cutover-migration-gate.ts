import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import {
  evaluateProductionPartyCutoverMigrationGate,
  readProductionPartyCutoverMigrationGateConfig,
} from "../src/lib/production-party-cutover-migration-gate";
import { createProductionPartyCutoverPreflightPrismaRepository } from
  "../src/lib/production-party-cutover-preflight-prisma-repository";
import { runProductionPartyCutoverPreflight } from
  "../src/lib/production-party-cutover-preflight";

async function main() {
  const config = readProductionPartyCutoverMigrationGateConfig(process.env);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: config.databaseUrl }),
  });
  try {
    const preflight = await runProductionPartyCutoverPreflight({
      config,
      localMigrationNames: await readLocalMigrationNames(),
      repository: createProductionPartyCutoverPreflightPrismaRepository(prisma),
    });
    const result = evaluateProductionPartyCutoverMigrationGate({ config, preflight });
    console.log(JSON.stringify(result));
    if (!result.ready) process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

async function readLocalMigrationNames() {
  const entries = await readdir(resolve(process.cwd(), "prisma", "migrations"), {
    withFileTypes: true,
  });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

void main().catch(() => {
  console.error("Party cutover production migration gate fail-closed durdu.");
  process.exitCode = 1;
});
