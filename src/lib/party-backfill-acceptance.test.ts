import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  PARTY_BACKFILL_ACCEPTANCE_CONFIRMATION,
  PARTY_BACKFILL_ACCEPTANCE_MIGRATION_COUNT,
  assertPartyBackfillAcceptanceDatabaseName,
  createPartyBackfillAcceptanceDatabaseName,
  createPartyBackfillAcceptanceDatabaseUrl,
  evaluatePartyBackfillAcceptance,
  readPartyBackfillAcceptanceConfig,
  type PartyBackfillAcceptanceEvidence,
} from "./party-backfill-acceptance";

const localUrl = "postgresql://acceptance:secret@127.0.0.1:5432/noa_source";

describe("party backfill acceptance safety contract", () => {
  it("accepts only the exact test confirmation and derives the admin URL", () => {
    const config = readPartyBackfillAcceptanceConfig({
      DATABASE_URL: localUrl,
      NOA_RUNTIME_ENV: "test",
      PARTY_BACKFILL_ACCEPTANCE_CONFIRMATION,
    });

    expect(config.sourceDatabaseUrl).toContain("/noa_source");
    expect(config.adminDatabaseUrl).toContain("/postgres");
  });

  it.each([
    [{ DATABASE_URL: localUrl, NOA_RUNTIME_ENV: "production", PARTY_BACKFILL_ACCEPTANCE_CONFIRMATION }, /test/],
    [{ DATABASE_URL: localUrl, NOA_RUNTIME_ENV: "test" }, /onayı eksik/],
    [{ DATABASE_URL: "postgresql://user:pass@db.example.com/noa", NOA_RUNTIME_ENV: "test", PARTY_BACKFILL_ACCEPTANCE_CONFIRMATION }, /local PostgreSQL/],
    [{ DATABASE_URL: "mysql://user:pass@localhost/noa", NOA_RUNTIME_ENV: "test", PARTY_BACKFILL_ACCEPTANCE_CONFIRMATION }, /PostgreSQL/],
    [{ DATABASE_URL: "postgresql://user:pass@localhost", NOA_RUNTIME_ENV: "test", PARTY_BACKFILL_ACCEPTANCE_CONFIRMATION }, /veritabanı adı/],
  ])("rejects an unsafe environment %#", (env, error) => {
    expect(() => readPartyBackfillAcceptanceConfig(env)).toThrow(error);
  });

  it("creates a deterministic, narrowly-prefixed disposable database target", () => {
    const name = createPartyBackfillAcceptanceDatabaseName(
      new Date("2026-08-14T12:34:56.789Z"),
    );

    expect(name).toBe("noa_party_acceptance_20260814t123456z");
    expect(createPartyBackfillAcceptanceDatabaseUrl(localUrl, name)).toContain(`/${name}`);
  });

  it.each([
    "noa_source",
    "noa_party_acceptance_20260814",
    "noa_party_acceptance_20260814t123456z_extra",
    "NOA_party_acceptance_20260814t123456z",
    "noa_party_acceptance_20260814t123456z;drop database postgres",
  ])("rejects unsafe database name %s", (name) => {
    expect(() => assertPartyBackfillAcceptanceDatabaseName(name)).toThrow(/güvenli değil/);
  });

  it("marks complete isolated evidence ready", () => {
    expect(evaluatePartyBackfillAcceptance(readyEvidence())).toMatchObject({
      ready: true,
      rollbackClean: true,
    });
  });

  it.each([
    ["migrationCount", 68],
    ["missingTables", ["Party"]],
    ["cleanAuditCountAfterRetry", 2],
    ["blockedPartyCount", 1],
    ["driftRejected", false],
    ["rollbackRunCount", 1],
    ["sourceInventoryUnchanged", false],
    ["temporaryDatabaseRemoved", false],
  ] satisfies Array<[keyof PartyBackfillAcceptanceEvidence, unknown]>)
  ("fails closed when %s is not proven", (key, value) => {
    expect(evaluatePartyBackfillAcceptance({
      ...readyEvidence(),
      [key]: value,
    }).ready).toBe(false);
  });

  it("keeps destructive SQL behind the exact database-name guard and cleanup", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/verify-party-backfill-acceptance.ts"),
      "utf8",
    );
    const guardIndex = source.indexOf("assertPartyBackfillAcceptanceDatabaseName");
    const createIndex = source.indexOf("CREATE DATABASE");
    const dropIndex = source.indexOf("DROP DATABASE");

    expect(guardIndex).toBeGreaterThan(-1);
    expect(createIndex).toBeGreaterThan(guardIndex);
    expect(dropIndex).toBeGreaterThan(createIndex);
    expect(source).toContain("finally");
    expect(source).toContain("WITH (FORCE)");
    expect(source).not.toContain("db push");
    expect(source).not.toContain("db:seed");
  });
});

function readyEvidence(): PartyBackfillAcceptanceEvidence {
  return {
    blockedPartyCount: 0,
    blockedRoleCount: 0,
    blockedRunStatus: "BLOCKED",
    cleanAuditCountAfterRetry: 1,
    cleanPartyCountAfterRetry: 3,
    cleanRoleCountAfterRetry: 3,
    cleanRunStatus: "VERIFIED",
    closedRunStatus: "VERIFIED",
    driftRejected: true,
    foreignPartyCount: 0,
    migrationCount: PARTY_BACKFILL_ACCEPTANCE_MIGRATION_COUNT,
    missingTables: [],
    rollbackAuditCount: 0,
    rollbackIssueCount: 0,
    rollbackPartyCount: 0,
    rollbackRoleCount: 0,
    rollbackRunCount: 0,
    sourceInventoryUnchanged: true,
    temporaryDatabaseRemoved: true,
  };
}
