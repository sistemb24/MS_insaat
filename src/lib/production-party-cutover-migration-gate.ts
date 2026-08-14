import type { ProductionPartyCutoverPreflightConfig } from
  "./production-party-cutover-preflight";
import {
  PRODUCTION_PARTY_CUTOVER_EXPECTED_MIGRATION_COUNT,
  PRODUCTION_PARTY_CUTOVER_MIGRATION_NAME,
  assertProductionPartyCutoverMigrationContext,
  readProductionPartyCutoverStage,
  type ProductionPartyCutoverStage,
  type runProductionPartyCutoverPreflight,
} from "./production-party-cutover-preflight";

export type ProductionPartyCutoverPreflightResult = Awaited<
  ReturnType<typeof runProductionPartyCutoverPreflight>
>;

export type ProductionPartyCutoverMigrationGateConfig =
  ProductionPartyCutoverPreflightConfig & {
    backupId: string;
    expectedBusinessChecksum: string;
    expectedPreflightManifestChecksum: string;
    stage: ProductionPartyCutoverStage;
  };

export function readProductionPartyCutoverMigrationGateConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionPartyCutoverMigrationGateConfig {
  const base = assertProductionPartyCutoverMigrationContext(env);
  const backupId = normalizeBackupId(env.NOA_PARTY_CUTOVER_BACKUP_ID ?? "");
  if (!backupId.endsWith(`-${base.releaseId}`)) {
    throw new Error("Party cutover backup kimliği exact release SHA ile eşleşmiyor.");
  }
  return {
    ...base,
    backupId,
    expectedBusinessChecksum: normalizeChecksum(
      env.NOA_PARTY_CUTOVER_EXPECTED_BUSINESS_CHECKSUM ?? "",
      "Beklenen business checksum",
    ),
    expectedPreflightManifestChecksum: normalizeChecksum(
      env.NOA_PARTY_CUTOVER_EXPECTED_PREFLIGHT_MANIFEST_CHECKSUM ?? "",
      "Beklenen preflight manifest checksum",
    ),
    stage: readProductionPartyCutoverStage(
      env.NOA_PARTY_CUTOVER_MIGRATION_STAGE,
    ),
  };
}

export function evaluateProductionPartyCutoverMigrationGate(input: {
  config: ProductionPartyCutoverMigrationGateConfig;
  preflight: ProductionPartyCutoverPreflightResult;
}) {
  const blockers = [...input.preflight.blockers];
  const { config, preflight } = input;
  if (!preflight.ready) blockers.push("PREFLIGHT_NOT_READY");
  if (!preflight.readOnly) blockers.push("PREFLIGHT_NOT_READ_ONLY");
  if (preflight.releaseId !== config.releaseId) blockers.push("RELEASE_ID_MISMATCH");
  if (preflight.migration.schemaState !== config.stage) {
    blockers.push("SCHEMA_STATE_MISMATCH");
  }
  if (preflight.businessChecksum !== config.expectedBusinessChecksum) {
    blockers.push("BUSINESS_CHECKSUM_MISMATCH");
  }
  if (config.stage === "PRE_MIGRATION") {
    if (preflight.manifestChecksum !== config.expectedPreflightManifestChecksum) {
      blockers.push("PREFLIGHT_MANIFEST_CHECKSUM_MISMATCH");
    }
    if (
      preflight.migration.appliedMigrationCount
        !== PRODUCTION_PARTY_CUTOVER_EXPECTED_MIGRATION_COUNT - 1
      || preflight.migration.pendingMigrationNames.length !== 1
      || preflight.migration.pendingMigrationNames[0]
        !== PRODUCTION_PARTY_CUTOVER_MIGRATION_NAME
    ) {
      blockers.push("PRE_MIGRATION_INVENTORY_MISMATCH");
    }
  } else if (
    preflight.migration.appliedMigrationCount
      !== PRODUCTION_PARTY_CUTOVER_EXPECTED_MIGRATION_COUNT
    || preflight.migration.pendingMigrationNames.length !== 0
  ) {
    blockers.push("POST_MIGRATION_INVENTORY_MISMATCH");
  }
  if (
    preflight.cutover.stateCount !== 0
    || preflight.cutover.eventCount !== 0
    || preflight.cutover.auditCount !== 0
    || preflight.cutover.state
  ) {
    blockers.push("CUTOVER_STATE_NOT_EMPTY");
  }
  return {
    backupId: config.backupId,
    blockers: unique(blockers),
    businessChecksum: preflight.businessChecksum,
    eligibilityManifestChecksum: preflight.eligibilityManifestChecksum,
    manifestChecksum: preflight.manifestChecksum,
    migration: preflight.migration,
    ready: blockers.length === 0,
    releaseId: config.releaseId,
    stage: config.stage,
    stateManifestChecksum: preflight.stateManifestChecksum,
  };
}

function normalizeChecksum(value: string, label: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error(`${label} geçerli değil.`);
  return normalized;
}

function normalizeBackupId(value: string) {
  const normalized = value.trim();
  if (!/^\d{8}T\d{6}Z-[a-f0-9]{40}$/.test(normalized)) {
    throw new Error("Party cutover backup kimliği güvenli değil.");
  }
  return normalized;
}

function unique(values: readonly string[]) {
  return [...new Set(values)].sort();
}
