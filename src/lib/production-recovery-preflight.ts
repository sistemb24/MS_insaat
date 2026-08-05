import { readR2DocumentStorageConfig } from "./document-storage-runtime";
import type { R2DocumentStorageConfig } from "./document-storage-r2";

export const PRODUCTION_RECOVERY_PREFLIGHT_CONFIRMATION =
  "production-backup-preflight";
export const PRODUCTION_DOCUMENT_BUCKET = "noa-insaat-production-eu";
export const PRODUCTION_BACKUP_BUCKET =
  "noa-insaat-production-backups-eu";

export type ProductionRecoveryPreflightConfig = {
  backupStorage: R2DocumentStorageConfig;
  databaseUrl: string;
  documentStorage: R2DocumentStorageConfig;
  releaseId: string;
};

export type ProductionMigrationRecord = {
  finished: boolean;
  migrationName: string;
  rolledBack: boolean;
};

export type ProductionMigrationInventory = {
  localMigrationNames: readonly string[];
  migrationTableExists: boolean;
  productionMigrationRecords: readonly ProductionMigrationRecord[];
  publicTableNames: readonly string[];
};

export function readProductionRecoveryPreflightConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionRecoveryPreflightConfig {
  if (env.NOA_RUNTIME_ENV !== "production") {
    throw new Error(
      "Production recovery preflight yalnız NOA_RUNTIME_ENV=production ile çalışır.",
    );
  }
  if (
    env.NOA_PRODUCTION_PREFLIGHT_CONFIRMATION !==
    PRODUCTION_RECOVERY_PREFLIGHT_CONFIRMATION
  ) {
    throw new Error("Production recovery preflight açık onayı eksik.");
  }

  const databaseUrl = readRemoteProductionDatabaseUrl(env.DATABASE_URL ?? "");
  const documentStorage = readR2DocumentStorageConfig(env);
  const backupStorage = readR2DocumentStorageConfig({
    R2_ACCESS_KEY_ID: env.R2_BACKUP_ACCESS_KEY_ID,
    R2_BUCKET: env.R2_BACKUP_BUCKET,
    R2_ENDPOINT: env.R2_BACKUP_ENDPOINT,
    R2_SECRET_ACCESS_KEY: env.R2_BACKUP_SECRET_ACCESS_KEY,
  });

  if (documentStorage.bucket !== PRODUCTION_DOCUMENT_BUCKET) {
    throw new Error("Production doküman bucket kimliği onaylı sözleşmeyle eşleşmiyor.");
  }
  if (backupStorage.bucket !== PRODUCTION_BACKUP_BUCKET) {
    throw new Error("Production backup bucket kimliği onaylı sözleşmeyle eşleşmiyor.");
  }
  if (backupStorage.accessKeyId === documentStorage.accessKeyId) {
    throw new Error("Production document-read ve backup-write kimlikleri ayrı olmalıdır.");
  }

  const releaseId = normalizeReleaseId(
    env.NOA_RELEASE_ID ?? env.GITHUB_SHA ?? "",
  );
  if (!releaseId) {
    throw new Error("Production preflight için anonim release kimliği zorunludur.");
  }

  return {
    backupStorage,
    databaseUrl,
    documentStorage,
    releaseId,
  };
}

export function evaluateProductionMigrationPreflight(
  inventory: ProductionMigrationInventory,
) {
  const localMigrationNames = normalizeMigrationNames(
    inventory.localMigrationNames,
    "yerel migration",
  );
  const productionMigrationNames = normalizeMigrationNames(
    inventory.productionMigrationRecords.map((record) => record.migrationName),
    "production migration",
  );
  const duplicateProductionMigrations = findDuplicates(productionMigrationNames);
  const localMigrationSet = new Set(localMigrationNames);
  const appliedMigrationNames = inventory.productionMigrationRecords
    .filter((record) => record.finished && !record.rolledBack)
    .map((record) => record.migrationName);
  const appliedMigrationSet = new Set(appliedMigrationNames);
  const unknownProductionMigrations = productionMigrationNames.filter(
    (migrationName) => !localMigrationSet.has(migrationName),
  );
  const unhealthyProductionMigrations = inventory.productionMigrationRecords
    .filter((record) => !record.finished || record.rolledBack)
    .map((record) => record.migrationName);
  const pendingMigrationNames = localMigrationNames.filter(
    (migrationName) => !appliedMigrationSet.has(migrationName),
  );
  const unmanagedSchema =
    inventory.publicTableNames.length > 0 && !inventory.migrationTableExists;

  return {
    appliedMigrationCount: appliedMigrationNames.length,
    backupCreationAllowed: false as const,
    duplicateProductionMigrations,
    localMigrationCount: localMigrationNames.length,
    migrationApplyAllowed: false as const,
    pendingMigrationCount: pendingMigrationNames.length,
    pendingMigrationNames,
    publicTableCount: new Set(inventory.publicTableNames).size,
    readOnly: true as const,
    ready:
      duplicateProductionMigrations.length === 0 &&
      unknownProductionMigrations.length === 0 &&
      unhealthyProductionMigrations.length === 0 &&
      !unmanagedSchema,
    unhealthyProductionMigrations,
    unknownProductionMigrations,
    unmanagedSchema,
  };
}

function readRemoteProductionDatabaseUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Production DATABASE_URL geçerli değil.");
  }

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())
  ) {
    throw new Error("Production preflight uzak PostgreSQL veritabanı gerektirir.");
  }

  return value;
}

function normalizeReleaseId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeMigrationNames(values: readonly string[], label: string) {
  return values.map((value) => {
    const normalized = value.trim();
    if (!/^\d{12,14}_[a-z0-9_]+$/.test(normalized)) {
      throw new Error(`${label} adı güvenli değil.`);
    }
    return normalized;
  });
}

function findDuplicates(values: readonly string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}
