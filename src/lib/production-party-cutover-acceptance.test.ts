import { describe, expect, test } from "vitest";

import {
  createProductionPartyCutoverAcceptanceDatabaseName,
  createProductionPartyCutoverAcceptanceDatabaseUrl,
  createReadOnlyPartyCutoverAcceptanceDatabaseUrl,
  evaluateProductionPartyCutoverAcceptance,
  readProductionPartyCutoverAcceptanceConfig,
} from "./production-party-cutover-acceptance";

const localUrl = "postgresql://postgres:postgres@127.0.0.1:5432/noa_source";

test("requires explicit local test execution", () => {
  expect(readProductionPartyCutoverAcceptanceConfig({
    DATABASE_URL: localUrl,
    NOA_RUNTIME_ENV: "test",
    PRODUCTION_PARTY_CUTOVER_ACCEPTANCE_CONFIRMATION:
      "production-party-cutover-isolated-acceptance",
  })).toEqual({
    adminDatabaseUrl: "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
    sourceDatabaseUrl: localUrl,
  });
  expect(() => readProductionPartyCutoverAcceptanceConfig({
    DATABASE_URL: "postgresql://user:secret@remote.example.com/noa",
    NOA_RUNTIME_ENV: "test",
    PRODUCTION_PARTY_CUTOVER_ACCEPTANCE_CONFIRMATION:
      "production-party-cutover-isolated-acceptance",
  })).toThrow(/yalnız local PostgreSQL/);
});

test("creates constrained sibling and read-only database URLs", () => {
  const name = createProductionPartyCutoverAcceptanceDatabaseName(
    new Date("2026-08-14T17:15:30.000Z"),
  );
  expect(name).toBe("noa_party_cutover_preflight_acceptance_20260814t171530z");
  const databaseUrl = createProductionPartyCutoverAcceptanceDatabaseUrl(localUrl, name);
  expect(databaseUrl).toContain(`/${name}`);
  expect(new URL(createReadOnlyPartyCutoverAcceptanceDatabaseUrl(databaseUrl))
    .searchParams.get("options")).toBe("-c default_transaction_read_only=on");
});

describe("evaluateProductionPartyCutoverAcceptance", () => {
  const evidence = {
    businessChecksumUnchanged: true,
    cutoverStateRejected: true,
    driftRejected: true,
    postAppliedMigrationCount: 70,
    postCutoverAuditCount: 0,
    postCutoverEventCount: 0,
    postCutoverStateCount: 0,
    postGateReady: true,
    postPendingMigrationCount: 0,
    postPreflightReady: true,
    postSchemaState: "POST_MIGRATION",
    preAppliedMigrationCount: 69,
    preGateReady: true,
    prePendingMigrationNames: ["20260814160000_add_party_cutover_state"],
    prePreflightReady: true,
    preSchemaState: "PRE_MIGRATION",
    readOnlyCredentialRequired: true,
    sourceInventoryUnchanged: true,
    temporaryDatabaseRemoved: true,
    temporaryMigrationWorkspaceRemoved: true,
  };

  test("requires PRE, POST, negative gates, source and cleanup evidence", () => {
    expect(evaluateProductionPartyCutoverAcceptance(evidence)).toMatchObject({
      ready: true,
    });
    expect(evaluateProductionPartyCutoverAcceptance({
      ...evidence,
      postCutoverEventCount: 1,
    })).toMatchObject({ ready: false });
    expect(evaluateProductionPartyCutoverAcceptance({
      ...evidence,
      sourceInventoryUnchanged: false,
    })).toMatchObject({ ready: false });
  });
});
