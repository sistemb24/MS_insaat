import { describe, expect, test } from "vitest";

import {
  partyCutoverIdentifiers,
  partyCutoverScopeFingerprint,
  type PartyCutoverEvidence,
} from "./party-cutover";
import { buildPartyParityReadModel } from "./party-parity-read-model";
import type { ProductionPartyCutoverPreflightResult } from
  "./production-party-cutover-migration-gate";
import {
  evaluateProductionPartyCutoverPostflightGate,
  runProductionPartyCutoverPostflight,
  type ProductionPartyCutoverPostflightRead,
} from "./production-party-cutover-postflight";
import type {
  ProductionPartyCutoverTransitionConfig,
  ProductionPartyCutoverTransitionKind,
} from "./production-party-cutover-transition";

const releaseId = "c82b60fe7a847c886ceddc9dcab73c766eb2b3a3";
const scope = {
  companyId: "company-ms-insaat",
  periodId: "period-ms-insaat-2026",
  tenantId: "tenant-ms-insaat",
};
const actorUserId = "user-production-bootstrap";
const emptySnapshot = { legacyRecords: [], parties: [], roles: [] };

describe("production Party cutover postflight", () => {
  test.each([
    "ACTIVATE",
    "ACTIVATE_RETRY",
    "ROLLBACK",
    "ROLLBACK_RETRY",
  ] as const)("accepts the exact %s evidence chain", async (kind) => {
    const config = createConfig(kind);
    const read = createRead(config);
    const postflight = await runProductionPartyCutoverPostflight({
      config,
      repository: { readExactState: async () => read },
    });
    const preflight = createPreflight(config, postflight);

    expect(postflight).toMatchObject({
      auditCount: kind.startsWith("ACTIVATE") ? 1 : 2,
      blockers: [],
      eventCount: kind.startsWith("ACTIVATE") ? 1 : 2,
      mode: kind.startsWith("ACTIVATE") ? "SHADOW_READ" : "LEGACY_ONLY",
      ready: true,
      revisionNo: kind.startsWith("ACTIVATE") ? 1 : 2,
      transactionReadOnly: true,
    });
    expect(evaluateProductionPartyCutoverPostflightGate({
      config,
      postflight,
      preflight,
    })).toMatchObject({ blockers: [], ready: true });
    expect(JSON.stringify(postflight)).not.toContain(config.operationId);
    expect(postflight.chainChecksum).toMatch(/^[a-f0-9]{64}$/);
  });

  test("rejects writable reads and a drifted audit chain", async () => {
    const config = createConfig("ACTIVATE");
    const read = createRead(config);
    read.transactionReadOnly = false;
    read.audits = [{ ...read.audits[0], metadata: { drifted: true } }];

    const result = await runProductionPartyCutoverPostflight({
      config,
      repository: { readExactState: async () => read },
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      "AUDIT_CHAIN_INVALID",
      "TRANSACTION_NOT_READ_ONLY",
    ]));
  });

  test("requires retry manifests to remain unchanged", async () => {
    const config = createConfig("ACTIVATE_RETRY");
    const postflight = await runProductionPartyCutoverPostflight({
      config,
      repository: { readExactState: async () => createRead(config) },
    });
    const preflight = createPreflight(config, postflight);
    preflight.manifestChecksum = "f".repeat(64);
    preflight.stateManifestChecksum = "e".repeat(64);

    expect(evaluateProductionPartyCutoverPostflightGate({
      config,
      postflight,
      preflight,
    }).blockers).toEqual(expect.arrayContaining([
      "RETRY_PREFLIGHT_MANIFEST_CHECKSUM_MISMATCH",
      "RETRY_STATE_MANIFEST_CHECKSUM_MISMATCH",
    ]));
  });
});

function createConfig(
  kind: ProductionPartyCutoverTransitionKind,
): ProductionPartyCutoverTransitionConfig {
  return {
    actorUserId,
    expectedBusinessChecksum: "a".repeat(64),
    expectedEligibilityManifestChecksum: "b".repeat(64),
    expectedPreflightManifestChecksum: "c".repeat(64),
    expectedStateManifestChecksum: "d".repeat(64),
    kind,
    operationId: kind.startsWith("ACTIVATE")
      ? "party-cutover-shadow-operation-1"
      : "party-cutover-rollback-operation-1",
    releaseId,
    scope,
  };
}

function createRead(
  config: ProductionPartyCutoverTransitionConfig,
): ProductionPartyCutoverPostflightRead {
  const model = buildPartyParityReadModel({ scope, snapshot: emptySnapshot });
  const evidence: PartyCutoverEvidence = {
    issueChecksum: model.issueChecksum,
    legacyChecksum: model.legacyChecksum,
    legacyCount: model.legacyCount,
    matchedCount: model.matchedCount,
    parityChecksum: model.parityChecksum,
    partyChecksum: model.partyChecksum,
    partyCount: model.partyCount,
    roleCount: model.roleCount,
  };
  const activationOperationId = "party-cutover-shadow-operation-1";
  const activation = event({
    action: "ACTIVATE_SHADOW",
    evidence,
    fromMode: "LEGACY_ONLY",
    operationId: activationOperationId,
    reasonCode: "PRODUCTION_SHADOW_VALIDATION",
    revisionNo: 1,
    toMode: "SHADOW_READ",
  });
  const events = config.kind.startsWith("ACTIVATE") ? [activation] : [
    activation,
    event({
      action: "ROLLBACK_LEGACY",
      evidence,
      fromMode: "SHADOW_READ",
      operationId: config.operationId,
      reasonCode: "PRODUCTION_SHADOW_ROLLBACK",
      revisionNo: 2,
      toMode: "LEGACY_ONLY",
    }),
  ];
  const stateId = partyCutoverIdentifiers({
    operationId: activationOperationId,
    scope,
  }).stateId;
  return {
    audits: events.map((value) => ({
      action: value.action === "ACTIVATE_SHADOW"
        ? "party-cutover.shadow-activated"
        : "party-cutover.legacy-restored",
      actorUserId,
      entityId: stateId,
      metadata: {
        action: value.action,
        counts: {
          legacy: evidence.legacyCount,
          matched: evidence.matchedCount,
          party: evidence.partyCount,
          role: evidence.roleCount,
        },
        fromMode: value.fromMode,
        operationFingerprint: partyCutoverIdentifiers({
          operationId: value.operationId,
          scope,
        }).eventId.slice(-12),
        parityChecksum: evidence.parityChecksum,
        reasonCode: value.reasonCode,
        releaseId,
        revisionFrom: value.stateRevisionNo - 1,
        revisionTo: value.stateRevisionNo,
        scopeFingerprint: partyCutoverScopeFingerprint(scope),
        toMode: value.toMode,
      },
    })),
    events,
    paritySnapshot: emptySnapshot,
    state: {
      ...evidence,
      createdBy: actorUserId,
      id: stateId,
      mode: config.kind.startsWith("ACTIVATE") ? "SHADOW_READ" : "LEGACY_ONLY",
      releaseId,
      revisionNo: config.kind.startsWith("ACTIVATE") ? 1 : 2,
      updatedBy: actorUserId,
    },
    stateCount: 1,
    transactionReadOnly: true,
  };
}

function event(input: {
  action: string;
  evidence: PartyCutoverEvidence;
  fromMode: string;
  operationId: string;
  reasonCode: string;
  revisionNo: number;
  toMode: string;
}) {
  return {
    ...input.evidence,
    action: input.action,
    actorUserId,
    fromMode: input.fromMode,
    operationId: input.operationId,
    reasonCode: input.reasonCode,
    releaseId,
    stateId: partyCutoverIdentifiers({ operationId: input.operationId, scope }).stateId,
    stateRevisionNo: input.revisionNo,
    toMode: input.toMode,
  };
}

function createPreflight(
  config: ProductionPartyCutoverTransitionConfig,
  postflight: Awaited<ReturnType<typeof runProductionPartyCutoverPostflight>>,
): ProductionPartyCutoverPreflightResult {
  return {
    blockers: [],
    businessChecksum: config.expectedBusinessChecksum,
    cutover: {
      auditCount: postflight.auditCount,
      eventCount: postflight.eventCount,
      state: {
        mode: postflight.mode ?? "",
        parityChecksum: postflight.parityChecksum,
        revisionNo: postflight.revisionNo ?? 0,
      },
      stateCount: postflight.stateCount,
    },
    eligibilityManifestChecksum: config.expectedEligibilityManifestChecksum,
    manifestChecksum: config.expectedPreflightManifestChecksum,
    migration: {
      appliedMigrationCount: 70,
      pendingMigrationNames: [],
      schemaState: "POST_MIGRATION",
    },
    parity: {
      issueChecksum: "1".repeat(64),
      issueCount: 0,
      legacyChecksum: "2".repeat(64),
      legacyCount: 0,
      matchedCount: 0,
      parityChecksum: postflight.parityChecksum,
      partyChecksum: "3".repeat(64),
      partyCount: 0,
      ready: true,
      roleCount: 0,
    },
    periodClosed: false,
    readOnly: true,
    ready: true,
    releaseId,
    scopeFingerprint: partyCutoverScopeFingerprint(scope),
    stateManifestChecksum: config.expectedStateManifestChecksum,
  };
}
