import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationName = "20260814160000_add_party_cutover_state";
const migration = readFileSync(
  resolve(process.cwd(), "prisma", "migrations", migrationName, "migration.sql"),
  "utf8",
);

describe("Party cutover additive migration", () => {
  it("adds state and append-only event tables without data mutation", () => {
    expect(migration).toContain('CREATE TABLE "PartyCutoverState"');
    expect(migration).toContain('CREATE TABLE "PartyCutoverEvent"');
    expect(migration).not.toMatch(/^\s*(?:INSERT\s+INTO|UPDATE\s+"|DELETE\s+FROM)/im);
  });

  it("allows only LEGACY_ONLY and SHADOW_READ at the database boundary", () => {
    expect(migration).toContain(
      'CHECK ("mode" IN (\'LEGACY_ONLY\', \'SHADOW_READ\'))',
    );
    expect(migration).not.toMatch(/DUAL_WRITE|PARTY_ONLY/);
  });

  it("is the seventieth migration and includes scope, count and checksum gates", () => {
    const migrations = readdirSync(resolve(process.cwd(), "prisma", "migrations"), {
      withFileTypes: true,
    }).filter((entry) => entry.isDirectory());
    expect(migrations).toHaveLength(70);
    expect(migration).toContain("PartyCutoverState_tenantId_companyId_periodId_key");
    expect(migration).toContain("PartyCutoverState_counts_check");
    expect(migration).toContain("PartyCutoverState_checksums_check");
    expect(migration).toContain("PartyCutoverEvent_operationId_key");
  });
});
