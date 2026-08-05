import { describe, expect, test } from "vitest";

import {
  evaluateStagingRecoverySource,
  STAGING_RECOVERY_CRITICAL_TABLES,
} from "./staging-recovery";

describe("staging recovery source", () => {
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
