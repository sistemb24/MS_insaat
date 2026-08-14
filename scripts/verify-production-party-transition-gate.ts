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
import {
  evaluateProductionPartyMigrationGate,
  evaluateProductionPartyZeroApplyGate,
  readProductionPartyMigrationConfig,
  readProductionPartyTransitionStage,
  readProductionPartyZeroApplyConfig,
} from "../src/lib/production-party-transition";

async function main() {
  const preflightConfig = readProductionPartyPreflightConfig(process.env);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: preflightConfig.databaseUrl }),
  });
  try {
    const preflight = await runProductionPartyPreflight({
      config: preflightConfig,
      localMigrationNames: await readLocalMigrationNames(),
      repository: createProductionPartyPreflightPrismaRepository(prisma),
    });
    const stage = readProductionPartyTransitionStage(
      process.env.NOA_PARTY_TRANSITION_STAGE,
    );
    const result = stage === "ZERO_APPLY"
      ? evaluateProductionPartyZeroApplyGate({
          config: readProductionPartyZeroApplyConfig(process.env),
          preflight,
        })
      : evaluateProductionPartyMigrationGate({
          config: readProductionPartyMigrationConfig(process.env),
          preflight,
          stage,
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
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

void main().catch(() => {
  console.error("Party production transition gate fail-closed durdu.");
  process.exitCode = 1;
});
