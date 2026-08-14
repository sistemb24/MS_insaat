import { createHash } from "node:crypto";

import {
  buildPartyBackfillPlan,
  PARTY_BACKFILL_VERSION,
  type ExistingPartyRole,
  type LegacyPartyRecord,
  type PartyBackfillIssueCode,
} from "./party-backfill";

export const PRODUCTION_PARTY_PREFLIGHT_CONFIRMATION =
  "production-party-backfill-preflight";
export const PRODUCTION_PARTY_MIGRATION_NAME =
  "20260814120000_add_party_backfill_foundation";
export const PRODUCTION_PARTY_TABLES = [
  "Party",
  "PartyBackfillIssue",
  "PartyBackfillRun",
  "PartyRole",
] as const;

export type ProductionPartyPreflightConfig = {
  actorUserId: string;
  databaseUrl: string;
  releaseId: string;
  scope: { companyId: string; periodId: string; tenantId: string };
};

export type ProductionPartyMigrationRecord = {
  finished: boolean;
  migrationName: string;
  rolledBack: boolean;
};

export type ProductionPartyPreflightDatabaseRead = {
  actorHasActiveAdminAccess: boolean;
  companyExists: boolean;
  existingRoles: readonly ExistingPartyRole[];
  financialCounts: {
    cashBankMovement: number;
    ledgerEntry: number;
    progressPayment: number;
    purchaseInvoice: number;
    salesInvoice: number;
  };
  legacyRecords: readonly LegacyPartyRecord[];
  migrationTableExists: boolean;
  period: { isClosed: boolean } | null;
  productionMigrationRecords: readonly ProductionPartyMigrationRecord[];
  publicTableNames: readonly string[];
  tenant: { lifecycleStatus: string } | null;
  transactionReadOnly: boolean;
};

export type ProductionPartyPreflightRepository = {
  readScope(input: {
    actorUserId: string;
    scope: ProductionPartyPreflightConfig["scope"];
  }): Promise<ProductionPartyPreflightDatabaseRead>;
};

export function readProductionPartyPreflightConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionPartyPreflightConfig {
  if (env.NOA_RUNTIME_ENV !== "production") {
    throw new Error("Party production preflight yalnız production ortamında çalışır.");
  }
  if (env.GITHUB_EVENT_NAME !== "workflow_dispatch") {
    throw new Error("Party production preflight yalnız manuel workflow ile çalışır.");
  }
  if (env.NOA_SOURCE_REF !== "refs/heads/main") {
    throw new Error("Party production preflight yalnız main branch üzerinde çalışır.");
  }
  if (
    env.NOA_PRODUCTION_PARTY_PREFLIGHT_CONFIRMATION
    !== PRODUCTION_PARTY_PREFLIGHT_CONFIRMATION
  ) {
    throw new Error("Party production preflight açık onayı eksik.");
  }

  const releaseId = normalizeSha(env.NOA_RELEASE_ID ?? "", "Release SHA");
  const expectedReleaseId = normalizeSha(
    env.NOA_EXPECTED_RELEASE_SHA ?? "",
    "Beklenen release SHA",
  );
  const githubSha = normalizeSha(env.GITHUB_SHA ?? "", "GitHub SHA");
  if (releaseId !== expectedReleaseId || releaseId !== githubSha) {
    throw new Error("Party production preflight release SHA değerleri eşleşmiyor.");
  }

  return {
    actorUserId: normalizeIdentifier(
      env.NOA_PARTY_PREFLIGHT_ACTOR_USER_ID ?? "",
      "Actor kullanıcı kimliği",
    ),
    databaseUrl: readRemotePostgresUrl(env.DATABASE_URL ?? ""),
    releaseId,
    scope: {
      companyId: normalizeIdentifier(
        env.NOA_PARTY_PREFLIGHT_COMPANY_ID ?? "",
        "Şirket kimliği",
      ),
      periodId: normalizeIdentifier(
        env.NOA_PARTY_PREFLIGHT_PERIOD_ID ?? "",
        "Dönem kimliği",
      ),
      tenantId: normalizeIdentifier(
        env.NOA_PARTY_PREFLIGHT_TENANT_ID ?? "",
        "Tenant kimliği",
      ),
    },
  };
}

export async function runProductionPartyPreflight(input: {
  config: ProductionPartyPreflightConfig;
  localMigrationNames: readonly string[];
  repository: ProductionPartyPreflightRepository;
}) {
  const read = await input.repository.readScope({
    actorUserId: input.config.actorUserId,
    scope: input.config.scope,
  });
  const migration = evaluateMigrationState({
    localMigrationNames: input.localMigrationNames,
    migrationTableExists: read.migrationTableExists,
    productionMigrationRecords: read.productionMigrationRecords,
    publicTableNames: read.publicTableNames,
  });
  const blockers = [...migration.blockers];
  if (!read.transactionReadOnly) blockers.push("TRANSACTION_NOT_READ_ONLY");
  if (!read.tenant) blockers.push("TENANT_NOT_FOUND");
  else if (read.tenant.lifecycleStatus !== "ACTIVE") blockers.push("TENANT_NOT_ACTIVE");
  if (!read.companyExists) blockers.push("COMPANY_SCOPE_NOT_FOUND");
  if (!read.period) blockers.push("PERIOD_SCOPE_NOT_FOUND");
  if (!read.actorHasActiveAdminAccess) blockers.push("ACTIVE_ADMIN_ACCESS_REQUIRED");

  const plan = buildPartyBackfillPlan({
    existingRoles: migration.schemaState === "POST_MIGRATION" ? [...read.existingRoles] : [],
    records: [...read.legacyRecords],
    scope: input.config.scope,
    version: PARTY_BACKFILL_VERSION,
  });
  const blockingIssueCount = plan.issues.filter(
    (issue) => issue.severity === "BLOCKING",
  ).length;
  const warningIssueCount = plan.issues.filter(
    (issue) => issue.severity === "WARNING",
  ).length;
  if (blockingIssueCount > 0) blockers.push("PARTY_PLAN_HAS_BLOCKING_ISSUES");

  const issueCodeCounts = countIssueCodes(plan.issues.map((issue) => issue.issueCode));
  const payload = {
    blockingIssueCount,
    blockers: [...new Set(blockers)].sort(),
    candidateCount: plan.run.candidateCount,
    financialCounts: normalizeFinancialCounts(read.financialCounts),
    issueCodeCounts,
    migration: {
      appliedMigrationCount: migration.appliedMigrationCount,
      pendingMigrationNames: migration.pendingMigrationNames,
      schemaState: migration.schemaState,
    },
    periodClosed: read.period?.isClosed ?? null,
    readOnly: read.transactionReadOnly,
    releaseId: input.config.releaseId,
    runId: plan.run.id,
    scopeFingerprints: {
      company: fingerprint(input.config.scope.companyId),
      period: fingerprint(input.config.scope.periodId),
      tenant: fingerprint(input.config.scope.tenantId),
    },
    sourceChecksum: plan.run.sourceChecksum,
    sourceCount: plan.run.sourceCount,
    version: plan.run.version,
    warningIssueCount,
  };
  return {
    ...payload,
    manifestChecksum: checksum(payload),
    ready: payload.blockers.length === 0,
  };
}

export function evaluateMigrationState(input: {
  localMigrationNames: readonly string[];
  migrationTableExists: boolean;
  productionMigrationRecords: readonly ProductionPartyMigrationRecord[];
  publicTableNames: readonly string[];
}) {
  const blockers: string[] = [];
  const local = normalizeMigrationNames(input.localMigrationNames, "Yerel migration");
  const production = input.productionMigrationRecords.map((record) => ({
    ...record,
    migrationName: normalizeMigrationName(record.migrationName, "Production migration"),
  }));
  if (!input.migrationTableExists) blockers.push("MIGRATION_TABLE_MISSING");
  if (!local.includes(PRODUCTION_PARTY_MIGRATION_NAME)) {
    blockers.push("PARTY_MIGRATION_NOT_IN_RELEASE");
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

  const applied = new Set(
    production
      .filter((record) => record.finished && !record.rolledBack)
      .map((record) => record.migrationName),
  );
  const pendingMigrationNames = local.filter((name) => !applied.has(name));
  const tableSet = new Set(input.publicTableNames);
  const presentPartyTables = PRODUCTION_PARTY_TABLES.filter((name) => tableSet.has(name));
  let schemaState: "INVALID" | "POST_MIGRATION" | "PRE_MIGRATION" = "INVALID";
  if (
    pendingMigrationNames.length === 1
    && pendingMigrationNames[0] === PRODUCTION_PARTY_MIGRATION_NAME
    && presentPartyTables.length === 0
  ) {
    schemaState = "PRE_MIGRATION";
  } else if (
    pendingMigrationNames.length === 0
    && presentPartyTables.length === PRODUCTION_PARTY_TABLES.length
    && applied.has(PRODUCTION_PARTY_MIGRATION_NAME)
  ) {
    schemaState = "POST_MIGRATION";
  } else {
    blockers.push("PARTY_SCHEMA_STATE_INVALID");
  }

  return {
    appliedMigrationCount: applied.size,
    blockers: [...new Set(blockers)].sort(),
    pendingMigrationNames,
    schemaState,
  };
}

function countIssueCodes(codes: readonly PartyBackfillIssueCode[]) {
  const counts = new Map<PartyBackfillIssueCode, number>();
  for (const code of codes) counts.set(code, (counts.get(code) ?? 0) + 1);
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, count]) => ({ code, count }));
}

function normalizeFinancialCounts(
  counts: ProductionPartyPreflightDatabaseRead["financialCounts"],
) {
  for (const [name, value] of Object.entries(counts)) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`Party production preflight ${name} sayımı geçerli değil.`);
    }
  }
  return { ...counts };
}

function normalizeMigrationNames(values: readonly string[], label: string) {
  return values.map((value) => normalizeMigrationName(value, label));
}

function normalizeMigrationName(value: string, label: string) {
  const normalized = value.trim();
  if (!/^\d{12,14}_[a-z0-9_]+$/.test(normalized)) {
    throw new Error(`${label} adı güvenli değil.`);
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
    throw new Error("Party production preflight DATABASE_URL geçerli değil.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol)
    || ["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())
    || !url.pathname
    || url.pathname === "/"
  ) {
    throw new Error("Party production preflight uzak PostgreSQL hedefi gerektirir.");
  }
  return value;
}

function fingerprint(value: string) {
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
