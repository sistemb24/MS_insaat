import { createHash } from "node:crypto";

import {
  buildPartyParityReadModel,
  type PartyParityReadModel,
  type PartyParityScope,
  type PartyParitySnapshot,
} from "./party-parity-read-model";

export const PRODUCTION_PARTY_CUTOVER_PREFLIGHT_CONFIRMATION =
  "production-party-cutover-preflight";
export const PRODUCTION_PARTY_CUTOVER_MIGRATION_CONFIRMATION =
  "production-party-cutover-migration-execute";
export const PRODUCTION_PARTY_CUTOVER_MIGRATION_NAME =
  "20260814160000_add_party_cutover_state";
export const PRODUCTION_PARTY_CUTOVER_EXPECTED_MIGRATION_COUNT = 70;
export const PRODUCTION_PARTY_CUTOVER_TABLES = [
  "PartyCutoverEvent",
  "PartyCutoverState",
] as const;

export type ProductionPartyCutoverStage = "POST_MIGRATION" | "PRE_MIGRATION";

export type ProductionPartyCutoverPreflightConfig = {
  actorUserId: string;
  databaseUrl: string;
  releaseId: string;
  scope: PartyParityScope;
};

export type ProductionPartyCutoverMigrationRecord = {
  finished: boolean;
  migrationName: string;
  rolledBack: boolean;
};

export type ProductionPartyCutoverPreflightRead = {
  actorHasActiveAdminAccess: boolean;
  backfillAuditCount: number;
  backfillIssueCount: number;
  backfillRuns: readonly {
    candidateCount: number;
    issueCount: number;
    sourceChecksum: string;
    sourceCount: number;
    status: string;
    version: string;
  }[];
  companyExists: boolean;
  cutoverAuditCount: number;
  cutoverEventCount: number;
  cutoverState: {
    mode: string;
    parityChecksum: string;
    revisionNo: number;
  } | null;
  cutoverStateCount: number;
  financialCounts: {
    cashBankMovement: number;
    ledgerEntry: number;
    progressPayment: number;
    purchaseInvoice: number;
    salesInvoice: number;
  };
  migrationTableExists: boolean;
  paritySnapshot: PartyParitySnapshot;
  period: { isClosed: boolean } | null;
  productionMigrationRecords: readonly ProductionPartyCutoverMigrationRecord[];
  publicTableNames: readonly string[];
  tenant: { lifecycleStatus: string } | null;
  transactionReadOnly: boolean;
};

export type ProductionPartyCutoverPreflightRepository = {
  readScope(input: {
    actorUserId: string;
    scope: PartyParityScope;
  }): Promise<ProductionPartyCutoverPreflightRead>;
};

export function readProductionPartyCutoverPreflightConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionPartyCutoverPreflightConfig {
  assertProductionWorkflowContext(
    env,
    PRODUCTION_PARTY_CUTOVER_PREFLIGHT_CONFIRMATION,
  );
  return readBaseConfig(env);
}

export function readProductionPartyCutoverStage(
  value: string | undefined,
): ProductionPartyCutoverStage {
  if (value !== "PRE_MIGRATION" && value !== "POST_MIGRATION") {
    throw new Error("Party cutover production stage allowlist dışında.");
  }
  return value;
}

export async function runProductionPartyCutoverPreflight(input: {
  config: ProductionPartyCutoverPreflightConfig;
  localMigrationNames: readonly string[];
  repository: ProductionPartyCutoverPreflightRepository;
}) {
  const read = await input.repository.readScope({
    actorUserId: input.config.actorUserId,
    scope: input.config.scope,
  });
  const migration = evaluateProductionPartyCutoverMigrationState({
    localMigrationNames: input.localMigrationNames,
    migrationTableExists: read.migrationTableExists,
    productionMigrationRecords: read.productionMigrationRecords,
    publicTableNames: read.publicTableNames,
  });
  const parity = buildPartyParityReadModel({
    scope: input.config.scope,
    snapshot: read.paritySnapshot,
  });
  const blockers = [...migration.blockers];
  if (!read.transactionReadOnly) blockers.push("TRANSACTION_NOT_READ_ONLY");
  if (!read.tenant) blockers.push("TENANT_NOT_FOUND");
  else if (read.tenant.lifecycleStatus !== "ACTIVE") blockers.push("TENANT_NOT_ACTIVE");
  if (!read.companyExists) blockers.push("COMPANY_SCOPE_NOT_FOUND");
  if (!read.period) blockers.push("PERIOD_SCOPE_NOT_FOUND");
  if (!read.actorHasActiveAdminAccess) blockers.push("ACTIVE_ADMIN_ACCESS_REQUIRED");
  if (!parity.ready) blockers.push("PARTY_PARITY_NOT_READY");
  validateBackfillContinuity(read, blockers);
  validateCutoverState(read, migration.schemaState, blockers);

  const businessEvidence = {
    backfill: {
      auditCount: read.backfillAuditCount,
      issueCount: read.backfillIssueCount,
      runs: normalizeBackfillRuns(read.backfillRuns),
    },
    financialCounts: normalizeCounts(read.financialCounts, "finansal"),
    parity: parityEvidence(parity),
  };
  const eligibilityPayload = {
    businessChecksum: checksum(businessEvidence),
    migration: {
      appliedMigrationCount: migration.appliedMigrationCount,
      pendingMigrationNames: migration.pendingMigrationNames,
      schemaState: migration.schemaState,
    },
    releaseId: input.config.releaseId,
    scopeFingerprint: fingerprint(input.config.scope),
  };
  const statePayload = {
    auditCount: read.cutoverAuditCount,
    eventCount: read.cutoverEventCount,
    state: read.cutoverState,
    stateCount: read.cutoverStateCount,
  };
  const payload = {
    blockers: unique(blockers),
    businessChecksum: eligibilityPayload.businessChecksum,
    cutover: statePayload,
    eligibilityManifestChecksum: checksum(eligibilityPayload),
    migration: eligibilityPayload.migration,
    parity: parityEvidence(parity),
    periodClosed: read.period?.isClosed ?? null,
    readOnly: read.transactionReadOnly,
    releaseId: input.config.releaseId,
    scopeFingerprint: eligibilityPayload.scopeFingerprint,
    stateManifestChecksum: checksum(statePayload),
  };
  return {
    ...payload,
    manifestChecksum: checksum(payload),
    ready: payload.blockers.length === 0,
  };
}

export function evaluateProductionPartyCutoverMigrationState(input: {
  localMigrationNames: readonly string[];
  migrationTableExists: boolean;
  productionMigrationRecords: readonly ProductionPartyCutoverMigrationRecord[];
  publicTableNames: readonly string[];
}) {
  const blockers: string[] = [];
  const local = input.localMigrationNames.map((name) => normalizeMigrationName(name));
  const production = input.productionMigrationRecords.map((record) => ({
    ...record,
    migrationName: normalizeMigrationName(record.migrationName),
  }));
  if (!input.migrationTableExists) blockers.push("MIGRATION_TABLE_MISSING");
  if (local.length !== PRODUCTION_PARTY_CUTOVER_EXPECTED_MIGRATION_COUNT) {
    blockers.push("LOCAL_MIGRATION_COUNT_MISMATCH");
  }
  if (!local.includes(PRODUCTION_PARTY_CUTOVER_MIGRATION_NAME)) {
    blockers.push("CUTOVER_MIGRATION_NOT_IN_RELEASE");
  }
  if (new Set(local).size !== local.length) blockers.push("LOCAL_MIGRATION_DUPLICATE");
  const productionNames = production.map((record) => record.migrationName);
  if (new Set(productionNames).size !== productionNames.length) {
    blockers.push("PRODUCTION_MIGRATION_DUPLICATE");
  }
  if (production.some((record) => !record.finished || record.rolledBack)) {
    blockers.push("PRODUCTION_MIGRATION_UNHEALTHY");
  }
  if (productionNames.some((name) => !local.includes(name))) {
    blockers.push("PRODUCTION_MIGRATION_UNKNOWN");
  }
  const applied = new Set(production
    .filter((record) => record.finished && !record.rolledBack)
    .map((record) => record.migrationName));
  const pendingMigrationNames = local.filter((name) => !applied.has(name));
  const tables = new Set(input.publicTableNames);
  const cutoverTableCount = PRODUCTION_PARTY_CUTOVER_TABLES
    .filter((table) => tables.has(table)).length;
  let schemaState: "INVALID" | ProductionPartyCutoverStage = "INVALID";
  if (
    applied.size === PRODUCTION_PARTY_CUTOVER_EXPECTED_MIGRATION_COUNT - 1
    && pendingMigrationNames.length === 1
    && pendingMigrationNames[0] === PRODUCTION_PARTY_CUTOVER_MIGRATION_NAME
    && cutoverTableCount === 0
  ) {
    schemaState = "PRE_MIGRATION";
  } else if (
    applied.size === PRODUCTION_PARTY_CUTOVER_EXPECTED_MIGRATION_COUNT
    && pendingMigrationNames.length === 0
    && cutoverTableCount === PRODUCTION_PARTY_CUTOVER_TABLES.length
    && applied.has(PRODUCTION_PARTY_CUTOVER_MIGRATION_NAME)
  ) {
    schemaState = "POST_MIGRATION";
  } else {
    blockers.push("CUTOVER_SCHEMA_STATE_INVALID");
  }
  return {
    appliedMigrationCount: applied.size,
    blockers: unique(blockers),
    pendingMigrationNames,
    schemaState,
  };
}

export function assertProductionPartyCutoverMigrationContext(
  env: Readonly<Record<string, string | undefined>>,
) {
  assertProductionWorkflowContext(
    env,
    PRODUCTION_PARTY_CUTOVER_MIGRATION_CONFIRMATION,
  );
  return readBaseConfig(env);
}

function validateBackfillContinuity(
  read: ProductionPartyCutoverPreflightRead,
  blockers: string[],
) {
  if (read.backfillRuns.length !== 1) blockers.push("BACKFILL_RUN_COUNT_MISMATCH");
  const run = read.backfillRuns[0];
  if (!run || run.status !== "VERIFIED" || run.version !== "party-v1") {
    blockers.push("VERIFIED_BACKFILL_RUN_REQUIRED");
  } else if (
    run.sourceCount !== 0
    || run.candidateCount !== 0
    || run.issueCount !== 0
  ) {
    blockers.push("ZERO_CANDIDATE_BACKFILL_REQUIRED");
  }
  if (read.backfillIssueCount !== 0) blockers.push("BACKFILL_ISSUES_PRESENT");
  if (read.backfillAuditCount !== 1) blockers.push("BACKFILL_AUDIT_COUNT_MISMATCH");
}

function validateCutoverState(
  read: ProductionPartyCutoverPreflightRead,
  schemaState: "INVALID" | ProductionPartyCutoverStage,
  blockers: string[],
) {
  if (schemaState === "PRE_MIGRATION") {
    if (
      read.cutoverStateCount !== 0
      || read.cutoverEventCount !== 0
      || read.cutoverAuditCount !== 0
      || read.cutoverState
    ) {
      blockers.push("PRE_MIGRATION_CUTOVER_STATE_PRESENT");
    }
    return;
  }
  if (!read.cutoverState) {
    if (
      read.cutoverStateCount !== 0
      || read.cutoverEventCount !== 0
      || read.cutoverAuditCount !== 0
    ) {
      blockers.push("CUTOVER_STATE_CHAIN_INVALID");
    }
  } else {
    if (read.cutoverStateCount !== 1) blockers.push("CUTOVER_STATE_COUNT_INVALID");
    if (!["LEGACY_ONLY", "SHADOW_READ"].includes(read.cutoverState.mode)) {
      blockers.push("CUTOVER_MODE_INVALID");
    }
    if (!Number.isSafeInteger(read.cutoverState.revisionNo) || read.cutoverState.revisionNo < 1) {
      blockers.push("CUTOVER_REVISION_INVALID");
    }
    if (!/^[a-f0-9]{64}$/.test(read.cutoverState.parityChecksum)) {
      blockers.push("CUTOVER_PARITY_CHECKSUM_INVALID");
    }
    if (
      read.cutoverEventCount !== read.cutoverState.revisionNo
      || read.cutoverAuditCount !== read.cutoverState.revisionNo
    ) {
      blockers.push("CUTOVER_STATE_CHAIN_INVALID");
    }
  }
}

function parityEvidence(parity: PartyParityReadModel) {
  return {
    issueChecksum: parity.issueChecksum,
    issueCount: parity.issues.length,
    legacyChecksum: parity.legacyChecksum,
    legacyCount: parity.legacyCount,
    matchedCount: parity.matchedCount,
    parityChecksum: parity.parityChecksum,
    partyChecksum: parity.partyChecksum,
    partyCount: parity.partyCount,
    ready: parity.ready,
    roleCount: parity.roleCount,
  };
}

function normalizeBackfillRuns(
  runs: ProductionPartyCutoverPreflightRead["backfillRuns"],
) {
  return [...runs].map((run) => ({ ...run })).sort((left, right) =>
    `${left.version}:${left.sourceChecksum}`.localeCompare(
      `${right.version}:${right.sourceChecksum}`,
    ));
}

function normalizeCounts<T extends Record<string, number>>(counts: T, label: string): T {
  for (const [name, value] of Object.entries(counts)) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`Party cutover production ${label} ${name} sayımı geçerli değil.`);
    }
  }
  return { ...counts };
}

function assertProductionWorkflowContext(
  env: Readonly<Record<string, string | undefined>>,
  confirmation: string,
) {
  if (env.NOA_RUNTIME_ENV !== "production") {
    throw new Error("Party cutover production akışı yalnız production ortamında çalışır.");
  }
  if (env.GITHUB_EVENT_NAME !== "workflow_dispatch") {
    throw new Error("Party cutover production akışı yalnız manuel workflow ile çalışır.");
  }
  if (env.NOA_SOURCE_REF !== "refs/heads/main") {
    throw new Error("Party cutover production akışı yalnız main branch üzerinde çalışır.");
  }
  if (env.NOA_PRODUCTION_PARTY_CUTOVER_CONFIRMATION !== confirmation) {
    throw new Error("Party cutover production açık onayı eksik.");
  }
  const releaseId = normalizeSha(env.NOA_RELEASE_ID ?? "", "Release SHA");
  const expectedReleaseId = normalizeSha(
    env.NOA_EXPECTED_RELEASE_SHA ?? "",
    "Beklenen release SHA",
  );
  const githubSha = normalizeSha(env.GITHUB_SHA ?? "", "GitHub SHA");
  if (releaseId !== expectedReleaseId || releaseId !== githubSha) {
    throw new Error("Party cutover production release SHA değerleri eşleşmiyor.");
  }
}

function readBaseConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionPartyCutoverPreflightConfig {
  return {
    actorUserId: normalizeIdentifier(
      env.NOA_PARTY_CUTOVER_ACTOR_USER_ID ?? "",
      "Actor kullanıcı kimliği",
    ),
    databaseUrl: readRemotePostgresUrl(env.DATABASE_URL ?? ""),
    releaseId: normalizeSha(env.NOA_RELEASE_ID ?? "", "Release SHA"),
    scope: {
      companyId: normalizeIdentifier(
        env.NOA_PARTY_CUTOVER_COMPANY_ID ?? "",
        "Şirket kimliği",
      ),
      periodId: normalizeIdentifier(
        env.NOA_PARTY_CUTOVER_PERIOD_ID ?? "",
        "Dönem kimliği",
      ),
      tenantId: normalizeIdentifier(
        env.NOA_PARTY_CUTOVER_TENANT_ID ?? "",
        "Tenant kimliği",
      ),
    },
  };
}

function normalizeMigrationName(value: string) {
  const normalized = value.trim();
  if (!/^\d{12,14}_[a-z0-9_]+$/.test(normalized)) {
    throw new Error("Party cutover production migration adı güvenli değil.");
  }
  return normalized;
}

function normalizeSha(value: string, label: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(normalized)) throw new Error(`${label} geçerli değil.`);
  return normalized;
}

function normalizeIdentifier(value: string, label: string) {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,119}$/.test(normalized)) {
    throw new Error(`${label} güvenli değil.`);
  }
  return normalized;
}

function readRemotePostgresUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Party cutover production DATABASE_URL geçerli değil.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol)
    || ["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())
    || !url.pathname
    || url.pathname === "/"
  ) {
    throw new Error("Party cutover production uzak PostgreSQL hedefi gerektirir.");
  }
  return value;
}

function fingerprint(value: unknown) {
  return checksum(value).slice(0, 12);
}

function checksum(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function unique(values: string[]) {
  return [...new Set(values)].sort();
}
