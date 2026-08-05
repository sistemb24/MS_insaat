import {
  readR2DocumentStorageConfig,
} from "./document-storage-runtime";
import type { R2DocumentStorageConfig } from "./document-storage-r2";

export type StagingBackupConfig = {
  backupStorage: R2DocumentStorageConfig;
  databaseUrl: string;
  documentStorage: R2DocumentStorageConfig;
  releaseId: string;
};

export type StagingBackupVerificationConfig = {
  backupId?: string;
  backupStorage: R2DocumentStorageConfig;
};

export function readStagingDatabaseUrl(
  env: Readonly<Record<string, string | undefined>>,
) {
  if (env.NOA_RUNTIME_ENV !== "staging") {
    throw new Error("Staging veritabanı yalnız NOA_RUNTIME_ENV=staging ile kullanılabilir.");
  }

  const databaseUrl = env.DATABASE_URL?.trim() ?? "";
  let parsedDatabaseUrl: URL;
  try {
    parsedDatabaseUrl = new URL(databaseUrl);
  } catch {
    throw new Error("Staging DATABASE_URL geçerli değil.");
  }

  if (
    !["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol) ||
    ["localhost", "127.0.0.1", "::1"].includes(
      parsedDatabaseUrl.hostname.toLowerCase(),
    )
  ) {
    throw new Error("Staging işlemi uzak PostgreSQL veritabanı gerektirir.");
  }

  return databaseUrl;
}

export function readStagingBackupConfig(
  env: Readonly<Record<string, string | undefined>>,
): StagingBackupConfig {
  const databaseUrl = readStagingDatabaseUrl(env);

  const documentStorage = readR2DocumentStorageConfig(env);
  const backupStorage = readR2DocumentStorageConfig({
    R2_ACCESS_KEY_ID: env.R2_BACKUP_ACCESS_KEY_ID,
    R2_BUCKET: env.R2_BACKUP_BUCKET,
    R2_ENDPOINT: env.R2_BACKUP_ENDPOINT,
    R2_SECRET_ACCESS_KEY: env.R2_BACKUP_SECRET_ACCESS_KEY,
  });

  if (backupStorage.bucket === documentStorage.bucket) {
    throw new Error("Doküman ve backup bucket'ları ayrı olmalıdır.");
  }

  const releaseId = normalizeReleaseId(
    env.NOA_RELEASE_ID ?? env.VERCEL_GIT_COMMIT_SHA ?? env.GITHUB_SHA ?? "",
  );
  if (!releaseId) {
    throw new Error("Staging backup için anonim release kimliği zorunludur.");
  }

  return {
    backupStorage,
    databaseUrl,
    documentStorage,
    releaseId,
  };
}

export function createStagingBackupId(now: Date, releaseId: string) {
  const timestamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const safeReleaseId = normalizeReleaseId(releaseId);

  if (!safeReleaseId) {
    throw new Error("Backup release kimliği geçerli değil.");
  }

  return `${timestamp}-${safeReleaseId}`;
}

export function readStagingBackupVerificationConfig(
  env: Readonly<Record<string, string | undefined>>,
): StagingBackupVerificationConfig {
  if (env.NOA_RUNTIME_ENV !== "staging") {
    throw new Error("Backup doğrulaması yalnız NOA_RUNTIME_ENV=staging ile çalışır.");
  }

  const backupStorage = readR2DocumentStorageConfig({
    R2_ACCESS_KEY_ID: env.R2_BACKUP_ACCESS_KEY_ID,
    R2_BUCKET: env.R2_BACKUP_BUCKET,
    R2_ENDPOINT: env.R2_BACKUP_ENDPOINT,
    R2_SECRET_ACCESS_KEY: env.R2_BACKUP_SECRET_ACCESS_KEY,
  });
  const backupId = normalizeReleaseId(env.NOA_BACKUP_ID ?? "");

  return {
    backupId: backupId || undefined,
    backupStorage,
  };
}

function normalizeReleaseId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
