export const PARTY_BACKFILL_ACCEPTANCE_CONFIRMATION =
  "party-backfill-isolated-acceptance";
export const PARTY_BACKFILL_ACCEPTANCE_MIGRATION_COUNT = 70;
export const PARTY_BACKFILL_ACCEPTANCE_TABLES = [
  "Party",
  "PartyBackfillIssue",
  "PartyBackfillRun",
  "PartyRole",
] as const;

export type PartyBackfillAcceptanceConfig = {
  adminDatabaseUrl: string;
  sourceDatabaseUrl: string;
};

export type PartyBackfillAcceptanceEvidence = {
  blockedPartyCount: number;
  blockedRoleCount: number;
  blockedRunStatus: string;
  cleanAuditCountAfterRetry: number;
  cleanPartyCountAfterRetry: number;
  cleanRoleCountAfterRetry: number;
  cleanRunStatus: string;
  closedRunStatus: string;
  driftRejected: boolean;
  foreignPartyCount: number;
  migrationCount: number;
  missingTables: readonly string[];
  rollbackAuditCount: number;
  rollbackIssueCount: number;
  rollbackPartyCount: number;
  rollbackRoleCount: number;
  rollbackRunCount: number;
  sourceInventoryUnchanged: boolean;
  temporaryDatabaseRemoved: boolean;
  zeroApplyAuditCountAfterRetry: number;
  zeroApplyIssueCountAfterRetry: number;
  zeroApplyPartyCountAfterRetry: number;
  zeroApplyRoleCountAfterRetry: number;
  zeroApplyRunCountAfterRetry: number;
  zeroApplyRunStatus: string;
};

export function readPartyBackfillAcceptanceConfig(
  env: Readonly<Record<string, string | undefined>>,
): PartyBackfillAcceptanceConfig {
  if (env.NOA_RUNTIME_ENV !== "test") {
    throw new Error("Party backfill izole kabulü yalnız NOA_RUNTIME_ENV=test ile çalışır.");
  }
  if (
    env.PARTY_BACKFILL_ACCEPTANCE_CONFIRMATION
    !== PARTY_BACKFILL_ACCEPTANCE_CONFIRMATION
  ) {
    throw new Error("Party backfill izole kabul onayı eksik.");
  }
  const sourceDatabaseUrl = assertLocalPostgresUrl(env.DATABASE_URL ?? "");
  const adminUrl = new URL(sourceDatabaseUrl);
  adminUrl.pathname = "/postgres";
  return {
    adminDatabaseUrl: adminUrl.toString(),
    sourceDatabaseUrl,
  };
}

export function createPartyBackfillAcceptanceDatabaseName(now: Date) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("Party backfill kabul zamanı geçerli değil.");
  }
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "z")
    .toLowerCase();
  return assertPartyBackfillAcceptanceDatabaseName(
    `noa_party_acceptance_${timestamp}`,
  );
}

export function assertPartyBackfillAcceptanceDatabaseName(value: string) {
  if (!/^noa_party_acceptance_[0-9]{8}t[0-9]{6}z$/.test(value)) {
    throw new Error("Party backfill geçici veritabanı adı güvenli değil.");
  }
  return value;
}

export function createPartyBackfillAcceptanceDatabaseUrl(
  sourceDatabaseUrl: string,
  databaseName: string,
) {
  const safeName = assertPartyBackfillAcceptanceDatabaseName(databaseName);
  const url = new URL(assertLocalPostgresUrl(sourceDatabaseUrl));
  url.pathname = `/${safeName}`;
  return url.toString();
}

export function evaluatePartyBackfillAcceptance(
  evidence: PartyBackfillAcceptanceEvidence,
) {
  const rollbackClean =
    evidence.rollbackAuditCount === 0
    && evidence.rollbackIssueCount === 0
    && evidence.rollbackPartyCount === 0
    && evidence.rollbackRoleCount === 0
    && evidence.rollbackRunCount === 0;
  return {
    ...evidence,
    ready:
      evidence.migrationCount === PARTY_BACKFILL_ACCEPTANCE_MIGRATION_COUNT
      && evidence.missingTables.length === 0
      && evidence.cleanRunStatus === "VERIFIED"
      && evidence.cleanPartyCountAfterRetry === 3
      && evidence.cleanRoleCountAfterRetry === 3
      && evidence.cleanAuditCountAfterRetry === 1
      && evidence.blockedRunStatus === "BLOCKED"
      && evidence.blockedPartyCount === 0
      && evidence.blockedRoleCount === 0
      && evidence.closedRunStatus === "VERIFIED"
      && evidence.foreignPartyCount === 0
      && evidence.zeroApplyRunStatus === "UNCHANGED"
      && evidence.zeroApplyRunCountAfterRetry === 1
      && evidence.zeroApplyAuditCountAfterRetry === 1
      && evidence.zeroApplyPartyCountAfterRetry === 0
      && evidence.zeroApplyRoleCountAfterRetry === 0
      && evidence.zeroApplyIssueCountAfterRetry === 0
      && evidence.driftRejected
      && rollbackClean
      && evidence.sourceInventoryUnchanged
      && evidence.temporaryDatabaseRemoved,
    rollbackClean,
  };
}

function assertLocalPostgresUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Party backfill kabul DATABASE_URL değeri geçerli değil.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Party backfill kabulü PostgreSQL gerektirir.");
  }
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())) {
    throw new Error("Party backfill kabulü yalnız local PostgreSQL hedefinde çalışır.");
  }
  if (!url.pathname || url.pathname === "/") {
    throw new Error("Party backfill kabul kaynak veritabanı adı zorunludur.");
  }
  return url.toString();
}
