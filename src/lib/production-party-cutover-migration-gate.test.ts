import { expect, test } from "vitest";

import {
  evaluateProductionPartyCutoverMigrationGate,
  readProductionPartyCutoverMigrationGateConfig,
} from "./production-party-cutover-migration-gate";
import { PRODUCTION_PARTY_CUTOVER_MIGRATION_NAME } from
  "./production-party-cutover-preflight";

const releaseId = "274bd09939040a8ff4a9f00d654fa1bf838ad87f";
const checksum = "a".repeat(64);

test("reads an exact-release migration gate config", () => {
  expect(readProductionPartyCutoverMigrationGateConfig({
    DATABASE_URL: "postgresql://user:secret@db.example.com/noa",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_SHA: releaseId,
    NOA_EXPECTED_RELEASE_SHA: releaseId,
    NOA_PARTY_CUTOVER_ACTOR_USER_ID: "user-production-bootstrap",
    NOA_PARTY_CUTOVER_BACKUP_ID: `20260814T140000Z-${releaseId}`,
    NOA_PARTY_CUTOVER_COMPANY_ID: "company-ms-insaat",
    NOA_PARTY_CUTOVER_EXPECTED_BUSINESS_CHECKSUM: checksum,
    NOA_PARTY_CUTOVER_EXPECTED_PREFLIGHT_MANIFEST_CHECKSUM: checksum,
    NOA_PARTY_CUTOVER_MIGRATION_STAGE: "PRE_MIGRATION",
    NOA_PARTY_CUTOVER_PERIOD_ID: "period-ms-insaat-2026",
    NOA_PARTY_CUTOVER_TENANT_ID: "tenant-ms-insaat",
    NOA_PRODUCTION_PARTY_CUTOVER_CONFIRMATION:
      "production-party-cutover-migration-execute",
    NOA_RELEASE_ID: releaseId,
    NOA_RUNTIME_ENV: "production",
    NOA_SOURCE_REF: "refs/heads/main",
  })).toMatchObject({
    backupId: `20260814T140000Z-${releaseId}`,
    stage: "PRE_MIGRATION",
  });
});

test("accepts exact PRE and POST gates while rejecting business drift", () => {
  const preflight = result("PRE_MIGRATION");
  const preConfig = config("PRE_MIGRATION", preflight);
  expect(evaluateProductionPartyCutoverMigrationGate({
    config: preConfig,
    preflight,
  })).toMatchObject({ blockers: [], ready: true, stage: "PRE_MIGRATION" });

  const postflight = result("POST_MIGRATION");
  expect(evaluateProductionPartyCutoverMigrationGate({
    config: { ...preConfig, stage: "POST_MIGRATION" },
    preflight: postflight,
  })).toMatchObject({ blockers: [], ready: true, stage: "POST_MIGRATION" });
  expect(evaluateProductionPartyCutoverMigrationGate({
    config: { ...preConfig, expectedBusinessChecksum: "f".repeat(64) },
    preflight,
  })).toMatchObject({
    blockers: expect.arrayContaining(["BUSINESS_CHECKSUM_MISMATCH"]),
    ready: false,
  });
});

function config(
  stage: "POST_MIGRATION" | "PRE_MIGRATION",
  preflight: ReturnType<typeof result>,
) {
  return {
    actorUserId: "user-production-bootstrap",
    backupId: `20260814T140000Z-${releaseId}`,
    databaseUrl: "postgresql://user:secret@db.example.com/noa",
    expectedBusinessChecksum: preflight.businessChecksum,
    expectedPreflightManifestChecksum: preflight.manifestChecksum,
    releaseId,
    scope: {
      companyId: "company-ms-insaat",
      periodId: "period-ms-insaat-2026",
      tenantId: "tenant-ms-insaat",
    },
    stage,
  };
}

function result(stage: "POST_MIGRATION" | "PRE_MIGRATION") {
  return {
    blockers: [],
    businessChecksum: "b".repeat(64),
    cutover: { auditCount: 0, eventCount: 0, state: null, stateCount: 0 },
    eligibilityManifestChecksum: "c".repeat(64),
    manifestChecksum: "d".repeat(64),
    migration: stage === "PRE_MIGRATION"
      ? {
          appliedMigrationCount: 69,
          pendingMigrationNames: [PRODUCTION_PARTY_CUTOVER_MIGRATION_NAME],
          schemaState: stage,
        }
      : { appliedMigrationCount: 70, pendingMigrationNames: [], schemaState: stage },
    parity: {
      issueChecksum: checksum,
      issueCount: 0,
      legacyChecksum: checksum,
      legacyCount: 0,
      matchedCount: 0,
      parityChecksum: checksum,
      partyChecksum: checksum,
      partyCount: 0,
      ready: true,
      roleCount: 0,
    },
    periodClosed: false,
    readOnly: true,
    ready: true,
    releaseId,
    scopeFingerprint: "a1b2c3d4e5f6",
    stateManifestChecksum: "e".repeat(64),
  };
}
