export const PRODUCTION_SCOPE_BOOTSTRAP_ACCEPTANCE_CONFIRMATION =
  "production-scope-bootstrap-isolated-acceptance";
export const PRODUCTION_SCOPE_BOOTSTRAP_ACCEPTANCE_MIGRATION_COUNT = 69;

export type ProductionScopeBootstrapAcceptanceConfig = {
  adminDatabaseUrl: string;
  sourceDatabaseUrl: string;
};

export type ProductionScopeBootstrapAcceptanceEvidence = {
  auditCountAfterRetry: number;
  companyCountAfterRetry: number;
  conflictRejected: boolean;
  createStatus: string;
  migrationCount: number;
  partialRejected: boolean;
  periodCountAfterRetry: number;
  retryStatus: string;
  rollbackAccessCount: number;
  rollbackAuditCount: number;
  rollbackCompanyCount: number;
  rollbackPeriodCount: number;
  rollbackUserCount: number;
  scopeAccessCountAfterRetry: number;
  sourceInventoryUnchanged: boolean;
  temporaryDatabaseRemoved: boolean;
  userCountAfterRetry: number;
};

export function readProductionScopeBootstrapAcceptanceConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionScopeBootstrapAcceptanceConfig {
  if (env.NOA_RUNTIME_ENV !== "test") {
    throw new Error("Production scope bootstrap izole kabulü yalnız test ortamında çalışır.");
  }
  if (
    env.PRODUCTION_SCOPE_BOOTSTRAP_ACCEPTANCE_CONFIRMATION
    !== PRODUCTION_SCOPE_BOOTSTRAP_ACCEPTANCE_CONFIRMATION
  ) {
    throw new Error("Production scope bootstrap izole kabul onayı eksik.");
  }
  const sourceDatabaseUrl = assertLocalPostgresUrl(env.DATABASE_URL ?? "");
  const admin = new URL(sourceDatabaseUrl);
  admin.pathname = "/postgres";
  return { adminDatabaseUrl: admin.toString(), sourceDatabaseUrl };
}

export function createProductionScopeBootstrapAcceptanceDatabaseName(now: Date) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("Production scope bootstrap kabul zamanı geçerli değil.");
  }
  const timestamp = now.toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "z")
    .toLowerCase();
  return assertProductionScopeBootstrapAcceptanceDatabaseName(
    `noa_scope_bootstrap_acceptance_${timestamp}`,
  );
}

export function assertProductionScopeBootstrapAcceptanceDatabaseName(value: string) {
  if (!/^noa_scope_bootstrap_acceptance_[0-9]{8}t[0-9]{6}z$/.test(value)) {
    throw new Error("Production scope bootstrap geçici veritabanı adı güvenli değil.");
  }
  return value;
}

export function createProductionScopeBootstrapAcceptanceDatabaseUrl(
  sourceDatabaseUrl: string,
  databaseName: string,
) {
  const url = new URL(assertLocalPostgresUrl(sourceDatabaseUrl));
  url.pathname = `/${assertProductionScopeBootstrapAcceptanceDatabaseName(databaseName)}`;
  return url.toString();
}

export function evaluateProductionScopeBootstrapAcceptance(
  evidence: ProductionScopeBootstrapAcceptanceEvidence,
) {
  const rollbackClean =
    evidence.rollbackAccessCount === 0
    && evidence.rollbackAuditCount === 0
    && evidence.rollbackCompanyCount === 0
    && evidence.rollbackPeriodCount === 0
    && evidence.rollbackUserCount === 0;
  return {
    ...evidence,
    ready:
      evidence.migrationCount === PRODUCTION_SCOPE_BOOTSTRAP_ACCEPTANCE_MIGRATION_COUNT
      && evidence.createStatus === "CREATED"
      && evidence.retryStatus === "UNCHANGED"
      && evidence.companyCountAfterRetry === 1
      && evidence.periodCountAfterRetry === 1
      && evidence.userCountAfterRetry === 1
      && evidence.scopeAccessCountAfterRetry === 1
      && evidence.auditCountAfterRetry === 1
      && evidence.partialRejected
      && evidence.conflictRejected
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
    throw new Error("Production scope bootstrap kabul DATABASE_URL geçerli değil.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Production scope bootstrap kabulü PostgreSQL gerektirir.");
  }
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())) {
    throw new Error("Production scope bootstrap kabulü yalnız local PostgreSQL hedefinde çalışır.");
  }
  if (!url.pathname || url.pathname === "/") {
    throw new Error("Production scope bootstrap kabul kaynak DB adı zorunludur.");
  }
  return url.toString();
}
