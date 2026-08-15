import { createHash } from "node:crypto";

import type { PartyParityReadModel, PartyParityScope } from "./party-parity-read-model";
import type { PartySlug } from "./party-read-model";

export type PartyShadowCutoverState = {
  mode: string;
  releaseId: string;
  revisionNo: number;
};

export type PartyShadowReadStatus =
  | "INVALID_CUTOVER_STATE"
  | "LEGACY_ONLY"
  | "RELEASE_MISMATCH"
  | "SHADOW_DRIFT"
  | "SHADOW_MATCH";

export type PartyShadowReadObservation = {
  issueChecksum?: string;
  issueCodes: string[];
  legacyChecksum?: string;
  legacyCount?: number;
  mode: "LEGACY_ONLY" | "SHADOW_READ" | "UNKNOWN";
  partyChecksum?: string;
  partyCount?: number;
  releaseId?: string;
  revisionNo?: number;
  roleCount?: number;
  scopeFingerprint: string;
  slug: PartySlug;
  status: PartyShadowReadStatus;
};

export function evaluatePartyShadowRead(input: {
  parity?: PartyParityReadModel;
  runtimeReleaseId: string;
  scope: PartyParityScope;
  slug: PartySlug;
  state: PartyShadowCutoverState | null;
  stateCount: number;
}): PartyShadowReadObservation {
  const base = {
    issueCodes: [] as string[],
    scopeFingerprint: partyShadowScopeFingerprint(input.scope),
    slug: input.slug,
  };

  if (input.stateCount === 0 && !input.state) {
    return { ...base, mode: "LEGACY_ONLY", status: "LEGACY_ONLY" };
  }
  if (input.stateCount !== 1 || !input.state || !isKnownMode(input.state.mode)) {
    return { ...base, mode: "UNKNOWN", status: "INVALID_CUTOVER_STATE" };
  }

  const state = input.state;
  const mode = state.mode as "LEGACY_ONLY" | "SHADOW_READ";
  const stateFields = {
    mode,
    releaseId: state.releaseId,
    revisionNo: state.revisionNo,
  } as const;

  if ((mode === "SHADOW_READ" && state.revisionNo !== 1)
    || (mode === "LEGACY_ONLY" && state.revisionNo !== 2)) {
    return { ...base, ...stateFields, status: "INVALID_CUTOVER_STATE" };
  }

  if (mode === "LEGACY_ONLY") {
    return { ...base, ...stateFields, status: "LEGACY_ONLY" };
  }
  if (!isSha(input.runtimeReleaseId) || input.runtimeReleaseId !== state.releaseId) {
    return { ...base, ...stateFields, status: "RELEASE_MISMATCH" };
  }
  if (!input.parity) {
    return { ...base, ...stateFields, status: "INVALID_CUTOVER_STATE" };
  }

  const parityFields = {
    issueChecksum: input.parity.issueChecksum,
    issueCodes: [...new Set(input.parity.issues.map((issue) => issue.code))].sort(),
    legacyChecksum: input.parity.legacyChecksum,
    legacyCount: input.parity.legacyCount,
    partyChecksum: input.parity.partyChecksum,
    partyCount: input.parity.partyCount,
    roleCount: input.parity.roleCount,
  };

  return {
    ...base,
    ...stateFields,
    ...parityFields,
    scopeFingerprint: input.parity.scopeFingerprint,
    status: input.parity.ready ? "SHADOW_MATCH" : "SHADOW_DRIFT",
  };
}

export function partyShadowScopeFingerprint(scope: PartyParityScope) {
  return createHash("sha256")
    .update(stableJson(normalizePartyParityScope(scope)))
    .digest("hex")
    .slice(0, 12);
}

export function normalizePartyParityScope(scope: PartyParityScope): PartyParityScope {
  return {
    companyId: scope.companyId,
    periodId: scope.periodId,
    tenantId: scope.tenantId,
  };
}

function isKnownMode(value: string): value is "LEGACY_ONLY" | "SHADOW_READ" {
  return value === "LEGACY_ONLY" || value === "SHADOW_READ";
}

function isSha(value: string) {
  return /^[a-f0-9]{40}$/.test(value);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
