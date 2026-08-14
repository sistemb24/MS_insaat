import { describe, expect, test } from "vitest";

import {
  createPartyCutoverAcceptanceDatabaseName,
  createPartyCutoverAcceptanceDatabaseUrl,
  evaluatePartyCutoverAcceptance,
  readPartyCutoverAcceptanceConfig,
} from "./party-cutover-acceptance";

const localUrl = "postgresql://postgres:postgres@127.0.0.1:5432/noa_source";

test("acceptance config requires explicit local test execution", () => {
  expect(readPartyCutoverAcceptanceConfig({
    DATABASE_URL: localUrl,
    NOA_RUNTIME_ENV: "test",
    PARTY_CUTOVER_ACCEPTANCE_CONFIRMATION: "party-cutover-isolated-acceptance",
  })).toEqual({
    adminDatabaseUrl: "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
    sourceDatabaseUrl: localUrl,
  });
  expect(() => readPartyCutoverAcceptanceConfig({
    DATABASE_URL: "postgresql://user:secret@remote.example.com/noa",
    NOA_RUNTIME_ENV: "test",
    PARTY_CUTOVER_ACCEPTANCE_CONFIRMATION: "party-cutover-isolated-acceptance",
  })).toThrow(/yalnız local PostgreSQL/);
});

test("creates a constrained sibling acceptance database URL", () => {
  const name = createPartyCutoverAcceptanceDatabaseName(
    new Date("2026-08-14T14:15:30.000Z"),
  );
  expect(name).toBe("noa_party_cutover_acceptance_20260814t141530z");
  expect(createPartyCutoverAcceptanceDatabaseUrl(localUrl, name))
    .toContain(`/${name}`);
});

describe("evaluatePartyCutoverAcceptance", () => {
  const evidence = {
    activationAuditCountAfterRetry: 1,
    activationEventCountAfterRetry: 1,
    activationModeAfterRetry: "SHADOW_READ",
    activationRevisionAfterRetry: 1,
    activationStateCountAfterRetry: 1,
    activationStatus: "ACTIVATED",
    activationRetryStatus: "UNCHANGED",
    auditFailureRejected: true,
    auditRollbackAuditCount: 0,
    auditRollbackEventCount: 0,
    auditRollbackStateCount: 0,
    migrationCount: 70,
    missingTables: [],
    parityDriftConfirmed: true,
    rollbackAuditCountAfterRetry: 2,
    rollbackEventCountAfterRetry: 2,
    rollbackModeAfterRetry: "LEGACY_ONLY",
    rollbackRevisionAfterRetry: 2,
    rollbackStateCountAfterRetry: 1,
    rollbackStatus: "ROLLED_BACK",
    rollbackRetryStatus: "UNCHANGED",
    sourceInventoryUnchanged: true,
    sqlModeConstraintRejected: true,
    temporaryDatabaseRemoved: true,
  };

  test("requires activation, retries, rollback, SQL gate, transaction rollback and cleanup", () => {
    expect(evaluatePartyCutoverAcceptance(evidence)).toMatchObject({
      auditRollbackClean: true,
      ready: true,
    });
    expect(evaluatePartyCutoverAcceptance({
      ...evidence,
      auditRollbackEventCount: 1,
    })).toMatchObject({ auditRollbackClean: false, ready: false });
    expect(evaluatePartyCutoverAcceptance({
      ...evidence,
      rollbackRetryStatus: "ROLLED_BACK",
    })).toMatchObject({ ready: false });
  });
});
