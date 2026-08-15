export const PARTY_SHADOW_READ_ACCEPTANCE_CONFIRMATION =
  "party-shadow-read-runtime-isolated-acceptance";
export const PARTY_SHADOW_READ_ACCEPTANCE_MIGRATION_COUNT = 70;
export const PARTY_SHADOW_READ_ACCEPTANCE_TABLES = [
  "EntityRecord",
  "Party",
  "PartyRole",
  "PartyCutoverState",
] as const;

export type PartyShadowReadAcceptanceConfig = {
  adminDatabaseUrl: string;
  sourceDatabaseUrl: string;
};

export type PartyShadowReadAcceptanceEvidence = {
  globalSearchLegacyAuthoritative: boolean;
  legacyOnlyAuthoritative: boolean;
  legacyWriteWarningRedacted: boolean;
  migrationCount: number;
  missingStateAuthoritative: boolean;
  missingTables: readonly string[];
  observerFailureContained: boolean;
  partyInventoryUnchangedAfterLegacyWrite: boolean;
  redactedObservations: boolean;
  releaseMismatchFailSafe: boolean;
  scopeIsolationConfirmed: boolean;
  shadowDriftLegacyAuthoritative: boolean;
  shadowMatchSlugCount: number;
  sourceInventoryUnchanged: boolean;
  temporaryDatabaseRemoved: boolean;
};

export function readPartyShadowReadAcceptanceConfig(
  env: Readonly<Record<string, string | undefined>>,
): PartyShadowReadAcceptanceConfig {
  if (env.NOA_RUNTIME_ENV !== "test") {
    throw new Error("Party shadow-read izole kabulü yalnız NOA_RUNTIME_ENV=test ile çalışır.");
  }
  if (
    env.PARTY_SHADOW_READ_ACCEPTANCE_CONFIRMATION
    !== PARTY_SHADOW_READ_ACCEPTANCE_CONFIRMATION
  ) {
    throw new Error("Party shadow-read izole kabul onayı eksik.");
  }
  const sourceDatabaseUrl = assertLocalPostgresUrl(env.DATABASE_URL ?? "");
  const adminUrl = new URL(sourceDatabaseUrl);
  adminUrl.pathname = "/postgres";
  return { adminDatabaseUrl: adminUrl.toString(), sourceDatabaseUrl };
}

export function createPartyShadowReadAcceptanceDatabaseName(now: Date) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("Party shadow-read kabul zamanı geçerli değil.");
  }
  const timestamp = now.toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "z")
    .toLowerCase();
  return assertPartyShadowReadAcceptanceDatabaseName(
    `noa_party_shadow_read_acceptance_${timestamp}`,
  );
}

export function assertPartyShadowReadAcceptanceDatabaseName(value: string) {
  if (!/^noa_party_shadow_read_acceptance_[0-9]{8}t[0-9]{6}z$/.test(value)) {
    throw new Error("Party shadow-read geçici veritabanı adı güvenli değil.");
  }
  return value;
}

export function createPartyShadowReadAcceptanceDatabaseUrl(
  sourceDatabaseUrl: string,
  databaseName: string,
) {
  const url = new URL(assertLocalPostgresUrl(sourceDatabaseUrl));
  url.pathname = `/${assertPartyShadowReadAcceptanceDatabaseName(databaseName)}`;
  return url.toString();
}

export function evaluatePartyShadowReadAcceptance(
  evidence: PartyShadowReadAcceptanceEvidence,
) {
  return {
    ...evidence,
    ready:
      evidence.migrationCount === PARTY_SHADOW_READ_ACCEPTANCE_MIGRATION_COUNT
      && evidence.missingTables.length === 0
      && evidence.missingStateAuthoritative
      && evidence.legacyOnlyAuthoritative
      && evidence.shadowMatchSlugCount === 3
      && evidence.releaseMismatchFailSafe
      && evidence.shadowDriftLegacyAuthoritative
      && evidence.scopeIsolationConfirmed
      && evidence.globalSearchLegacyAuthoritative
      && evidence.partyInventoryUnchangedAfterLegacyWrite
      && evidence.legacyWriteWarningRedacted
      && evidence.observerFailureContained
      && evidence.redactedObservations
      && evidence.sourceInventoryUnchanged
      && evidence.temporaryDatabaseRemoved,
  };
}

function assertLocalPostgresUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Party shadow-read kabul DATABASE_URL değeri geçerli değil.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Party shadow-read kabulü PostgreSQL gerektirir.");
  }
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())) {
    throw new Error("Party shadow-read kabulü yalnız local PostgreSQL hedefinde çalışır.");
  }
  if (!url.pathname || url.pathname === "/") {
    throw new Error("Party shadow-read kabul kaynak veritabanı adı zorunludur.");
  }
  return url.toString();
}
