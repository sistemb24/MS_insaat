export const PRODUCTION_PARTY_CUTOVER_ACCEPTANCE_CONFIRMATION =
  "production-party-cutover-isolated-acceptance";

export type ProductionPartyCutoverAcceptanceConfig = {
  adminDatabaseUrl: string;
  sourceDatabaseUrl: string;
};

export type ProductionPartyCutoverAcceptanceEvidence = {
  businessChecksumUnchanged: boolean;
  cutoverStateRejected: boolean;
  driftRejected: boolean;
  postAppliedMigrationCount: number;
  postCutoverAuditCount: number;
  postCutoverEventCount: number;
  postCutoverStateCount: number;
  postGateReady: boolean;
  postPendingMigrationCount: number;
  postPreflightReady: boolean;
  postSchemaState: string;
  preAppliedMigrationCount: number;
  preGateReady: boolean;
  prePendingMigrationNames: readonly string[];
  prePreflightReady: boolean;
  preSchemaState: string;
  readOnlyCredentialRequired: boolean;
  sourceInventoryUnchanged: boolean;
  temporaryDatabaseRemoved: boolean;
  temporaryMigrationWorkspaceRemoved: boolean;
};

export function readProductionPartyCutoverAcceptanceConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionPartyCutoverAcceptanceConfig {
  if (env.NOA_RUNTIME_ENV !== "test") {
    throw new Error("Party cutover production-tarzı kabulü yalnız test ortamında çalışır.");
  }
  if (
    env.PRODUCTION_PARTY_CUTOVER_ACCEPTANCE_CONFIRMATION
    !== PRODUCTION_PARTY_CUTOVER_ACCEPTANCE_CONFIRMATION
  ) {
    throw new Error("Party cutover production-tarzı kabul onayı eksik.");
  }
  const sourceDatabaseUrl = assertLocalPostgresUrl(env.DATABASE_URL ?? "");
  const adminUrl = new URL(sourceDatabaseUrl);
  adminUrl.pathname = "/postgres";
  return { adminDatabaseUrl: adminUrl.toString(), sourceDatabaseUrl };
}

export function createProductionPartyCutoverAcceptanceDatabaseName(now: Date) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("Party cutover production-tarzı kabul zamanı geçerli değil.");
  }
  const timestamp = now.toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "z")
    .toLowerCase();
  return assertProductionPartyCutoverAcceptanceDatabaseName(
    `noa_party_cutover_preflight_acceptance_${timestamp}`,
  );
}

export function assertProductionPartyCutoverAcceptanceDatabaseName(value: string) {
  if (!/^noa_party_cutover_preflight_acceptance_[0-9]{8}t[0-9]{6}z$/.test(value)) {
    throw new Error("Party cutover production-tarzı geçici DB adı güvenli değil.");
  }
  return value;
}

export function createProductionPartyCutoverAcceptanceDatabaseUrl(
  sourceDatabaseUrl: string,
  databaseName: string,
) {
  const url = new URL(assertLocalPostgresUrl(sourceDatabaseUrl));
  url.pathname = `/${assertProductionPartyCutoverAcceptanceDatabaseName(databaseName)}`;
  return url.toString();
}

export function createReadOnlyPartyCutoverAcceptanceDatabaseUrl(databaseUrl: string) {
  const url = new URL(assertLocalPostgresUrl(databaseUrl));
  url.searchParams.set("options", "-c default_transaction_read_only=on");
  return url.toString();
}

export function evaluateProductionPartyCutoverAcceptance(
  evidence: ProductionPartyCutoverAcceptanceEvidence,
) {
  return {
    ...evidence,
    ready:
      evidence.preAppliedMigrationCount === 69
      && evidence.prePendingMigrationNames.length === 1
      && evidence.prePendingMigrationNames[0]
        === "20260814160000_add_party_cutover_state"
      && evidence.preSchemaState === "PRE_MIGRATION"
      && evidence.prePreflightReady
      && evidence.preGateReady
      && evidence.postAppliedMigrationCount === 70
      && evidence.postPendingMigrationCount === 0
      && evidence.postSchemaState === "POST_MIGRATION"
      && evidence.postPreflightReady
      && evidence.postGateReady
      && evidence.businessChecksumUnchanged
      && evidence.postCutoverStateCount === 0
      && evidence.postCutoverEventCount === 0
      && evidence.postCutoverAuditCount === 0
      && evidence.readOnlyCredentialRequired
      && evidence.driftRejected
      && evidence.cutoverStateRejected
      && evidence.sourceInventoryUnchanged
      && evidence.temporaryDatabaseRemoved
      && evidence.temporaryMigrationWorkspaceRemoved,
  };
}

function assertLocalPostgresUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Party cutover production-tarzı kabul DATABASE_URL geçerli değil.");
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error("Party cutover production-tarzı kabulü PostgreSQL gerektirir.");
  }
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase())) {
    throw new Error("Party cutover production-tarzı kabulü yalnız local PostgreSQL kullanır.");
  }
  if (!url.pathname || url.pathname === "/") {
    throw new Error("Party cutover production-tarzı kabul kaynak DB adı zorunludur.");
  }
  return url.toString();
}
