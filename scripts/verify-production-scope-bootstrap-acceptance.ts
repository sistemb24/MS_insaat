import "dotenv/config";

import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";

import {
  asProductionScopeBootstrapPrismaClient,
  createProductionScopeBootstrapPrismaRepository,
  type ProductionScopeBootstrapPrismaClientLike,
} from "../src/lib/production-scope-bootstrap-prisma-repository";
import {
  createProductionScopeBootstrapAcceptanceDatabaseName,
  createProductionScopeBootstrapAcceptanceDatabaseUrl,
  evaluateProductionScopeBootstrapAcceptance,
  readProductionScopeBootstrapAcceptanceConfig,
  type ProductionScopeBootstrapAcceptanceEvidence,
} from "../src/lib/production-scope-bootstrap-acceptance";
import {
  ProductionScopeBootstrapError,
  readProductionScopeBootstrapConfig,
  runProductionScopeBootstrap,
  type ProductionScopeBootstrapCommand,
} from "../src/lib/production-scope-bootstrap";

type Inventory = { migrationCount: number; publicTableCount: number };

async function main() {
  const config = readProductionScopeBootstrapAcceptanceConfig(process.env);
  const databaseName = createProductionScopeBootstrapAcceptanceDatabaseName(new Date());
  const temporaryDatabaseUrl = createProductionScopeBootstrapAcceptanceDatabaseUrl(
    config.sourceDatabaseUrl,
    databaseName,
  );
  const admin = new Client({ connectionString: config.adminDatabaseUrl });
  let databaseCreated = false;
  let temporaryDatabaseRemoved = false;
  let sourceInventoryBefore: Inventory | null = null;
  let evidence: Omit<ProductionScopeBootstrapAcceptanceEvidence,
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
      `Production scope bootstrap izole kabulü başarısız; aşama: ${executionStage}; `
        + `neden: ${safeDiagnostic(executionError)}; geçici hedef: ${databaseName}.`,
      { cause: executionError },
    );
  }
  if (!evidence) throw new Error("Production scope bootstrap kabul kanıtı üretilemedi.");

  const result = evaluateProductionScopeBootstrapAcceptance({
    ...evidence,
    sourceInventoryUnchanged,
    temporaryDatabaseRemoved,
  });
  console.log(JSON.stringify({ databaseName, ...result }, null, 2));
  if (!result.ready) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Scope bootstrap kabulü başarısız.");
  process.exitCode = 1;
});

async function runAcceptanceScenarios(databaseUrl: string) {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const migrationCount = await readMigrationCount(prisma);
    const clean = acceptanceCommand("clean");
    await createTenant(prisma, clean.manifest.tenantId);
    const repository = createProductionScopeBootstrapPrismaRepository(
      asProductionScopeBootstrapPrismaClient(prisma),
      () => new Date("2026-08-14T08:30:00.000Z"),
    );
    const created = await runProductionScopeBootstrap({ command: clean, repository });
    const retry = await runProductionScopeBootstrap({ command: clean, repository });
    const cleanCounts = await readScopeCounts(prisma, clean);

    const partial = acceptanceCommand("partial");
    await createTenant(prisma, partial.manifest.tenantId);
    await prisma.company.create({
      data: {
        id: partial.manifest.company.companyId,
        name: partial.manifest.company.name,
        tenantId: partial.manifest.tenantId,
      },
    });
    const partialRejected = await rejectsWithReason(
      () => runProductionScopeBootstrap({ command: partial, repository }),
      "PARTIAL_SCOPE_STATE",
    );

    const conflict = acceptanceCommand("conflict");
    await createTenant(prisma, conflict.manifest.tenantId);
    await runProductionScopeBootstrap({ command: conflict, repository });
    await prisma.company.update({
      data: { name: "Drifted Company" },
      where: { id: conflict.manifest.company.companyId },
    });
    const conflictRejected = await rejectsWithReason(
      () => runProductionScopeBootstrap({ command: conflict, repository }),
      "SCOPE_CONFLICT",
    );

    const rollback = acceptanceCommand("rollback");
    await createTenant(prisma, rollback.manifest.tenantId);
    const failingRepository = createProductionScopeBootstrapPrismaRepository(
      createAuditFailureClient(prisma),
      () => new Date("2026-08-14T08:31:00.000Z"),
    );
    const rollbackRejected = await rejectsWithReason(
      () => runProductionScopeBootstrap({ command: rollback, repository: failingRepository }),
      "AUDIT_WRITE_FAILED",
    );
    if (!rollbackRejected) throw new Error("Zorlanmış audit hatası reddedilmedi.");
    const rollbackCounts = await readScopeCounts(prisma, rollback);

    return {
      auditCountAfterRetry: cleanCounts.audit,
      companyCountAfterRetry: cleanCounts.company,
      conflictRejected,
      createStatus: created.status,
      migrationCount,
      partialRejected,
      periodCountAfterRetry: cleanCounts.period,
      retryStatus: retry.status,
      rollbackAccessCount: rollbackCounts.access,
      rollbackAuditCount: rollbackCounts.audit,
      rollbackCompanyCount: rollbackCounts.company,
      rollbackPeriodCount: rollbackCounts.period,
      rollbackUserCount: rollbackCounts.user,
      scopeAccessCountAfterRetry: cleanCounts.access,
      userCountAfterRetry: cleanCounts.user,
    };
  } finally {
    await prisma.$disconnect();
  }
}

function acceptanceCommand(suffix: string): ProductionScopeBootstrapCommand {
  const fakeRemoteUrl = "postgresql://bootstrap:secret@db.example.com/noa";
  const sha = "665135fa518fe17b7dbea38a2cb122ed947e0564";
  return readProductionScopeBootstrapConfig({
    DATABASE_URL: fakeRemoteUrl,
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_SHA: sha,
    NOA_EXPECTED_RELEASE_SHA: sha,
    NOA_PRODUCTION_SCOPE_ADMIN_NAME: `Acceptance Admin ${suffix}`,
    NOA_PRODUCTION_SCOPE_ADMIN_USER_ID: `user-scope-${suffix}`,
    NOA_PRODUCTION_SCOPE_BOOTSTRAP_CONFIRMATION: "production-scope-bootstrap",
    NOA_PRODUCTION_SCOPE_COMPANY_ID: `company-scope-${suffix}`,
    NOA_PRODUCTION_SCOPE_COMPANY_NAME: `Acceptance Company ${suffix}`,
    NOA_PRODUCTION_SCOPE_PERIOD_ENDS_ON: "2026-12-31",
    NOA_PRODUCTION_SCOPE_PERIOD_ID: `period-scope-${suffix}`,
    NOA_PRODUCTION_SCOPE_PERIOD_LABEL: `2026 ${suffix}`,
    NOA_PRODUCTION_SCOPE_PERIOD_STARTS_ON: "2026-01-01",
    NOA_PRODUCTION_SCOPE_TENANT_ID: `tenant-scope-${suffix}`,
    NOA_RELEASE_ID: sha,
    NOA_RUNTIME_ENV: "production",
    NOA_SOURCE_REF: "refs/heads/main",
  });
}

async function createTenant(prisma: PrismaClient, tenantId: string) {
  await prisma.tenant.create({ data: { id: tenantId, name: tenantId } });
}

async function rejectsWithReason(
  operation: () => Promise<unknown>,
  reasonCode: ProductionScopeBootstrapError["reasonCode"],
) {
  try {
    await operation();
    return false;
  } catch (error) {
    return error instanceof ProductionScopeBootstrapError
      && error.reasonCode === reasonCode;
  }
}

function createAuditFailureClient(prisma: PrismaClient) {
  return {
    $transaction: <T>(
      callback: (transaction: unknown) => Promise<T>,
      options: { isolationLevel: "Serializable"; maxWait: number; timeout: number },
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
  } as unknown as ProductionScopeBootstrapPrismaClientLike;
}

async function readScopeCounts(prisma: PrismaClient, command: ProductionScopeBootstrapCommand) {
  const scope = command.manifest;
  const [company, period, user, access, audit] = await Promise.all([
    prisma.company.count({ where: { id: scope.company.companyId, tenantId: scope.tenantId } }),
    prisma.period.count({ where: { id: scope.period.periodId, tenantId: scope.tenantId } }),
    prisma.appUser.count({ where: { id: scope.admin.userId, tenantId: scope.tenantId } }),
    prisma.appUserScopeAccess.count({
      where: {
        companyId: scope.company.companyId,
        periodId: scope.period.periodId,
        tenantId: scope.tenantId,
        userId: scope.admin.userId,
      },
    }),
    prisma.auditLog.count({
      where: {
        action: "production-scope.bootstrap",
        companyId: scope.company.companyId,
        periodId: scope.period.periodId,
        tenantId: scope.tenantId,
      },
    }),
  ]);
  return { access, audit, company, period, user };
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
      else reject(new Error(`Prisma migrate deploy exit ${code}: ${safeDiagnostic(diagnostic)}`));
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

async function readInventory(connectionString: string): Promise<Inventory> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const tables = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const exists = await client.query<{ exists: boolean }>(`
      SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS exists
    `);
    let migrationCount = 0;
    if (exists.rows[0]?.exists) {
      const migrations = await client.query<{ count: string }>(`
        SELECT COUNT(*)::text AS count FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      `);
      migrationCount = Number(migrations.rows[0]?.count ?? 0);
    }
    return {
      migrationCount,
      publicTableCount: Number(tables.rows[0]?.count ?? 0),
    };
  } finally {
    await client.end();
  }
}

async function assertDatabaseAbsent(client: Client, name: string) {
  if (await databaseExists(client, name)) {
    throw new Error(`Geçici kabul veritabanı zaten mevcut: ${name}.`);
  }
}

async function databaseExists(client: Client, name: string) {
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
