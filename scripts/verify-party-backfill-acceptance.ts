import "dotenv/config";

import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";

import {
  PARTY_BACKFILL_ACCEPTANCE_MIGRATION_COUNT,
  PARTY_BACKFILL_ACCEPTANCE_TABLES,
  assertPartyBackfillAcceptanceDatabaseName,
  createPartyBackfillAcceptanceDatabaseName,
  createPartyBackfillAcceptanceDatabaseUrl,
  evaluatePartyBackfillAcceptance,
  readPartyBackfillAcceptanceConfig,
  type PartyBackfillAcceptanceEvidence,
} from "../src/lib/party-backfill-acceptance";
import { createPartyBackfillApplyPrismaRepository } from
  "../src/lib/party-backfill-apply-prisma-repository";
import {
  PARTY_BACKFILL_APPLY_CONFIRMATION,
  createPartyBackfillApplyService,
} from "../src/lib/party-backfill-apply-service";
import {
  runProductionPartyZeroApply,
  type ProductionPartyZeroApplyConfig,
} from "../src/lib/production-party-transition";

type Scope = { companyId: string; periodId: string; tenantId: string };
type Inventory = { migrationCount: number; publicTableCount: number };

async function main() {
  const config = readPartyBackfillAcceptanceConfig(process.env);
  const databaseName = assertPartyBackfillAcceptanceDatabaseName(
    createPartyBackfillAcceptanceDatabaseName(new Date()),
  );
  const temporaryDatabaseUrl = createPartyBackfillAcceptanceDatabaseUrl(
    config.sourceDatabaseUrl,
    databaseName,
  );
  const admin = new Client({ connectionString: config.adminDatabaseUrl });
  let databaseCreated = false;
  let temporaryDatabaseRemoved = false;
  let sourceInventoryBefore: Inventory | null = null;
  let evidence: Omit<PartyBackfillAcceptanceEvidence,
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
        assertPartyBackfillAcceptanceDatabaseName(databaseName);
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
      `Party backfill izole kabulü başarısız oldu; aşama: ${executionStage}; `
        + `neden: ${safeDiagnostic(executionError)}; geçici hedef: ${databaseName}.`,
      { cause: executionError },
    );
  }
  if (!evidence) {
    throw new Error("Party backfill izole kabul kanıtı üretilemedi.");
  }

  const result = evaluatePartyBackfillAcceptance({
    ...evidence,
    sourceInventoryUnchanged,
    temporaryDatabaseRemoved,
  });
  console.log(JSON.stringify({ databaseName, ...result }, null, 2));
  if (!result.ready) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Party backfill kabulü başarısız.");
  process.exitCode = 1;
});

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

async function runAcceptanceScenarios(databaseUrl: string) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
  try {
    const [migrationCount, missingTables] = await Promise.all([
      readMigrationCount(prisma),
      readMissingTables(prisma),
    ]);
    if (migrationCount !== PARTY_BACKFILL_ACCEPTANCE_MIGRATION_COUNT) {
      throw new Error(`Beklenen migration sayısı ${PARTY_BACKFILL_ACCEPTANCE_MIGRATION_COUNT}.`);
    }
    if (missingTables.length > 0) {
      throw new Error(`Eksik Party tabloları: ${missingTables.join(", ")}.`);
    }

    const fixtures = await createFixtures(prisma);
    let repositoryFailure: unknown;
    const repository = createPartyBackfillApplyPrismaRepository(prisma as never);
    const diagnosticRepository = {
      applyAtomically: async (command: Parameters<typeof repository.applyAtomically>[0]) => {
        try {
          return await repository.applyAtomically(command);
        } catch (error) {
          repositoryFailure = error;
          throw error;
        }
      },
      previewConsistently: repository.previewConsistently,
    };
    const service = createPartyBackfillApplyService({
      repository: diagnosticRepository,
      runtimeEnvironment: "test",
    });
    const financialBefore = await readFinancialCounts(prisma);

    const cleanPreview = await service.preview({ scope: fixtures.clean });
    const cleanInput = applyInput(fixtures.actorUserId, fixtures.clean, cleanPreview);
    const cleanResult = await service.apply(cleanInput);
    assertSuccessful(cleanResult, "clean", "VERIFIED", repositoryFailure);
    const cleanRetry = await service.apply(cleanInput);
    assertSuccessful(cleanRetry, "clean-retry", "VERIFIED", repositoryFailure);
    if (!cleanRetry.data.reused) throw new Error("Temiz retry mevcut run kaydını kullanmadı.");

    const zeroPreview = await repository.previewConsistently({
      scope: fixtures.zero,
      version: "party-v1",
    });
    const zeroConfig: ProductionPartyZeroApplyConfig = {
      actorUserId: fixtures.actorUserId,
      databaseUrl,
      expectedPostMigrationManifestChecksum: "a".repeat(64),
      expectedRunId: zeroPreview.run.id,
      expectedSourceChecksum: zeroPreview.run.sourceChecksum,
      releaseId: "a".repeat(40),
      scope: fixtures.zero,
    };
    const zeroApply = await runProductionPartyZeroApply({
      config: zeroConfig,
      repository,
    });
    if (zeroApply.status !== "VERIFIED") {
      throw new Error("Production zero-candidate ilk apply VERIFIED olmadı.");
    }
    const zeroRetry = await runProductionPartyZeroApply({
      config: zeroConfig,
      repository,
    });
    if (zeroRetry.status !== "UNCHANGED") {
      throw new Error("Production zero-candidate retry UNCHANGED olmadı.");
    }

    const blockedPreview = await service.preview({ scope: fixtures.blocked });
    const blockedResult = await service.apply(
      applyInput(fixtures.actorUserId, fixtures.blocked, blockedPreview),
    );
    assertSuccessful(blockedResult, "blocked", "BLOCKED", repositoryFailure);

    const closedPreview = await service.preview({ scope: fixtures.closed });
    const closedResult = await service.apply(
      applyInput(fixtures.actorUserId, fixtures.closed, closedPreview),
    );
    assertSuccessful(closedResult, "closed", "VERIFIED", repositoryFailure);

    const driftPreview = await service.preview({ scope: fixtures.drift });
    await prisma.entityRecord.update({
      data: { data: { name: "Preview Sonrası Değişti", status: "Aktif" } },
      where: { id: fixtures.driftRecordId },
    });
    const driftResult = await service.apply(
      applyInput(fixtures.actorUserId, fixtures.drift, driftPreview),
    );
    const driftRejected = !driftResult.ok
      && driftResult.errors.some((message) => message.includes("preview sonrasında değişti"));

    const rollbackPreview = await service.preview({ scope: fixtures.rollback });
    const rollbackService = createPartyBackfillApplyService({
      repository: createPartyBackfillApplyPrismaRepository(
        createAuditFailureClient(prisma) as never,
      ),
      runtimeEnvironment: "test",
    });
    const rollbackResult = await rollbackService.apply(
      applyInput(fixtures.actorUserId, fixtures.rollback, rollbackPreview),
    );
    if (rollbackResult.ok) throw new Error("Zorlanan audit hatası fail-closed olmadı.");

    const financialAfter = await readFinancialCounts(prisma);
    if (JSON.stringify(financialBefore) !== JSON.stringify(financialAfter)) {
      throw new Error("Party backfill finansal tablolara beklenmeyen yazım yaptı.");
    }

    const [cleanCounts, blockedCounts, foreignCounts, rollbackCounts, zeroCounts] = await Promise.all([
      readBackfillCounts(prisma, fixtures.clean),
      readBackfillCounts(prisma, fixtures.blocked),
      readBackfillCounts(prisma, fixtures.foreign),
      readBackfillCounts(prisma, fixtures.rollback),
      readBackfillCounts(prisma, fixtures.zero),
    ]);

    return {
      blockedPartyCount: blockedCounts.partyCount,
      blockedRoleCount: blockedCounts.roleCount,
      blockedRunStatus: blockedResult.data.status,
      cleanAuditCountAfterRetry: cleanCounts.auditCount,
      cleanPartyCountAfterRetry: cleanCounts.partyCount,
      cleanRoleCountAfterRetry: cleanCounts.roleCount,
      cleanRunStatus: cleanRetry.data.status,
      closedRunStatus: closedResult.data.status,
      driftRejected,
      foreignPartyCount: foreignCounts.partyCount,
      migrationCount,
      missingTables,
      rollbackAuditCount: rollbackCounts.auditCount,
      rollbackIssueCount: rollbackCounts.issueCount,
      rollbackPartyCount: rollbackCounts.partyCount,
      rollbackRoleCount: rollbackCounts.roleCount,
      rollbackRunCount: rollbackCounts.runCount,
      zeroApplyAuditCountAfterRetry: zeroCounts.auditCount,
      zeroApplyIssueCountAfterRetry: zeroCounts.issueCount,
      zeroApplyPartyCountAfterRetry: zeroCounts.partyCount,
      zeroApplyRoleCountAfterRetry: zeroCounts.roleCount,
      zeroApplyRunCountAfterRetry: zeroCounts.runCount,
      zeroApplyRunStatus: zeroRetry.status,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function createFixtures(prisma: PrismaClient) {
  const actorUserId = "party-acceptance-admin";
  const tenantId = "party-acceptance-tenant";
  await prisma.tenant.create({ data: { id: tenantId, name: "Party Acceptance Tenant" } });
  await prisma.appUser.create({
    data: { id: actorUserId, name: "Party Acceptance Admin", tenantId },
  });

  const clean = await createScope(prisma, { actorUserId, key: "clean", tenantId });
  const blocked = await createScope(prisma, { actorUserId, key: "blocked", tenantId });
  const closed = await createScope(prisma, {
    actorUserId,
    isClosed: true,
    key: "closed",
    tenantId,
  });
  const drift = await createScope(prisma, { actorUserId, key: "drift", tenantId });
  const rollback = await createScope(prisma, { actorUserId, key: "rollback", tenantId });
  const zero = await createScope(prisma, { actorUserId, key: "zero", tenantId });

  await prisma.entityRecord.createMany({
    data: [
      record(clean, actorUserId, "musteriler", "MUS-001", "Ortak Vergili Müşteri", "1234567890"),
      record(clean, actorUserId, "tedarikciler", "TED-001", "Ortak Vergili Tedarikçi", "1234567890"),
      record(clean, actorUserId, "taseronlar", "TAS-001", "Kabul Taşeronu"),
      record(blocked, actorUserId, "musteriler", "MUS-001", "Çakışan Bir"),
      record(blocked, actorUserId, "musteriler", " mus-001 ", "Çakışan İki"),
      record(closed, actorUserId, "musteriler", "MUS-CLS", "Kapalı Dönem Müşterisi"),
      record(drift, actorUserId, "tedarikciler", "TED-DRF", "Drift Tedarikçisi"),
      record(rollback, actorUserId, "taseronlar", "TAS-RBK", "Rollback Taşeronu"),
    ],
  });
  const driftRecord = await prisma.entityRecord.findFirstOrThrow({
    select: { id: true },
    where: { ...drift, code: "TED-DRF", slug: "tedarikciler" },
  });

  const foreignTenantId = "party-acceptance-foreign-tenant";
  const foreignActor = "party-acceptance-foreign-admin";
  await prisma.tenant.create({ data: { id: foreignTenantId, name: "Foreign Tenant" } });
  await prisma.appUser.create({
    data: { id: foreignActor, name: "Foreign Admin", tenantId: foreignTenantId },
  });
  const foreign = await createScope(prisma, {
    actorUserId: foreignActor,
    key: "foreign",
    tenantId: foreignTenantId,
  });
  await prisma.entityRecord.create({
    data: record(foreign, foreignActor, "musteriler", "MUS-FRG", "Yabancı Tenant"),
  });

  return {
    actorUserId,
    blocked,
    clean,
    closed,
    drift,
    driftRecordId: driftRecord.id,
    foreign,
    rollback,
    zero,
  };
}

async function createScope(
  prisma: PrismaClient,
  input: { actorUserId: string; isClosed?: boolean; key: string; tenantId: string },
): Promise<Scope> {
  const scope = {
    companyId: `party-acceptance-company-${input.key}`,
    periodId: `party-acceptance-period-${input.key}`,
    tenantId: input.tenantId,
  };
  await prisma.company.create({
    data: { id: scope.companyId, name: `Acceptance ${input.key}`, tenantId: scope.tenantId },
  });
  await prisma.period.create({
    data: {
      companyId: scope.companyId,
      id: scope.periodId,
      isClosed: input.isClosed ?? false,
      label: `Acceptance ${input.key}`,
      tenantId: scope.tenantId,
    },
  });
  await prisma.appUserScopeAccess.create({
    data: {
      companyId: scope.companyId,
      id: `party-acceptance-access-${input.key}`,
      isActive: true,
      licenseLabel: "Acceptance",
      periodId: scope.periodId,
      role: "admin",
      tenantId: scope.tenantId,
      userId: input.actorUserId,
    },
  });
  return scope;
}

function record(
  scope: Scope,
  actorUserId: string,
  slug: string,
  code: string,
  name: string,
  taxNumber?: string,
) {
  return {
    ...scope,
    code,
    createdBy: actorUserId,
    data: { name, status: "Aktif", ...(taxNumber ? { taxNumber } : {}) },
    slug,
    updatedBy: actorUserId,
  };
}

function applyInput(
  actorUserId: string,
  scope: Scope,
  preview: { run: { sourceChecksum: string; sourceCount: number; version: string } },
) {
  return {
    actorUserId,
    approvedSourceCountLimit: preview.run.sourceCount,
    confirmation: PARTY_BACKFILL_APPLY_CONFIRMATION,
    expectedSourceChecksum: preview.run.sourceChecksum,
    scope,
    version: preview.run.version,
  };
}

function assertSuccessful(
  result: Awaited<ReturnType<ReturnType<typeof createPartyBackfillApplyService>["apply"]>>,
  scenario: string,
  status: "BLOCKED" | "VERIFIED",
  repositoryFailure: unknown,
): asserts result is Extract<typeof result, { ok: true }> {
  if (!result.ok || result.data.status !== status) {
    throw new Error(
      `Party backfill ${scenario}/${status} senaryosu doğrulanamadı: `
        + safeDiagnostic(repositoryFailure ?? result.errors.join(" ")),
    );
  }
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
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `;
  const existing = new Set(rows.map((row) => row.table_name));
  return PARTY_BACKFILL_ACCEPTANCE_TABLES.filter((table) => !existing.has(table));
}

async function readBackfillCounts(prisma: PrismaClient, scope: Scope) {
  const rows = await prisma.$queryRaw<Array<{
    audit_count: bigint;
    issue_count: bigint;
    party_count: bigint;
    role_count: bigint;
    run_count: bigint;
  }>>`
    SELECT
      (SELECT COUNT(*) FROM "Party"
        WHERE "tenantId" = ${scope.tenantId}
          AND "companyId" = ${scope.companyId}
          AND "periodId" = ${scope.periodId})::bigint AS party_count,
      (SELECT COUNT(*) FROM "PartyRole"
        WHERE "tenantId" = ${scope.tenantId}
          AND "companyId" = ${scope.companyId}
          AND "periodId" = ${scope.periodId})::bigint AS role_count,
      (SELECT COUNT(*) FROM "PartyBackfillRun"
        WHERE "tenantId" = ${scope.tenantId}
          AND "companyId" = ${scope.companyId}
          AND "periodId" = ${scope.periodId})::bigint AS run_count,
      (SELECT COUNT(*) FROM "PartyBackfillIssue"
        WHERE "tenantId" = ${scope.tenantId}
          AND "companyId" = ${scope.companyId}
          AND "periodId" = ${scope.periodId})::bigint AS issue_count,
      (SELECT COUNT(*) FROM "AuditLog"
        WHERE "tenantId" = ${scope.tenantId}
          AND "companyId" = ${scope.companyId}
          AND "periodId" = ${scope.periodId}
          AND "entityType" = 'party-backfill-run')::bigint AS audit_count
  `;
  const row = rows[0];
  return {
    auditCount: Number(row?.audit_count ?? 0),
    issueCount: Number(row?.issue_count ?? 0),
    partyCount: Number(row?.party_count ?? 0),
    roleCount: Number(row?.role_count ?? 0),
    runCount: Number(row?.run_count ?? 0),
  };
}

async function readFinancialCounts(prisma: PrismaClient) {
  const [purchaseInvoices, salesInvoices, progressPayments, ledgerEntries, cashBankMovements] =
    await Promise.all([
      prisma.purchaseInvoice.count(),
      prisma.salesInvoice.count(),
      prisma.progressPayment.count(),
      prisma.ledgerEntry.count(),
      prisma.cashBankMovement.count(),
    ]);
  return { cashBankMovements, ledgerEntries, progressPayments, purchaseInvoices, salesInvoices };
}

async function readInventory(connectionString: string): Promise<Inventory> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const tableResult = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const migrationTable = await client.query<{ exists: boolean }>(`
      SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS exists
    `);
    let migrationCount = 0;
    if (migrationTable.rows[0]?.exists) {
      const migrationResult = await client.query<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      `);
      migrationCount = Number(migrationResult.rows[0]?.count ?? 0);
    }
    return {
      migrationCount,
      publicTableCount: Number(tableResult.rows[0]?.count ?? 0),
    };
  } finally {
    await client.end();
  }
}

async function assertDatabaseAbsent(client: Client, name: string) {
  assertPartyBackfillAcceptanceDatabaseName(name);
  if (await databaseExists(client, name)) {
    throw new Error(`Geçici kabul veritabanı zaten mevcut: ${name}.`);
  }
}

async function databaseExists(client: Client, name: string) {
  assertPartyBackfillAcceptanceDatabaseName(name);
  const result = await client.query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
    [name],
  );
  return Boolean(result.rows[0]?.exists);
}

function inventoriesEqual(left: Inventory, right: Inventory) {
  return left.migrationCount === right.migrationCount
    && left.publicTableCount === right.publicTableCount;
}

function safeDiagnostic(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[database-url-redacted]")
    .replace(/password\s*[=:]\s*\S+/gi, "password=[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1_000) || "unknown";
}
