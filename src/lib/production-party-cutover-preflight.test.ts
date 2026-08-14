import { describe, expect, test } from "vitest";

import {
  PRODUCTION_PARTY_CUTOVER_MIGRATION_NAME,
  evaluateProductionPartyCutoverMigrationState,
  readProductionPartyCutoverPreflightConfig,
  runProductionPartyCutoverPreflight,
  type ProductionPartyCutoverPreflightRead,
} from "./production-party-cutover-preflight";

const scope = {
  companyId: "company-ms-insaat",
  periodId: "period-ms-insaat-2026",
  tenantId: "tenant-ms-insaat",
};
const releaseId = "274bd09939040a8ff4a9f00d654fa1bf838ad87f";
const localMigrationNames = [
  ...Array.from({ length: 69 }, (_, index) =>
    `20260101${String(index).padStart(4, "0")}_migration_${index}`),
  PRODUCTION_PARTY_CUTOVER_MIGRATION_NAME,
];

describe("production Party cutover preflight", () => {
  test("requires an exact remote production workflow context", () => {
    expect(readProductionPartyCutoverPreflightConfig({
      DATABASE_URL: "postgresql://user:secret@db.example.com/noa",
      GITHUB_EVENT_NAME: "workflow_dispatch",
      GITHUB_SHA: releaseId,
      NOA_EXPECTED_RELEASE_SHA: releaseId,
      NOA_PARTY_CUTOVER_ACTOR_USER_ID: "user-production-bootstrap",
      NOA_PARTY_CUTOVER_COMPANY_ID: scope.companyId,
      NOA_PARTY_CUTOVER_PERIOD_ID: scope.periodId,
      NOA_PARTY_CUTOVER_TENANT_ID: scope.tenantId,
      NOA_PRODUCTION_PARTY_CUTOVER_CONFIRMATION: "production-party-cutover-preflight",
      NOA_RELEASE_ID: releaseId,
      NOA_RUNTIME_ENV: "production",
      NOA_SOURCE_REF: "refs/heads/main",
    })).toMatchObject({ releaseId, scope });
    expect(() => readProductionPartyCutoverPreflightConfig({
      DATABASE_URL: "postgresql://user:secret@localhost/noa",
      GITHUB_EVENT_NAME: "workflow_dispatch",
      GITHUB_SHA: releaseId,
      NOA_EXPECTED_RELEASE_SHA: releaseId,
      NOA_PARTY_CUTOVER_ACTOR_USER_ID: "user-production-bootstrap",
      NOA_PARTY_CUTOVER_COMPANY_ID: scope.companyId,
      NOA_PARTY_CUTOVER_PERIOD_ID: scope.periodId,
      NOA_PARTY_CUTOVER_TENANT_ID: scope.tenantId,
      NOA_PRODUCTION_PARTY_CUTOVER_CONFIRMATION: "production-party-cutover-preflight",
      NOA_RELEASE_ID: releaseId,
      NOA_RUNTIME_ENV: "production",
      NOA_SOURCE_REF: "refs/heads/main",
    })).toThrow(/uzak PostgreSQL/);
  });

  test("produces a redacted deterministic PRE migration manifest", async () => {
    const result = await runProductionPartyCutoverPreflight({
      config: config(),
      localMigrationNames,
      repository: repository(preMigrationRead()),
    });

    expect(result).toMatchObject({
      blockers: [],
      cutover: { auditCount: 0, eventCount: 0, state: null, stateCount: 0 },
      migration: {
        appliedMigrationCount: 69,
        pendingMigrationNames: [PRODUCTION_PARTY_CUTOVER_MIGRATION_NAME],
        schemaState: "PRE_MIGRATION",
      },
      parity: { issueCount: 0, ready: true },
      ready: true,
      readOnly: true,
    });
    expect(result.manifestChecksum).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(result)).not.toContain(scope.tenantId);
    expect(await runProductionPartyCutoverPreflight({
      config: config(),
      localMigrationNames,
      repository: repository(preMigrationRead()),
    })).toEqual(result);
  });

  test("keeps business evidence stable after only the cutover migration", async () => {
    const pre = await runProductionPartyCutoverPreflight({
      config: config(),
      localMigrationNames,
      repository: repository(preMigrationRead()),
    });
    const post = await runProductionPartyCutoverPreflight({
      config: config(),
      localMigrationNames,
      repository: repository(postMigrationRead()),
    });

    expect(post).toMatchObject({
      blockers: [],
      migration: {
        appliedMigrationCount: 70,
        pendingMigrationNames: [],
        schemaState: "POST_MIGRATION",
      },
      ready: true,
    });
    expect(post.businessChecksum).toBe(pre.businessChecksum);
    expect(post.manifestChecksum).not.toBe(pre.manifestChecksum);
    expect(post.eligibilityManifestChecksum).not.toBe(pre.eligibilityManifestChecksum);
  });

  test("keeps eligibility stable when an internally consistent cutover state appears", async () => {
    const empty = await runProductionPartyCutoverPreflight({
      config: config(),
      localMigrationNames,
      repository: repository(postMigrationRead()),
    });
    const activatedRead = postMigrationRead();
    activatedRead.cutoverStateCount = 1;
    activatedRead.cutoverEventCount = 1;
    activatedRead.cutoverAuditCount = 1;
    activatedRead.cutoverState = {
      mode: "SHADOW_READ",
      parityChecksum: empty.parity.parityChecksum,
      revisionNo: 1,
    };
    const activated = await runProductionPartyCutoverPreflight({
      config: config(),
      localMigrationNames,
      repository: repository(activatedRead),
    });

    expect(activated.ready).toBe(true);
    expect(activated.businessChecksum).toBe(empty.businessChecksum);
    expect(activated.eligibilityManifestChecksum).toBe(
      empty.eligibilityManifestChecksum,
    );
    expect(activated.manifestChecksum).not.toBe(empty.manifestChecksum);
  });

  test("fails closed for parity blockers and partial cutover tables", async () => {
    const read = preMigrationRead();
    read.paritySnapshot.legacyRecords.push({
      ...scope,
      code: "MUS-001",
      data: { name: "Eksik Party", status: "Aktif" },
      slug: "musteriler",
    });
    const parityBlocked = await runProductionPartyCutoverPreflight({
      config: config(),
      localMigrationNames,
      repository: repository(read),
    });
    expect(parityBlocked).toMatchObject({ ready: false });
    expect(parityBlocked.blockers).toContain("PARTY_PARITY_NOT_READY");

    expect(evaluateProductionPartyCutoverMigrationState({
      localMigrationNames,
      migrationTableExists: true,
      productionMigrationRecords: productionRecords(69),
      publicTableNames: ["Party", "PartyCutoverState"],
    })).toMatchObject({
      blockers: expect.arrayContaining(["CUTOVER_SCHEMA_STATE_INVALID"]),
      schemaState: "INVALID",
    });
  });
});

function config() {
  return {
    actorUserId: "user-production-bootstrap",
    databaseUrl: "postgresql://user:secret@db.example.com/noa",
    releaseId,
    scope,
  };
}

function repository(read: ProductionPartyCutoverPreflightRead) {
  return { readScope: async () => read };
}

function preMigrationRead(): ProductionPartyCutoverPreflightRead {
  return {
    actorHasActiveAdminAccess: true,
    backfillAuditCount: 1,
    backfillIssueCount: 0,
    backfillRuns: [{
      candidateCount: 0,
      issueCount: 0,
      sourceChecksum: "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
      sourceCount: 0,
      status: "VERIFIED",
      version: "party-v1",
    }],
    companyExists: true,
    cutoverAuditCount: 0,
    cutoverEventCount: 0,
    cutoverState: null,
    cutoverStateCount: 0,
    financialCounts: {
      cashBankMovement: 0,
      ledgerEntry: 0,
      progressPayment: 0,
      purchaseInvoice: 0,
      salesInvoice: 0,
    },
    migrationTableExists: true,
    paritySnapshot: { legacyRecords: [], parties: [], roles: [] },
    period: { isClosed: false },
    productionMigrationRecords: productionRecords(69),
    publicTableNames: ["_prisma_migrations", "Party", "PartyRole"],
    tenant: { lifecycleStatus: "ACTIVE" },
    transactionReadOnly: true,
  };
}

function postMigrationRead(): ProductionPartyCutoverPreflightRead {
  return {
    ...preMigrationRead(),
    productionMigrationRecords: productionRecords(70),
    publicTableNames: [
      "_prisma_migrations",
      "Party",
      "PartyRole",
      "PartyCutoverEvent",
      "PartyCutoverState",
    ],
  };
}

function productionRecords(count: number) {
  return localMigrationNames.slice(0, count).map((migrationName) => ({
    finished: true,
    migrationName,
    rolledBack: false,
  }));
}
