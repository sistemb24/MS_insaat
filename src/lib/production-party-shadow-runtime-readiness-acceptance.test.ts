import { describe, expect, test } from "vitest";

import {
  createProductionPartyShadowRuntimeReadinessAcceptanceDatabaseName,
  createProductionPartyShadowRuntimeReadinessAcceptanceDatabaseUrl,
  createReadOnlyPartyShadowRuntimeReadinessAcceptanceDatabaseUrl,
  evaluateProductionPartyShadowRuntimeReadinessAcceptance,
  readProductionPartyShadowRuntimeReadinessAcceptanceConfig,
} from "./production-party-shadow-runtime-readiness-acceptance";

const localUrl = "postgresql://postgres:postgres@127.0.0.1:5432/noa_source";

test("requires exact local PostgreSQL test execution", () => {
  expect(readProductionPartyShadowRuntimeReadinessAcceptanceConfig({
    DATABASE_URL: localUrl,
    NOA_RUNTIME_ENV: "test",
    PARTY_SHADOW_RUNTIME_READINESS_ACCEPTANCE_CONFIRMATION:
      "party-shadow-runtime-readiness-isolated-acceptance",
  })).toEqual({
    adminDatabaseUrl: "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
    sourceDatabaseUrl: localUrl,
  });
  expect(() => readProductionPartyShadowRuntimeReadinessAcceptanceConfig({
    DATABASE_URL: localUrl,
    NOA_RUNTIME_ENV: "production",
    PARTY_SHADOW_RUNTIME_READINESS_ACCEPTANCE_CONFIRMATION:
      "party-shadow-runtime-readiness-isolated-acceptance",
  })).toThrow(/yalnız NOA_RUNTIME_ENV=test/);
  expect(() => readProductionPartyShadowRuntimeReadinessAcceptanceConfig({
    DATABASE_URL: "postgresql://user:secret@remote.example.com/noa",
    NOA_RUNTIME_ENV: "test",
    PARTY_SHADOW_RUNTIME_READINESS_ACCEPTANCE_CONFIRMATION:
      "party-shadow-runtime-readiness-isolated-acceptance",
  })).toThrow(/yalnız local PostgreSQL/);
});

test("creates only a constrained sibling DB and read-only URL", () => {
  const name = createProductionPartyShadowRuntimeReadinessAcceptanceDatabaseName(
    new Date("2026-08-15T12:30:45.000Z"),
  );
  const databaseUrl =
    createProductionPartyShadowRuntimeReadinessAcceptanceDatabaseUrl(localUrl, name);
  expect(name).toBe("noa_party_shadow_runtime_readiness_20260815t123045z");
  expect(databaseUrl).toContain(`/${name}`);
  expect(new URL(
    createReadOnlyPartyShadowRuntimeReadinessAcceptanceDatabaseUrl(databaseUrl),
  ).searchParams.get("options")).toBe("-c default_transaction_read_only=on");
});

describe("evaluateProductionPartyShadowRuntimeReadinessAcceptance", () => {
  const evidence = {
    alertFailureContained: true,
    alertFieldsRedacted: true,
    alertSafetyStatusCount: 5,
    alertThrottleExact: true,
    attestationRoundTripExact: true,
    blockerScenariosRejected: true,
    initialStateCountsExact: true,
    manifestDeterministic: true,
    manifestFreshnessExact: true,
    manifestRedacted: true,
    migrationCount: 70,
    missingTables: [],
    readOnlyManifestReady: true,
    runtimeRequestContractExact: true,
    sourceInventoryUnchanged: true,
    temporaryDatabaseRemoved: true,
    writableCredentialRejected: true,
  };

  test("requires every readiness, alert, isolation and cleanup proof", () => {
    expect(evaluateProductionPartyShadowRuntimeReadinessAcceptance(evidence))
      .toMatchObject({ ready: true });
    expect(evaluateProductionPartyShadowRuntimeReadinessAcceptance({
      ...evidence,
      alertSafetyStatusCount: 4,
    })).toMatchObject({ ready: false });
    expect(evaluateProductionPartyShadowRuntimeReadinessAcceptance({
      ...evidence,
      temporaryDatabaseRemoved: false,
    })).toMatchObject({ ready: false });
  });
});
