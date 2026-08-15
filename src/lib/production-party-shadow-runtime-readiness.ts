import { createHash } from "node:crypto";

import {
  PARTY_SHADOW_RUNTIME_READINESS_CONFIRMATION,
  PARTY_SHADOW_RUNTIME_READINESS_HEADER,
  PARTY_SHADOW_RUNTIME_SAFETY_STATUSES,
  partyShadowRuntimeContractChecksum,
  partyShadowRuntimeOriginFingerprint,
  type PartyShadowRuntimeAttestation,
} from "./party-shadow-runtime-contract";
import type { ProductionPartyCutoverPreflightResult } from
  "./production-party-cutover-migration-gate";
import { PRODUCTION_PARTY_CUTOVER_EXPECTED_MIGRATION_COUNT } from
  "./production-party-cutover-preflight";

const READINESS_VALIDITY_MINUTES = 60;

export type ProductionPartyShadowRuntimeAttestationConfig = {
  productionOrigin: string;
  releaseId: string;
};

export type ProductionPartyShadowRuntimeReadinessConfig =
  ProductionPartyShadowRuntimeAttestationConfig & {
    actorUserId: string;
    databaseUrl: string;
    generatedAt: string;
    scope: {
      companyId: string;
      periodId: string;
      tenantId: string;
    };
    validUntil: string;
  };

export function readProductionPartyShadowRuntimeAttestationConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionPartyShadowRuntimeAttestationConfig {
  assertWorkflowContext(env);
  const productionOrigin = normalizeProductionOrigin(
    env.NOA_PARTY_SHADOW_PRODUCTION_ORIGIN ?? "",
  );
  const approvedProductionOrigin = normalizeProductionOrigin(
    env.NOA_APPROVED_PRODUCTION_ORIGIN ?? "",
  );
  if (productionOrigin !== approvedProductionOrigin) {
    throw new Error("Party shadow runtime production origin onaylı değerle eşleşmiyor.");
  }
  return {
    productionOrigin,
    releaseId: normalizeSha(env.NOA_RELEASE_ID ?? "", "Release SHA"),
  };
}

export function readProductionPartyShadowRuntimeReadinessConfig(
  env: Readonly<Record<string, string | undefined>>,
  now = new Date(),
): ProductionPartyShadowRuntimeReadinessConfig {
  const base = readProductionPartyShadowRuntimeAttestationConfig(env);
  if (Number.isNaN(now.valueOf())) {
    throw new Error("Party shadow runtime readiness zamanı geçerli değil.");
  }
  return {
    ...base,
    actorUserId: normalizeIdentifier(
      env.NOA_PARTY_CUTOVER_ACTOR_USER_ID ?? "",
      "Actor kullanıcı kimliği",
    ),
    databaseUrl: readRemotePostgresUrl(env.DATABASE_URL ?? ""),
    generatedAt: now.toISOString(),
    scope: {
      companyId: normalizeIdentifier(
        env.NOA_PARTY_CUTOVER_COMPANY_ID ?? "",
        "Şirket kimliği",
      ),
      periodId: normalizeIdentifier(
        env.NOA_PARTY_CUTOVER_PERIOD_ID ?? "",
        "Dönem kimliği",
      ),
      tenantId: normalizeIdentifier(
        env.NOA_PARTY_CUTOVER_TENANT_ID ?? "",
        "Tenant kimliği",
      ),
    },
    validUntil: new Date(
      now.valueOf() + READINESS_VALIDITY_MINUTES * 60_000,
    ).toISOString(),
  };
}

export async function requestProductionPartyShadowRuntimeAttestation(
  config: ProductionPartyShadowRuntimeAttestationConfig,
  fetcher: typeof fetch = fetch,
): Promise<PartyShadowRuntimeAttestation> {
  const response = await fetcher(
    `${config.productionOrigin}/api/party-shadow-runtime-readiness`,
    {
      cache: "no-store",
      headers: {
        [PARTY_SHADOW_RUNTIME_READINESS_HEADER]:
          PARTY_SHADOW_RUNTIME_READINESS_CONFIRMATION,
      },
      method: "GET",
      redirect: "error",
    },
  );
  if (response.status !== 200) {
    throw new Error("Party shadow runtime attestation hazır değil.");
  }
  return normalizeRuntimeAttestation(await response.json());
}

export function evaluateProductionPartyShadowRuntimeAttestation(input: {
  attestation: PartyShadowRuntimeAttestation;
  config: ProductionPartyShadowRuntimeAttestationConfig;
}) {
  const blockers: string[] = [];
  const expectedStatuses = [...PARTY_SHADOW_RUNTIME_SAFETY_STATUSES].sort();
  const actualStatuses = [...input.attestation.safetyStatuses].sort();
  if (!input.attestation.ready) blockers.push("RUNTIME_ATTESTATION_NOT_READY");
  if (input.attestation.releaseId !== input.config.releaseId) {
    blockers.push("RUNTIME_RELEASE_MISMATCH");
  }
  if (
    input.attestation.contractChecksum
    !== partyShadowRuntimeContractChecksum()
  ) {
    blockers.push("RUNTIME_CONTRACT_CHECKSUM_MISMATCH");
  }
  if (
    input.attestation.originFingerprint
    !== partyShadowRuntimeOriginFingerprint(input.config.productionOrigin)
  ) {
    blockers.push("PRODUCTION_ORIGIN_MISMATCH");
  }
  if (!input.attestation.legacyAuthoritative) {
    blockers.push("LEGACY_AUTHORITY_NOT_PROVEN");
  }
  if (!input.attestation.redactedStructuredLogs) {
    blockers.push("REDACTED_LOGGING_NOT_READY");
  }
  if (!input.attestation.negativeAlertingReady) {
    blockers.push("NEGATIVE_ALERTING_NOT_READY");
  }
  if (
    actualStatuses.length !== expectedStatuses.length
    || actualStatuses.some((status, index) => status !== expectedStatuses[index])
  ) {
    blockers.push("SAFETY_STATUS_CONTRACT_MISMATCH");
  }
  return {
    blockers: unique(blockers),
    ready: blockers.length === 0,
  };
}

export function runProductionPartyShadowRuntimeReadinessPreflight(input: {
  attestation: PartyShadowRuntimeAttestation;
  config: ProductionPartyShadowRuntimeReadinessConfig;
  cutoverPreflight: ProductionPartyCutoverPreflightResult | null;
}) {
  const runtimeGate = evaluateProductionPartyShadowRuntimeAttestation(input);
  const blockers = [...runtimeGate.blockers];
  const cutover = input.cutoverPreflight;
  if (!cutover) {
    blockers.push("PRODUCTION_INVENTORY_NOT_READ");
  } else {
    blockers.push(...cutover.blockers);
    if (!cutover.ready) blockers.push("CUTOVER_PREFLIGHT_NOT_READY");
    if (!cutover.readOnly) blockers.push("CUTOVER_PREFLIGHT_NOT_READ_ONLY");
    if (cutover.releaseId !== input.config.releaseId) {
      blockers.push("CUTOVER_RELEASE_MISMATCH");
    }
    if (
      cutover.migration.schemaState !== "POST_MIGRATION"
      || cutover.migration.appliedMigrationCount
        !== PRODUCTION_PARTY_CUTOVER_EXPECTED_MIGRATION_COUNT
      || cutover.migration.pendingMigrationNames.length !== 0
    ) {
      blockers.push("POST_MIGRATION_INVENTORY_MISMATCH");
    }
    if (!cutover.parity.ready || cutover.parity.issueCount !== 0) {
      blockers.push("PARTY_PARITY_NOT_READY");
    }
    if (
      cutover.cutover.stateCount !== 0
      || cutover.cutover.eventCount !== 0
      || cutover.cutover.auditCount !== 0
      || cutover.cutover.state !== null
    ) {
      blockers.push("INITIAL_CUTOVER_STATE_NOT_EMPTY");
    }
  }

  const payload = {
    blockers: unique(blockers),
    cutover: cutover ? {
      auditCount: cutover.cutover.auditCount,
      businessChecksum: cutover.businessChecksum,
      eligibilityManifestChecksum: cutover.eligibilityManifestChecksum,
      eventCount: cutover.cutover.eventCount,
      manifestChecksum: cutover.manifestChecksum,
      migration: cutover.migration,
      parity: cutover.parity,
      stateCount: cutover.cutover.stateCount,
      stateManifestChecksum: cutover.stateManifestChecksum,
    } : null,
    generatedAt: input.config.generatedAt,
    observability: {
      negativeAlertingReady: input.attestation.negativeAlertingReady,
      redactedStructuredLogs: input.attestation.redactedStructuredLogs,
      safetyStatuses: [...input.attestation.safetyStatuses].sort(),
    },
    readOnly: cutover?.readOnly ?? true,
    releaseId: input.config.releaseId,
    runtime: {
      contractChecksum: input.attestation.contractChecksum,
      legacyAuthoritative: input.attestation.legacyAuthoritative,
      originFingerprint: input.attestation.originFingerprint,
      version: input.attestation.version,
    },
    scopeFingerprint: fingerprint(input.config.scope),
    validUntil: input.config.validUntil,
  };
  return {
    ...payload,
    manifestChecksum: checksum(payload),
    ready: payload.blockers.length === 0,
  };
}

export function decodeProductionPartyShadowRuntimeAttestation(value: string) {
  let decoded: string;
  try {
    decoded = Buffer.from(value.trim(), "base64").toString("utf8");
  } catch {
    throw new Error("Party shadow runtime attestation kodlaması geçerli değil.");
  }
  if (!decoded || Buffer.from(decoded).toString("base64") !== value.trim()) {
    throw new Error("Party shadow runtime attestation kodlaması kanonik değil.");
  }
  try {
    return normalizeRuntimeAttestation(JSON.parse(decoded));
  } catch {
    throw new Error("Party shadow runtime attestation manifesti geçerli değil.");
  }
}

function normalizeRuntimeAttestation(value: unknown): PartyShadowRuntimeAttestation {
  const record = asRecord(value);
  if (!record) throw new Error("Party shadow runtime attestation nesnesi geçerli değil.");
  if (!Array.isArray(record.safetyStatuses)) {
    throw new Error("Party shadow runtime attestation alanları geçerli değil.");
  }
  const rawSafetyStatuses = record.safetyStatuses;
  const safetyStatuses = rawSafetyStatuses
    .filter((status): status is string => typeof status === "string");
  if (
    typeof record.contractChecksum !== "string"
    || !/^[a-f0-9]{64}$/.test(record.contractChecksum)
    || typeof record.legacyAuthoritative !== "boolean"
    || typeof record.negativeAlertingReady !== "boolean"
    || typeof record.originFingerprint !== "string"
    || !/^[a-f0-9]{12}$/.test(record.originFingerprint)
    || typeof record.ready !== "boolean"
    || typeof record.redactedStructuredLogs !== "boolean"
    || typeof record.releaseId !== "string"
    || !/^[a-f0-9]{40}$/.test(record.releaseId)
    || typeof record.version !== "string"
    || safetyStatuses.length !== rawSafetyStatuses.length
  ) {
    throw new Error("Party shadow runtime attestation alanları geçerli değil.");
  }
  return {
    contractChecksum: record.contractChecksum,
    legacyAuthoritative: record.legacyAuthoritative,
    negativeAlertingReady: record.negativeAlertingReady,
    originFingerprint: record.originFingerprint,
    ready: record.ready,
    redactedStructuredLogs: record.redactedStructuredLogs,
    releaseId: record.releaseId,
    safetyStatuses: safetyStatuses as PartyShadowRuntimeAttestation["safetyStatuses"],
    version: record.version,
  };
}

function assertWorkflowContext(
  env: Readonly<Record<string, string | undefined>>,
) {
  if (env.NOA_RUNTIME_ENV !== "production") {
    throw new Error("Party shadow runtime readiness yalnız production ortamında çalışır.");
  }
  if (env.GITHUB_EVENT_NAME !== "workflow_dispatch") {
    throw new Error("Party shadow runtime readiness yalnız manuel workflow ile çalışır.");
  }
  if (env.NOA_SOURCE_REF !== "refs/heads/main") {
    throw new Error("Party shadow runtime readiness yalnız main branch üzerinde çalışır.");
  }
  if (
    env.NOA_PRODUCTION_PARTY_SHADOW_RUNTIME_CONFIRMATION
    !== PARTY_SHADOW_RUNTIME_READINESS_CONFIRMATION
  ) {
    throw new Error("Party shadow runtime readiness açık onayı eksik.");
  }
  const releaseId = normalizeSha(env.NOA_RELEASE_ID ?? "", "Release SHA");
  const expectedReleaseId = normalizeSha(
    env.NOA_EXPECTED_RELEASE_SHA ?? "",
    "Beklenen release SHA",
  );
  const githubSha = normalizeSha(env.GITHUB_SHA ?? "", "GitHub SHA");
  if (releaseId !== expectedReleaseId || releaseId !== githubSha) {
    throw new Error("Party shadow runtime readiness release SHA değerleri eşleşmiyor.");
  }
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
      throw new Error();
    }
    return url.origin.toLowerCase();
  } catch {
    throw new Error("Party shadow runtime production origin geçerli değil.");
  }
}

function normalizeSha(value: string, label: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(normalized)) throw new Error(`${label} geçerli değil.`);
  return normalized;
}

function normalizeIdentifier(value: string, label: string) {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,119}$/.test(normalized)) {
    throw new Error(`${label} güvenli değil.`);
  }
  return normalized;
}

function readRemotePostgresUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Party shadow runtime readiness DATABASE_URL geçerli değil.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol)
    || ["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())
    || !url.pathname
    || url.pathname === "/"
  ) {
    throw new Error("Party shadow runtime readiness uzak PostgreSQL hedefi gerektirir.");
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function fingerprint(value: unknown) {
  return checksum(value).slice(0, 12);
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
