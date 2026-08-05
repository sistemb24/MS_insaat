import { describe, expect, test } from "vitest";

import {
  createStagingBackupId,
  readStagingDatabaseUrl,
  readStagingBackupConfig,
  readStagingBackupVerificationConfig,
} from "./staging-backup";

const validEnv = {
  DATABASE_URL: "postgresql://user:secret@db.example.com/noa?sslmode=require",
  NOA_RELEASE_ID: "Release/2026-08-04",
  NOA_RUNTIME_ENV: "staging",
  R2_ACCESS_KEY_ID: "document-access",
  R2_BACKUP_ACCESS_KEY_ID: "backup-access",
  R2_BACKUP_BUCKET: "noa-insaat-staging-backups-eu",
  R2_BACKUP_ENDPOINT: "https://account.eu.r2.cloudflarestorage.com",
  R2_BACKUP_SECRET_ACCESS_KEY: "backup-secret",
  R2_BUCKET: "noa-insaat-staging-eu",
  R2_ENDPOINT: "https://account.eu.r2.cloudflarestorage.com",
  R2_SECRET_ACCESS_KEY: "document-secret",
} as const;

describe("staging backup contract", () => {
  test("requires isolated EU document and backup storage", () => {
    expect(readStagingBackupConfig(validEnv)).toMatchObject({
      backupStorage: { bucket: "noa-insaat-staging-backups-eu" },
      documentStorage: { bucket: "noa-insaat-staging-eu" },
      releaseId: "release-2026-08-04",
    });
  });

  test("rejects backup credentials that point to the runtime bucket", () => {
    expect(() =>
      readStagingBackupConfig({
        ...validEnv,
        R2_BACKUP_BUCKET: validEnv.R2_BUCKET,
      }),
    ).toThrow("Doküman ve backup bucket'ları ayrı olmalıdır");
  });

  test("rejects local database targets", () => {
    expect(() =>
      readStagingBackupConfig({
        ...validEnv,
        DATABASE_URL: "postgresql://user:secret@localhost/noa",
      }),
    ).toThrow("uzak PostgreSQL");
  });

  test("exposes only a validated remote staging database URL", () => {
    expect(readStagingDatabaseUrl(validEnv)).toBe(validEnv.DATABASE_URL);
  });

  test("creates a deterministic, secret-free backup identifier", () => {
    expect(
      createStagingBackupId(
        new Date("2026-08-04T19:30:45.123Z"),
        "Release/2026-08-04",
      ),
    ).toBe("20260804T193045Z-release-2026-08-04");
  });

  test("reads backup-only credentials for integrity verification", () => {
    expect(
      readStagingBackupVerificationConfig({
        NOA_BACKUP_ID: "20260804T193045Z-release-2026-08-04",
        NOA_RUNTIME_ENV: "staging",
        R2_BACKUP_ACCESS_KEY_ID: validEnv.R2_BACKUP_ACCESS_KEY_ID,
        R2_BACKUP_BUCKET: validEnv.R2_BACKUP_BUCKET,
        R2_BACKUP_ENDPOINT: validEnv.R2_BACKUP_ENDPOINT,
        R2_BACKUP_SECRET_ACCESS_KEY: validEnv.R2_BACKUP_SECRET_ACCESS_KEY,
      }),
    ).toMatchObject({
      backupId: "20260804t193045z-release-2026-08-04",
      backupStorage: { bucket: "noa-insaat-staging-backups-eu" },
    });
  });
});
