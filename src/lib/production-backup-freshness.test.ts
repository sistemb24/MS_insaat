import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import {
  evaluateProductionBackupFreshness,
  readProductionBackupFreshnessConfig,
} from "./production-backup-freshness";

const validEnv = {
  GITHUB_EVENT_NAME: "workflow_dispatch",
  NOA_PRODUCTION_BACKUP_FRESHNESS_CONFIRMATION:
    "production-backup-freshness-check",
  NOA_RUNTIME_ENV: "production",
  R2_BACKUP_ACCESS_KEY_ID: "production-backup-read",
  R2_BACKUP_BUCKET: "noa-insaat-production-backups-eu",
  R2_BACKUP_ENDPOINT: "https://account.eu.r2.cloudflarestorage.com",
  R2_BACKUP_SECRET_ACCESS_KEY: "backup-secret",
} as const;

const manifest = {
  backupId: "20260809T094027Z-e83a0f8c50d95147c936a4a0e9397213ea3342d9",
  binaryObjects: [],
  createdAt: "2026-08-09T09:40:27.000Z",
  database: {
    key: "database/20260809T094027Z-e83a0f8c50d95147c936a4a0e9397213ea3342d9/database.dump",
    sha256: "a".repeat(64),
    sizeBytes: 514_690,
  },
  releaseId: "e83a0f8c50d95147c936a4a0e9397213ea3342d9",
  schemaVersion: 1,
};

describe("production backup freshness contract", () => {
  test("accepts the manual and scheduled tokens only for their own events", () => {
    expect(readProductionBackupFreshnessConfig(validEnv).maxAgeHours).toBe(24);
    expect(
      readProductionBackupFreshnessConfig({
        ...validEnv,
        GITHUB_EVENT_NAME: "schedule",
        NOA_PRODUCTION_BACKUP_FRESHNESS_CONFIRMATION:
          "production-backup-freshness-scheduled",
      }).backupStorage.bucket,
    ).toBe("noa-insaat-production-backups-eu");

    expect(() =>
      readProductionBackupFreshnessConfig({
        ...validEnv,
        NOA_PRODUCTION_BACKUP_FRESHNESS_CONFIRMATION:
          "production-backup-freshness-scheduled",
      }),
    ).toThrow(/açık onayı eksik/);
    expect(() =>
      readProductionBackupFreshnessConfig({
        ...validEnv,
        GITHUB_EVENT_NAME: "schedule",
      }),
    ).toThrow(/açık onayı eksik/);
  });

  test("reports a valid recent manifest as fresh", () => {
    expect(
      evaluateProductionBackupFreshness(
        manifest,
        new Date("2026-08-10T07:40:27.000Z"),
      ),
    ).toMatchObject({
      ageHours: 22,
      backupId: manifest.backupId,
      databaseBytes: 514_690,
      fresh: true,
      status: "fresh",
    });
  });

  test("reports a valid manifest older than 24 hours as stale", () => {
    expect(
      evaluateProductionBackupFreshness(
        manifest,
        new Date("2026-08-10T11:40:28.000Z"),
      ),
    ).toMatchObject({ fresh: false, status: "stale" });
  });

  test("fails closed for future, malformed or empty-database manifests", () => {
    expect(() =>
      evaluateProductionBackupFreshness(
        manifest,
        new Date("2026-08-09T09:40:26.000Z"),
      ),
    ).toThrow(/gelecekte/);
    expect(() =>
      evaluateProductionBackupFreshness(
        { ...manifest, backupId: "latest" },
        new Date("2026-08-10T07:40:27.000Z"),
      ),
    ).toThrow(/sözleşmeyle eşleşmiyor/);
    expect(() =>
      evaluateProductionBackupFreshness(
        { ...manifest, database: { ...manifest.database, sizeBytes: 0 } },
        new Date("2026-08-10T07:40:27.000Z"),
      ),
    ).toThrow(/sözleşmeyle eşleşmiyor/);
  });

  test("keeps the workflow read-only, scheduled after backup and manually gated", () => {
    const workflow = readFileSync(
      resolve(process.cwd(), ".github/workflows/production-backup-freshness.yml"),
      "utf8",
    );

    expect(workflow).toContain('cron: "15 4 * * *"');
    expect(workflow).toContain("production-backup-freshness-scheduled");
    expect(workflow).toContain("production-backup-freshness-check");
    expect(workflow).toContain("pnpm production:backup:freshness");
    expect(workflow).toContain("PRODUCTION_R2_BACKUP_READ_ACCESS_KEY_ID");
    expect(workflow).toContain("PRODUCTION_R2_BACKUP_READ_SECRET_ACCESS_KEY");
    expect(workflow).not.toContain("secrets.PRODUCTION_R2_BACKUP_ACCESS_KEY_ID");
    expect(workflow).not.toMatch(/DATABASE_URL|db:migrate|pg_dump|PutObject|DeleteObject|delete-object/);
  });
});
