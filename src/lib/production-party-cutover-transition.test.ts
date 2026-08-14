import { describe, expect, test, vi } from "vitest";

import type { PartyCutoverRepository } from "./party-cutover";
import type { ProductionPartyCutoverPreflightResult } from
  "./production-party-cutover-migration-gate";
import {
  createTransitionCommand,
  evaluateProductionPartyCutoverTransitionGate,
  readProductionPartyCutoverTransitionConfig,
  runProductionPartyCutoverTransition,
  type ProductionPartyCutoverTransitionConfig,
  type ProductionPartyCutoverTransitionKind,
} from "./production-party-cutover-transition";

const releaseId = "c82b60fe7a847c886ceddc9dcab73c766eb2b3a3";
const checksum = (value: string) => value.repeat(64);

describe("production Party cutover transition", () => {
  test.each([
    ["ACTIVATE", "production-party-shadow-activate"],
    ["ACTIVATE_RETRY", "production-party-shadow-exact-retry"],
    ["ROLLBACK", "production-party-shadow-rollback"],
    ["ROLLBACK_RETRY", "production-party-shadow-rollback-exact-retry"],
  ] as const)("reads exact %s workflow context", (kind, confirmation) => {
    expect(readProductionPartyCutoverTransitionConfig({
      GITHUB_EVENT_NAME: "workflow_dispatch",
      GITHUB_SHA: releaseId,
      NOA_EXPECTED_RELEASE_SHA: releaseId,
      NOA_PARTY_CUTOVER_ACTOR_USER_ID: "user-production-bootstrap",
      NOA_PARTY_CUTOVER_COMPANY_ID: "company-ms-insaat",
      NOA_PARTY_CUTOVER_EXPECTED_BUSINESS_CHECKSUM: checksum("a"),
      NOA_PARTY_CUTOVER_EXPECTED_ELIGIBILITY_MANIFEST_CHECKSUM: checksum("b"),
      NOA_PARTY_CUTOVER_EXPECTED_PREFLIGHT_MANIFEST_CHECKSUM: checksum("c"),
      NOA_PARTY_CUTOVER_EXPECTED_STATE_MANIFEST_CHECKSUM: checksum("d"),
      NOA_PARTY_CUTOVER_OPERATION_ID: "party-cutover-operation-safe-1",
      NOA_PARTY_CUTOVER_PERIOD_ID: "period-ms-insaat-2026",
      NOA_PARTY_CUTOVER_TENANT_ID: "tenant-ms-insaat",
      NOA_PARTY_CUTOVER_TRANSITION_KIND: kind,
      NOA_PRODUCTION_PARTY_CUTOVER_CONFIRMATION: confirmation,
      NOA_RELEASE_ID: releaseId,
      NOA_RUNTIME_ENV: "production",
      NOA_SOURCE_REF: "refs/heads/main",
    })).toMatchObject({ kind, operationId: "party-cutover-operation-safe-1" });
  });

  test("rejects a confirmation that does not match the transition kind", () => {
    expect(() => readProductionPartyCutoverTransitionConfig({
      GITHUB_EVENT_NAME: "workflow_dispatch",
      GITHUB_SHA: releaseId,
      NOA_PARTY_CUTOVER_TRANSITION_KIND: "ACTIVATE",
      NOA_PRODUCTION_PARTY_CUTOVER_CONFIRMATION: "production-party-shadow-rollback",
      NOA_RELEASE_ID: releaseId,
      NOA_RUNTIME_ENV: "production",
      NOA_SOURCE_REF: "refs/heads/main",
    })).toThrow(/açık onayı işlem türüyle eşleşmiyor/);
  });

  test.each([
    ["ACTIVATE", null, 0, 0, 0],
    ["ACTIVATE_RETRY", { mode: "SHADOW_READ", revisionNo: 1 }, 1, 1, 1],
    ["ROLLBACK", { mode: "SHADOW_READ", revisionNo: 1 }, 1, 1, 1],
    ["ROLLBACK_RETRY", { mode: "LEGACY_ONLY", revisionNo: 2 }, 1, 2, 2],
  ] as const)("accepts the exact %s pre-state", (
    kind,
    state,
    stateCount,
    eventCount,
    auditCount,
  ) => {
    const preflight = result({ auditCount, eventCount, state, stateCount });
    expect(evaluateProductionPartyCutoverTransitionGate({
      config: config(kind, preflight),
      preflight,
    })).toMatchObject({ blockers: [], kind, ready: true });
  });

  test("rejects manifest, business, eligibility, state and revision drift", () => {
    const preflight = result({
      auditCount: 1,
      eventCount: 1,
      state: { mode: "SHADOW_READ", revisionNo: 2 },
      stateCount: 1,
    });
    const gate = evaluateProductionPartyCutoverTransitionGate({
      config: {
        ...config("ROLLBACK", preflight),
        expectedBusinessChecksum: checksum("f"),
        expectedEligibilityManifestChecksum: checksum("f"),
        expectedPreflightManifestChecksum: checksum("f"),
        expectedStateManifestChecksum: checksum("f"),
      },
      preflight,
    });
    expect(gate.ready).toBe(false);
    expect(gate.blockers).toEqual(expect.arrayContaining([
      "BUSINESS_CHECKSUM_MISMATCH",
      "ELIGIBILITY_MANIFEST_CHECKSUM_MISMATCH",
      "PREFLIGHT_MANIFEST_CHECKSUM_MISMATCH",
      "SHADOW_REVISION_ONE_REQUIRED",
      "STATE_MANIFEST_CHECKSUM_MISMATCH",
    ]));
  });

  test.each([
    ["ACTIVATE", "SHADOW_READ", 0, true],
    ["ACTIVATE_RETRY", "SHADOW_READ", 0, true],
    ["ROLLBACK", "LEGACY_ONLY", 1, false],
    ["ROLLBACK_RETRY", "LEGACY_ONLY", 1, false],
  ] as const)("builds the allowlisted %s command", (
    kind,
    targetMode,
    expectedRevisionNo,
    hasParity,
  ) => {
    const preflight = resultForKind(kind);
    expect(createTransitionCommand(config(kind, preflight), preflight)).toMatchObject({
      expectedRevisionNo,
      targetMode,
    });
    expect(Boolean(createTransitionCommand(
      config(kind, preflight),
      preflight,
    ).expectedParity)).toBe(hasParity);
  });

  test.each([
    ["ACTIVATE", "ACTIVATED", "SHADOW_READ", false, 1],
    ["ACTIVATE_RETRY", "UNCHANGED", "SHADOW_READ", true, 1],
    ["ROLLBACK", "ROLLED_BACK", "LEGACY_ONLY", false, 2],
    ["ROLLBACK_RETRY", "UNCHANGED", "LEGACY_ONLY", true, 2],
  ] as const)("accepts only the exact %s execution result", async (
    kind,
    status,
    mode,
    replayed,
    revisionNo,
  ) => {
    const preflight = resultForKind(kind);
    const repository: PartyCutoverRepository = {
      transition: vi.fn().mockResolvedValue({
        mode,
        parityChecksum: preflight.parity.parityChecksum,
        replayed,
        revisionNo,
        scopeFingerprint: "a1b2c3d4e5f6",
        status,
      }),
    };
    await expect(runProductionPartyCutoverTransition({
      config: config(kind, preflight),
      preflight,
      repository,
    })).resolves.toMatchObject({ kind, mode, replayed, revisionNo, status });
    expect(repository.transition).toHaveBeenCalledOnce();
  });
});

function config(
  kind: ProductionPartyCutoverTransitionKind,
  preflight: ProductionPartyCutoverPreflightResult,
): ProductionPartyCutoverTransitionConfig {
  return {
    actorUserId: "user-production-bootstrap",
    expectedBusinessChecksum: preflight.businessChecksum,
    expectedEligibilityManifestChecksum: preflight.eligibilityManifestChecksum,
    expectedPreflightManifestChecksum: preflight.manifestChecksum,
    expectedStateManifestChecksum: preflight.stateManifestChecksum,
    kind,
    operationId: kind.startsWith("ACTIVATE")
      ? "party-cutover-shadow-operation-1"
      : "party-cutover-rollback-operation-1",
    releaseId,
    scope: {
      companyId: "company-ms-insaat",
      periodId: "period-ms-insaat-2026",
      tenantId: "tenant-ms-insaat",
    },
  };
}

function resultForKind(kind: ProductionPartyCutoverTransitionKind) {
  if (kind === "ACTIVATE") {
    return result({ auditCount: 0, eventCount: 0, state: null, stateCount: 0 });
  }
  if (kind === "ACTIVATE_RETRY" || kind === "ROLLBACK") {
    return result({
      auditCount: 1,
      eventCount: 1,
      state: { mode: "SHADOW_READ", revisionNo: 1 },
      stateCount: 1,
    });
  }
  return result({
    auditCount: 2,
    eventCount: 2,
    state: { mode: "LEGACY_ONLY", revisionNo: 2 },
    stateCount: 1,
  });
}

function result(input: {
  auditCount: number;
  eventCount: number;
  state: { mode: string; revisionNo: number } | null;
  stateCount: number;
}): ProductionPartyCutoverPreflightResult {
  const parityChecksum = checksum("9");
  const state = input.state ? { ...input.state, parityChecksum } : null;
  return {
    blockers: [],
    businessChecksum: checksum("a"),
    cutover: {
      auditCount: input.auditCount,
      eventCount: input.eventCount,
      state,
      stateCount: input.stateCount,
    },
    eligibilityManifestChecksum: checksum("b"),
    manifestChecksum: checksum("c"),
    migration: {
      appliedMigrationCount: 70,
      pendingMigrationNames: [],
      schemaState: "POST_MIGRATION",
    },
    parity: {
      issueChecksum: checksum("1"),
      issueCount: 0,
      legacyChecksum: checksum("2"),
      legacyCount: 0,
      matchedCount: 0,
      parityChecksum,
      partyChecksum: checksum("3"),
      partyCount: 0,
      ready: true,
      roleCount: 0,
    },
    periodClosed: false,
    readOnly: true,
    ready: true,
    releaseId,
    scopeFingerprint: "a1b2c3d4e5f6",
    stateManifestChecksum: checksum("d"),
  };
}
