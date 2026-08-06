import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { createProductionBackupId, readProductionBackupConfig, readProductionMigrationConfig, readProductionRestoreConfig } from "./production-backup";

const validEnv = {
  DATABASE_URL: "postgresql://noa:secret@production.example.com/noa?sslmode=require",
  NOA_PRODUCTION_BACKUP_CONFIRMATION: "production-backup-execute",
  NOA_PRODUCTION_MIGRATION_CONFIRMATION: "production-migration-execute",
  NOA_PRODUCTION_RESTORE_CONFIRMATION: "production-restore-rehearsal",
  NOA_PRODUCTION_PREFLIGHT_CONFIRMATION: "production-backup-preflight",
  NOA_RELEASE_ID: "Release/2026-08-06",
  NOA_RUNTIME_ENV: "production",
  R2_ACCESS_KEY_ID: "production-document-read",
  R2_BACKUP_ACCESS_KEY_ID: "production-backup-write",
  R2_BACKUP_BUCKET: "noa-insaat-production-backups-eu",
  R2_BACKUP_ENDPOINT: "https://account.eu.r2.cloudflarestorage.com",
  R2_BACKUP_SECRET_ACCESS_KEY: "backup-secret",
  R2_BUCKET: "noa-insaat-production-eu",
  R2_ENDPOINT: "https://account.eu.r2.cloudflarestorage.com",
  R2_SECRET_ACCESS_KEY: "document-secret",
  NOA_BACKUP_ID: "20260806T183005Z-93f953d8f12db3bf2ae6e2cc08a9ff23fee45942",
} as const;

describe("production backup execution contract", () => {
  test("requires preflight and backup confirmation for approved production resources", () => {
    expect(readProductionBackupConfig(validEnv)).toMatchObject({
      backupStorage: { bucket: "noa-insaat-production-backups-eu" },
      documentStorage: { bucket: "noa-insaat-production-eu" },
    });
  });

  test("fails closed without exact backup or migration confirmation", () => {
    expect(() => readProductionBackupConfig({ ...validEnv, NOA_PRODUCTION_BACKUP_CONFIRMATION: "yes" })).toThrow(/backup açık onayı eksik/);
    expect(() => readProductionMigrationConfig({ ...validEnv, NOA_PRODUCTION_MIGRATION_CONFIRMATION: "yes" })).toThrow(/migration açık onayı eksik/);
    expect(() => readProductionRestoreConfig({ ...validEnv, NOA_PRODUCTION_RESTORE_CONFIRMATION: "yes" })).toThrow(/restore açık onayı eksik/);
  });

  test("requires an exact backup identity for an isolated restore", () => {
    expect(readProductionRestoreConfig(validEnv).backupId).toBe(validEnv.NOA_BACKUP_ID);
    expect(() => readProductionRestoreConfig({ ...validEnv, NOA_BACKUP_ID: "latest" })).toThrow(/backup kimliği zorunludur/);
  });

  test("creates a deterministic secret-free backup id", () => {
    expect(createProductionBackupId(new Date("2026-08-06T09:30:45.123Z"), validEnv.NOA_RELEASE_ID)).toBe("20260806T093045Z-release-2026-08-06");
  });

  test("orders the production workflow as preflight, verified backup, migration and post-check", () => {
    const workflow = readFileSync(
      resolve(process.cwd(), ".github/workflows/production-backup-and-migrate.yml"),
      "utf8",
    );
    const preflight = workflow.indexOf("pnpm production:recovery:preflight");
    const backup = workflow.indexOf("pnpm production:backup:execute");
    const migration = workflow.indexOf("pnpm db:migrate");

    expect(workflow).toContain("inputs.backup_confirmation == 'production-backup-execute'");
    expect(workflow).toContain("inputs.migration_confirmation == 'production-migration-execute'");
    expect(preflight).toBeGreaterThan(-1);
    expect(backup).toBeGreaterThan(preflight);
    expect(migration).toBeGreaterThan(backup);
    expect(workflow.lastIndexOf("pnpm production:recovery:preflight")).toBeGreaterThan(migration);
  });

  test("keeps restore isolated and confirmation-gated", () => {
    const workflow = readFileSync(
      resolve(process.cwd(), ".github/workflows/production-restore-rehearsal.yml"),
      "utf8",
    );
    expect(workflow).toContain("inputs.confirmation == 'production-restore-rehearsal'");
    expect(workflow).toContain("NOA_BACKUP_ID: ${{ inputs.backup_id }}");
    expect(workflow).toContain("pnpm production:restore:rehearsal");
    expect(workflow).not.toContain("pnpm db:migrate");
    expect(workflow).not.toContain("vercel");
  });
});
