import "dotenv/config";

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Client } from "pg";

import { createEntityPrismaRepository } from
  "../src/lib/entity-prisma-repository";
import { getEntityDefinition, type EntityRow } from "../src/lib/entities";
import { createGlobalSearchPrismaRepository } from
  "../src/lib/global-search-prisma-repository";
import {
  PARTY_SHADOW_READ_ACCEPTANCE_MIGRATION_COUNT,
  PARTY_SHADOW_READ_ACCEPTANCE_TABLES,
  assertPartyShadowReadAcceptanceDatabaseName,
  createPartyShadowReadAcceptanceDatabaseName,
  createPartyShadowReadAcceptanceDatabaseUrl,
  evaluatePartyShadowReadAcceptance,
  readPartyShadowReadAcceptanceConfig,
  type PartyShadowReadAcceptanceEvidence,
} from "../src/lib/party-shadow-read-acceptance";
import {
  createPartyShadowReadPrismaObserver,
  type PartyShadowReadPrismaClientLike,
} from "../src/lib/party-shadow-read-prisma-observer";
import type { PartySlug } from "../src/lib/party-read-model";
import type { StructuredLogFields, StructuredLogLevel } from
  "../src/lib/structured-logger";
import { listSubscriptionOverview } from "../src/lib/subscription-service";
import type { TenantScope } from "../src/lib/tenant-scope";

type Inventory = { migrationCount: number; publicTableCount: number };
type CapturedLog = {
  event: string;
  fields: StructuredLogFields;
  level: StructuredLogLevel;
};
type Fixture = {
  code: string;
  email: string;
  kind: "customer" | "subcontractor" | "supplier";
  name: string;
  phone: string;
  slug: PartySlug;
  taxNumber: string;
};

const releaseId = "a".repeat(40);
const fixtures: readonly Fixture[] = [
  {
    slug: "musteriler",
    kind: "customer",
    code: "MUS-C2-001",
    name: "C2 Runtime Customer",
    taxNumber: "1000000001",
    phone: "05000000001",
    email: "customer.c2@example.invalid",
  },
  {
    slug: "tedarikciler",
    kind: "supplier",
    code: "TED-C2-001",
    name: "C2 Runtime Supplier",
    taxNumber: "1000000002",
    phone: "05000000002",
    email: "supplier.c2@example.invalid",
  },
  {
    slug: "taseronlar",
    kind: "subcontractor",
    code: "TAS-C2-001",
    name: "C2 Runtime Subcontractor",
    taxNumber: "1000000003",
    phone: "05000000003",
    email: "subcontractor.c2@example.invalid",
  },
] as const;

async function main() {
  const config = readPartyShadowReadAcceptanceConfig(process.env);
  const databaseName = assertPartyShadowReadAcceptanceDatabaseName(
    createPartyShadowReadAcceptanceDatabaseName(new Date()),
  );
  const databaseUrl = createPartyShadowReadAcceptanceDatabaseUrl(
    config.sourceDatabaseUrl,
    databaseName,
  );
  const admin = new Client({ connectionString: config.adminDatabaseUrl });
  let databaseCreated = false;
  let temporaryDatabaseRemoved = false;
  let sourceInventoryBefore: Inventory | null = null;
  let evidence: Omit<PartyShadowReadAcceptanceEvidence,
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
    executionStage = "runtime-acceptance-scenarios";
    evidence = await runAcceptanceScenarios(databaseUrl, databaseName);
  } catch (error) {
    executionError = error;
  } finally {
    try {
      if (databaseCreated) {
        assertPartyShadowReadAcceptanceDatabaseName(databaseName);
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
      `Party shadow-read izole kabulü başarısız; aşama: ${executionStage}; `
        + `neden: ${safeDiagnostic(executionError)}; geçici hedef: ${databaseName}.`,
      { cause: executionError },
    );
  }
  if (!evidence) throw new Error("Party shadow-read izole kabul kanıtı yok.");

  const result = evaluatePartyShadowReadAcceptance({
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
    : "Party shadow-read izole kabulü başarısız.");
  process.exitCode = 1;
});

async function runAcceptanceScenarios(databaseUrl: string, databaseName: string) {
  const prisma = createPrisma(databaseUrl);
  const missingDatabaseUrl = createMissingDatabaseUrl(databaseUrl, databaseName);
  const unavailablePrisma = createPrisma(missingDatabaseUrl);
  const logs: CapturedLog[] = [];
  const log = (
    level: StructuredLogLevel,
    event: string,
    fields: StructuredLogFields = {},
  ) => logs.push({ event, fields, level });

  try {
    const [migrationCount, missingTables] = await Promise.all([
      readMigrationCount(prisma),
      readMissingTables(prisma),
    ]);
    if (migrationCount !== PARTY_SHADOW_READ_ACCEPTANCE_MIGRATION_COUNT) {
      throw new Error(
        `Beklenen migration sayısı ${PARTY_SHADOW_READ_ACCEPTANCE_MIGRATION_COUNT}.`,
      );
    }
    if (missingTables.length > 0) {
      throw new Error(`Eksik Party shadow-read tabloları: ${missingTables.join(", ")}.`);
    }

    const { decoyScope, scope } = await createFixtures(prisma);
    const observer = createPartyShadowReadPrismaObserver(
      prisma as unknown as PartyShadowReadPrismaClientLike,
      { log, runtimeReleaseId: releaseId },
    );
    const repository = createEntityPrismaRepository(prisma, {
      partyShadowReadObserver: observer,
    });

    const customer = fixtureFor("musteriler");
    await setPartyName(prisma, scope, customer.slug, "Canonical Missing State Value");
    logs.length = 0;
    const missingStateRows = await readEntity(repository, scope, customer.slug);
    const missingStateAuthoritative = hasLegacyValue(missingStateRows, customer)
      && latestStatus(logs, "party.shadow_read.parity") === "LEGACY_ONLY";
    await setPartyName(prisma, scope, customer.slug, customer.name);

    await createCutoverState(prisma, scope, "LEGACY_ONLY", 2);
    const supplier = fixtureFor("tedarikciler");
    await setPartyName(prisma, scope, supplier.slug, "Canonical Legacy Only Value");
    logs.length = 0;
    const legacyOnlyRows = await readEntity(repository, scope, supplier.slug);
    const legacyOnlyAuthoritative = hasLegacyValue(legacyOnlyRows, supplier)
      && latestStatus(logs, "party.shadow_read.parity") === "LEGACY_ONLY";
    await setPartyName(prisma, scope, supplier.slug, supplier.name);

    await prisma.partyCutoverState.update({
      data: { mode: "SHADOW_READ", releaseId, revisionNo: 1 },
      where: { tenantId_companyId_periodId: parityScope(scope) },
    });
    logs.length = 0;
    const shadowResults = await Promise.all(fixtures.map(async (fixture) => ({
      fixture,
      rows: await readEntity(repository, scope, fixture.slug),
    })));
    const matchLogs = logsFor(logs, "party.shadow_read.parity", "SHADOW_MATCH");
    const shadowMatchSlugCount = new Set(matchLogs.map((entry) => entry.fields.slug)).size;

    const scopeIsolationConfirmed = matchLogs.length === 3
      && matchLogs.every((entry) =>
        entry.fields.legacyCount === 1
        && entry.fields.partyCount === 1
        && entry.fields.roleCount === 1
      )
      && shadowResults.every(({ fixture, rows }) => hasLegacyValue(rows, fixture))
      && await prisma.entityRecord.count({ where: parityScope(decoyScope) }) === 3;

    const mismatchObserver = createPartyShadowReadPrismaObserver(
      prisma as unknown as PartyShadowReadPrismaClientLike,
      { log, runtimeReleaseId: "b".repeat(40) },
    );
    const mismatchRepository = createEntityPrismaRepository(prisma, {
      partyShadowReadObserver: mismatchObserver,
    });
    logs.length = 0;
    const mismatchRows = await readEntity(
      mismatchRepository,
      scope,
      customer.slug,
    );
    const mismatchLog = latestLog(logs, "party.shadow_read.parity");
    const releaseMismatchFailSafe = hasLegacyValue(mismatchRows, customer)
      && mismatchLog?.fields.status === "RELEASE_MISMATCH"
      && mismatchLog.fields.legacyCount === undefined
      && mismatchLog.fields.partyCount === undefined;

    await setPartyName(prisma, scope, customer.slug, "Canonical Drift Value");
    logs.length = 0;
    const driftRows = await readEntity(repository, scope, customer.slug);
    const driftLog = latestLog(logs, "party.shadow_read.parity");
    const shadowDriftLegacyAuthoritative = hasLegacyValue(driftRows, customer)
      && driftLog?.fields.status === "SHADOW_DRIFT"
      && Array.isArray(driftLog.fields.issueCodes)
      && driftLog.fields.issueCodes.length > 0;

    logs.length = 0;
    const searchRepository = createGlobalSearchPrismaRepository(prisma, {
      partyShadowReadObserver: observer,
    });
    const searchResult = await searchRepository.search({
      query: "runtime customer",
      scope,
      subscriptionOverview: listSubscriptionOverview(),
      today: "2026-08-14",
    });
    const searchSlugs = logsFor(logs, "party.shadow_read.parity")
      .map((entry) => entry.fields.slug)
      .sort();
    const searchLogs = [...logs];
    const globalSearchLegacyAuthoritative = "results" in searchResult
      && searchResult.results.some((result) =>
        result.code === customer.code && result.title === customer.name
      )
      && JSON.stringify(searchSlugs) === JSON.stringify([
        "musteriler",
        "taseronlar",
        "tedarikciler",
      ]);

    const partyInventoryBefore = await readPartyInventory(prisma);
    logs.length = 0;
    await repository.replace({
      scope,
      definition: requireDefinition(customer.slug),
      rows: [entityRow(scope, { ...customer, name: "C2 Legacy Updated Customer" })],
    });
    const partyInventoryAfter = await readPartyInventory(prisma);
    const writeLog = latestLog(logs, "party.shadow_read.legacy_write");
    const partyInventoryUnchangedAfterLegacyWrite =
      partyInventoryBefore === partyInventoryAfter;
    const legacyWriteWarningRedacted =
      writeLog?.fields.status === "LEGACY_WRITE_WHILE_SHADOW"
      && isRedactedLogSet([writeLog], scope, decoyScope);

    logs.length = 0;
    const unavailableObserver = createPartyShadowReadPrismaObserver(
      unavailablePrisma as unknown as PartyShadowReadPrismaClientLike,
      { log, runtimeReleaseId: releaseId },
    );
    const failureContainedRepository = createEntityPrismaRepository(prisma, {
      partyShadowReadObserver: unavailableObserver,
    });
    const failureRows = await readEntity(
      failureContainedRepository,
      scope,
      supplier.slug,
    );
    const observerFailureContained = hasLegacyValue(failureRows, supplier)
      && latestStatus(logs, "party.shadow_read.parity") === "SHADOW_READ_ERROR";

    const redactedObservations = isRedactedLogSet([
      ...matchLogs,
      ...(mismatchLog ? [mismatchLog] : []),
      ...(driftLog ? [driftLog] : []),
      ...searchLogs,
      ...logs,
    ], scope, decoyScope);

    return {
      globalSearchLegacyAuthoritative,
      legacyOnlyAuthoritative,
      legacyWriteWarningRedacted,
      migrationCount,
      missingStateAuthoritative,
      missingTables,
      observerFailureContained,
      partyInventoryUnchangedAfterLegacyWrite,
      redactedObservations,
      releaseMismatchFailSafe,
      scopeIsolationConfirmed,
      shadowDriftLegacyAuthoritative,
      shadowMatchSlugCount,
    };
  } finally {
    await Promise.all([
      prisma.$disconnect().catch(() => undefined),
      unavailablePrisma.$disconnect().catch(() => undefined),
    ]);
  }
}

async function createFixtures(prisma: PrismaClient) {
  const scope = createScope("primary");
  const decoyScope = createScope("decoy");
  await createScopeRows(prisma, scope);
  await createScopeRows(prisma, decoyScope);

  for (const [index, fixture] of fixtures.entries()) {
    await createPartyFixture(prisma, scope, fixture, `primary-${index}`);
    await createPartyFixture(
      prisma,
      decoyScope,
      { ...fixture, name: `Decoy ${fixture.name}` },
      `decoy-${index}`,
    );
  }
  return { decoyScope, scope };
}

function createScope(suffix: string): TenantScope {
  return {
    tenantId: `party-shadow-read-${suffix}-tenant`,
    tenantName: `Party Shadow Read ${suffix}`,
    companyId: `party-shadow-read-${suffix}-company`,
    companyName: `Party Shadow Read ${suffix}`,
    periodId: `party-shadow-read-${suffix}-period`,
    periodLabel: "2026",
    userId: `party-shadow-read-${suffix}-admin`,
    userName: `Party Shadow Read ${suffix} Admin`,
    userRole: "admin",
    licenseLabel: "Acceptance",
  };
}

async function createScopeRows(prisma: PrismaClient, scope: TenantScope) {
  await prisma.tenant.create({ data: { id: scope.tenantId, name: scope.tenantName } });
  await prisma.company.create({
    data: { id: scope.companyId, name: scope.companyName, tenantId: scope.tenantId },
  });
  await prisma.period.create({
    data: {
      companyId: scope.companyId,
      id: scope.periodId,
      label: scope.periodLabel,
      tenantId: scope.tenantId,
    },
  });
  await prisma.appUser.create({
    data: { id: scope.userId, name: scope.userName, tenantId: scope.tenantId },
  });
}

async function createPartyFixture(
  prisma: PrismaClient,
  scope: TenantScope,
  fixture: Fixture,
  suffix: string,
) {
  const partyId = `party-shadow-read-party-${suffix}`;
  await prisma.entityRecord.create({
    data: {
      ...parityScope(scope),
      slug: fixture.slug,
      code: fixture.code,
      data: {
        email: fixture.email,
        name: fixture.name,
        phone: fixture.phone,
        status: "Aktif",
        taxNumber: fixture.taxNumber,
      },
      createdBy: scope.userId,
      updatedBy: scope.userId,
    },
  });
  await prisma.party.create({
    data: {
      ...parityScope(scope),
      id: partyId,
      displayName: fixture.name,
      normalizedName: normalizeName(fixture.name),
      taxNumber: fixture.taxNumber,
      normalizedTaxNumber: fixture.taxNumber,
      phone: fixture.phone,
      email: fixture.email,
      createdBy: scope.userId,
      updatedBy: scope.userId,
    },
  });
  await prisma.partyRole.create({
    data: {
      ...parityScope(scope),
      id: `party-shadow-read-role-${suffix}`,
      partyId,
      kind: fixture.kind,
      code: fixture.code,
      normalizedCode: fixture.code,
      legacySlug: fixture.slug,
      legacyCode: fixture.code,
      createdBy: scope.userId,
      updatedBy: scope.userId,
    },
  });
}

async function createCutoverState(
  prisma: PrismaClient,
  scope: TenantScope,
  mode: "LEGACY_ONLY" | "SHADOW_READ",
  revisionNo: number,
) {
  await prisma.partyCutoverState.create({
    data: {
      ...parityScope(scope),
      id: "party-shadow-read-cutover-state",
      mode,
      revisionNo,
      legacyChecksum: "0".repeat(64),
      partyChecksum: "0".repeat(64),
      issueChecksum: "0".repeat(64),
      parityChecksum: "0".repeat(64),
      legacyCount: fixtures.length,
      partyCount: fixtures.length,
      roleCount: fixtures.length,
      matchedCount: fixtures.length,
      lastVerifiedAt: new Date("2026-08-14T20:00:00.000Z"),
      releaseId,
      createdBy: scope.userId,
      updatedBy: scope.userId,
    },
  });
}

async function setPartyName(
  prisma: PrismaClient,
  scope: TenantScope,
  slug: PartySlug,
  name: string,
) {
  await prisma.party.updateMany({
    data: { displayName: name, normalizedName: normalizeName(name) },
    where: { ...parityScope(scope), roles: { some: { legacySlug: slug } } },
  });
}

async function readEntity(
  repository: ReturnType<typeof createEntityPrismaRepository>,
  scope: TenantScope,
  slug: PartySlug,
) {
  return repository.read({ scope, definition: requireDefinition(slug) });
}

function requireDefinition(slug: PartySlug) {
  const definition = getEntityDefinition(slug);
  if (!definition) throw new Error("Party entity tanımı bulunamadı.");
  return definition;
}

function entityRow(scope: TenantScope, fixture: Fixture): EntityRow {
  return {
    ...parityScope(scope),
    code: fixture.code,
    name: fixture.name,
    status: "Aktif",
    taxNumber: fixture.taxNumber,
    phone: fixture.phone,
    email: fixture.email,
    createdBy: scope.userId,
    updatedBy: scope.userId,
    createdAt: "2026-08-14T20:00:00.000Z",
    updatedAt: "2026-08-14T20:00:00.000Z",
  };
}

function hasLegacyValue(rows: EntityRow[], fixture: Fixture) {
  return rows.length === 1
    && rows[0]?.code === fixture.code
    && rows[0]?.name === fixture.name;
}

function fixtureFor(slug: PartySlug) {
  const fixture = fixtures.find((candidate) => candidate.slug === slug);
  if (!fixture) throw new Error("Party acceptance fixture bulunamadı.");
  return fixture;
}

function parityScope(scope: TenantScope) {
  return {
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
  };
}

function normalizeName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ")
    .toLocaleUpperCase("tr-TR");
}

function latestLog(logs: CapturedLog[], event: string) {
  return [...logs].reverse().find((entry) => entry.event === event);
}

function latestStatus(logs: CapturedLog[], event: string) {
  return latestLog(logs, event)?.fields.status;
}

function logsFor(logs: CapturedLog[], event: string, status?: string) {
  return logs.filter((entry) =>
    entry.event === event && (!status || entry.fields.status === status)
  );
}

function isRedactedLogSet(
  logs: CapturedLog[],
  scope: TenantScope,
  decoyScope: TenantScope,
) {
  const serialized = JSON.stringify(logs);
  const forbidden = [
    ...fixtures.flatMap((fixture) => [
      fixture.name,
      fixture.taxNumber,
      fixture.phone,
      fixture.email,
      `Decoy ${fixture.name}`,
    ]),
    "Canonical Missing State Value",
    "Canonical Legacy Only Value",
    "Canonical Drift Value",
    "C2 Legacy Updated Customer",
    scope.tenantId,
    scope.companyId,
    scope.periodId,
    decoyScope.tenantId,
    decoyScope.companyId,
    decoyScope.periodId,
    "postgresql://",
    "postgres://",
  ];
  return forbidden.every((value) => !serialized.includes(value));
}

async function readPartyInventory(prisma: PrismaClient) {
  const [parties, roles] = await Promise.all([
    prisma.party.findMany({ orderBy: { id: "asc" } }),
    prisma.partyRole.findMany({ orderBy: { id: "asc" } }),
  ]);
  return createHash("sha256")
    .update(JSON.stringify({ parties, roles }))
    .digest("hex");
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
  return PARTY_SHADOW_READ_ACCEPTANCE_TABLES.filter(
    (table) => !existing.has(table),
  );
}

function createPrisma(connectionString: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

function createMissingDatabaseUrl(databaseUrl: string, databaseName: string) {
  const url = new URL(databaseUrl);
  url.pathname = `/${databaseName}_missing`;
  return url.toString();
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
    throw new Error("Party shadow-read geçici veritabanı zaten var.");
  }
}

async function databaseExists(client: Client, name: string) {
  const result = await client.query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
    [assertPartyShadowReadAcceptanceDatabaseName(name)],
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
