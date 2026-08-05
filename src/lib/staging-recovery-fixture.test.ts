import { describe, expect, it } from "vitest";

import {
  assertStagingRecoveryFixtureConfirmation,
  evaluateStagingRecoveryFixture,
  STAGING_RECOVERY_FIXTURE,
} from "./staging-recovery-fixture";

describe("staging recovery fixture", () => {
  it("requires an explicit staging fixture confirmation", () => {
    expect(() => assertStagingRecoveryFixtureConfirmation({})).toThrow(
      "Staging recovery fixture onayı eksik.",
    );
    expect(() =>
      assertStagingRecoveryFixtureConfirmation({
        NOA_STAGING_RECOVERY_FIXTURE_CONFIRMATION:
          "staging-recovery-fixture",
      }),
    ).not.toThrow();
  });

  it("accepts exact fixture identity with a denied foreign scope", () => {
    expect(
      evaluateStagingRecoveryFixture({
        companyId: STAGING_RECOVERY_FIXTURE.companyId,
        fileId: STAGING_RECOVERY_FIXTURE.fileId,
        fileSizeBytes: 128,
        folderId: STAGING_RECOVERY_FIXTURE.folderId,
        foreignScopeCount: 0,
        periodId: STAGING_RECOVERY_FIXTURE.periodId,
        storageKey: STAGING_RECOVERY_FIXTURE.storageKey,
        tenantId: STAGING_RECOVERY_FIXTURE.tenantId,
      }),
    ).toEqual({ foreignScopeCount: 0, identityMatches: true, ready: true });
  });

  it("fails closed for a mismatched identity or foreign-scope leak", () => {
    const base = {
      companyId: STAGING_RECOVERY_FIXTURE.companyId,
      fileId: STAGING_RECOVERY_FIXTURE.fileId,
      fileSizeBytes: 128,
      folderId: STAGING_RECOVERY_FIXTURE.folderId,
      foreignScopeCount: 0,
      periodId: STAGING_RECOVERY_FIXTURE.periodId,
      storageKey: STAGING_RECOVERY_FIXTURE.storageKey,
      tenantId: STAGING_RECOVERY_FIXTURE.tenantId,
    };

    expect(
      evaluateStagingRecoveryFixture({ ...base, fileId: "unexpected" }).ready,
    ).toBe(false);
    expect(
      evaluateStagingRecoveryFixture({ ...base, foreignScopeCount: 1 }).ready,
    ).toBe(false);
  });
});
