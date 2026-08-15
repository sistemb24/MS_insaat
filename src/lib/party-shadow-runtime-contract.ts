import { createHash } from "node:crypto";

import type { PartyShadowReadStatus } from "./party-shadow-read";
import { readServerObservabilityConfig } from "./staging-observability";

export const PARTY_SHADOW_RUNTIME_READINESS_CONFIRMATION =
  "production-party-shadow-runtime-readiness";
export const PARTY_SHADOW_RUNTIME_READINESS_HEADER =
  "x-noa-party-shadow-runtime-readiness";

export const PARTY_SHADOW_RUNTIME_SAFETY_STATUSES = [
  "INVALID_CUTOVER_STATE",
  "RELEASE_MISMATCH",
  "SHADOW_DRIFT",
  "SHADOW_READ_ERROR",
  "LEGACY_WRITE_WHILE_SHADOW",
] as const;

export type PartyShadowRuntimeSafetyStatus =
  (typeof PARTY_SHADOW_RUNTIME_SAFETY_STATUSES)[number];

export const PARTY_SHADOW_RUNTIME_CONTRACT = {
  alertStatuses: PARTY_SHADOW_RUNTIME_SAFETY_STATUSES,
  authoritativeSource: "EntityRecord",
  comparisonModes: ["SHADOW_READ"],
  legacyAuthoritative: true,
  observerEvent: "party.shadow_read.parity",
  redactedStructuredLogs: true,
  releaseSources: ["VERCEL_GIT_COMMIT_SHA", "NOA_RELEASE_ID"],
  version: "party-shadow-runtime-v1",
} as const;

export type PartyShadowRuntimeAttestation = {
  contractChecksum: string;
  legacyAuthoritative: boolean;
  negativeAlertingReady: boolean;
  originFingerprint: string;
  ready: boolean;
  redactedStructuredLogs: boolean;
  releaseId: string;
  safetyStatuses: readonly PartyShadowRuntimeSafetyStatus[];
  version: string;
};

export function isPartyShadowRuntimeReadinessAuthorized(
  env: Readonly<Record<string, string | undefined>>,
  confirmation: string | null,
) {
  return env.NOA_RUNTIME_ENV === "production"
    && confirmation === PARTY_SHADOW_RUNTIME_READINESS_CONFIRMATION
    && isSha(runtimeReleaseId(env))
    && normalizeProductionOrigin(env.APP_BASE_URL ?? "") !== null;
}

export function buildPartyShadowRuntimeAttestation(input: {
  env: Readonly<Record<string, string | undefined>>;
  sentry: {
    enabled: boolean;
    initialized: boolean;
    projectId?: string;
  };
}): PartyShadowRuntimeAttestation {
  const releaseId = runtimeReleaseId(input.env);
  const origin = normalizeProductionOrigin(input.env.APP_BASE_URL ?? "");
  const observability = readServerObservabilityConfig(input.env);
  const expectedProjectId = input.env.SENTRY_EXPECTED_PROJECT_ID?.trim();
  const negativeAlertingReady = observability.enabled
    && input.sentry.enabled
    && input.sentry.initialized
    && Boolean(expectedProjectId)
    && input.sentry.projectId === expectedProjectId;
  const ready = isSha(releaseId)
    && origin !== null
    && negativeAlertingReady;

  return {
    contractChecksum: partyShadowRuntimeContractChecksum(),
    legacyAuthoritative: PARTY_SHADOW_RUNTIME_CONTRACT.legacyAuthoritative,
    negativeAlertingReady,
    originFingerprint: origin ? fingerprint(origin) : "unavailable",
    ready,
    redactedStructuredLogs:
      PARTY_SHADOW_RUNTIME_CONTRACT.redactedStructuredLogs,
    releaseId,
    safetyStatuses: [...PARTY_SHADOW_RUNTIME_SAFETY_STATUSES],
    version: PARTY_SHADOW_RUNTIME_CONTRACT.version,
  };
}

export function partyShadowRuntimeContractChecksum() {
  return checksum(PARTY_SHADOW_RUNTIME_CONTRACT);
}

export function partyShadowRuntimeOriginFingerprint(value: string) {
  const origin = normalizeProductionOrigin(value);
  if (!origin) throw new Error("Party shadow runtime production origin geçerli değil.");
  return fingerprint(origin);
}

export function isPartyShadowRuntimeSafetyStatus(
  value: string,
): value is PartyShadowRuntimeSafetyStatus {
  return PARTY_SHADOW_RUNTIME_SAFETY_STATUSES.some((status) => status === value);
}

export function isPartyShadowReadAlertStatus(
  value: PartyShadowReadStatus | "SHADOW_READ_ERROR" | "LEGACY_WRITE_WHILE_SHADOW",
): value is PartyShadowRuntimeSafetyStatus {
  return isPartyShadowRuntimeSafetyStatus(value);
}

function runtimeReleaseId(
  env: Readonly<Record<string, string | undefined>>,
) {
  return (env.VERCEL_GIT_COMMIT_SHA ?? env.NOA_RELEASE_ID ?? "")
    .trim()
    .toLowerCase();
}

function normalizeProductionOrigin(value: string) {
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || url.pathname !== "/"
      || url.search
      || url.hash
    ) {
      return null;
    }
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

function isSha(value: string) {
  return /^[a-f0-9]{40}$/.test(value);
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
