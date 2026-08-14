import { describe, expect, test } from "vitest";

import {
  createProductionPartyCutoverTransitionAcceptanceDatabaseName,
  createProductionPartyCutoverTransitionAcceptanceDatabaseUrl,
  createReadOnlyPartyCutoverTransitionAcceptanceDatabaseUrl,
  evaluateProductionPartyCutoverTransitionAcceptance,
  readProductionPartyCutoverTransitionAcceptanceConfig,
} from "./production-party-cutover-transition-acceptance";

const localUrl = "postgresql://postgres:postgres@127.0.0.1:5432/noa_source";

test("requires explicit local test execution", () => {
  expect(readProductionPartyCutoverTransitionAcceptanceConfig({
    DATABASE_URL: localUrl,
    NOA_RUNTIME_ENV: "test",
    PRODUCTION_PARTY_CUTOVER_TRANSITION_ACCEPTANCE_CONFIRMATION:
      "production-party-cutover-transition-isolated-acceptance",
  })).toEqual({
    adminDatabaseUrl: "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
    sourceDatabaseUrl: localUrl,
  });
  expect(() => readProductionPartyCutoverTransitionAcceptanceConfig({
    DATABASE_URL: "postgresql://user:secret@remote.example.com/noa",
    NOA_RUNTIME_ENV: "test",
    PRODUCTION_PARTY_CUTOVER_TRANSITION_ACCEPTANCE_CONFIRMATION:
      "production-party-cutover-transition-isolated-acceptance",
  })).toThrow(/yalnız local PostgreSQL/);
});

test("creates constrained sibling and read-only database URLs", () => {
  const name = createProductionPartyCutoverTransitionAcceptanceDatabaseName(
    new Date("2026-08-14T19:00:00.000Z"),
  );
  expect(name).toBe("noa_party_cutover_transition_acceptance_20260814t190000z");
  const databaseUrl = createProductionPartyCutoverTransitionAcceptanceDatabaseUrl(
    localUrl,
    name,
  );
  expect(databaseUrl).toContain(`/${name}`);
  expect(new URL(createReadOnlyPartyCutoverTransitionAcceptanceDatabaseUrl(
    databaseUrl,
  )).searchParams.get("options")).toBe("-c default_transaction_read_only=on");
});

describe("evaluateProductionPartyCutoverTransitionAcceptance", () => {
  const evidence = {
    activationCountsExact: true,
    activationPostflightReady: true,
    activationRetryPostflightReady: true,
    activationRetryStatus: "UNCHANGED",
    activationStatus: "ACTIVATED",
    checksumDriftRejected: true,
    migrationCount: 70,
    rollbackCountsExact: true,
    rollbackPostflightReady: true,
    rollbackRetryPostflightReady: true,
    rollbackRetryStatus: "UNCHANGED",
    rollbackStatus: "ROLLED_BACK",
    sourceInventoryUnchanged: true,
    temporaryDatabaseRemoved: true,
    writablePostflightRejected: true,
  };

  test("requires all transition, postflight, isolation and cleanup evidence", () => {
    expect(evaluateProductionPartyCutoverTransitionAcceptance(evidence))
      .toMatchObject({ ready: true });
    expect(evaluateProductionPartyCutoverTransitionAcceptance({
      ...evidence,
      activationRetryStatus: "ACTIVATED",
    })).toMatchObject({ ready: false });
    expect(evaluateProductionPartyCutoverTransitionAcceptance({
      ...evidence,
      temporaryDatabaseRemoved: false,
    })).toMatchObject({ ready: false });
  });
});
