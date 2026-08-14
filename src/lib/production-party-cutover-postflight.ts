import { createHash } from "node:crypto";

import {
  partyCutoverIdentifiers,
  partyCutoverScopeFingerprint,
  samePartyCutoverEvidence,
  type PartyCutoverEvidence,
} from "./party-cutover";
import {
  buildPartyParityReadModel,
  type PartyParitySnapshot,
} from "./party-parity-read-model";
import type {
  ProductionPartyCutoverPreflightResult,
} from "./production-party-cutover-migration-gate";
import { PRODUCTION_PARTY_CUTOVER_EXPECTED_MIGRATION_COUNT } from
  "./production-party-cutover-preflight";
import type {
  ProductionPartyCutoverTransitionConfig,
  ProductionPartyCutoverTransitionKind,
} from "./production-party-cutover-transition";

type StateRecord = PartyCutoverEvidence & {
  createdBy: string;
  id: string;
  mode: string;
  releaseId: string;
  revisionNo: number;
  updatedBy: string;
};

type EventRecord = PartyCutoverEvidence & {
  action: string;
  actorUserId: string;
  fromMode: string;
  operationId: string;
  reasonCode: string;
  releaseId: string;
  stateId: string;
  stateRevisionNo: number;
  toMode: string;
};

type AuditRecord = {
  action: string;
  actorUserId: string | null;
  entityId: string;
  metadata: unknown;
};

export type ProductionPartyCutoverPostflightRead = {
  audits: readonly AuditRecord[];
  events: readonly EventRecord[];
  paritySnapshot: PartyParitySnapshot;
  state: StateRecord | null;
  stateCount: number;
  transactionReadOnly: boolean;
};

export type ProductionPartyCutoverPostflightRepository = {
  readExactState(input: {
    scope: ProductionPartyCutoverTransitionConfig["scope"];
  }): Promise<ProductionPartyCutoverPostflightRead>;
};

export async function runProductionPartyCutoverPostflight(input: {
  config: ProductionPartyCutoverTransitionConfig;
  repository: ProductionPartyCutoverPostflightRepository;
}) {
  const read = await input.repository.readExactState({ scope: input.config.scope });
  const parity = buildPartyParityReadModel({
    scope: input.config.scope,
    snapshot: read.paritySnapshot,
  });
  const blockers: string[] = [];
  if (!read.transactionReadOnly) blockers.push("TRANSACTION_NOT_READ_ONLY");
  if (!parity.ready || parity.issues.length !== 0) blockers.push("PARTY_PARITY_NOT_READY");
  if (read.stateCount !== 1 || !read.state) blockers.push("CUTOVER_STATE_REQUIRED");
  const state = read.state;
  const expected = expectedPostState(input.config.kind);
  if (state) {
    if (state.mode !== expected.mode) blockers.push("STATE_MODE_MISMATCH");
    if (state.revisionNo !== expected.revisionNo) {
      blockers.push("STATE_REVISION_MISMATCH");
    }
    if (state.releaseId !== input.config.releaseId) {
      blockers.push("STATE_RELEASE_MISMATCH");
    }
    if (state.updatedBy !== input.config.actorUserId) {
      blockers.push("STATE_ACTOR_MISMATCH");
    }
    if (read.events[0] && state.createdBy !== read.events[0].actorUserId) {
      blockers.push("STATE_CREATOR_MISMATCH");
    }
    if (!samePartyCutoverEvidence(stateEvidence(state), parityEvidence(parity))) {
      blockers.push("STATE_PARITY_MISMATCH");
    }
  }
  if (read.events.length !== expected.eventCount) blockers.push("EVENT_COUNT_MISMATCH");
  if (read.audits.length !== expected.auditCount) blockers.push("AUDIT_COUNT_MISMATCH");
  if (state) {
    validateEventChain({
      blockers,
      config: input.config,
      events: read.events,
      state,
    });
    validateAuditChain({
      audits: read.audits,
      blockers,
      config: input.config,
      events: read.events,
      state,
    });
  }
  const chainPayload = {
    audits: read.audits.map((audit) => ({
      action: audit.action,
      actorFingerprint: fingerprint(audit.actorUserId ?? ""),
      entityFingerprint: fingerprint(audit.entityId),
      metadataChecksum: checksum(audit.metadata),
    })),
    events: read.events.map((event) => ({
      action: event.action,
      actorFingerprint: fingerprint(event.actorUserId),
      evidenceChecksum: checksum(eventEvidence(event)),
      fromMode: event.fromMode,
      operationFingerprint: fingerprint(event.operationId),
      reasonCode: event.reasonCode,
      releaseId: event.releaseId,
      revisionNo: event.stateRevisionNo,
      toMode: event.toMode,
    })),
    state: state ? {
      evidenceChecksum: checksum(stateEvidence(state)),
      mode: state.mode,
      releaseId: state.releaseId,
      revisionNo: state.revisionNo,
      updatedByFingerprint: fingerprint(state.updatedBy),
    } : null,
  };
  return {
    auditCount: read.audits.length,
    blockers: unique(blockers),
    chainChecksum: checksum(chainPayload),
    eventCount: read.events.length,
    kind: input.config.kind,
    latestOperationFingerprint: read.events.length > 0
      ? fingerprint(read.events.at(-1)?.operationId ?? "")
      : null,
    mode: state?.mode ?? null,
    parityChecksum: parity.parityChecksum,
    ready: blockers.length === 0,
    releaseId: input.config.releaseId,
    revisionNo: state?.revisionNo ?? null,
    scopeFingerprint: partyCutoverScopeFingerprint(input.config.scope),
    stateCount: read.stateCount,
    transactionReadOnly: read.transactionReadOnly,
  };
}

export function evaluateProductionPartyCutoverPostflightGate(input: {
  config: ProductionPartyCutoverTransitionConfig;
  postflight: Awaited<ReturnType<typeof runProductionPartyCutoverPostflight>>;
  preflight: ProductionPartyCutoverPreflightResult;
}) {
  const { config, postflight, preflight } = input;
  const blockers = [...preflight.blockers, ...postflight.blockers];
  if (!preflight.ready) blockers.push("PREFLIGHT_NOT_READY");
  if (!preflight.readOnly || !postflight.transactionReadOnly) {
    blockers.push("READ_ONLY_PROOF_REQUIRED");
  }
  if (preflight.releaseId !== config.releaseId) blockers.push("RELEASE_ID_MISMATCH");
  if (
    preflight.migration.schemaState !== "POST_MIGRATION"
    || preflight.migration.appliedMigrationCount
      !== PRODUCTION_PARTY_CUTOVER_EXPECTED_MIGRATION_COUNT
    || preflight.migration.pendingMigrationNames.length !== 0
  ) {
    blockers.push("POST_MIGRATION_INVENTORY_MISMATCH");
  }
  if (preflight.businessChecksum !== config.expectedBusinessChecksum) {
    blockers.push("BUSINESS_CHECKSUM_MISMATCH");
  }
  if (
    preflight.eligibilityManifestChecksum
    !== config.expectedEligibilityManifestChecksum
  ) {
    blockers.push("ELIGIBILITY_MANIFEST_CHECKSUM_MISMATCH");
  }
  if (!postflight.ready) blockers.push("POSTFLIGHT_NOT_READY");
  if (preflight.parity.parityChecksum !== postflight.parityChecksum) {
    blockers.push("POSTFLIGHT_PARITY_CHECKSUM_MISMATCH");
  }
  if (
    (config.kind === "ACTIVATE_RETRY" || config.kind === "ROLLBACK_RETRY")
    && preflight.manifestChecksum !== config.expectedPreflightManifestChecksum
  ) {
    blockers.push("RETRY_PREFLIGHT_MANIFEST_CHECKSUM_MISMATCH");
  }
  if (
    (config.kind === "ACTIVATE_RETRY" || config.kind === "ROLLBACK_RETRY")
    && preflight.stateManifestChecksum !== config.expectedStateManifestChecksum
  ) {
    blockers.push("RETRY_STATE_MANIFEST_CHECKSUM_MISMATCH");
  }
  return {
    blockers: unique(blockers),
    businessChecksum: preflight.businessChecksum,
    chainChecksum: postflight.chainChecksum,
    eligibilityManifestChecksum: preflight.eligibilityManifestChecksum,
    eventCount: postflight.eventCount,
    kind: config.kind,
    manifestChecksum: preflight.manifestChecksum,
    mode: postflight.mode,
    parityChecksum: postflight.parityChecksum,
    ready: blockers.length === 0,
    releaseId: config.releaseId,
    revisionNo: postflight.revisionNo,
    stateManifestChecksum: preflight.stateManifestChecksum,
  };
}

function validateEventChain(input: {
  blockers: string[];
  config: ProductionPartyCutoverTransitionConfig;
  events: readonly EventRecord[];
  state: StateRecord;
}) {
  const expectedActions = input.state.revisionNo === 1
    ? ["ACTIVATE_SHADOW"]
    : ["ACTIVATE_SHADOW", "ROLLBACK_LEGACY"];
  for (const [index, event] of input.events.entries()) {
    const revisionNo = index + 1;
    const action = expectedActions[index];
    const fromMode = revisionNo === 1 ? "LEGACY_ONLY" : "SHADOW_READ";
    const toMode = revisionNo === 1 ? "SHADOW_READ" : "LEGACY_ONLY";
    const reasonCode = revisionNo === 1
      ? "PRODUCTION_SHADOW_VALIDATION"
      : "PRODUCTION_SHADOW_ROLLBACK";
    if (
      event.stateId !== input.state.id
      || event.stateRevisionNo !== revisionNo
      || event.action !== action
      || event.fromMode !== fromMode
      || event.toMode !== toMode
      || event.reasonCode !== reasonCode
      || event.releaseId !== input.state.releaseId
      || !samePartyCutoverEvidence(
        eventEvidence(event),
        stateEvidence(input.state),
      )
    ) {
      input.blockers.push("EVENT_CHAIN_INVALID");
    }
  }
  const latest = input.events.at(-1);
  const expectedAction = isActivation(input.config.kind)
    ? "ACTIVATE_SHADOW"
    : "ROLLBACK_LEGACY";
  const expectedReason = isActivation(input.config.kind)
    ? "PRODUCTION_SHADOW_VALIDATION"
    : "PRODUCTION_SHADOW_ROLLBACK";
  if (
    !latest
    || latest.operationId !== input.config.operationId
    || latest.actorUserId !== input.config.actorUserId
    || latest.releaseId !== input.config.releaseId
    || latest.reasonCode !== expectedReason
    || latest.action !== expectedAction
  ) {
    input.blockers.push("LATEST_EVENT_MISMATCH");
  }
}

function validateAuditChain(input: {
  audits: readonly AuditRecord[];
  blockers: string[];
  config: ProductionPartyCutoverTransitionConfig;
  events: readonly EventRecord[];
  state: StateRecord;
}) {
  for (const event of input.events) {
    const expectedAction = event.action === "ACTIVATE_SHADOW"
      ? "party-cutover.shadow-activated"
      : "party-cutover.legacy-restored";
    const matching = input.audits.filter((audit) => {
      if (
        audit.action !== expectedAction
        || audit.actorUserId !== event.actorUserId
        || audit.entityId !== input.state.id
      ) {
        return false;
      }
      const metadata = asRecord(audit.metadata);
      const counts = asRecord(metadata?.counts);
      return Boolean(metadata)
        && metadata?.action === event.action
        && metadata?.fromMode === event.fromMode
        && metadata?.toMode === event.toMode
        && metadata?.reasonCode === event.reasonCode
        && metadata?.releaseId === event.releaseId
        && metadata?.revisionFrom === event.stateRevisionNo - 1
        && metadata?.revisionTo === event.stateRevisionNo
        && metadata?.parityChecksum === event.parityChecksum
        && metadata?.operationFingerprint === partyCutoverIdentifiers({
          operationId: event.operationId,
          scope: input.config.scope,
        }).eventId.slice(-12)
        && metadata?.scopeFingerprint === partyCutoverScopeFingerprint(
          input.config.scope,
        )
        && counts?.legacy === event.legacyCount
        && counts?.matched === event.matchedCount
        && counts?.party === event.partyCount
        && counts?.role === event.roleCount;
    });
    if (matching.length !== 1) input.blockers.push("AUDIT_CHAIN_INVALID");
  }
}

function expectedPostState(kind: ProductionPartyCutoverTransitionKind) {
  return isActivation(kind)
    ? { auditCount: 1, eventCount: 1, mode: "SHADOW_READ", revisionNo: 1 }
    : { auditCount: 2, eventCount: 2, mode: "LEGACY_ONLY", revisionNo: 2 };
}

function isActivation(kind: ProductionPartyCutoverTransitionKind) {
  return kind === "ACTIVATE" || kind === "ACTIVATE_RETRY";
}

function parityEvidence(
  model: ReturnType<typeof buildPartyParityReadModel>,
): PartyCutoverEvidence {
  return {
    issueChecksum: model.issueChecksum,
    legacyChecksum: model.legacyChecksum,
    legacyCount: model.legacyCount,
    matchedCount: model.matchedCount,
    parityChecksum: model.parityChecksum,
    partyChecksum: model.partyChecksum,
    partyCount: model.partyCount,
    roleCount: model.roleCount,
  };
}

function stateEvidence(value: PartyCutoverEvidence): PartyCutoverEvidence {
  return {
    issueChecksum: value.issueChecksum,
    legacyChecksum: value.legacyChecksum,
    legacyCount: value.legacyCount,
    matchedCount: value.matchedCount,
    parityChecksum: value.parityChecksum,
    partyChecksum: value.partyChecksum,
    partyCount: value.partyCount,
    roleCount: value.roleCount,
  };
}

function eventEvidence(value: EventRecord) {
  return stateEvidence(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function fingerprint(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function checksum(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function unique(values: readonly string[]) {
  return [...new Set(values)].sort();
}
