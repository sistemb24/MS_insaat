import type { R2DocumentStorageConfig } from "./document-storage-r2";
import {
  readProductionRecoveryPreflightConfig,
  type ProductionRecoveryPreflightConfig,
} from "./production-recovery-preflight";

export const PRODUCTION_BACKUP_CONFIRMATION = "production-backup-execute";
export const PRODUCTION_MIGRATION_CONFIRMATION = "production-migration-execute";
export const PRODUCTION_RESTORE_CONFIRMATION = "production-restore-rehearsal";
export type ProductionBackupConfig = ProductionRecoveryPreflightConfig;

export function readProductionBackupConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionBackupConfig {
  if (env.NOA_PRODUCTION_BACKUP_CONFIRMATION !== PRODUCTION_BACKUP_CONFIRMATION) {
    throw new Error("Production backup açık onayı eksik.");
  }
  return readProductionRecoveryPreflightConfig(env);
}

export function readProductionMigrationConfig(
  env: Readonly<Record<string, string | undefined>>,
) {
  if (env.NOA_PRODUCTION_MIGRATION_CONFIRMATION !== PRODUCTION_MIGRATION_CONFIRMATION) {
    throw new Error("Production migration açık onayı eksik.");
  }
  return readProductionBackupConfig(env);
}

export function readProductionRestoreConfig(
  env: Readonly<Record<string, string | undefined>>,
) {
  if (env.NOA_PRODUCTION_RESTORE_CONFIRMATION !== PRODUCTION_RESTORE_CONFIRMATION) {
    throw new Error("Production restore açık onayı eksik.");
  }
  const config = readProductionBackupConfig(env);
  const backupId = env.NOA_BACKUP_ID?.trim() ?? "";
  if (!/^\d{8}T\d{6}Z-[a-z0-9._-]{7,80}$/.test(backupId)) {
    throw new Error("Production restore için güvenli backup kimliği zorunludur.");
  }
  return { ...config, backupId };
}

export function createProductionBackupId(now: Date, releaseId: string) {
  const timestamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const safeReleaseId = normalizeReleaseId(releaseId);
  if (!safeReleaseId) throw new Error("Production backup release kimliği geçerli değil.");
  return `${timestamp}-${safeReleaseId}`;
}

export function readProductionBackupStorage(
  env: Readonly<Record<string, string | undefined>>,
): R2DocumentStorageConfig {
  return readProductionBackupConfig(env).backupStorage;
}

function normalizeReleaseId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
