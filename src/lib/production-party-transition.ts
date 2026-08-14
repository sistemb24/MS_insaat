import type { PartyBackfillExecutionRepository } from "./party-backfill-apply-service";
import { PARTY_BACKFILL_VERSION } from "./party-backfill";
import type { runProductionPartyPreflight } from "./production-party-backfill-preflight";

export const PRODUCTION_PARTY_MIGRATION_CONFIRMATION =
  "production-party-migration-execute";
export const PRODUCTION_PARTY_ZERO_APPLY_CONFIRMATION =
  "production-party-zero-candidate-apply";
export const PRODUCTION_PARTY_EXPECTED_MIGRATION_COUNT = 69;

export type ProductionPartyPreflightResult = Awaited<
  ReturnType<typeof runProductionPartyPreflight>
>;

type ExactScope = {
  companyId: string;
  periodId: string;
  tenantId: string;
};

type BaseConfig = {
  actorUserId: string;
  databaseUrl: string;
  expectedRunId: string;
  expectedSourceChecksum: string;
  releaseId: string;
  scope: ExactScope;
};

export type ProductionPartyMigrationConfig = BaseConfig & {
  backupId: string;
  expectedPreflightManifestChecksum: string;
};

export type ProductionPartyZeroApplyConfig = BaseConfig & {
  expectedPostMigrationManifestChecksum: string;
};

export type ProductionPartyTransitionStage =
  | "POST_MIGRATION"
  | "PRE_MIGRATION"
  | "ZERO_APPLY";

export function readProductionPartyTransitionStage(
  value: string | undefined,
): ProductionPartyTransitionStage {
  if (
    value !== "PRE_MIGRATION"
    && value !== "POST_MIGRATION"
    && value !== "ZERO_APPLY"
  ) {
    throw new Error("Party production transition stage allowlist dışında.");
  }
  return value;
}

export function readProductionPartyMigrationConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionPartyMigrationConfig {
  const base = readBaseConfig(env, PRODUCTION_PARTY_MIGRATION_CONFIRMATION);
  const backupId = normalizeBackupId(env.NOA_PARTY_BACKUP_ID ?? "");
  if (!backupId.endsWith(`-${base.releaseId}`)) {
    throw new Error("Party production backup kimliği exact release SHA ile eşleşmiyor.");
  }
  return {
    ...base,
    backupId,
    expectedPreflightManifestChecksum: normalizeChecksum(
      env.NOA_PARTY_EXPECTED_PREFLIGHT_MANIFEST_CHECKSUM ?? "",
      "Beklenen preflight manifest checksum",
    ),
  };
}

export function readProductionPartyZeroApplyConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionPartyZeroApplyConfig {
  return {
    ...readBaseConfig(env, PRODUCTION_PARTY_ZERO_APPLY_CONFIRMATION),
    expectedPostMigrationManifestChecksum: normalizeChecksum(
      env.NOA_PARTY_EXPECTED_POST_MIGRATION_MANIFEST_CHECKSUM ?? "",
      "Beklenen post-migration manifest checksum",
    ),
  };
}

export function evaluateProductionPartyMigrationGate(input: {
  config: ProductionPartyMigrationConfig;
  preflight: ProductionPartyPreflightResult;
  stage: "POST_MIGRATION" | "PRE_MIGRATION";
}) {
  const blockers = evidenceBlockers(input.preflight, input.config, input.stage);
  if (
    input.stage === "PRE_MIGRATION"
    && input.preflight.manifestChecksum
      !== input.config.expectedPreflightManifestChecksum
  ) {
    blockers.push("PREFLIGHT_MANIFEST_CHECKSUM_MISMATCH");
  }
  if (
    input.stage === "POST_MIGRATION"
    && input.preflight.migration.appliedMigrationCount
      !== PRODUCTION_PARTY_EXPECTED_MIGRATION_COUNT
  ) {
    blockers.push("POST_MIGRATION_COUNT_MISMATCH");
  }
  return {
    backupId: input.config.backupId,
    blockers: unique(blockers),
    manifestChecksum: input.preflight.manifestChecksum,
    migration: input.preflight.migration,
    ready: blockers.length === 0,
    releaseId: input.config.releaseId,
    runId: input.preflight.runId,
    sourceChecksum: input.preflight.sourceChecksum,
    stage: input.stage,
  };
}

export function evaluateProductionPartyZeroApplyGate(input: {
  config: ProductionPartyZeroApplyConfig;
  preflight: ProductionPartyPreflightResult;
}) {
  const blockers = evidenceBlockers(input.preflight, input.config, "POST_MIGRATION");
  if (
    input.preflight.manifestChecksum
    !== input.config.expectedPostMigrationManifestChecksum
  ) {
    blockers.push("POST_MIGRATION_MANIFEST_CHECKSUM_MISMATCH");
  }
  if (
    input.preflight.migration.appliedMigrationCount
    !== PRODUCTION_PARTY_EXPECTED_MIGRATION_COUNT
  ) {
    blockers.push("POST_MIGRATION_COUNT_MISMATCH");
  }
  return {
    blockers: unique(blockers),
    manifestChecksum: input.preflight.manifestChecksum,
    ready: blockers.length === 0,
    releaseId: input.config.releaseId,
    runId: input.preflight.runId,
    sourceChecksum: input.preflight.sourceChecksum,
  };
}

export async function runProductionPartyZeroApply(input: {
  config: ProductionPartyZeroApplyConfig;
  repository: PartyBackfillExecutionRepository;
}) {
  const preview = await input.repository.previewConsistently({
    scope: input.config.scope,
    version: PARTY_BACKFILL_VERSION,
  });
  const previewBlockers: string[] = [];
  if (preview.run.id !== input.config.expectedRunId) previewBlockers.push("RUN_ID_DRIFT");
  if (preview.run.sourceChecksum !== input.config.expectedSourceChecksum) {
    previewBlockers.push("SOURCE_CHECKSUM_DRIFT");
  }
  if (preview.run.sourceCount !== 0) previewBlockers.push("SOURCE_COUNT_NOT_ZERO");
  if (preview.run.candidateCount !== 0) previewBlockers.push("CANDIDATE_COUNT_NOT_ZERO");
  if (preview.run.issueCount !== 0 || preview.issues.length !== 0) {
    previewBlockers.push("ISSUE_COUNT_NOT_ZERO");
  }
  if (previewBlockers.length > 0) {
    throw new Error(
      `Party production zero-candidate apply fail-closed durdu: ${unique(previewBlockers).join(",")}.`,
    );
  }

  const result = await input.repository.applyAtomically({
    actorUserId: input.config.actorUserId,
    approvedSourceCountLimit: 0,
    expectedSourceChecksum: input.config.expectedSourceChecksum,
    scope: input.config.scope,
    version: PARTY_BACKFILL_VERSION,
  });
  if (
    result.status !== "VERIFIED"
    || result.runId !== input.config.expectedRunId
    || result.sourceChecksum !== input.config.expectedSourceChecksum
    || result.sourceCount !== 0
    || result.candidateCount !== 0
    || result.issueCount !== 0
    || result.blockingIssueCount !== 0
    || result.warningIssueCount !== 0
  ) {
    throw new Error("Party production zero-candidate apply sonucu mutabık değil.");
  }
  return {
    ...result,
    releaseId: input.config.releaseId,
    status: result.reused ? "UNCHANGED" as const : "VERIFIED" as const,
    version: PARTY_BACKFILL_VERSION,
  };
}

function evidenceBlockers(
  preflight: ProductionPartyPreflightResult,
  config: BaseConfig,
  stage: "POST_MIGRATION" | "PRE_MIGRATION",
) {
  const blockers: string[] = [];
  if (!preflight.ready) blockers.push("PREFLIGHT_NOT_READY");
  if (!preflight.readOnly) blockers.push("PREFLIGHT_NOT_READ_ONLY");
  if (preflight.releaseId !== config.releaseId) blockers.push("RELEASE_ID_MISMATCH");
  if (preflight.runId !== config.expectedRunId) blockers.push("RUN_ID_MISMATCH");
  if (preflight.sourceChecksum !== config.expectedSourceChecksum) {
    blockers.push("SOURCE_CHECKSUM_MISMATCH");
  }
  if (preflight.sourceCount !== 0) blockers.push("SOURCE_COUNT_NOT_ZERO");
  if (preflight.candidateCount !== 0) blockers.push("CANDIDATE_COUNT_NOT_ZERO");
  if (preflight.blockingIssueCount !== 0) blockers.push("BLOCKING_ISSUE_COUNT_NOT_ZERO");
  if (preflight.warningIssueCount !== 0) blockers.push("WARNING_ISSUE_COUNT_NOT_ZERO");
  if (preflight.blockers.length !== 0) blockers.push("PREFLIGHT_BLOCKERS_PRESENT");
  if (preflight.issueCodeCounts.length !== 0) blockers.push("ISSUE_CODES_PRESENT");
  if (preflight.periodClosed) blockers.push("PERIOD_CLOSED");
  if (Object.values(preflight.financialCounts).some((count) => count !== 0)) {
    blockers.push("FINANCIAL_COUNTS_NOT_ZERO");
  }
  if (preflight.migration.schemaState !== stage) blockers.push("SCHEMA_STATE_MISMATCH");
  if (
    stage === "PRE_MIGRATION"
    && (
      preflight.migration.appliedMigrationCount !== 68
      || preflight.migration.pendingMigrationNames.length !== 1
      || preflight.migration.pendingMigrationNames[0]
        !== "20260814120000_add_party_backfill_foundation"
    )
  ) {
    blockers.push("PRE_MIGRATION_INVENTORY_MISMATCH");
  }
  if (
    stage === "POST_MIGRATION"
    && preflight.migration.pendingMigrationNames.length !== 0
  ) {
    blockers.push("POST_MIGRATION_PENDING_MIGRATIONS");
  }
  return blockers;
}

function readBaseConfig(
  env: Readonly<Record<string, string | undefined>>,
  confirmation: string,
): BaseConfig {
  if (env.NOA_RUNTIME_ENV !== "production") {
    throw new Error("Party production transition yalnız production ortamında çalışır.");
  }
  if (env.GITHUB_EVENT_NAME !== "workflow_dispatch") {
    throw new Error("Party production transition yalnız manuel workflow ile çalışır.");
  }
  if (env.NOA_SOURCE_REF !== "refs/heads/main") {
    throw new Error("Party production transition yalnız main branch üzerinde çalışır.");
  }
  if (env.NOA_PRODUCTION_PARTY_TRANSITION_CONFIRMATION !== confirmation) {
    throw new Error("Party production transition açık onayı eksik.");
  }
  const releaseId = normalizeSha(env.NOA_RELEASE_ID ?? "", "Release SHA");
  const expectedReleaseId = normalizeSha(
    env.NOA_EXPECTED_RELEASE_SHA ?? "",
    "Beklenen release SHA",
  );
  const githubSha = normalizeSha(env.GITHUB_SHA ?? "", "GitHub SHA");
  if (releaseId !== expectedReleaseId || releaseId !== githubSha) {
    throw new Error("Party production transition release SHA değerleri eşleşmiyor.");
  }
  return {
    actorUserId: normalizeIdentifier(
      env.NOA_PARTY_TRANSITION_ACTOR_USER_ID ?? "",
      "Actor kullanıcı kimliği",
    ),
    databaseUrl: readRemotePostgresUrl(env.DATABASE_URL ?? ""),
    expectedRunId: normalizeRunId(env.NOA_PARTY_EXPECTED_RUN_ID ?? ""),
    expectedSourceChecksum: normalizeChecksum(
      env.NOA_PARTY_EXPECTED_SOURCE_CHECKSUM ?? "",
      "Beklenen kaynak checksum",
    ),
    releaseId,
    scope: {
      companyId: normalizeIdentifier(
        env.NOA_PARTY_TRANSITION_COMPANY_ID ?? "",
        "Şirket kimliği",
      ),
      periodId: normalizeIdentifier(
        env.NOA_PARTY_TRANSITION_PERIOD_ID ?? "",
        "Dönem kimliği",
      ),
      tenantId: normalizeIdentifier(
        env.NOA_PARTY_TRANSITION_TENANT_ID ?? "",
        "Tenant kimliği",
      ),
    },
  };
}

function normalizeSha(value: string, label: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(normalized)) throw new Error(`${label} geçerli değil.`);
  return normalized;
}

function normalizeChecksum(value: string, label: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error(`${label} geçerli değil.`);
  return normalized;
}

function normalizeIdentifier(value: string, label: string) {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,119}$/.test(normalized)) {
    throw new Error(`${label} güvenli değil.`);
  }
  return normalized;
}

function normalizeRunId(value: string) {
  const normalized = value.trim();
  if (!/^party-backfill-run_[a-f0-9]{32}$/.test(normalized)) {
    throw new Error("Party backfill run kimliği güvenli değil.");
  }
  return normalized;
}

function normalizeBackupId(value: string) {
  const normalized = value.trim();
  if (!/^\d{8}T\d{6}Z-[a-f0-9]{40}$/.test(normalized)) {
    throw new Error("Party production backup kimliği güvenli değil.");
  }
  return normalized;
}

function readRemotePostgresUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Party production transition DATABASE_URL geçerli değil.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol)
    || ["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())
    || !url.pathname
    || url.pathname === "/"
  ) {
    throw new Error("Party production transition uzak PostgreSQL hedefi gerektirir.");
  }
  return value;
}

function unique(values: string[]) {
  return [...new Set(values)].sort();
}
