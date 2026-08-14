import { describe, expect, test } from "vitest";

import {
  createProductionScopeBootstrapAcceptanceDatabaseName,
  createProductionScopeBootstrapAcceptanceDatabaseUrl,
  evaluateProductionScopeBootstrapAcceptance,
  readProductionScopeBootstrapAcceptanceConfig,
} from "./production-scope-bootstrap-acceptance";

const localUrl = "postgresql://postgres:postgres@127.0.0.1:5432/noa_source";

test("acceptance config is restricted to explicit local test execution", () => {
  expect(readProductionScopeBootstrapAcceptanceConfig({
    DATABASE_URL: localUrl,
    NOA_RUNTIME_ENV: "test",
    PRODUCTION_SCOPE_BOOTSTRAP_ACCEPTANCE_CONFIRMATION:
      "production-scope-bootstrap-isolated-acceptance",
  })).toEqual({
    adminDatabaseUrl: "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
    sourceDatabaseUrl: localUrl,
  });
  expect(() => readProductionScopeBootstrapAcceptanceConfig({
    DATABASE_URL: "postgresql://user:secret@remote.example.com/noa",
    NOA_RUNTIME_ENV: "test",
    PRODUCTION_SCOPE_BOOTSTRAP_ACCEPTANCE_CONFIRMATION:
      "production-scope-bootstrap-isolated-acceptance",
  })).toThrow(/yalnız local PostgreSQL/);
});

test("creates a constrained sibling acceptance database URL", () => {
  const name = createProductionScopeBootstrapAcceptanceDatabaseName(
    new Date("2026-08-14T08:15:30.000Z"),
  );
  expect(name).toBe("noa_scope_bootstrap_acceptance_20260814t081530z");
  expect(createProductionScopeBootstrapAcceptanceDatabaseUrl(localUrl, name))
    .toContain(`/${name}`);
});

describe("evaluateProductionScopeBootstrapAcceptance", () => {
  const evidence = {
    auditCountAfterRetry: 1,
    companyCountAfterRetry: 1,
    conflictRejected: true,
    createStatus: "CREATED",
    migrationCount: 69,
    partialRejected: true,
    periodCountAfterRetry: 1,
    retryStatus: "UNCHANGED",
    rollbackAccessCount: 0,
    rollbackAuditCount: 0,
    rollbackCompanyCount: 0,
    rollbackPeriodCount: 0,
    rollbackUserCount: 0,
    scopeAccessCountAfterRetry: 1,
    sourceInventoryUnchanged: true,
    temporaryDatabaseRemoved: true,
    userCountAfterRetry: 1,
  };

  test("requires create, retry, blockers, rollback, source and cleanup evidence", () => {
    expect(evaluateProductionScopeBootstrapAcceptance(evidence)).toMatchObject({
      ready: true,
      rollbackClean: true,
    });
    expect(evaluateProductionScopeBootstrapAcceptance({
      ...evidence,
      rollbackAuditCount: 1,
    })).toMatchObject({ ready: false, rollbackClean: false });
  });
});
