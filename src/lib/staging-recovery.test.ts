import { describe, expect, test } from "vitest";

import {
  assertStagingRestoreDatabaseName,
  createNodePostgresConnectionString,
  createStagingRestoreDatabaseName,
  evaluateStagingRecoverySource,
  STAGING_RECOVERY_CRITICAL_TABLES,
} from "./staging-recovery";

describe("staging recovery source", () => {
  test("creates an exact, disposable restore database name", () => {
    const name = createStagingRestoreDatabaseName(
      new Date("2026-08-05T12:00:01.123Z"),
    );
    expect(name).toBe("noa_restore_20260805t120001z");
    expect(assertStagingRestoreDatabaseName(name)).toBe(name);
    expect(() => assertStagingRestoreDatabaseName("postgres")).toThrow(
      "güvenli değil",
    );
  });

  test("keeps Node PostgreSQL certificate verification explicit", () => {
    expect(
      createNodePostgresConnectionString(
        "postgresql://user:secret@db.example.com/noa?sslmode=require",
      ),
    ).toContain("sslmode=verify-full");
  });

  test("accepts a remote source with the complete migration and table contract", () => {
    expect(
      evaluateStagingRecoverySource({
        appliedMigrationCount: 67,
        databaseBytes: 4096,
        expectedMigrationCount: 67,
        publicTableNames: STAGING_RECOVERY_CRITICAL_TABLES,
      }),
    ).toMatchObject({
      migrationCountMatches: true,
      missingCriticalTables: [],
      ready: true,
    });
  });

  test("fails closed for an empty or migration-incomplete source", () => {
    expect(
      evaluateStagingRecoverySource({
        appliedMigrationCount: 0,
        databaseBytes: 900,
        expectedMigrationCount: 67,
        publicTableNames: [],
      }),
    ).toMatchObject({
      migrationCountMatches: false,
      missingCriticalTables: STAGING_RECOVERY_CRITICAL_TABLES,
      publicTableCount: 0,
      ready: false,
    });
  });
});
