import { createHash } from "node:crypto";

import {
  createPartyCutoverService,
  type PartyCutoverEvidence,
  type PartyCutoverRepository,
  type PartyCutoverTransitionCommand,
  type PartyCutoverTransitionResult,
} from "./party-cutover";
import type { ProductionPartyCutoverPreflightResult } from
  "./production-party-cutover-migration-gate";
import { PRODUCTION_PARTY_CUTOVER_EXPECTED_MIGRATION_COUNT } from
  "./production-party-cutover-preflight";

export const PRODUCTION_PARTY_CUTOVER_TRANSITION_CONFIRMATIONS = {
  ACTIVATE: "production-party-shadow-activate",
  ACTIVATE_RETRY: "production-party-shadow-exact-retry",
  ROLLBACK: "production-party-shadow-rollback",
  ROLLBACK_RETRY: "production-party-shadow-rollback-exact-retry",
} as const;

export type ProductionPartyCutoverTransitionKind = keyof
  typeof PRODUCTION_PARTY_CUTOVER_TRANSITION_CONFIRMATIONS;

export type ProductionPartyCutoverTransitionConfig = {
  actorUserId: string;
  expectedBusinessChecksum: string;
  expectedEligibilityManifestChecksum: string;
  expectedPreflightManifestChecksum: string;
  expectedStateManifestChecksum: string;
  kind: ProductionPartyCutoverTransitionKind;
  operationId: string;
  releaseId: string;
  scope: {
    companyId: string;
    periodId: string;
    tenantId: string;
  };
};

export function readProductionPartyCutoverTransitionConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionPartyCutoverTransitionConfig {
  const kind = readTransitionKind(env.NOA_PARTY_CUTOVER_TRANSITION_KIND);
  assertProductionContext(
    env,
    PRODUCTION_PARTY_CUTOVER_TRANSITION_CONFIRMATIONS[kind],
  );
  return {
    actorUserId: normalizeIdentifier(
      env.NOA_PARTY_CUTOVER_ACTOR_USER_ID ?? "",
      "Actor kullanıcı kimliği",
    ),
    expectedBusinessChecksum: normalizeChecksum(
      env.NOA_PARTY_CUTOVER_EXPECTED_BUSINESS_CHECKSUM ?? "",
      "Beklenen business checksum",
    ),
    expectedEligibilityManifestChecksum: normalizeChecksum(
      env.NOA_PARTY_CUTOVER_EXPECTED_ELIGIBILITY_MANIFEST_CHECKSUM ?? "",
      "Beklenen eligibility manifest checksum",
    ),
    expectedPreflightManifestChecksum: normalizeChecksum(
      env.NOA_PARTY_CUTOVER_EXPECTED_PREFLIGHT_MANIFEST_CHECKSUM ?? "",
      "Beklenen preflight manifest checksum",
    ),
    expectedStateManifestChecksum: normalizeChecksum(
      env.NOA_PARTY_CUTOVER_EXPECTED_STATE_MANIFEST_CHECKSUM ?? "",
      "Beklenen state manifest checksum",
    ),
    kind,
    operationId: normalizeOperationId(
      env.NOA_PARTY_CUTOVER_OPERATION_ID ?? "",
    ),
    releaseId: normalizeSha(env.NOA_RELEASE_ID ?? "", "Release SHA"),
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
  };
}

export function readProductionPartyCutoverInventoryDatabaseUrl(
  env: Readonly<Record<string, string | undefined>>,
) {
  return readRemotePostgresUrl(
    env.NOA_PARTY_CUTOVER_INVENTORY_DATABASE_URL ?? "",
    "inventory",
  );
}

export function readProductionPartyCutoverWriteDatabaseUrl(
  env: Readonly<Record<string, string | undefined>>,
) {
  return readRemotePostgresUrl(env.DATABASE_URL ?? "", "write");
}

export function evaluateProductionPartyCutoverTransitionGate(input: {
  config: ProductionPartyCutoverTransitionConfig;
  preflight: ProductionPartyCutoverPreflightResult;
}) {
  const { config, preflight } = input;
  const blockers = [...preflight.blockers];
  if (!preflight.ready) blockers.push("PREFLIGHT_NOT_READY");
  if (!preflight.readOnly) blockers.push("PREFLIGHT_NOT_READ_ONLY");
  if (preflight.releaseId !== config.releaseId) blockers.push("RELEASE_ID_MISMATCH");
  if (
    preflight.migration.schemaState !== "POST_MIGRATION"
    || preflight.migration.appliedMigrationCount
      !== PRODUCTION_PARTY_CUTOVER_EXPECTED_MIGRATION_COUNT
    || preflight.migration.pendingMigrationNames.length !== 0
  ) {
    blockers.push("POST_MIGRATION_INVENTORY_MISMATCH");
  }
  if (preflight.manifestChecksum !== config.expectedPreflightManifestChecksum) {
    blockers.push("PREFLIGHT_MANIFEST_CHECKSUM_MISMATCH");
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
  if (preflight.stateManifestChecksum !== config.expectedStateManifestChecksum) {
    blockers.push("STATE_MANIFEST_CHECKSUM_MISMATCH");
  }
  if (!preflight.parity.ready || preflight.parity.issueCount !== 0) {
    blockers.push("PARTY_PARITY_NOT_READY");
  }
  validateExpectedState(config.kind, preflight, blockers);
  return {
    blockers: unique(blockers),
    businessChecksum: preflight.businessChecksum,
    eligibilityManifestChecksum: preflight.eligibilityManifestChecksum,
    kind: config.kind,
    manifestChecksum: preflight.manifestChecksum,
    migration: preflight.migration,
    ready: blockers.length === 0,
    releaseId: config.releaseId,
    stateManifestChecksum: preflight.stateManifestChecksum,
  };
}

export async function runProductionPartyCutoverTransition(input: {
  config: ProductionPartyCutoverTransitionConfig;
  preflight: ProductionPartyCutoverPreflightResult;
  repository: PartyCutoverRepository;
}) {
  const gate = evaluateProductionPartyCutoverTransitionGate(input);
  if (!gate.ready) {
    throw new Error("Party cutover production transition PRE gate fail-closed durdu.");
  }
  const command = createTransitionCommand(input.config, input.preflight);
  const result = await createPartyCutoverService({ repository: input.repository })
    .transition(command);
  assertExpectedResult(input.config.kind, result);
  return {
    kind: input.config.kind,
    mode: result.mode,
    operationFingerprint: fingerprint(input.config.operationId),
    parityChecksum: result.parityChecksum,
    releaseId: input.config.releaseId,
    replayed: result.replayed,
    revisionNo: result.revisionNo,
    scopeFingerprint: result.scopeFingerprint,
    status: result.status,
  };
}

export function createTransitionCommand(
  config: ProductionPartyCutoverTransitionConfig,
  preflight: ProductionPartyCutoverPreflightResult,
): PartyCutoverTransitionCommand {
  const activation = isActivation(config.kind);
  return {
    actorUserId: config.actorUserId,
    expectedParity: activation ? parityEvidence(preflight) : undefined,
    expectedRevisionNo: activation ? 0 : 1,
    operationId: config.operationId,
    reasonCode: activation
      ? "PRODUCTION_SHADOW_VALIDATION"
      : "PRODUCTION_SHADOW_ROLLBACK",
    releaseId: config.releaseId,
    scope: config.scope,
    targetMode: activation ? "SHADOW_READ" : "LEGACY_ONLY",
  };
}

function validateExpectedState(
  kind: ProductionPartyCutoverTransitionKind,
  preflight: ProductionPartyCutoverPreflightResult,
  blockers: string[],
) {
  const state = preflight.cutover.state;
  if (kind === "ACTIVATE") {
    if (
      preflight.cutover.stateCount !== 0
      || preflight.cutover.eventCount !== 0
      || preflight.cutover.auditCount !== 0
      || state
    ) {
      blockers.push("INITIAL_STATE_NOT_EMPTY");
    }
    return;
  }
  if (!state || preflight.cutover.stateCount !== 1) {
    blockers.push("CUTOVER_STATE_REQUIRED");
    return;
  }
  if (kind === "ACTIVATE_RETRY" || kind === "ROLLBACK") {
    if (
      state.mode !== "SHADOW_READ"
      || state.revisionNo !== 1
      || preflight.cutover.eventCount !== 1
      || preflight.cutover.auditCount !== 1
    ) {
      blockers.push("SHADOW_REVISION_ONE_REQUIRED");
    }
  } else if (
    state.mode !== "LEGACY_ONLY"
    || state.revisionNo !== 2
    || preflight.cutover.eventCount !== 2
    || preflight.cutover.auditCount !== 2
  ) {
    blockers.push("ROLLBACK_REVISION_TWO_REQUIRED");
  }
  if (state.parityChecksum !== preflight.parity.parityChecksum) {
    blockers.push("STORED_PARITY_CHECKSUM_MISMATCH");
  }
}

function assertExpectedResult(
  kind: ProductionPartyCutoverTransitionKind,
  result: PartyCutoverTransitionResult,
) {
  const expected = {
    ACTIVATE: {
      mode: "SHADOW_READ",
      replayed: false,
      revisionNo: 1,
      status: "ACTIVATED",
    },
    ACTIVATE_RETRY: {
      mode: "SHADOW_READ",
      replayed: true,
      revisionNo: 1,
      status: "UNCHANGED",
    },
    ROLLBACK: {
      mode: "LEGACY_ONLY",
      replayed: false,
      revisionNo: 2,
      status: "ROLLED_BACK",
    },
    ROLLBACK_RETRY: {
      mode: "LEGACY_ONLY",
      replayed: true,
      revisionNo: 2,
      status: "UNCHANGED",
    },
  }[kind];
  if (
    result.mode !== expected.mode
    || result.replayed !== expected.replayed
    || result.revisionNo !== expected.revisionNo
    || result.status !== expected.status
  ) {
    throw new Error("Party cutover production transition sonucu mutabık değil.");
  }
}

function parityEvidence(
  preflight: ProductionPartyCutoverPreflightResult,
): PartyCutoverEvidence {
  return {
    issueChecksum: preflight.parity.issueChecksum,
    legacyChecksum: preflight.parity.legacyChecksum,
    legacyCount: preflight.parity.legacyCount,
    matchedCount: preflight.parity.matchedCount,
    parityChecksum: preflight.parity.parityChecksum,
    partyChecksum: preflight.parity.partyChecksum,
    partyCount: preflight.parity.partyCount,
    roleCount: preflight.parity.roleCount,
  };
}

function isActivation(kind: ProductionPartyCutoverTransitionKind) {
  return kind === "ACTIVATE" || kind === "ACTIVATE_RETRY";
}

function readTransitionKind(value: string | undefined) {
  if (
    value !== "ACTIVATE"
    && value !== "ACTIVATE_RETRY"
    && value !== "ROLLBACK"
    && value !== "ROLLBACK_RETRY"
  ) {
    throw new Error("Party cutover production transition türü allowlist dışında.");
  }
  return value;
}

function assertProductionContext(
  env: Readonly<Record<string, string | undefined>>,
  expectedConfirmation: string,
) {
  if (env.NOA_RUNTIME_ENV !== "production") {
    throw new Error("Party cutover transition yalnız production ortamında çalışır.");
  }
  if (env.GITHUB_EVENT_NAME !== "workflow_dispatch") {
    throw new Error("Party cutover transition yalnız manuel workflow ile çalışır.");
  }
  if (env.NOA_SOURCE_REF !== "refs/heads/main") {
    throw new Error("Party cutover transition yalnız main branch üzerinde çalışır.");
  }
  if (env.NOA_PRODUCTION_PARTY_CUTOVER_CONFIRMATION !== expectedConfirmation) {
    throw new Error("Party cutover transition açık onayı işlem türüyle eşleşmiyor.");
  }
  const releaseId = normalizeSha(env.NOA_RELEASE_ID ?? "", "Release SHA");
  const expectedReleaseId = normalizeSha(
    env.NOA_EXPECTED_RELEASE_SHA ?? "",
    "Beklenen release SHA",
  );
  const githubSha = normalizeSha(env.GITHUB_SHA ?? "", "GitHub SHA");
  if (releaseId !== expectedReleaseId || releaseId !== githubSha) {
    throw new Error("Party cutover transition release SHA değerleri eşleşmiyor.");
  }
}

function normalizeSha(value: string, label: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(normalized)) throw new Error(`${label} geçerli değil.`);
  return normalized;
}

function normalizeChecksum(value: string, label: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error(`${label} geçerli değil.`);
  return normalized;
}

function normalizeIdentifier(value: string, label: string) {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,119}$/.test(normalized)) {
    throw new Error(`${label} güvenli değil.`);
  }
  return normalized;
}

function normalizeOperationId(value: string) {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,119}$/.test(normalized)) {
    throw new Error("Party cutover operation kimliği güvenli değil.");
  }
  return normalized;
}

function readRemotePostgresUrl(value: string, label: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Party cutover production ${label} PostgreSQL URL geçerli değil.`);
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol)
    || ["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())
    || !url.pathname
    || url.pathname === "/"
  ) {
    throw new Error(`Party cutover production uzak ${label} PostgreSQL hedefi gerektirir.`);
  }
  return value;
}

function fingerprint(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function unique(values: readonly string[]) {
  return [...new Set(values)].sort();
}
