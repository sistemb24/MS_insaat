import { describe, expect, test } from "vitest";

import {
  createPartyShadowReadAcceptanceDatabaseName,
  createPartyShadowReadAcceptanceDatabaseUrl,
  evaluatePartyShadowReadAcceptance,
  readPartyShadowReadAcceptanceConfig,
} from "./party-shadow-read-acceptance";

const localUrl = "postgresql://postgres:postgres@127.0.0.1:5432/noa_source";

test("requires explicit local PostgreSQL test execution", () => {
  expect(readPartyShadowReadAcceptanceConfig({
    DATABASE_URL: localUrl,
    NOA_RUNTIME_ENV: "test",
    PARTY_SHADOW_READ_ACCEPTANCE_CONFIRMATION:
      "party-shadow-read-runtime-isolated-acceptance",
  })).toEqual({
    adminDatabaseUrl: "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
    sourceDatabaseUrl: localUrl,
  });
  expect(() => readPartyShadowReadAcceptanceConfig({
    DATABASE_URL: localUrl,
    NOA_RUNTIME_ENV: "production",
    PARTY_SHADOW_READ_ACCEPTANCE_CONFIRMATION:
      "party-shadow-read-runtime-isolated-acceptance",
  })).toThrow(/yalnız NOA_RUNTIME_ENV=test/);
  expect(() => readPartyShadowReadAcceptanceConfig({
    DATABASE_URL: localUrl,
    NOA_RUNTIME_ENV: "test",
  })).toThrow(/kabul onayı eksik/);
  expect(() => readPartyShadowReadAcceptanceConfig({
    DATABASE_URL: "postgresql://user:secret@remote.example.com/noa",
    NOA_RUNTIME_ENV: "test",
    PARTY_SHADOW_READ_ACCEPTANCE_CONFIRMATION:
      "party-shadow-read-runtime-isolated-acceptance",
  })).toThrow(/yalnız local PostgreSQL/);
  expect(() => readPartyShadowReadAcceptanceConfig({
    DATABASE_URL: "mysql://root:secret@127.0.0.1/noa",
    NOA_RUNTIME_ENV: "test",
    PARTY_SHADOW_READ_ACCEPTANCE_CONFIRMATION:
      "party-shadow-read-runtime-isolated-acceptance",
  })).toThrow(/PostgreSQL gerektirir/);
  expect(() => readPartyShadowReadAcceptanceConfig({
    DATABASE_URL: "postgresql://postgres:secret@127.0.0.1",
    NOA_RUNTIME_ENV: "test",
    PARTY_SHADOW_READ_ACCEPTANCE_CONFIRMATION:
      "party-shadow-read-runtime-isolated-acceptance",
  })).toThrow(/kaynak veritabanı adı zorunludur/);
});

test("creates only a constrained sibling acceptance database URL", () => {
  const name = createPartyShadowReadAcceptanceDatabaseName(
    new Date("2026-08-14T21:30:45.000Z"),
  );
  expect(name).toBe("noa_party_shadow_read_acceptance_20260814t213045z");
  expect(createPartyShadowReadAcceptanceDatabaseUrl(localUrl, name))
    .toContain(`/${name}`);
});

describe("evaluatePartyShadowReadAcceptance", () => {
  const evidence = {
    globalSearchLegacyAuthoritative: true,
    legacyOnlyAuthoritative: true,
    legacyWriteWarningRedacted: true,
    migrationCount: 70,
    missingStateAuthoritative: true,
    missingTables: [],
    observerFailureContained: true,
    partyInventoryUnchangedAfterLegacyWrite: true,
    redactedObservations: true,
    releaseMismatchFailSafe: true,
    scopeIsolationConfirmed: true,
    shadowDriftLegacyAuthoritative: true,
    shadowMatchSlugCount: 3,
    sourceInventoryUnchanged: true,
    temporaryDatabaseRemoved: true,
  };

  test("requires every runtime, isolation, redaction and cleanup proof", () => {
    expect(evaluatePartyShadowReadAcceptance(evidence))
      .toMatchObject({ ready: true });
    expect(evaluatePartyShadowReadAcceptance({
      ...evidence,
      shadowMatchSlugCount: 2,
    })).toMatchObject({ ready: false });
    expect(evaluatePartyShadowReadAcceptance({
      ...evidence,
      partyInventoryUnchangedAfterLegacyWrite: false,
    })).toMatchObject({ ready: false });
    expect(evaluatePartyShadowReadAcceptance({
      ...evidence,
      temporaryDatabaseRemoved: false,
    })).toMatchObject({ ready: false });
  });
});
