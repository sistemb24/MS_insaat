export const PRODUCTION_PARTY_SHADOW_RUNTIME_READINESS_ACCEPTANCE_CONFIRMATION =
  "party-shadow-runtime-readiness-isolated-acceptance";
export const PRODUCTION_PARTY_SHADOW_RUNTIME_READINESS_ACCEPTANCE_MIGRATION_COUNT = 70;
export const PRODUCTION_PARTY_SHADOW_RUNTIME_READINESS_ACCEPTANCE_TABLES = [
  "AuditLog",
  "EntityRecord",
  "Party",
  "PartyBackfillRun",
  "PartyCutoverEvent",
  "PartyCutoverState",
  "PartyRole",
] as const;

export type ProductionPartyShadowRuntimeReadinessAcceptanceConfig = {
  adminDatabaseUrl: string;
  sourceDatabaseUrl: string;
};

export type ProductionPartyShadowRuntimeReadinessAcceptanceEvidence = {
  alertFailureContained: boolean;
  alertFieldsRedacted: boolean;
  alertSafetyStatusCount: number;
  alertThrottleExact: boolean;
  attestationRoundTripExact: boolean;
  blockerScenariosRejected: boolean;
  initialStateCountsExact: boolean;
  manifestDeterministic: boolean;
  manifestFreshnessExact: boolean;
  manifestRedacted: boolean;
  migrationCount: number;
  missingTables: readonly string[];
  readOnlyManifestReady: boolean;
  runtimeRequestContractExact: boolean;
  sourceInventoryUnchanged: boolean;
  temporaryDatabaseRemoved: boolean;
  writableCredentialRejected: boolean;
};

export function readProductionPartyShadowRuntimeReadinessAcceptanceConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionPartyShadowRuntimeReadinessAcceptanceConfig {
  if (env.NOA_RUNTIME_ENV !== "test") {
    throw new Error(
      "Party shadow runtime readiness izole kabulü yalnız NOA_RUNTIME_ENV=test ile çalışır.",
    );
  }
  if (
    env.PARTY_SHADOW_RUNTIME_READINESS_ACCEPTANCE_CONFIRMATION
    !== PRODUCTION_PARTY_SHADOW_RUNTIME_READINESS_ACCEPTANCE_CONFIRMATION
  ) {
    throw new Error("Party shadow runtime readiness izole kabul onayı eksik.");
  }
  const sourceDatabaseUrl = assertLocalPostgresUrl(env.DATABASE_URL ?? "");
  const adminUrl = new URL(sourceDatabaseUrl);
  adminUrl.pathname = "/postgres";
  adminUrl.searchParams.delete("options");
  return { adminDatabaseUrl: adminUrl.toString(), sourceDatabaseUrl };
}

export function createProductionPartyShadowRuntimeReadinessAcceptanceDatabaseName(
  now: Date,
) {
  if (!(now instanceof Date) || Number.isNaN(now.valueOf())) {
    throw new Error("Party shadow runtime readiness kabul zamanı geçerli değil.");
  }
  const timestamp = now.toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "z")
    .toLowerCase();
  return assertProductionPartyShadowRuntimeReadinessAcceptanceDatabaseName(
    `noa_party_shadow_runtime_readiness_${timestamp}`,
  );
}

export function assertProductionPartyShadowRuntimeReadinessAcceptanceDatabaseName(
  value: string,
) {
  if (!/^noa_party_shadow_runtime_readiness_[0-9]{8}t[0-9]{6}z$/.test(value)) {
    throw new Error("Party shadow runtime readiness geçici DB adı güvenli değil.");
  }
  return value;
}

export function createProductionPartyShadowRuntimeReadinessAcceptanceDatabaseUrl(
  sourceDatabaseUrl: string,
  databaseName: string,
) {
  const url = new URL(assertLocalPostgresUrl(sourceDatabaseUrl));
  url.pathname = `/${assertProductionPartyShadowRuntimeReadinessAcceptanceDatabaseName(
    databaseName,
  )}`;
  url.searchParams.delete("options");
  return url.toString();
}

export function createReadOnlyPartyShadowRuntimeReadinessAcceptanceDatabaseUrl(
  databaseUrl: string,
) {
  const url = new URL(assertLocalPostgresUrl(databaseUrl));
  url.searchParams.set("options", "-c default_transaction_read_only=on");
  return url.toString();
}

export function evaluateProductionPartyShadowRuntimeReadinessAcceptance(
  evidence: ProductionPartyShadowRuntimeReadinessAcceptanceEvidence,
) {
  return {
    ...evidence,
    ready:
      evidence.migrationCount
        === PRODUCTION_PARTY_SHADOW_RUNTIME_READINESS_ACCEPTANCE_MIGRATION_COUNT
      && evidence.missingTables.length === 0
      && evidence.readOnlyManifestReady
      && evidence.initialStateCountsExact
      && evidence.manifestDeterministic
      && evidence.manifestFreshnessExact
      && evidence.manifestRedacted
      && evidence.runtimeRequestContractExact
      && evidence.attestationRoundTripExact
      && evidence.blockerScenariosRejected
      && evidence.writableCredentialRejected
      && evidence.alertSafetyStatusCount === 5
      && evidence.alertFieldsRedacted
      && evidence.alertThrottleExact
      && evidence.alertFailureContained
      && evidence.sourceInventoryUnchanged
      && evidence.temporaryDatabaseRemoved,
  };
}

function assertLocalPostgresUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Party shadow runtime readiness kabul DATABASE_URL geçerli değil.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Party shadow runtime readiness kabulü PostgreSQL gerektirir.");
  }
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())) {
    throw new Error("Party shadow runtime readiness kabulü yalnız local PostgreSQL kullanır.");
  }
  if (!url.pathname || url.pathname === "/") {
    throw new Error("Party shadow runtime readiness kaynak DB adı zorunludur.");
  }
  return url.toString();
}
