import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  evaluateProductionMigrationPreflight,
  readProductionRecoveryPreflightConfig,
} from "./production-recovery-preflight";

const validEnv = {
  DATABASE_URL: "postgresql://noa:secret@production.example.com/noa?sslmode=require",
  NOA_PRODUCTION_PREFLIGHT_CONFIRMATION: "production-backup-preflight",
  NOA_RELEASE_ID: "Release/2026-08-05",
  NOA_RUNTIME_ENV: "production",
  R2_ACCESS_KEY_ID: "production-document-read",
  R2_BACKUP_ACCESS_KEY_ID: "production-backup-write",
  R2_BACKUP_BUCKET: "noa-insaat-production-backups-eu",
  R2_BACKUP_ENDPOINT: "https://account.eu.r2.cloudflarestorage.com",
  R2_BACKUP_SECRET_ACCESS_KEY: "backup-secret",
  R2_BUCKET: "noa-insaat-production-eu",
  R2_ENDPOINT: "https://account.eu.r2.cloudflarestorage.com",
  R2_SECRET_ACCESS_KEY: "document-secret",
} as const;

describe("production recovery preflight contract", () => {
  it("accepts only the approved isolated production resources", () => {
    expect(readProductionRecoveryPreflightConfig(validEnv)).toMatchObject({
      backupStorage: { bucket: "noa-insaat-production-backups-eu" },
      documentStorage: { bucket: "noa-insaat-production-eu" },
      releaseId: "release-2026-08-05",
    });
  });

  it("fails closed without exact approval or production runtime", () => {
    expect(() =>
      readProductionRecoveryPreflightConfig({
        ...validEnv,
        NOA_PRODUCTION_PREFLIGHT_CONFIRMATION: "yes",
      }),
    ).toThrow(/açık onayı eksik/);
    expect(() =>
      readProductionRecoveryPreflightConfig({
        ...validEnv,
        NOA_RUNTIME_ENV: "staging",
      }),
    ).toThrow(/NOA_RUNTIME_ENV=production/);
  });

  it("rejects local DB, changed buckets and shared credentials", () => {
    expect(() =>
      readProductionRecoveryPreflightConfig({
        ...validEnv,
        DATABASE_URL: "postgresql://noa:secret@localhost/noa",
      }),
    ).toThrow(/uzak PostgreSQL/);
    expect(() =>
      readProductionRecoveryPreflightConfig({
        ...validEnv,
        R2_BACKUP_BUCKET: "another-bucket",
      }),
    ).toThrow(/backup bucket kimliği/);
    expect(() =>
      readProductionRecoveryPreflightConfig({
        ...validEnv,
        R2_BACKUP_ACCESS_KEY_ID: validEnv.R2_ACCESS_KEY_ID,
      }),
    ).toThrow(/kimlikleri ayrı/);
  });

  it("reports an empty production DB as read-only and migration-pending", () => {
    expect(
      evaluateProductionMigrationPreflight({
        localMigrationNames: ["202606250001_init", "202606250002_invoice"],
        migrationTableExists: false,
        productionMigrationRecords: [],
        publicTableNames: [],
      }),
    ).toMatchObject({
      appliedMigrationCount: 0,
      backupCreationAllowed: false,
      migrationApplyAllowed: false,
      pendingMigrationCount: 2,
      readOnly: true,
      ready: true,
      unmanagedSchema: false,
    });
  });

  it("blocks failed, unknown or unmanaged production schemas", () => {
    expect(
      evaluateProductionMigrationPreflight({
        localMigrationNames: ["202606250001_init"],
        migrationTableExists: true,
        productionMigrationRecords: [
          {
            finished: false,
            migrationName: "202606250999_unknown",
            rolledBack: false,
          },
        ],
        publicTableNames: ["_prisma_migrations"],
      }),
    ).toMatchObject({ ready: false });
    expect(
      evaluateProductionMigrationPreflight({
        localMigrationNames: ["202606250001_init"],
        migrationTableExists: false,
        productionMigrationRecords: [],
        publicTableNames: ["LegacyTable"],
      }),
    ).toMatchObject({ ready: false, unmanagedSchema: true });
  });

  it("keeps the workflow manual and free of backup/migration mutations", () => {
    const workflow = readFileSync(
      resolve(
        process.cwd(),
        ".github/workflows/production-backup-migration-preflight.yml",
      ),
      "utf8",
    );

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("inputs.confirmation == 'production-backup-preflight'");
    expect(workflow).not.toContain("schedule:");
    expect(workflow).not.toMatch(/db:migrate|prisma migrate deploy|pg_dump|PutObject/);
  });
});
