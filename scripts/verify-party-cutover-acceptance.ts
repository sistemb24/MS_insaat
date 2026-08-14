import "dotenv/config";

import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Client } from "pg";

import {
  PARTY_CUTOVER_ACCEPTANCE_MIGRATION_COUNT,
  PARTY_CUTOVER_ACCEPTANCE_TABLES,
  assertPartyCutoverAcceptanceDatabaseName,
  createPartyCutoverAcceptanceDatabaseName,
  createPartyCutoverAcceptanceDatabaseUrl,
  evaluatePartyCutoverAcceptance,
  readPartyCutoverAcceptanceConfig,
  type PartyCutoverAcceptanceEvidence,
} from "../src/lib/party-cutover-acceptance";
import {
  PartyCutoverError,
  createPartyCutoverService,
  type PartyCutoverEvidence,
  type PartyCutoverTransitionCommand,
} from "../src/lib/party-cutover";
import {
  asPartyCutoverPrismaClient,
  createPartyCutoverPrismaRepository,
} from "../src/lib/party-cutover-prisma-repository";
import {
  readPartyParityReadModel,
  type PartyParityScope,
} from "../src/lib/party-parity-read-model";
import { createPartyParityPrismaRepository } from
  "../src/lib/party-parity-read-model-prisma-repository";

type Inventory = { migrationCount: number; publicTableCount: number };
type ScopeCounts = {
  auditCount: number;
  eventCount: number;
  mode: string;
  revisionNo: number;
  stateCount: number;
};

async function main() {
  const config = readPartyCutoverAcceptanceConfig(process.env);
  const databaseName = assertPartyCutoverAcceptanceDatabaseName(
    createPartyCutoverAcceptanceDatabaseName(new Date()),
  );
  const temporaryDatabaseUrl = createPartyCutoverAcceptanceDatabaseUrl(
    config.sourceDatabaseUrl,
    databaseName,
  );
  const admin = new Client({ connectionString: config.adminDatabaseUrl });
  let databaseCreated = false;
  let temporaryDatabaseRemoved = false;
  let sourceInventoryBefore: Inventory | null = null;
  let evidence: Omit<PartyCutoverAcceptanceEvidence,
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
    await deployMigrations(temporaryDatabaseUrl);
    executionStage = "acceptance-scenarios";
    evidence = await runAcceptanceScenarios(temporaryDatabaseUrl);
  } catch (error) {
    executionError = error;
  } finally {
    try {
      if (databaseCreated) {
        assertPartyCutoverAcceptanceDatabaseName(databaseName);
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
      `Party cutover izole kabulü başarısız oldu; aşama: ${executionStage}; `
        + `neden: ${safeDiagnostic(executionError)}; geçici hedef: ${databaseName}.`,
      { cause: executionError },
    );
  }
  if (!evidence) throw new Error("Party cutover izole kabul kanıtı üretilemedi.");

  const result = evaluatePartyCutoverAcceptance({
    ...evidence,
    sourceInventoryUnchanged,
    temporaryDatabaseRemoved,
  });
  console.log(JSON.stringify({ databaseName, ...result }, null, 2));
  if (!result.ready) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Party cutover kabulü başarısız.");
  process.exitCode = 1;
});

async function runAcceptanceScenarios(databaseUrl: string) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
  try {
    const [migrationCount, missingTables] = await Promise.all([
      readMigrationCount(prisma),
      readMissingTables(prisma),
    ]);
    if (migrationCount !== PARTY_CUTOVER_ACCEPTANCE_MIGRATION_COUNT) {
      throw new Error(`Beklenen migration sayısı ${PARTY_CUTOVER_ACCEPTANCE_MIGRATION_COUNT}.`);
    }
    if (missingTables.length > 0) {
      throw new Error(`Eksik Party cutover tabloları: ${missingTables.join(", ")}.`);
    }

    const fixtures = await createFixtures(prisma);
    const service = createPartyCutoverService({
      repository: createPartyCutoverPrismaRepository(
        asPartyCutoverPrismaClient(prisma),
      ),
    });
    const expectedParity = await readParityEvidence(prisma, fixtures.primary);
    const activate = activationCommand(fixtures, expectedParity);
    const activation = await service.transition(activate);
    const activationRetry = await service.transition(activate);
    const activationCounts = await readScopeCounts(prisma, fixtures.primary);

    await prisma.entityRecord.update({
      data: { data: { name: "Parity Drift", status: "Aktif" } },
      where: { id: fixtures.primaryLegacyRecordId },
    });
    const driftedParity = await readParityModel(prisma, fixtures.primary);
    const parityDriftConfirmed = !driftedParity.ready
      && driftedParity.parityChecksum !== expectedParity.parityChecksum;

    const rollback = rollbackCommand(fixtures);
    const rollbackResult = await service.transition(rollback);
    const rollbackRetry = await service.transition(rollback);
    const rollbackCounts = await readScopeCounts(prisma, fixtures.primary);

    const auditFailureService = createPartyCutoverService({
      repository: createPartyCutoverPrismaRepository(
        createAuditFailureClient(prisma) as never,
      ),
    });
    const auditParity = await readParityEvidence(prisma, fixtures.auditFailure);
    let auditFailureRejected = false;
    try {
      await auditFailureService.transition(activationCommand(
        { ...fixtures, primary: fixtures.auditFailure },
        auditParity,
      ));
    } catch (error) {
      auditFailureRejected = error instanceof PartyCutoverError
        && error.reasonCode === "AUDIT_WRITE_FAILED";
    }
    const auditRollbackCounts = await readScopeCounts(prisma, fixtures.auditFailure);

    let sqlModeConstraintRejected = false;
    try {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "PartyCutoverState"
        SET "mode" = 'DUAL_WRITE'
        WHERE "tenantId" = ${fixtures.primary.tenantId}
          AND "companyId" = ${fixtures.primary.companyId}
          AND "periodId" = ${fixtures.primary.periodId}
      `);
    } catch {
      const preserved = await prisma.partyCutoverState.findFirst({
        select: { mode: true },
        where: fixtures.primary,
      });
      sqlModeConstraintRejected = preserved?.mode === "LEGACY_ONLY";
    }

    return {
      activationAuditCountAfterRetry: activationCounts.auditCount,
      activationEventCountAfterRetry: activationCounts.eventCount,
      activationModeAfterRetry: activationCounts.mode,
      activationRevisionAfterRetry: activationCounts.revisionNo,
      activationStateCountAfterRetry: activationCounts.stateCount,
      activationStatus: activation.status,
      activationRetryStatus: activationRetry.status,
      auditFailureRejected,
      auditRollbackAuditCount: auditRollbackCounts.auditCount,
      auditRollbackEventCount: auditRollbackCounts.eventCount,
      auditRollbackStateCount: auditRollbackCounts.stateCount,
      migrationCount,
      missingTables,
      parityDriftConfirmed,
      rollbackAuditCountAfterRetry: rollbackCounts.auditCount,
      rollbackEventCountAfterRetry: rollbackCounts.eventCount,
      rollbackModeAfterRetry: rollbackCounts.mode,
      rollbackRevisionAfterRetry: rollbackCounts.revisionNo,
      rollbackStateCountAfterRetry: rollbackCounts.stateCount,
      rollbackStatus: rollbackResult.status,
      rollbackRetryStatus: rollbackRetry.status,
      sqlModeConstraintRejected,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function createFixtures(prisma: PrismaClient) {
  const tenantId = "party-cutover-acceptance-tenant";
  const actorUserId = "party-cutover-acceptance-admin";
  await prisma.tenant.create({ data: { id: tenantId, name: "Party Cutover Acceptance" } });
  await prisma.appUser.create({
    data: { id: actorUserId, name: "Party Cutover Acceptance Admin", tenantId },
  });
  const primary = await createScope(prisma, tenantId, actorUserId, "primary");
  const auditFailure = await createScope(prisma, tenantId, actorUserId, "audit-failure");
  const primaryLegacyRecordId = await createMatchedPartyFixture(
    prisma,
    primary,
    actorUserId,
    "PRIMARY",
  );
  await createMatchedPartyFixture(prisma, auditFailure, actorUserId, "AUDIT");
  return { actorUserId, auditFailure, primary, primaryLegacyRecordId };
}

async function createScope(
  prisma: PrismaClient,
  tenantId: string,
  actorUserId: string,
  key: string,
): Promise<PartyParityScope> {
  const scope = {
    companyId: `party-cutover-company-${key}`,
    periodId: `party-cutover-period-${key}`,
    tenantId,
  };
  await prisma.company.create({
    data: { id: scope.companyId, name: `Party Cutover ${key}`, tenantId },
  });
  await prisma.period.create({
    data: {
      companyId: scope.companyId,
      id: scope.periodId,
      label: `Party Cutover ${key}`,
      tenantId: scope.tenantId,
    },
  });
  await prisma.appUserScopeAccess.create({
    data: {
      ...scope,
      id: `party-cutover-access-${key}`,
      isActive: true,
      licenseLabel: "Acceptance",
      role: "admin",
      userId: actorUserId,
    },
  });
  return scope;
}

async function createMatchedPartyFixture(
  prisma: PrismaClient,
  scope: PartyParityScope,
  actorUserId: string,
  key: string,
) {
  const code = `MUS-${key}`;
  const displayName = `Kabul Müşterisi ${key}`;
  const partyId = `party-cutover-party-${key.toLowerCase()}`;
  const legacy = await prisma.entityRecord.create({
    data: {
      ...scope,
      code,
      createdBy: actorUserId,
      data: {
        email: `${key.toLowerCase()}@example.test`,
        name: displayName,
        phone: "+90 555 000 00 00",
        status: "Aktif",
        taxNumber: "1234567890",
      },
      slug: "musteriler",
      updatedBy: actorUserId,
    },
    select: { id: true },
  });
  await prisma.party.create({
    data: {
      ...scope,
      createdBy: actorUserId,
      displayName,
      email: `${key.toLowerCase()}@example.test`,
      id: partyId,
      normalizedName: displayName.toLocaleUpperCase("tr-TR"),
      normalizedTaxNumber: "1234567890",
      phone: "+90 555 000 00 00",
      status: "ACTIVE",
      taxNumber: "1234567890",
      updatedBy: actorUserId,
    },
  });
  await prisma.partyRole.create({
    data: {
      ...scope,
      code,
      createdBy: actorUserId,
      id: `party-cutover-role-${key.toLowerCase()}`,
      kind: "customer",
      legacyCode: code,
      legacySlug: "musteriler",
      normalizedCode: code,
      partyId,
      status: "ACTIVE",
      updatedBy: actorUserId,
    },
  });
  return legacy.id;
}

function activationCommand(
  fixtures: { actorUserId: string; primary: PartyParityScope },
  expectedParity: PartyCutoverEvidence,
): PartyCutoverTransitionCommand {
  return {
    actorUserId: fixtures.actorUserId,
    expectedParity,
    expectedRevisionNo: 0,
    operationId: `party-cutover-activate-${fixtures.primary.periodId}`,
    reasonCode: "SHADOW_VALIDATION",
    releaseId: "party-cutover-acceptance-release-1",
    scope: fixtures.primary,
    targetMode: "SHADOW_READ",
  };
}

function rollbackCommand(fixtures: { actorUserId: string; primary: PartyParityScope }) {
  return {
    actorUserId: fixtures.actorUserId,
    expectedRevisionNo: 1,
    operationId: `party-cutover-rollback-${fixtures.primary.periodId}`,
    reasonCode: "PARITY_DRIFT",
    releaseId: "party-cutover-acceptance-release-1",
    scope: fixtures.primary,
    targetMode: "LEGACY_ONLY" as const,
  };
}

async function readParityModel(prisma: PrismaClient, scope: PartyParityScope) {
  return readPartyParityReadModel({
    repository: createPartyParityPrismaRepository(prisma),
    scope,
  });
}

async function readParityEvidence(prisma: PrismaClient, scope: PartyParityScope) {
  const model = await readParityModel(prisma, scope);
  if (!model.ready) throw new Error("Acceptance Party parity başlangıçta hazır değil.");
  return {
    issueChecksum: model.issueChecksum,
    legacyChecksum: model.legacyChecksum,
    legacyCount: model.legacyCount,
    matchedCount: model.matchedCount,
    parityChecksum: model.parityChecksum,
    partyChecksum: model.partyChecksum,
    partyCount: model.partyCount,
    roleCount: model.roleCount,
  };
}

async function readScopeCounts(
  prisma: PrismaClient,
  scope: PartyParityScope,
): Promise<ScopeCounts> {
  const rows = await prisma.$queryRaw<Array<{
    audit_count: bigint;
    event_count: bigint;
    mode: string | null;
    revision_no: number | null;
    state_count: bigint;
  }>>`
    SELECT
      (SELECT COUNT(*) FROM "PartyCutoverState"
        WHERE "tenantId" = ${scope.tenantId}
          AND "companyId" = ${scope.companyId}
          AND "periodId" = ${scope.periodId})::bigint AS state_count,
      (SELECT MAX("mode") FROM "PartyCutoverState"
        WHERE "tenantId" = ${scope.tenantId}
          AND "companyId" = ${scope.companyId}
          AND "periodId" = ${scope.periodId}) AS mode,
      (SELECT MAX("revisionNo") FROM "PartyCutoverState"
        WHERE "tenantId" = ${scope.tenantId}
          AND "companyId" = ${scope.companyId}
          AND "periodId" = ${scope.periodId}) AS revision_no,
      (SELECT COUNT(*) FROM "PartyCutoverEvent"
        WHERE "tenantId" = ${scope.tenantId}
          AND "companyId" = ${scope.companyId}
          AND "periodId" = ${scope.periodId})::bigint AS event_count,
      (SELECT COUNT(*) FROM "AuditLog"
        WHERE "tenantId" = ${scope.tenantId}
          AND "companyId" = ${scope.companyId}
          AND "periodId" = ${scope.periodId}
          AND "entityType" = 'party-cutover-state')::bigint AS audit_count
  `;
  const row = rows[0];
  return {
    auditCount: Number(row?.audit_count ?? 0),
    eventCount: Number(row?.event_count ?? 0),
    mode: row?.mode ?? "NONE",
    revisionNo: row?.revision_no ?? 0,
    stateCount: Number(row?.state_count ?? 0),
  };
}

function createAuditFailureClient(prisma: PrismaClient) {
  return {
    $transaction: <T>(
      callback: (transaction: unknown) => Promise<T>,
      options: { isolationLevel: "Serializable" },
    ) => prisma.$transaction(async (transaction) => {
      const faultingTransaction = new Proxy(transaction, {
        get(target, property, receiver) {
          if (property !== "auditLog") return Reflect.get(target, property, receiver);
          return new Proxy(transaction.auditLog, {
            get(auditTarget, auditProperty, auditReceiver) {
              if (auditProperty === "create") {
                return async () => { throw new Error("Synthetic audit write failure."); };
              }
              return Reflect.get(auditTarget, auditProperty, auditReceiver);
            },
          });
        },
      });
      return callback(faultingTransaction);
    }, options),
  };
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
        `Prisma migrate deploy exit code ${code ?? "unknown"}: ${safeDiagnostic(diagnostic)}`,
      ));
    });
  });
}

async function readMigrationCount(prisma: PrismaClient) {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
  `;
  return Number(rows[0]?.count ?? 0);
}

async function readMissingTables(prisma: PrismaClient) {
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
  `;
  const existing = new Set(rows.map((row) => row.table_name));
  return PARTY_CUTOVER_ACCEPTANCE_TABLES.filter((table) => !existing.has(table));
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
    throw new Error("Party cutover geçici veritabanı zaten var.");
  }
}

async function databaseExists(client: Client, name: string) {
  const result = await client.query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
    [assertPartyCutoverAcceptanceDatabaseName(name)],
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
