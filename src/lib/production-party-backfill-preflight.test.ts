import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  PRODUCTION_PARTY_MIGRATION_NAME,
  PRODUCTION_PARTY_PREFLIGHT_CONFIRMATION,
  PRODUCTION_PARTY_TABLES,
  evaluateMigrationState,
  readProductionPartyPreflightConfig,
  runProductionPartyPreflight,
  type ProductionPartyPreflightDatabaseRead,
} from "./production-party-backfill-preflight";

const releaseSha = "a".repeat(40);
const previousMigration = "20260801120000_previous_migration";
const scope = {
  companyId: "company-production-1",
  periodId: "period-production-1",
  tenantId: "tenant-production-1",
};

describe("production party backfill preflight", () => {
  it("accepts only an exact manual main release and remote PostgreSQL target", () => {
    expect(readProductionPartyPreflightConfig(validEnv())).toEqual({
      actorUserId: "admin-production-1",
      databaseUrl: "postgresql://readonly:secret@production.example.com/noa?sslmode=require",
      releaseId: releaseSha,
      scope,
    });
  });

  it.each([
    ["NOA_RUNTIME_ENV", "staging", /production ortamında/],
    ["GITHUB_EVENT_NAME", "schedule", /manuel workflow/],
    ["NOA_SOURCE_REF", "refs/heads/feature", /main branch/],
    ["NOA_PRODUCTION_PARTY_PREFLIGHT_CONFIRMATION", "yes", /açık onayı/],
    ["NOA_EXPECTED_RELEASE_SHA", "b".repeat(40), /SHA değerleri eşleşmiyor/],
    ["DATABASE_URL", "postgresql://user:pass@localhost/noa", /uzak PostgreSQL/],
    ["NOA_PARTY_PREFLIGHT_PERIOD_ID", " ", /Dönem kimliği/],
  ])("fails closed for invalid %s", (key, value, error) => {
    expect(() => readProductionPartyPreflightConfig({
      ...validEnv(),
      [key]: value,
    })).toThrow(error);
  });

  it("recognizes only the exact pre- and post-migration schema states", () => {
    expect(evaluateMigrationState(preMigrationInventory())).toMatchObject({
      blockers: [],
      pendingMigrationNames: [PRODUCTION_PARTY_MIGRATION_NAME],
      schemaState: "PRE_MIGRATION",
    });
    expect(evaluateMigrationState({
      ...preMigrationInventory(),
      productionMigrationRecords: [
        healthyMigration(previousMigration),
        healthyMigration(PRODUCTION_PARTY_MIGRATION_NAME),
      ],
      publicTableNames: ["_prisma_migrations", ...PRODUCTION_PARTY_TABLES],
    })).toMatchObject({
      blockers: [],
      pendingMigrationNames: [],
      schemaState: "POST_MIGRATION",
    });
  });

  it.each([
    {
      ...preMigrationInventory(),
      localMigrationNames: [previousMigration, PRODUCTION_PARTY_MIGRATION_NAME, "20260815120000_unexpected"],
    },
    {
      ...preMigrationInventory(),
      publicTableNames: ["_prisma_migrations", "Party"],
    },
    {
      ...preMigrationInventory(),
      productionMigrationRecords: [{
        ...healthyMigration(previousMigration),
        finished: false,
      }],
    },
  ])("blocks ambiguous or unhealthy migration inventory %#", (inventory) => {
    const result = evaluateMigrationState(inventory);
    expect(result.schemaState).toBe("INVALID");
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it("produces a redacted, deterministic ready manifest for a clean scope", async () => {
    const repository = { readScope: vi.fn().mockResolvedValue(databaseRead()) };
    const config = readProductionPartyPreflightConfig(validEnv());

    const first = await runProductionPartyPreflight({
      config,
      localMigrationNames: [previousMigration, PRODUCTION_PARTY_MIGRATION_NAME],
      repository,
    });
    const second = await runProductionPartyPreflight({
      config,
      localMigrationNames: [previousMigration, PRODUCTION_PARTY_MIGRATION_NAME],
      repository,
    });

    expect(first).toMatchObject({
      blockers: [],
      candidateCount: 1,
      migration: { schemaState: "PRE_MIGRATION" },
      readOnly: true,
      ready: true,
      sourceCount: 1,
    });
    expect(first.manifestChecksum).toBe(second.manifestChecksum);
    const output = JSON.stringify(first);
    expect(output).not.toContain(scope.tenantId);
    expect(output).not.toContain(scope.companyId);
    expect(output).not.toContain(scope.periodId);
    expect(output).not.toContain("Gerçek Müşteri Adı");
  });

  it("reports blockers without invoking a mutation port", async () => {
    const read = databaseRead();
    read.actorHasActiveAdminAccess = false;
    read.tenant = { lifecycleStatus: "FROZEN" };
    read.legacyRecords = [{
      ...read.legacyRecords[0],
      data: { name: "", status: "Aktif" },
    }];
    const repository = { readScope: vi.fn().mockResolvedValue(read) };

    const result = await runProductionPartyPreflight({
      config: readProductionPartyPreflightConfig(validEnv()),
      localMigrationNames: [previousMigration, PRODUCTION_PARTY_MIGRATION_NAME],
      repository,
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      "ACTIVE_ADMIN_ACCESS_REQUIRED",
      "PARTY_PLAN_HAS_BLOCKING_ISSUES",
      "TENANT_NOT_ACTIVE",
    ]));
  });

  it("keeps the workflow manual, main-pinned and strictly read-only", () => {
    const workflow = readFileSync(
      resolve(process.cwd(), ".github/workflows/production-party-backfill-preflight.yml"),
      "utf8",
    );
    const script = readFileSync(
      resolve(process.cwd(), "scripts/verify-production-party-backfill-preflight.ts"),
      "utf8",
    );

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("inputs.expected_release_sha == github.sha");
    expect(workflow).toContain("environment: production");
    expect(workflow).toContain("secrets.PRODUCTION_TENANT_INVENTORY_DATABASE_URL");
    expect(workflow).not.toContain("secrets.PRODUCTION_DATABASE_URL");
    expect(workflow).not.toMatch(/schedule:|db:migrate|migrate deploy|db:push|db:seed/);
    expect(workflow).not.toMatch(/upload-artifact|R2_|DeleteObject|PutObject/);
    expect(script).not.toMatch(/createMany|updateMany|deleteMany|\$executeRaw/);
  });
});

function validEnv() {
  return {
    DATABASE_URL: "postgresql://readonly:secret@production.example.com/noa?sslmode=require",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_SHA: releaseSha,
    NOA_EXPECTED_RELEASE_SHA: releaseSha,
    NOA_PARTY_PREFLIGHT_ACTOR_USER_ID: "admin-production-1",
    NOA_PARTY_PREFLIGHT_COMPANY_ID: scope.companyId,
    NOA_PARTY_PREFLIGHT_PERIOD_ID: scope.periodId,
    NOA_PARTY_PREFLIGHT_TENANT_ID: scope.tenantId,
    NOA_PRODUCTION_PARTY_PREFLIGHT_CONFIRMATION:
      PRODUCTION_PARTY_PREFLIGHT_CONFIRMATION,
    NOA_RELEASE_ID: releaseSha,
    NOA_RUNTIME_ENV: "production",
    NOA_SOURCE_REF: "refs/heads/main",
  };
}

function preMigrationInventory() {
  return {
    localMigrationNames: [previousMigration, PRODUCTION_PARTY_MIGRATION_NAME],
    migrationTableExists: true,
    productionMigrationRecords: [healthyMigration(previousMigration)],
    publicTableNames: ["_prisma_migrations", "EntityRecord"],
  };
}

function healthyMigration(migrationName: string) {
  return { finished: true, migrationName, rolledBack: false };
}

function databaseRead(): ProductionPartyPreflightDatabaseRead {
  return {
    actorHasActiveAdminAccess: true,
    companyExists: true,
    existingRoles: [],
    financialCounts: {
      cashBankMovement: 2,
      ledgerEntry: 4,
      progressPayment: 1,
      purchaseInvoice: 3,
      salesInvoice: 5,
    },
    legacyRecords: [{
      ...scope,
      code: "MUS-001",
      createdAt: new Date("2026-08-14T08:00:00.000Z"),
      createdBy: "admin-production-1",
      data: { name: "Gerçek Müşteri Adı", status: "Aktif" },
      slug: "musteriler",
      updatedAt: new Date("2026-08-14T08:00:00.000Z"),
      updatedBy: "admin-production-1",
    }],
    migrationTableExists: true,
    period: { isClosed: false },
    productionMigrationRecords: [healthyMigration(previousMigration)],
    publicTableNames: ["_prisma_migrations", "EntityRecord"],
    tenant: { lifecycleStatus: "ACTIVE" },
    transactionReadOnly: true,
  };
}
