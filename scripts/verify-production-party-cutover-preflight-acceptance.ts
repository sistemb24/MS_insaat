import "dotenv/config";

import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";

import {
  assertProductionPartyCutoverAcceptanceDatabaseName,
  createProductionPartyCutoverAcceptanceDatabaseName,
  createProductionPartyCutoverAcceptanceDatabaseUrl,
  createReadOnlyPartyCutoverAcceptanceDatabaseUrl,
  evaluateProductionPartyCutoverAcceptance,
  readProductionPartyCutoverAcceptanceConfig,
  type ProductionPartyCutoverAcceptanceEvidence,
} from "../src/lib/production-party-cutover-acceptance";
import {
  evaluateProductionPartyCutoverMigrationGate,
  type ProductionPartyCutoverMigrationGateConfig,
} from "../src/lib/production-party-cutover-migration-gate";
import { createProductionPartyCutoverPreflightPrismaRepository } from
  "../src/lib/production-party-cutover-preflight-prisma-repository";
import {
  PRODUCTION_PARTY_CUTOVER_EXPECTED_MIGRATION_COUNT,
  PRODUCTION_PARTY_CUTOVER_MIGRATION_NAME,
  runProductionPartyCutoverPreflight,
  type ProductionPartyCutoverPreflightConfig,
} from "../src/lib/production-party-cutover-preflight";

type Inventory = { migrationCount: number; publicTableCount: number };
type Scope = ProductionPartyCutoverPreflightConfig["scope"];

async function main() {
  const config = readProductionPartyCutoverAcceptanceConfig(process.env);
  const databaseName = assertProductionPartyCutoverAcceptanceDatabaseName(
    createProductionPartyCutoverAcceptanceDatabaseName(new Date()),
  );
  const databaseUrl = createProductionPartyCutoverAcceptanceDatabaseUrl(
    config.sourceDatabaseUrl,
    databaseName,
  );
  const readOnlyDatabaseUrl = createReadOnlyPartyCutoverAcceptanceDatabaseUrl(databaseUrl);
  const admin = new Client({ connectionString: config.adminDatabaseUrl });
  let databaseCreated = false;
  let temporaryDatabaseRemoved = false;
  let temporaryMigrationWorkspace: string | null = null;
  let temporaryMigrationWorkspaceRemoved = false;
  let sourceInventoryBefore: Inventory | null = null;
  let evidence: Omit<ProductionPartyCutoverAcceptanceEvidence,
    | "sourceInventoryUnchanged"
    | "temporaryDatabaseRemoved"
    | "temporaryMigrationWorkspaceRemoved"> | null = null;
  let executionError: unknown;
  let executionStage = "admin-connect";

  try {
    await admin.connect();
    executionStage = "source-inventory-before";
    sourceInventoryBefore = await readInventory(config.sourceDatabaseUrl);
    executionStage = "temporary-migration-workspace";
    temporaryMigrationWorkspace = await preparePreMigrationWorkspace();
    executionStage = "temporary-database-create";
    await assertDatabaseAbsent(admin, databaseName);
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    databaseCreated = true;
    executionStage = "pre-migration-deploy";
    await deployMigrations(
      databaseUrl,
      join(temporaryMigrationWorkspace, "schema.prisma"),
      join(temporaryMigrationWorkspace, "prisma.config.ts"),
    );
    executionStage = "acceptance-fixtures";
    const fixtures = await createFixtures(databaseUrl);
    executionStage = "pre-post-acceptance";
    evidence = await runAcceptanceStages({
      databaseUrl,
      fixtures,
      readOnlyDatabaseUrl,
    });
  } catch (error) {
    executionError = error;
  } finally {
    try {
      if (databaseCreated) {
        assertProductionPartyCutoverAcceptanceDatabaseName(databaseName);
        await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
        temporaryDatabaseRemoved = !(await databaseExists(admin, databaseName));
      }
    } catch (cleanupError) {
      executionError ??= cleanupError;
    }
    try {
      if (temporaryMigrationWorkspace) {
        const safeWorkspace = assertTemporaryMigrationWorkspace(
          temporaryMigrationWorkspace,
        );
        await rm(safeWorkspace, { force: true, recursive: true });
        temporaryMigrationWorkspaceRemoved = !(await pathExists(safeWorkspace));
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
      `Party cutover production-tarzı kabul başarısız; aşama: ${executionStage}; `
        + `neden: ${safeDiagnostic(executionError)}; geçici hedef: ${databaseName}.`,
      { cause: executionError },
    );
  }
  if (!evidence) throw new Error("Party cutover production-tarzı kabul kanıtı yok.");

  const result = evaluateProductionPartyCutoverAcceptance({
    ...evidence,
    sourceInventoryUnchanged,
    temporaryDatabaseRemoved,
    temporaryMigrationWorkspaceRemoved,
  });
  console.log(JSON.stringify({ databaseName, ...result }, null, 2));
  if (!result.ready) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Party cutover kabulü başarısız.");
  process.exitCode = 1;
});

async function runAcceptanceStages(input: {
  databaseUrl: string;
  fixtures: { actorUserId: string; scope: Scope };
  readOnlyDatabaseUrl: string;
}) {
  const localMigrationNames = await readLocalMigrationNames();
  if (localMigrationNames.length !== PRODUCTION_PARTY_CUTOVER_EXPECTED_MIGRATION_COUNT) {
    throw new Error("Party cutover kabul yerel migration sayısı 70 değil.");
  }
  const preflightConfig: ProductionPartyCutoverPreflightConfig = {
    actorUserId: input.fixtures.actorUserId,
    databaseUrl: input.readOnlyDatabaseUrl,
    releaseId: "a".repeat(40),
    scope: input.fixtures.scope,
  };
  const preflight = await readPreflight(
    preflightConfig,
    localMigrationNames,
  );
  const preGateConfig = gateConfig({
    businessChecksum: preflight.businessChecksum,
    manifestChecksum: preflight.manifestChecksum,
    preflightConfig,
    stage: "PRE_MIGRATION",
  });
  const preGate = evaluateProductionPartyCutoverMigrationGate({
    config: preGateConfig,
    preflight,
  });

  let readOnlyCredentialRequired = false;
  try {
    await readPreflight(
      { ...preflightConfig, databaseUrl: input.databaseUrl },
      localMigrationNames,
    );
  } catch (error) {
    if (
      error instanceof Error
      && error.message.includes("transaction salt-okunur değil")
    ) {
      readOnlyCredentialRequired = true;
    } else {
      throw error;
    }
  }

  await deployMigrations(input.databaseUrl, resolve("prisma/schema.prisma"));
  const postflight = await readPreflight(
    preflightConfig,
    localMigrationNames,
  );
  const postGateConfig = gateConfig({
    businessChecksum: preflight.businessChecksum,
    manifestChecksum: preflight.manifestChecksum,
    preflightConfig,
    stage: "POST_MIGRATION",
  });
  const postGate = evaluateProductionPartyCutoverMigrationGate({
    config: postGateConfig,
    preflight: postflight,
  });
  const driftGate = evaluateProductionPartyCutoverMigrationGate({
    config: { ...postGateConfig, expectedBusinessChecksum: "f".repeat(64) },
    preflight: postflight,
  });

  const writePrisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: input.databaseUrl }),
  });
  let cutoverStateRejected = false;
  try {
    await writePrisma.partyCutoverState.create({
      data: {
        ...input.fixtures.scope,
        createdBy: input.fixtures.actorUserId,
        id: "party-cutover-state-acceptance-blocker",
        issueChecksum: postflight.parity.issueChecksum,
        lastVerifiedAt: new Date("2026-08-14T17:00:00.000Z"),
        legacyChecksum: postflight.parity.legacyChecksum,
        legacyCount: postflight.parity.legacyCount,
        matchedCount: postflight.parity.matchedCount,
        mode: "SHADOW_READ",
        parityChecksum: postflight.parity.parityChecksum,
        partyChecksum: postflight.parity.partyChecksum,
        partyCount: postflight.parity.partyCount,
        releaseId: preflightConfig.releaseId,
        revisionNo: 1,
        roleCount: postflight.parity.roleCount,
        updatedBy: input.fixtures.actorUserId,
      },
    });
    const statePreflight = await readPreflight(preflightConfig, localMigrationNames);
    const stateGate = evaluateProductionPartyCutoverMigrationGate({
      config: postGateConfig,
      preflight: statePreflight,
    });
    cutoverStateRejected = !stateGate.ready
      && stateGate.blockers.includes("CUTOVER_STATE_NOT_EMPTY")
      && stateGate.blockers.includes("CUTOVER_STATE_CHAIN_INVALID");
    await writePrisma.partyCutoverState.delete({
      where: { id: "party-cutover-state-acceptance-blocker" },
    });
  } finally {
    await writePrisma.$disconnect();
  }

  return {
    businessChecksumUnchanged:
      preflight.businessChecksum === postflight.businessChecksum,
    cutoverStateRejected,
    driftRejected: !driftGate.ready
      && driftGate.blockers.includes("BUSINESS_CHECKSUM_MISMATCH"),
    postAppliedMigrationCount: postflight.migration.appliedMigrationCount,
    postCutoverAuditCount: postflight.cutover.auditCount,
    postCutoverEventCount: postflight.cutover.eventCount,
    postCutoverStateCount: postflight.cutover.stateCount,
    postGateReady: postGate.ready,
    postPendingMigrationCount: postflight.migration.pendingMigrationNames.length,
    postPreflightReady: postflight.ready,
    postSchemaState: postflight.migration.schemaState,
    preAppliedMigrationCount: preflight.migration.appliedMigrationCount,
    preGateReady: preGate.ready,
    prePendingMigrationNames: preflight.migration.pendingMigrationNames,
    prePreflightReady: preflight.ready,
    preSchemaState: preflight.migration.schemaState,
    readOnlyCredentialRequired,
  };
}

async function readPreflight(
  config: ProductionPartyCutoverPreflightConfig,
  localMigrationNames: readonly string[],
) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: config.databaseUrl }),
  });
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

function gateConfig(input: {
  businessChecksum: string;
  manifestChecksum: string;
  preflightConfig: ProductionPartyCutoverPreflightConfig;
  stage: "POST_MIGRATION" | "PRE_MIGRATION";
}): ProductionPartyCutoverMigrationGateConfig {
  return {
    ...input.preflightConfig,
    backupId: `20260814T170000Z-${input.preflightConfig.releaseId}`,
    expectedBusinessChecksum: input.businessChecksum,
    expectedPreflightManifestChecksum: input.manifestChecksum,
    stage: input.stage,
  };
}

async function createFixtures(databaseUrl: string) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
  const actorUserId = "party-cutover-preflight-acceptance-admin";
  const scope = {
    companyId: "party-cutover-preflight-acceptance-company",
    periodId: "party-cutover-preflight-acceptance-period",
    tenantId: "party-cutover-preflight-acceptance-tenant",
  };
  const runId = `party-backfill-run_${"a".repeat(32)}`;
  try {
    await prisma.tenant.create({
      data: { id: scope.tenantId, name: "Party Cutover Preflight Acceptance" },
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
        id: "party-cutover-preflight-acceptance-access",
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
        completedAt: new Date("2026-08-14T16:00:00.000Z"),
        createdBy: actorUserId,
        id: runId,
        issueCount: 0,
        sourceChecksum: "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
        sourceCount: 0,
        startedAt: new Date("2026-08-14T15:59:00.000Z"),
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
        occurredAt: new Date("2026-08-14T16:00:00.000Z"),
      },
    });
    return { actorUserId, scope };
  } finally {
    await prisma.$disconnect();
  }
}

async function preparePreMigrationWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), "noa-party-cutover-migrations-"));
  const safeWorkspace = assertTemporaryMigrationWorkspace(workspace);
  try {
    await cp(resolve("prisma/schema.prisma"), join(safeWorkspace, "schema.prisma"));
    await writeFile(
      join(safeWorkspace, "prisma.config.ts"),
      [
        "export default {",
        '  schema: "schema.prisma",',
        '  migrations: { path: "migrations" },',
        "  datasource: { url: process.env.DATABASE_URL },",
        "};",
        "",
      ].join("\n"),
      "utf8",
    );
    const targetMigrations = join(safeWorkspace, "migrations");
    await mkdir(targetMigrations);
    const entries = await readdir(resolve("prisma/migrations"), { withFileTypes: true });
    const migrationNames = entries.filter((entry) => entry.isDirectory())
      .map((entry) => entry.name).sort();
    if (
      migrationNames.length !== PRODUCTION_PARTY_CUTOVER_EXPECTED_MIGRATION_COUNT
      || !migrationNames.includes(PRODUCTION_PARTY_CUTOVER_MIGRATION_NAME)
    ) {
      throw new Error("Party cutover migration workspace envanteri beklenen durumda değil.");
    }
    for (const migrationName of migrationNames) {
      if (migrationName === PRODUCTION_PARTY_CUTOVER_MIGRATION_NAME) continue;
      await cp(
        resolve("prisma/migrations", migrationName),
        join(targetMigrations, migrationName),
        { recursive: true },
      );
    }
    return safeWorkspace;
  } catch (error) {
    await rm(safeWorkspace, { force: true, recursive: true });
    throw error;
  }
}

function assertTemporaryMigrationWorkspace(value: string) {
  const resolved = resolve(value);
  const tempRoot = `${resolve(tmpdir())}${sep}`.toLowerCase();
  if (
    !resolved.toLowerCase().startsWith(tempRoot)
    || !basename(resolved).startsWith("noa-party-cutover-migrations-")
  ) {
    throw new Error("Party cutover geçici migration workspace yolu güvenli değil.");
  }
  return resolved;
}

async function readLocalMigrationNames() {
  const entries = await readdir(resolve("prisma/migrations"), { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function deployMigrations(
  databaseUrl: string,
  schemaPath: string,
  configPath?: string,
) {
  const prismaCli = resolve(process.cwd(), "node_modules/prisma/build/index.js");
  await new Promise<void>((resolvePromise, reject) => {
    let diagnostic = "";
    const args = [prismaCli, "migrate", "deploy", "--schema", schemaPath];
    if (configPath) args.push("--config", configPath);
    const child = spawn(
      process.execPath,
      args,
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
    throw new Error("Party cutover production-tarzı geçici DB zaten var.");
  }
}

async function databaseExists(client: Client, name: string) {
  const result = await client.query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
    [assertProductionPartyCutoverAcceptanceDatabaseName(name)],
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

async function pathExists(path: string) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (
      error
      && typeof error === "object"
      && "code" in error
      && error.code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
}
