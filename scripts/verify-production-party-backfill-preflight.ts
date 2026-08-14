import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { createProductionPartyPreflightPrismaRepository } from
  "../src/lib/production-party-backfill-preflight-prisma-repository";
import {
  readProductionPartyPreflightConfig,
  runProductionPartyPreflight,
} from "../src/lib/production-party-backfill-preflight";

async function main() {
  const config = readProductionPartyPreflightConfig(process.env);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: config.databaseUrl }),
  });
  try {
    const result = await runProductionPartyPreflight({
      config,
      localMigrationNames: await readLocalMigrationNames(),
      repository: createProductionPartyPreflightPrismaRepository(prisma),
    });
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
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

void main().catch(() => {
  console.error("Party production preflight fail-closed durdu.");
  process.exitCode = 1;
});
