export const PARTY_CUTOVER_ACCEPTANCE_CONFIRMATION =
  "party-cutover-isolated-acceptance";
export const PARTY_CUTOVER_ACCEPTANCE_MIGRATION_COUNT = 70;
export const PARTY_CUTOVER_ACCEPTANCE_TABLES = [
  "PartyCutoverEvent",
  "PartyCutoverState",
] as const;

export type PartyCutoverAcceptanceConfig = {
  adminDatabaseUrl: string;
  sourceDatabaseUrl: string;
};

export type PartyCutoverAcceptanceEvidence = {
  activationAuditCountAfterRetry: number;
  activationEventCountAfterRetry: number;
  activationModeAfterRetry: string;
  activationRevisionAfterRetry: number;
  activationStateCountAfterRetry: number;
  activationStatus: string;
  activationRetryStatus: string;
  auditFailureRejected: boolean;
  auditRollbackAuditCount: number;
  auditRollbackEventCount: number;
  auditRollbackStateCount: number;
  migrationCount: number;
  missingTables: readonly string[];
  parityDriftConfirmed: boolean;
  rollbackAuditCountAfterRetry: number;
  rollbackEventCountAfterRetry: number;
  rollbackModeAfterRetry: string;
  rollbackRevisionAfterRetry: number;
  rollbackStateCountAfterRetry: number;
  rollbackStatus: string;
  rollbackRetryStatus: string;
  sourceInventoryUnchanged: boolean;
  sqlModeConstraintRejected: boolean;
  temporaryDatabaseRemoved: boolean;
};

export function readPartyCutoverAcceptanceConfig(
  env: Readonly<Record<string, string | undefined>>,
): PartyCutoverAcceptanceConfig {
  if (env.NOA_RUNTIME_ENV !== "test") {
    throw new Error("Party cutover izole kabulü yalnız NOA_RUNTIME_ENV=test ile çalışır.");
  }
  if (
    env.PARTY_CUTOVER_ACCEPTANCE_CONFIRMATION
    !== PARTY_CUTOVER_ACCEPTANCE_CONFIRMATION
  ) {
    throw new Error("Party cutover izole kabul onayı eksik.");
  }
  const sourceDatabaseUrl = assertLocalPostgresUrl(env.DATABASE_URL ?? "");
  const adminUrl = new URL(sourceDatabaseUrl);
  adminUrl.pathname = "/postgres";
  return { adminDatabaseUrl: adminUrl.toString(), sourceDatabaseUrl };
}

export function createPartyCutoverAcceptanceDatabaseName(now: Date) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("Party cutover kabul zamanı geçerli değil.");
  }
  const timestamp = now.toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "z")
    .toLowerCase();
  return assertPartyCutoverAcceptanceDatabaseName(
    `noa_party_cutover_acceptance_${timestamp}`,
  );
}

export function assertPartyCutoverAcceptanceDatabaseName(value: string) {
  if (!/^noa_party_cutover_acceptance_[0-9]{8}t[0-9]{6}z$/.test(value)) {
    throw new Error("Party cutover geçici veritabanı adı güvenli değil.");
  }
  return value;
}

export function createPartyCutoverAcceptanceDatabaseUrl(
  sourceDatabaseUrl: string,
  databaseName: string,
) {
  const url = new URL(assertLocalPostgresUrl(sourceDatabaseUrl));
  url.pathname = `/${assertPartyCutoverAcceptanceDatabaseName(databaseName)}`;
  return url.toString();
}

export function evaluatePartyCutoverAcceptance(
  evidence: PartyCutoverAcceptanceEvidence,
) {
  const auditRollbackClean = evidence.auditRollbackStateCount === 0
    && evidence.auditRollbackEventCount === 0
    && evidence.auditRollbackAuditCount === 0;
  return {
    ...evidence,
    auditRollbackClean,
    ready:
      evidence.migrationCount === PARTY_CUTOVER_ACCEPTANCE_MIGRATION_COUNT
      && evidence.missingTables.length === 0
      && evidence.activationStatus === "ACTIVATED"
      && evidence.activationRetryStatus === "UNCHANGED"
      && evidence.activationModeAfterRetry === "SHADOW_READ"
      && evidence.activationRevisionAfterRetry === 1
      && evidence.activationStateCountAfterRetry === 1
      && evidence.activationEventCountAfterRetry === 1
      && evidence.activationAuditCountAfterRetry === 1
      && evidence.parityDriftConfirmed
      && evidence.rollbackStatus === "ROLLED_BACK"
      && evidence.rollbackRetryStatus === "UNCHANGED"
      && evidence.rollbackModeAfterRetry === "LEGACY_ONLY"
      && evidence.rollbackRevisionAfterRetry === 2
      && evidence.rollbackStateCountAfterRetry === 1
      && evidence.rollbackEventCountAfterRetry === 2
      && evidence.rollbackAuditCountAfterRetry === 2
      && evidence.auditFailureRejected
      && auditRollbackClean
      && evidence.sqlModeConstraintRejected
      && evidence.sourceInventoryUnchanged
      && evidence.temporaryDatabaseRemoved,
  };
}

function assertLocalPostgresUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Party cutover kabul DATABASE_URL değeri geçerli değil.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Party cutover kabulü PostgreSQL gerektirir.");
  }
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())) {
    throw new Error("Party cutover kabulü yalnız local PostgreSQL hedefinde çalışır.");
  }
  if (!url.pathname || url.pathname === "/") {
    throw new Error("Party cutover kabul kaynak veritabanı adı zorunludur.");
  }
  return url.toString();
}
