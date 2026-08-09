import { readR2DocumentStorageConfig } from "./document-storage-runtime";
import type { R2DocumentStorageConfig } from "./document-storage-r2";
import { PRODUCTION_BACKUP_BUCKET } from "./production-recovery-preflight";

export const PRODUCTION_BACKUP_FRESHNESS_MAX_AGE_HOURS = 24;
export const PRODUCTION_BACKUP_FRESHNESS_SCHEDULED_CONFIRMATION =
  "production-backup-freshness-scheduled";
export const PRODUCTION_BACKUP_FRESHNESS_ONCE_CONFIRMATION =
  "production-backup-freshness-check";

type IntegrityEntry = {
  key: string;
  sha256: string;
  sizeBytes: number;
};

export type ProductionBackupManifest = {
  backupId: string;
  binaryObjects: unknown[];
  createdAt: string;
  database: IntegrityEntry;
  releaseId: string;
  schemaVersion: 1;
};

export type ProductionBackupFreshnessConfig = {
  backupStorage: R2DocumentStorageConfig;
  maxAgeHours: number;
};

export function readProductionBackupFreshnessConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionBackupFreshnessConfig {
  if (env.NOA_RUNTIME_ENV !== "production") {
    throw new Error("Production backup freshness yalnız production ortamında çalışır.");
  }

  const confirmation = env.NOA_PRODUCTION_BACKUP_FRESHNESS_CONFIRMATION;
  const eventName = env.GITHUB_EVENT_NAME;
  const scheduled =
    eventName === "schedule" &&
    confirmation === PRODUCTION_BACKUP_FRESHNESS_SCHEDULED_CONFIRMATION;
  const manual =
    (eventName === undefined || eventName === "workflow_dispatch") &&
    confirmation === PRODUCTION_BACKUP_FRESHNESS_ONCE_CONFIRMATION;

  if (!scheduled && !manual) {
    throw new Error("Production backup freshness açık onayı eksik.");
  }

  const backupStorage = readR2DocumentStorageConfig({
    R2_ACCESS_KEY_ID: env.R2_BACKUP_ACCESS_KEY_ID,
    R2_BUCKET: env.R2_BACKUP_BUCKET,
    R2_ENDPOINT: env.R2_BACKUP_ENDPOINT,
    R2_SECRET_ACCESS_KEY: env.R2_BACKUP_SECRET_ACCESS_KEY,
  });

  if (backupStorage.bucket !== PRODUCTION_BACKUP_BUCKET) {
    throw new Error("Production freshness backup bucket sözleşmeyle eşleşmiyor.");
  }

  return {
    backupStorage,
    maxAgeHours: PRODUCTION_BACKUP_FRESHNESS_MAX_AGE_HOURS,
  };
}

export function evaluateProductionBackupFreshness(
  candidate: unknown,
  now: Date,
  maxAgeHours = PRODUCTION_BACKUP_FRESHNESS_MAX_AGE_HOURS,
) {
  const manifest = readProductionBackupManifest(candidate);
  const nowMs = now.getTime();
  const createdAtMs = Date.parse(manifest.createdAt);

  if (!Number.isFinite(nowMs) || !Number.isFinite(createdAtMs)) {
    throw new Error("Production backup freshness zamanı geçerli değil.");
  }

  const ageMs = nowMs - createdAtMs;
  if (ageMs < 0) {
    throw new Error("Production backup manifest zamanı gelecekte olamaz.");
  }

  const ageHours = ageMs / 3_600_000;
  return {
    ageHours,
    backupId: manifest.backupId,
    binaryObjectCount: manifest.binaryObjects.length,
    databaseBytes: manifest.database.sizeBytes,
    fresh: ageHours <= maxAgeHours,
    maxAgeHours,
    releaseId: manifest.releaseId,
    status: ageHours <= maxAgeHours ? ("fresh" as const) : ("stale" as const),
  };
}

export function readProductionBackupManifest(
  candidate: unknown,
): ProductionBackupManifest {
  if (typeof candidate !== "object" || candidate === null) {
    throw new Error("Production backup manifest biçimi geçerli değil.");
  }

  const manifest = candidate as Partial<ProductionBackupManifest>;
  const backupId = manifest.backupId ?? "";
  const database = manifest.database;
  const expectedDatabaseKey = `database/${backupId}/database.dump`;
  const backupTimestamp = parseBackupIdTimestamp(backupId);
  const createdAtTimestamp = Date.parse(manifest.createdAt ?? "");
  const releaseId = manifest.releaseId ?? "";

  if (
    manifest.schemaVersion !== 1 ||
    !/^\d{8}T\d{6}Z-[a-z0-9._-]{7,80}$/.test(backupId) ||
    backupTimestamp === null ||
    typeof manifest.createdAt !== "string" ||
    !Number.isFinite(createdAtTimestamp) ||
    createdAtTimestamp < backupTimestamp ||
    createdAtTimestamp - backupTimestamp > 3_600_000 ||
    typeof manifest.releaseId !== "string" ||
    !/^[a-z0-9._-]{7,80}$/.test(releaseId) ||
    backupId.slice(17) !== releaseId ||
    !Array.isArray(manifest.binaryObjects) ||
    typeof database !== "object" ||
    database === null ||
    database.key !== expectedDatabaseKey ||
    !/^[a-f0-9]{64}$/.test(database.sha256) ||
    !Number.isSafeInteger(database.sizeBytes) ||
    database.sizeBytes <= 0
  ) {
    throw new Error("Production backup manifest sözleşmeyle eşleşmiyor.");
  }

  return manifest as ProductionBackupManifest;
}

function parseBackupIdTimestamp(backupId: string) {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z-/.exec(backupId);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const timestamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  const normalized = new Date(timestamp).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  return normalized === backupId.slice(0, 16) ? timestamp : null;
}
