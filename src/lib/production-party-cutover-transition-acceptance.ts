export const PRODUCTION_PARTY_CUTOVER_TRANSITION_ACCEPTANCE_CONFIRMATION =
  "production-party-cutover-transition-isolated-acceptance";

export type ProductionPartyCutoverTransitionAcceptanceConfig = {
  adminDatabaseUrl: string;
  sourceDatabaseUrl: string;
};

export type ProductionPartyCutoverTransitionAcceptanceEvidence = {
  activationCountsExact: boolean;
  activationPostflightReady: boolean;
  activationRetryPostflightReady: boolean;
  activationRetryStatus: string;
  activationStatus: string;
  checksumDriftRejected: boolean;
  migrationCount: number;
  rollbackCountsExact: boolean;
  rollbackPostflightReady: boolean;
  rollbackRetryPostflightReady: boolean;
  rollbackRetryStatus: string;
  rollbackStatus: string;
  sourceInventoryUnchanged: boolean;
  temporaryDatabaseRemoved: boolean;
  writablePostflightRejected: boolean;
};

export function readProductionPartyCutoverTransitionAcceptanceConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionPartyCutoverTransitionAcceptanceConfig {
  if (env.NOA_RUNTIME_ENV !== "test") {
    throw new Error("Party cutover transition kabulü yalnız test ortamında çalışır.");
  }
  if (
    env.PRODUCTION_PARTY_CUTOVER_TRANSITION_ACCEPTANCE_CONFIRMATION
    !== PRODUCTION_PARTY_CUTOVER_TRANSITION_ACCEPTANCE_CONFIRMATION
  ) {
    throw new Error("Party cutover transition kabul onayı eksik.");
  }
  const sourceDatabaseUrl = assertLocalPostgresUrl(env.DATABASE_URL ?? "");
  const adminUrl = new URL(sourceDatabaseUrl);
  adminUrl.pathname = "/postgres";
  return { adminDatabaseUrl: adminUrl.toString(), sourceDatabaseUrl };
}

export function createProductionPartyCutoverTransitionAcceptanceDatabaseName(
  now: Date,
) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("Party cutover transition kabul zamanı geçerli değil.");
  }
  const timestamp = now.toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "z")
    .toLowerCase();
  return assertProductionPartyCutoverTransitionAcceptanceDatabaseName(
    `noa_party_cutover_transition_acceptance_${timestamp}`,
  );
}

export function assertProductionPartyCutoverTransitionAcceptanceDatabaseName(
  value: string,
) {
  if (!/^noa_party_cutover_transition_acceptance_[0-9]{8}t[0-9]{6}z$/.test(value)) {
    throw new Error("Party cutover transition geçici DB adı güvenli değil.");
  }
  return value;
}

export function createProductionPartyCutoverTransitionAcceptanceDatabaseUrl(
  sourceDatabaseUrl: string,
  databaseName: string,
) {
  const url = new URL(assertLocalPostgresUrl(sourceDatabaseUrl));
  url.pathname = `/${assertProductionPartyCutoverTransitionAcceptanceDatabaseName(
    databaseName,
  )}`;
  return url.toString();
}

export function createReadOnlyPartyCutoverTransitionAcceptanceDatabaseUrl(
  databaseUrl: string,
) {
  const url = new URL(assertLocalPostgresUrl(databaseUrl));
  url.searchParams.set("options", "-c default_transaction_read_only=on");
  return url.toString();
}

export function evaluateProductionPartyCutoverTransitionAcceptance(
  evidence: ProductionPartyCutoverTransitionAcceptanceEvidence,
) {
  return {
    ...evidence,
    ready:
      evidence.migrationCount === 70
      && evidence.activationStatus === "ACTIVATED"
      && evidence.activationRetryStatus === "UNCHANGED"
      && evidence.activationCountsExact
      && evidence.activationPostflightReady
      && evidence.activationRetryPostflightReady
      && evidence.rollbackStatus === "ROLLED_BACK"
      && evidence.rollbackRetryStatus === "UNCHANGED"
      && evidence.rollbackCountsExact
      && evidence.rollbackPostflightReady
      && evidence.rollbackRetryPostflightReady
      && evidence.checksumDriftRejected
      && evidence.writablePostflightRejected
      && evidence.sourceInventoryUnchanged
      && evidence.temporaryDatabaseRemoved,
  };
}

function assertLocalPostgresUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Party cutover transition kabul DATABASE_URL geçerli değil.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Party cutover transition kabulü PostgreSQL gerektirir.");
  }
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())) {
    throw new Error("Party cutover transition kabulü yalnız local PostgreSQL kullanır.");
  }
  if (!url.pathname || url.pathname === "/") {
    throw new Error("Party cutover transition kabul kaynak DB adı zorunludur.");
  }
  return url.toString();
}
