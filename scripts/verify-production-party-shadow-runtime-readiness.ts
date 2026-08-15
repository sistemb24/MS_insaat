import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { createProductionPartyCutoverPreflightPrismaRepository } from
  "../src/lib/production-party-cutover-preflight-prisma-repository";
import { runProductionPartyCutoverPreflight } from
  "../src/lib/production-party-cutover-preflight";
import {
  decodeProductionPartyShadowRuntimeAttestation,
  readProductionPartyShadowRuntimeReadinessConfig,
  runProductionPartyShadowRuntimeReadinessPreflight,
} from "../src/lib/production-party-shadow-runtime-readiness";

async function main() {
  const config = readProductionPartyShadowRuntimeReadinessConfig(process.env);
  const attestation = decodeProductionPartyShadowRuntimeAttestation(
    process.env.NOA_PARTY_SHADOW_RUNTIME_ATTESTATION_BASE64 ?? "",
  );
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: config.databaseUrl }),
  });
  try {
    const cutoverPreflight = await runProductionPartyCutoverPreflight({
      config: {
        actorUserId: config.actorUserId,
        databaseUrl: "[redacted]",
        releaseId: config.releaseId,
        scope: config.scope,
      },
      localMigrationNames: await readLocalMigrationNames(),
      repository: createProductionPartyCutoverPreflightPrismaRepository(prisma),
    });
    const result = runProductionPartyShadowRuntimeReadinessPreflight({
      attestation,
      config,
      cutoverPreflight,
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
  console.error("Party shadow runtime production readiness fail-closed durdu.");
  process.exitCode = 1;
});
