import "dotenv/config";

import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";

import { createEntityPrismaRepository } from
  "../src/lib/entity-prisma-repository";
import { getEntityDefinition } from "../src/lib/entities";
import {
  createPartyShadowReadSafetyAlertWriter,
  type PartyShadowReadSafetyAlert,
} from "../src/lib/party-shadow-read-alert";
import {
  createPartyShadowReadPrismaObserver,
  type PartyShadowReadPrismaClientLike,
} from "../src/lib/party-shadow-read-prisma-observer";
import {
  PARTY_SHADOW_RUNTIME_READINESS_CONFIRMATION,
  PARTY_SHADOW_RUNTIME_SAFETY_STATUSES,
  buildPartyShadowRuntimeAttestation,
  partyShadowRuntimeOriginFingerprint,
} from "../src/lib/party-shadow-runtime-contract";
import {
  PRODUCTION_PARTY_SHADOW_RUNTIME_READINESS_ACCEPTANCE_MIGRATION_COUNT,
  PRODUCTION_PARTY_SHADOW_RUNTIME_READINESS_ACCEPTANCE_TABLES,
  assertProductionPartyShadowRuntimeReadinessAcceptanceDatabaseName,
  createProductionPartyShadowRuntimeReadinessAcceptanceDatabaseName,
  createProductionPartyShadowRuntimeReadinessAcceptanceDatabaseUrl,
  createReadOnlyPartyShadowRuntimeReadinessAcceptanceDatabaseUrl,
  evaluateProductionPartyShadowRuntimeReadinessAcceptance,
  readProductionPartyShadowRuntimeReadinessAcceptanceConfig,
  type ProductionPartyShadowRuntimeReadinessAcceptanceEvidence,
} from "../src/lib/production-party-shadow-runtime-readiness-acceptance";
import type { ProductionPartyCutoverPreflightResult } from
  "../src/lib/production-party-cutover-migration-gate";
import { createProductionPartyCutoverPreflightPrismaRepository } from
  "../src/lib/production-party-cutover-preflight-prisma-repository";
import {
  runProductionPartyCutoverPreflight,
  type ProductionPartyCutoverPreflightConfig,
} from "../src/lib/production-party-cutover-preflight";
import {
  decodeProductionPartyShadowRuntimeAttestation,
  evaluateProductionPartyShadowRuntimeAttestation,
  requestProductionPartyShadowRuntimeAttestation,
  runProductionPartyShadowRuntimeReadinessPreflight,
  type ProductionPartyShadowRuntimeReadinessConfig,
} from "../src/lib/production-party-shadow-runtime-readiness";

type Inventory = { migrationCount: number; publicTableCount: number };
type Scope = ProductionPartyCutoverPreflightConfig["scope"];
type CapturedAlert = { name: string; tags: Record<string, string> };

const releaseId = "a".repeat(40);
const productionOrigin = "https://party-shadow-runtime.acceptance.invalid";
const sentryProjectId = "4511859248791632";
const generatedAt = new Date("2026-08-15T12:00:00.000Z");

async function main() {
  const config = readProductionPartyShadowRuntimeReadinessAcceptanceConfig(
    process.env,
  );
  const databaseName =
    assertProductionPartyShadowRuntimeReadinessAcceptanceDatabaseName(
      createProductionPartyShadowRuntimeReadinessAcceptanceDatabaseName(new Date()),
    );
  const databaseUrl =
    createProductionPartyShadowRuntimeReadinessAcceptanceDatabaseUrl(
      config.sourceDatabaseUrl,
      databaseName,
    );
  const readOnlyDatabaseUrl =
    createReadOnlyPartyShadowRuntimeReadinessAcceptanceDatabaseUrl(databaseUrl);
  const admin = new Client({ connectionString: config.adminDatabaseUrl });
  let databaseCreated = false;
  let temporaryDatabaseRemoved = false;
  let sourceInventoryBefore: Inventory | null = null;
  let evidence: Omit<ProductionPartyShadowRuntimeReadinessAcceptanceEvidence,
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
    executionStage = "readiness-fixtures";
    const fixtures = await createReadinessFixtures(databaseUrl);
    executionStage = "readiness-and-observability-scenarios";
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
        assertProductionPartyShadowRuntimeReadinessAcceptanceDatabaseName(
          databaseName,
        );
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
      `Party shadow runtime readiness izole kabulü başarısız; aşama: ${executionStage}; `
        + `neden: ${safeDiagnostic(executionError)}; geçici hedef: ${databaseName}.`,
      { cause: executionError },
    );
  }
  if (!evidence) throw new Error("Party shadow runtime readiness kabul kanıtı yok.");

  const result = evaluateProductionPartyShadowRuntimeReadinessAcceptance({
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
    : "Party shadow runtime readiness izole kabulü başarısız.");
  process.exitCode = 1;
});

async function runAcceptanceScenarios(input: {
  databaseUrl: string;
  fixtures: { actorUserId: string; scope: Scope };
  readOnlyDatabaseUrl: string;
}) {
  const localMigrationNames = await readLocalMigrationNames();
  if (
    localMigrationNames.length
    !== PRODUCTION_PARTY_SHADOW_RUNTIME_READINESS_ACCEPTANCE_MIGRATION_COUNT
  ) {
    throw new Error("Party shadow runtime readiness kabul migration sayısı 70 değil.");
  }
  const reader = createPrisma(input.readOnlyDatabaseUrl);
  const writer = createPrisma(input.databaseUrl);
  try {
    const [migrationCount, missingTables] = await Promise.all([
      readMigrationCount(reader),
      readMissingTables(reader),
    ]);
    const attestation = buildAcceptanceAttestation();
    let requestedUrl = "";
    let requestedConfirmation = "";
    let noStoreRequested = false;
    const requestedAttestation =
      await requestProductionPartyShadowRuntimeAttestation(
        { productionOrigin, releaseId },
        async (url, init) => {
          requestedUrl = String(url);
          requestedConfirmation = new Headers(init?.headers).get(
            "x-noa-party-shadow-runtime-readiness",
          ) ?? "";
          noStoreRequested = init?.cache === "no-store"
            && init.redirect === "error"
            && init.method === "GET";
          return Response.json(attestation);
        },
      );
    const runtimeRequestContractExact = requestedUrl
        === `${productionOrigin}/api/party-shadow-runtime-readiness`
      && requestedConfirmation === PARTY_SHADOW_RUNTIME_READINESS_CONFIRMATION
      && noStoreRequested
      && requestedAttestation.originFingerprint
        === partyShadowRuntimeOriginFingerprint(productionOrigin)
      && requestedAttestation.contractChecksum === attestation.contractChecksum;

    const preflightConfig: ProductionPartyCutoverPreflightConfig = {
      actorUserId: input.fixtures.actorUserId,
      databaseUrl: input.readOnlyDatabaseUrl,
      releaseId,
      scope: input.fixtures.scope,
    };
    const cutoverPreflight = await runProductionPartyCutoverPreflight({
      config: preflightConfig,
      localMigrationNames,
      repository: createProductionPartyCutoverPreflightPrismaRepository(reader),
    });
    const readinessConfig = createReadinessConfig(
      input.fixtures,
      input.readOnlyDatabaseUrl,
    );
    const readiness = runProductionPartyShadowRuntimeReadinessPreflight({
      attestation: requestedAttestation,
      config: readinessConfig,
      cutoverPreflight,
    });
    const repeatedReadiness = runProductionPartyShadowRuntimeReadinessPreflight({
      attestation: requestedAttestation,
      config: readinessConfig,
      cutoverPreflight,
    });
    const initialStateCountsExact = readiness.cutover?.stateCount === 0
      && readiness.cutover.eventCount === 0
      && readiness.cutover.auditCount === 0;
    const manifestDeterministic = readiness.manifestChecksum
      === repeatedReadiness.manifestChecksum;
    const manifestFreshnessExact = Date.parse(readiness.validUntil)
      - Date.parse(readiness.generatedAt) === 60 * 60_000;
    const manifestRedacted = isReadinessManifestRedacted(
      readiness,
      input.fixtures,
      input.databaseUrl,
    );
    const encodedAttestation = Buffer.from(
      JSON.stringify(requestedAttestation),
    ).toString("base64");
    const attestationRoundTripExact = JSON.stringify(
      decodeProductionPartyShadowRuntimeAttestation(encodedAttestation),
    ) === JSON.stringify(requestedAttestation)
      && rejects(() => decodeProductionPartyShadowRuntimeAttestation("%%%"));
    const blockerScenariosRejected = rejectAllBlockerScenarios({
      attestation: requestedAttestation,
      config: readinessConfig,
      cutoverPreflight,
    });

    let writableCredentialRejected = false;
    try {
      await runProductionPartyCutoverPreflight({
        config: { ...preflightConfig, databaseUrl: input.databaseUrl },
        localMigrationNames,
        repository: createProductionPartyCutoverPreflightPrismaRepository(writer),
      });
    } catch (error) {
      writableCredentialRejected = error instanceof Error
        && error.message.includes("transaction salt-okunur değil");
    }

    const alertEvidence = await runAlertScenarios({
      databaseUrl: input.databaseUrl,
      fixtures: input.fixtures,
      writer,
    });
    return {
      ...alertEvidence,
      attestationRoundTripExact,
      blockerScenariosRejected,
      initialStateCountsExact,
      manifestDeterministic,
      manifestFreshnessExact,
      manifestRedacted,
      migrationCount,
      missingTables,
      readOnlyManifestReady: readiness.ready && readiness.readOnly,
      runtimeRequestContractExact,
      writableCredentialRejected,
    };
  } finally {
    await Promise.all([
      reader.$disconnect().catch(() => undefined),
      writer.$disconnect().catch(() => undefined),
    ]);
  }
}

async function runAlertScenarios(input: {
  databaseUrl: string;
  fixtures: { actorUserId: string; scope: Scope };
  writer: PrismaClient;
}) {
  await createAlertFixture(input.writer, input.fixtures);
  const captured: CapturedAlert[] = [];
  const alert = createPartyShadowReadSafetyAlertWriter({
    capture: (signal, context) => {
      captured.push({ name: signal.name, tags: context.tags });
      return `alert-${captured.length}`;
    },
    env: observabilityEnv(),
    now: () => generatedAt.valueOf(),
  });
  const observer = (runtimeReleaseId: string, client: PartyShadowReadPrismaClientLike) =>
    createPartyShadowReadPrismaObserver(client, { alert, runtimeReleaseId });
  const definition = getEntityDefinition("musteriler");
  if (!definition) throw new Error("Runtime readiness müşteri tanımı bulunamadı.");

  await observer("b".repeat(40), asObserverClient(input.writer)).observeRead({
    scope: input.fixtures.scope,
    slug: "musteriler",
  });
  await input.writer.party.updateMany({
    data: { displayName: "Canonical Drift Value" },
    where: { ...input.fixtures.scope },
  });
  await observer(releaseId, asObserverClient(input.writer)).observeRead({
    scope: input.fixtures.scope,
    slug: "musteriler",
  });
  await input.writer.partyCutoverState.update({
    data: { revisionNo: 9 },
    where: { tenantId_companyId_periodId: input.fixtures.scope },
  });
  await observer(releaseId, asObserverClient(input.writer)).observeRead({
    scope: input.fixtures.scope,
    slug: "musteriler",
  });
  await input.writer.partyCutoverState.update({
    data: { revisionNo: 1 },
    where: { tenantId_companyId_periodId: input.fixtures.scope },
  });
  await observer(releaseId, asObserverClient(input.writer)).observeLegacyWrite({
    scope: input.fixtures.scope,
    slug: "musteriler",
  });
  const unavailable = {
    $transaction: async () => { throw new TypeError("acceptance-private-error"); },
  } as unknown as PartyShadowReadPrismaClientLike;
  await observer(releaseId, unavailable).observeRead({
    scope: input.fixtures.scope,
    slug: "musteriler",
  });

  await input.writer.partyCutoverState.update({
    data: { revisionNo: 1 },
    where: { tenantId_companyId_periodId: input.fixtures.scope },
  });
  const throwingObserver = createPartyShadowReadPrismaObserver(
    asObserverClient(input.writer),
    {
      alert: () => { throw new Error("alert-provider-private-error"); },
      runtimeReleaseId: releaseId,
    },
  );
  const repository = createEntityPrismaRepository(input.writer, {
    partyShadowReadObserver: throwingObserver,
  });
  const rows = await repository.read({
    definition,
    scope: {
      ...input.fixtures.scope,
      companyName: "Acceptance Company",
      licenseLabel: "Acceptance",
      periodLabel: "Acceptance 2026",
      tenantName: "Acceptance Tenant",
      userId: input.fixtures.actorUserId,
      userName: "Acceptance Admin",
      userRole: "admin",
    },
  });
  const alertFailureContained = rows[0]?.name === "Legacy Acceptance Customer";
  const statuses = new Set(captured.map((entry) => entry.tags["noa.party.status"]));
  const alertSafetyStatusCount = PARTY_SHADOW_RUNTIME_SAFETY_STATUSES
    .filter((status) => statuses.has(status)).length;
  const alertFieldsRedacted = isAlertSetRedacted(captured, input.fixtures);
  const alertThrottleExact = verifyAlertThrottle();
  return {
    alertFailureContained,
    alertFieldsRedacted,
    alertSafetyStatusCount,
    alertThrottleExact,
  };
}

function buildAcceptanceAttestation() {
  return buildPartyShadowRuntimeAttestation({
    env: {
      APP_BASE_URL: productionOrigin,
      NOA_RUNTIME_ENV: "production",
      SENTRY_DSN: `https://public@example.ingest.sentry.io/${sentryProjectId}`,
      SENTRY_EXPECTED_PROJECT_ID: sentryProjectId,
      VERCEL_GIT_COMMIT_SHA: releaseId,
    },
    sentry: { enabled: true, initialized: true, projectId: sentryProjectId },
  });
}

function createReadinessConfig(
  fixtures: { actorUserId: string; scope: Scope },
  databaseUrl: string,
): ProductionPartyShadowRuntimeReadinessConfig {
  return {
    actorUserId: fixtures.actorUserId,
    databaseUrl,
    generatedAt: generatedAt.toISOString(),
    productionOrigin,
    releaseId,
    scope: fixtures.scope,
    validUntil: new Date(generatedAt.valueOf() + 60 * 60_000).toISOString(),
  };
}

function rejectAllBlockerScenarios(input: {
  attestation: ReturnType<typeof buildAcceptanceAttestation>;
  config: ProductionPartyShadowRuntimeReadinessConfig;
  cutoverPreflight: ProductionPartyCutoverPreflightResult;
}) {
  const runtimeVariants = [
    { ...input.attestation, releaseId: "b".repeat(40) },
    { ...input.attestation, contractChecksum: "f".repeat(64) },
    { ...input.attestation, originFingerprint: "f".repeat(12) },
    { ...input.attestation, negativeAlertingReady: false },
    { ...input.attestation, safetyStatuses: ["SHADOW_DRIFT"] as const },
  ];
  const runtimeRejected = runtimeVariants.every((attestation) =>
    !evaluateProductionPartyShadowRuntimeAttestation({
      attestation,
      config: input.config,
    }).ready
  );
  const nonEmpty = structuredClone(input.cutoverPreflight);
  nonEmpty.cutover = {
    auditCount: 1,
    eventCount: 1,
    state: {
      mode: "SHADOW_READ",
      parityChecksum: "a".repeat(64),
      revisionNo: 1,
    },
    stateCount: 1,
  };
  const migrationDrift = structuredClone(input.cutoverPreflight);
  migrationDrift.migration.appliedMigrationCount = 69;
  migrationDrift.migration.pendingMigrationNames = ["20260814160000_add_party_cutover_state"];
  migrationDrift.migration.schemaState = "PRE_MIGRATION";
  const parityDrift = structuredClone(input.cutoverPreflight);
  parityDrift.parity.ready = false;
  parityDrift.parity.issueCount = 1;
  return runtimeRejected
    && [nonEmpty, migrationDrift, parityDrift].every((cutoverPreflight) =>
      !runProductionPartyShadowRuntimeReadinessPreflight({
        attestation: input.attestation,
        config: input.config,
        cutoverPreflight,
      }).ready
    );
}

function verifyAlertThrottle() {
  let now = generatedAt.valueOf();
  let captures = 0;
  const write = createPartyShadowReadSafetyAlertWriter({
    capture: () => { captures += 1; return `throttle-${captures}`; },
    env: observabilityEnv(),
    now: () => now,
  });
  const alert: PartyShadowReadSafetyAlert = {
    releaseId,
    scopeFingerprint: "c2df556c5505",
    slug: "musteriler",
    status: "SHADOW_DRIFT",
  };
  const first = write(alert);
  const duplicate = write(alert);
  now += 5 * 60_000;
  const afterWindow = write(alert);
  return first === "throttle-1"
    && duplicate === null
    && afterWindow === "throttle-2"
    && captures === 2;
}

function observabilityEnv() {
  return {
    NOA_RUNTIME_ENV: "production",
    SENTRY_DSN: `https://public@example.ingest.sentry.io/${sentryProjectId}`,
    SENTRY_EXPECTED_PROJECT_ID: sentryProjectId,
  };
}

async function createReadinessFixtures(databaseUrl: string) {
  const prisma = createPrisma(databaseUrl);
  const actorUserId = "party-shadow-runtime-readiness-admin";
  const scope = {
    companyId: "party-shadow-runtime-readiness-company",
    periodId: "party-shadow-runtime-readiness-period",
    tenantId: "party-shadow-runtime-readiness-tenant",
  };
  const runId = `party-backfill-run_${"c".repeat(32)}`;
  try {
    await prisma.tenant.create({
      data: { id: scope.tenantId, name: "Runtime Readiness Acceptance" },
    });
    await prisma.company.create({
      data: { id: scope.companyId, name: "Acceptance Company", tenantId: scope.tenantId },
    });
    await prisma.period.create({
      data: {
        companyId: scope.companyId,
        id: scope.periodId,
        label: "Acceptance 2026",
        tenantId: scope.tenantId,
      },
    });
    await prisma.appUser.create({
      data: { id: actorUserId, name: "Acceptance Admin", tenantId: scope.tenantId },
    });
    await prisma.appUserScopeAccess.create({
      data: {
        ...scope,
        id: "party-shadow-runtime-readiness-access",
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
        completedAt: generatedAt,
        createdBy: actorUserId,
        id: runId,
        issueCount: 0,
        sourceChecksum: "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
        sourceCount: 0,
        startedAt: new Date(generatedAt.valueOf() - 60_000),
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
        occurredAt: generatedAt,
      },
    });
    return { actorUserId, scope };
  } finally {
    await prisma.$disconnect();
  }
}

async function createAlertFixture(
  prisma: PrismaClient,
  fixtures: { actorUserId: string; scope: Scope },
) {
  const partyId = "party-shadow-runtime-readiness-party";
  await prisma.entityRecord.create({
    data: {
      ...fixtures.scope,
      code: "MUS-C3B-001",
      createdBy: fixtures.actorUserId,
      data: {
        email: "customer.c3b@example.invalid",
        name: "Legacy Acceptance Customer",
        phone: "05000000003",
        status: "Aktif",
        taxNumber: "1000000003",
      },
      slug: "musteriler",
      updatedBy: fixtures.actorUserId,
    },
  });
  await prisma.party.create({
    data: {
      ...fixtures.scope,
      createdBy: fixtures.actorUserId,
      displayName: "Legacy Acceptance Customer",
      email: "customer.c3b@example.invalid",
      id: partyId,
      normalizedName: "LEGACY ACCEPTANCE CUSTOMER",
      normalizedTaxNumber: "1000000003",
      phone: "05000000003",
      taxNumber: "1000000003",
      updatedBy: fixtures.actorUserId,
    },
  });
  await prisma.partyRole.create({
    data: {
      ...fixtures.scope,
      code: "MUS-C3B-001",
      createdBy: fixtures.actorUserId,
      id: "party-shadow-runtime-readiness-role",
      kind: "customer",
      legacyCode: "MUS-C3B-001",
      legacySlug: "musteriler",
      normalizedCode: "MUS-C3B-001",
      partyId,
      updatedBy: fixtures.actorUserId,
    },
  });
  await prisma.partyCutoverState.create({
    data: {
      ...fixtures.scope,
      createdBy: fixtures.actorUserId,
      id: "party-shadow-runtime-readiness-state",
      issueChecksum: "0".repeat(64),
      lastVerifiedAt: generatedAt,
      legacyChecksum: "0".repeat(64),
      legacyCount: 1,
      matchedCount: 1,
      mode: "SHADOW_READ",
      parityChecksum: "0".repeat(64),
      partyChecksum: "0".repeat(64),
      partyCount: 1,
      releaseId,
      revisionNo: 1,
      roleCount: 1,
      updatedBy: fixtures.actorUserId,
    },
  });
}

function isReadinessManifestRedacted(
  value: unknown,
  fixtures: { actorUserId: string; scope: Scope },
  databaseUrl: string,
) {
  const serialized = JSON.stringify(value);
  return [
    ...Object.values(fixtures.scope),
    fixtures.actorUserId,
    productionOrigin,
    databaseUrl,
    sentryProjectId,
    "postgresql://",
    "postgres://",
  ].every((item) => !serialized.includes(item));
}

function isAlertSetRedacted(
  alerts: CapturedAlert[],
  fixtures: { actorUserId: string; scope: Scope },
) {
  const serialized = JSON.stringify(alerts);
  const allowedKeys = new Set([
    "noa.party.release",
    "noa.party.revision",
    "noa.party.scope",
    "noa.party.slug",
    "noa.party.status",
  ]);
  return alerts.length >= 5
    && alerts.every((alert) =>
      alert.name === "PartyShadowReadSafetySignal"
      && Object.keys(alert.tags).every((key) => allowedKeys.has(key))
    )
    && [
      ...Object.values(fixtures.scope),
      fixtures.actorUserId,
      "Legacy Acceptance Customer",
      "Canonical Drift Value",
      "1000000003",
      "05000000003",
      "customer.c3b@example.invalid",
      "acceptance-private-error",
      "alert-provider-private-error",
    ].every((item) => !serialized.includes(item));
}

function asObserverClient(prisma: PrismaClient) {
  return prisma as unknown as PartyShadowReadPrismaClientLike;
}

function rejects(callback: () => unknown) {
  try {
    callback();
    return false;
  } catch {
    return true;
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
    SELECT tablename::text AS table_name
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
  `;
  const tables = new Set(rows.map((row) => row.table_name));
  return PRODUCTION_PARTY_SHADOW_RUNTIME_READINESS_ACCEPTANCE_TABLES
    .filter((table) => !tables.has(table));
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
    throw new Error("Party shadow runtime readiness geçici DB zaten var.");
  }
}

async function databaseExists(client: Client, name: string) {
  const result = await client.query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
    [assertProductionPartyShadowRuntimeReadinessAcceptanceDatabaseName(name)],
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
