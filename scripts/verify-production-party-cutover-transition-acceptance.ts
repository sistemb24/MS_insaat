import "dotenv/config";

import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";

import {
  asPartyCutoverPrismaClient,
  createPartyCutoverPrismaRepository,
} from "../src/lib/party-cutover-prisma-repository";
import {
  assertProductionPartyCutoverTransitionAcceptanceDatabaseName,
  createProductionPartyCutoverTransitionAcceptanceDatabaseName,
  createProductionPartyCutoverTransitionAcceptanceDatabaseUrl,
  createReadOnlyPartyCutoverTransitionAcceptanceDatabaseUrl,
  evaluateProductionPartyCutoverTransitionAcceptance,
  readProductionPartyCutoverTransitionAcceptanceConfig,
  type ProductionPartyCutoverTransitionAcceptanceEvidence,
} from "../src/lib/production-party-cutover-transition-acceptance";
import {
  createProductionPartyCutoverPostflightPrismaRepository,
} from "../src/lib/production-party-cutover-postflight-prisma-repository";
import {
  evaluateProductionPartyCutoverPostflightGate,
  runProductionPartyCutoverPostflight,
} from "../src/lib/production-party-cutover-postflight";
import type { ProductionPartyCutoverPreflightResult } from
  "../src/lib/production-party-cutover-migration-gate";
import { createProductionPartyCutoverPreflightPrismaRepository } from
  "../src/lib/production-party-cutover-preflight-prisma-repository";
import {
  PRODUCTION_PARTY_CUTOVER_EXPECTED_MIGRATION_COUNT,
  runProductionPartyCutoverPreflight,
  type ProductionPartyCutoverPreflightConfig,
} from "../src/lib/production-party-cutover-preflight";
import {
  evaluateProductionPartyCutoverTransitionGate,
  runProductionPartyCutoverTransition,
  type ProductionPartyCutoverTransitionConfig,
  type ProductionPartyCutoverTransitionKind,
} from "../src/lib/production-party-cutover-transition";

type Inventory = { migrationCount: number; publicTableCount: number };
type Scope = ProductionPartyCutoverPreflightConfig["scope"];
type StageResult = Awaited<ReturnType<typeof runStage>>;

const releaseId = "a".repeat(40);

async function main() {
  const config = readProductionPartyCutoverTransitionAcceptanceConfig(process.env);
  const databaseName = assertProductionPartyCutoverTransitionAcceptanceDatabaseName(
    createProductionPartyCutoverTransitionAcceptanceDatabaseName(new Date()),
  );
  const databaseUrl = createProductionPartyCutoverTransitionAcceptanceDatabaseUrl(
    config.sourceDatabaseUrl,
    databaseName,
  );
  const readOnlyDatabaseUrl =
    createReadOnlyPartyCutoverTransitionAcceptanceDatabaseUrl(databaseUrl);
  const admin = new Client({ connectionString: config.adminDatabaseUrl });
  let databaseCreated = false;
  let temporaryDatabaseRemoved = false;
  let sourceInventoryBefore: Inventory | null = null;
  let evidence: Omit<ProductionPartyCutoverTransitionAcceptanceEvidence,
    "sourceInventoryUnchanged" | "temporaryDatabaseRemoved"> | null = null;
  let executionError: unknown;
  let executionStage = "admin-connect";

  try {
    await admin.connect();
    executionStage = "source-inventory-before";
    sourceInventoryBefore = await readInventory(config.sourceDatabaseUrl);
    executionStage = "temporary-database-create";
    await assertDatabaseAbsent(admin, databaseName);
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    databaseCreated = true;
    executionStage = "migration-deploy";
    await deployMigrations(databaseUrl);
    executionStage = "acceptance-fixtures";
    const fixtures = await createFixtures(databaseUrl);
    executionStage = "transition-scenarios";
    evidence = await runAcceptanceScenarios({
      databaseUrl,
      fixtures,
      readOnlyDatabaseUrl,
    });
  } catch (error) {
    executionError = error;
  } finally {
    try {
      if (databaseCreated) {
        assertProductionPartyCutoverTransitionAcceptanceDatabaseName(databaseName);
        await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
        temporaryDatabaseRemoved = !(await databaseExists(admin, databaseName));
      }
    } catch (cleanupError) {
      executionError ??= cleanupError;
    }
  }

  let sourceInventoryUnchanged = false;
  try {
    if (sourceInventoryBefore) {
      sourceInventoryUnchanged = inventoriesEqual(
        sourceInventoryBefore,
        await readInventory(config.sourceDatabaseUrl),
      );
    }
  } catch (inventoryError) {
    executionError ??= inventoryError;
  } finally {
    await admin.end().catch(() => undefined);
  }

  if (executionError) {
    throw new Error(
      `Party cutover transition izole kabulü başarısız; aşama: ${executionStage}; `
        + `neden: ${safeDiagnostic(executionError)}; geçici hedef: ${databaseName}.`,
      { cause: executionError },
    );
  }
  if (!evidence) throw new Error("Party cutover transition kabul kanıtı yok.");

  const result = evaluateProductionPartyCutoverTransitionAcceptance({
    ...evidence,
    sourceInventoryUnchanged,
    temporaryDatabaseRemoved,
  });
  console.log(JSON.stringify({ databaseName, ...result }, null, 2));
  if (!result.ready) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error
    ? error.message
    : "Party cutover transition kabulü başarısız.");
  process.exitCode = 1;
});

async function runAcceptanceScenarios(input: {
  databaseUrl: string;
  fixtures: { actorUserId: string; scope: Scope };
  readOnlyDatabaseUrl: string;
}) {
  const localMigrationNames = await readLocalMigrationNames();
  if (localMigrationNames.length !== PRODUCTION_PARTY_CUTOVER_EXPECTED_MIGRATION_COUNT) {
    throw new Error("Party cutover transition kabul migration sayısı 70 değil.");
  }
  const migrationCount = await readInventory(input.databaseUrl)
    .then((inventory) => inventory.migrationCount);
  const preflightConfig: ProductionPartyCutoverPreflightConfig = {
    actorUserId: input.fixtures.actorUserId,
    databaseUrl: input.readOnlyDatabaseUrl,
    releaseId,
    scope: input.fixtures.scope,
  };
  const writer = createPrisma(input.databaseUrl);
  try {
    const initialPreflight = await readPreflight(preflightConfig, localMigrationNames);
    const activateConfig = transitionConfig("ACTIVATE", initialPreflight);
    const checksumDriftGate = evaluateProductionPartyCutoverTransitionGate({
      config: { ...activateConfig, expectedBusinessChecksum: "f".repeat(64) },
      preflight: initialPreflight,
    });
    const activation = await runStage({
      config: activateConfig,
      localMigrationNames,
      preflight: initialPreflight,
      preflightConfig,
      readOnlyDatabaseUrl: input.readOnlyDatabaseUrl,
      writer,
    });
    const activateRetryConfig = transitionConfig(
      "ACTIVATE_RETRY",
      activation.afterPreflight,
    );
    const activationRetry = await runStage({
      config: activateRetryConfig,
      localMigrationNames,
      preflight: activation.afterPreflight,
      preflightConfig,
      readOnlyDatabaseUrl: input.readOnlyDatabaseUrl,
      writer,
    });
    const rollbackConfig = transitionConfig(
      "ROLLBACK",
      activationRetry.afterPreflight,
    );
    const rollback = await runStage({
      config: rollbackConfig,
      localMigrationNames,
      preflight: activationRetry.afterPreflight,
      preflightConfig,
      readOnlyDatabaseUrl: input.readOnlyDatabaseUrl,
      writer,
    });
    const rollbackRetryConfig = transitionConfig(
      "ROLLBACK_RETRY",
      rollback.afterPreflight,
    );
    const rollbackRetry = await runStage({
      config: rollbackRetryConfig,
      localMigrationNames,
      preflight: rollback.afterPreflight,
      preflightConfig,
      readOnlyDatabaseUrl: input.readOnlyDatabaseUrl,
      writer,
    });

    let writablePostflightRejected = false;
    try {
      await runProductionPartyCutoverPostflight({
        config: rollbackRetryConfig,
        repository: createProductionPartyCutoverPostflightPrismaRepository(writer),
      });
    } catch (error) {
      writablePostflightRejected = error instanceof Error
        && error.message.includes("transaction salt-okunur değil");
    }

    return {
      activationCountsExact: exactCounts(
        activationRetry,
        "SHADOW_READ",
        1,
        1,
        1,
      ),
      activationPostflightReady: activation.postGate.ready,
      activationRetryPostflightReady: activationRetry.postGate.ready,
      activationRetryStatus: activationRetry.transition.status,
      activationStatus: activation.transition.status,
      checksumDriftRejected: !checksumDriftGate.ready
        && checksumDriftGate.blockers.includes("BUSINESS_CHECKSUM_MISMATCH"),
      migrationCount,
      rollbackCountsExact: exactCounts(rollbackRetry, "LEGACY_ONLY", 2, 2, 2),
      rollbackPostflightReady: rollback.postGate.ready,
      rollbackRetryPostflightReady: rollbackRetry.postGate.ready,
      rollbackRetryStatus: rollbackRetry.transition.status,
      rollbackStatus: rollback.transition.status,
      writablePostflightRejected,
    };
  } finally {
    await writer.$disconnect();
  }
}

async function runStage(input: {
  config: ProductionPartyCutoverTransitionConfig;
  localMigrationNames: readonly string[];
  preflight: ProductionPartyCutoverPreflightResult;
  preflightConfig: ProductionPartyCutoverPreflightConfig;
  readOnlyDatabaseUrl: string;
  writer: PrismaClient;
}) {
  const transition = await runProductionPartyCutoverTransition({
    config: input.config,
    preflight: input.preflight,
    repository: createPartyCutoverPrismaRepository(
      asPartyCutoverPrismaClient(input.writer),
    ),
  });
  const afterPreflight = await readPreflight(
    input.preflightConfig,
    input.localMigrationNames,
  );
  const reader = createPrisma(input.readOnlyDatabaseUrl);
  try {
    const postflight = await runProductionPartyCutoverPostflight({
      config: input.config,
      repository: createProductionPartyCutoverPostflightPrismaRepository(reader),
    });
    return {
      afterPreflight,
      postGate: evaluateProductionPartyCutoverPostflightGate({
        config: input.config,
        postflight,
        preflight: afterPreflight,
      }),
      postflight,
      transition,
    };
  } finally {
    await reader.$disconnect();
  }
}

function exactCounts(
  stage: StageResult,
  mode: string,
  revisionNo: number,
  eventCount: number,
  auditCount: number,
) {
  return stage.postflight.stateCount === 1
    && stage.postflight.mode === mode
    && stage.postflight.revisionNo === revisionNo
    && stage.postflight.eventCount === eventCount
    && stage.postflight.auditCount === auditCount;
}

function transitionConfig(
  kind: ProductionPartyCutoverTransitionKind,
  preflight: ProductionPartyCutoverPreflightResult,
): ProductionPartyCutoverTransitionConfig {
  return {
    actorUserId: "party-cutover-transition-acceptance-admin",
    expectedBusinessChecksum: preflight.businessChecksum,
    expectedEligibilityManifestChecksum: preflight.eligibilityManifestChecksum,
    expectedPreflightManifestChecksum: preflight.manifestChecksum,
    expectedStateManifestChecksum: preflight.stateManifestChecksum,
    kind,
    operationId: kind.startsWith("ACTIVATE")
      ? "party-cutover-transition-acceptance-activate"
      : "party-cutover-transition-acceptance-rollback",
    releaseId,
    scope: {
      companyId: "party-cutover-transition-acceptance-company",
      periodId: "party-cutover-transition-acceptance-period",
      tenantId: "party-cutover-transition-acceptance-tenant",
    },
  };
}

async function readPreflight(
  config: ProductionPartyCutoverPreflightConfig,
  localMigrationNames: readonly string[],
) {
  const prisma = createPrisma(config.databaseUrl);
  try {
    return await runProductionPartyCutoverPreflight({
      config,
      localMigrationNames,
      repository: createProductionPartyCutoverPreflightPrismaRepository(prisma),
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function createFixtures(databaseUrl: string) {
  const prisma = createPrisma(databaseUrl);
  const actorUserId = "party-cutover-transition-acceptance-admin";
  const scope = {
    companyId: "party-cutover-transition-acceptance-company",
    periodId: "party-cutover-transition-acceptance-period",
    tenantId: "party-cutover-transition-acceptance-tenant",
  };
  const runId = `party-backfill-run_${"b".repeat(32)}`;
  try {
    await prisma.tenant.create({
      data: { id: scope.tenantId, name: "Party Cutover Transition Acceptance" },
    });
    await prisma.company.create({
      data: { id: scope.companyId, name: "Acceptance Company", tenantId: scope.tenantId },
    });
    await prisma.period.create({
      data: {
        companyId: scope.companyId,
        id: scope.periodId,
        label: "Acceptance Period",
        tenantId: scope.tenantId,
      },
    });
    await prisma.appUser.create({
      data: { id: actorUserId, name: "Acceptance Admin", tenantId: scope.tenantId },
    });
    await prisma.appUserScopeAccess.create({
      data: {
        ...scope,
        id: "party-cutover-transition-acceptance-access",
        isActive: true,
        licenseLabel: "Acceptance",
        role: "admin",
        userId: actorUserId,
      },
    });
    await prisma.partyBackfillRun.create({
      data: {
        ...scope,
        candidateCount: 0,
        completedAt: new Date("2026-08-14T18:00:00.000Z"),
        createdBy: actorUserId,
        id: runId,
        issueCount: 0,
        sourceChecksum: "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
        sourceCount: 0,
        startedAt: new Date("2026-08-14T17:59:00.000Z"),
        status: "VERIFIED",
        version: "party-v1",
      },
    });
    await prisma.auditLog.create({
      data: {
        ...scope,
        action: "party.backfill.verified",
        actorUserId,
        entityId: runId,
        entityLabel: "Party Backfill Run",
        entityType: "party-backfill-run",
        metadata: { acceptance: true },
        occurredAt: new Date("2026-08-14T18:00:00.000Z"),
      },
    });
    return { actorUserId, scope };
  } finally {
    await prisma.$disconnect();
  }
}

function createPrisma(connectionString: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

async function readLocalMigrationNames() {
  const entries = await readdir(resolve("prisma/migrations"), { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function deployMigrations(databaseUrl: string) {
  const prismaCli = resolve(process.cwd(), "node_modules/prisma/build/index.js");
  await new Promise<void>((resolvePromise, reject) => {
    let diagnostic = "";
    const child = spawn(
      process.execPath,
      [prismaCli, "migrate", "deploy", "--schema", "prisma/schema.prisma"],
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: databaseUrl, NOA_RUNTIME_ENV: "test" },
        stdio: ["ignore", "ignore", "pipe"],
      },
    );
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      diagnostic = `${diagnostic}${chunk}`.slice(-4_000);
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(
        `Prisma migrate deploy exit ${code ?? "unknown"}: ${safeDiagnostic(diagnostic)}`,
      ));
    });
  });
}

async function readInventory(connectionString: string): Promise<Inventory> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const migration = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    `);
    const tables = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    return {
      migrationCount: Number(migration.rows[0]?.count ?? 0),
      publicTableCount: Number(tables.rows[0]?.count ?? 0),
    };
  } finally {
    await client.end();
  }
}

async function assertDatabaseAbsent(client: Client, name: string) {
  if (await databaseExists(client, name)) {
    throw new Error("Party cutover transition geçici DB zaten var.");
  }
}

async function databaseExists(client: Client, name: string) {
  const result = await client.query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
    [assertProductionPartyCutoverTransitionAcceptanceDatabaseName(name)],
  );
  return result.rows[0]?.exists === true;
}

function inventoriesEqual(left: Inventory, right: Inventory) {
  return left.migrationCount === right.migrationCount
    && left.publicTableCount === right.publicTableCount;
}

function safeDiagnostic(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/password=[^\s]+/gi, "password=[REDACTED]")
    .slice(0, 1_000);
}
