import { describe, expect, test, vi } from "vitest";

import {
  PARTY_SHADOW_RUNTIME_SAFETY_STATUSES,
  partyShadowRuntimeContractChecksum,
  partyShadowRuntimeOriginFingerprint,
  type PartyShadowRuntimeAttestation,
} from "./party-shadow-runtime-contract";
import type { ProductionPartyCutoverPreflightResult } from
  "./production-party-cutover-migration-gate";
import {
  decodeProductionPartyShadowRuntimeAttestation,
  evaluateProductionPartyShadowRuntimeAttestation,
  readProductionPartyShadowRuntimeReadinessConfig,
  requestProductionPartyShadowRuntimeAttestation,
  runProductionPartyShadowRuntimeReadinessPreflight,
} from "./production-party-shadow-runtime-readiness";

const releaseId = "e82fcb4ce19e287867ed54337a326e81531676c7";
const origin = "https://app.noa.example";
const scope = {
  companyId: "company-ms-insaat",
  periodId: "period-ms-insaat-2026",
  tenantId: "tenant-ms-insaat",
};

describe("production Party shadow runtime readiness", () => {
  test("requires exact production workflow, remote DB and safe HTTPS origin", () => {
    const result = readProductionPartyShadowRuntimeReadinessConfig(
      env(),
      new Date("2026-08-15T10:00:00.000Z"),
    );

    expect(result).toMatchObject({
      generatedAt: "2026-08-15T10:00:00.000Z",
      productionOrigin: origin,
      releaseId,
      scope,
      validUntil: "2026-08-15T11:00:00.000Z",
    });
    expect(() => readProductionPartyShadowRuntimeReadinessConfig({
      ...env(),
      NOA_PARTY_SHADOW_PRODUCTION_ORIGIN: "http://app.noa.example",
    })).toThrow(/origin/);
    expect(() => readProductionPartyShadowRuntimeReadinessConfig({
      ...env(),
      NOA_PARTY_SHADOW_PRODUCTION_ORIGIN: "https://preview.noa.example",
    })).toThrow(/onaylı değer/);
    expect(() => readProductionPartyShadowRuntimeReadinessConfig({
      ...env(),
      DATABASE_URL: "postgresql://user:secret@localhost/noa",
    })).toThrow(/uzak PostgreSQL/);
  });

  test("requests only the closed no-store attestation endpoint", async () => {
    const fetcher = vi.fn(async () => new Response(
      JSON.stringify(attestation()),
      { status: 200 },
    ));

    await expect(requestProductionPartyShadowRuntimeAttestation(
      { productionOrigin: origin, releaseId },
      fetcher,
    )).resolves.toEqual(attestation());
    expect(fetcher).toHaveBeenCalledWith(
      `${origin}/api/party-shadow-runtime-readiness`,
      {
        cache: "no-store",
        headers: {
          "x-noa-party-shadow-runtime-readiness":
            "production-party-shadow-runtime-readiness",
        },
        method: "GET",
        redirect: "error",
      },
    );
  });

  test("produces a fresh redacted activation readiness manifest", () => {
    const config = readProductionPartyShadowRuntimeReadinessConfig(
      env(),
      new Date("2026-08-15T10:00:00.000Z"),
    );
    const result = runProductionPartyShadowRuntimeReadinessPreflight({
      attestation: attestation(),
      config,
      cutoverPreflight: cutoverPreflight(),
    });

    expect(result).toMatchObject({
      blockers: [],
      cutover: {
        auditCount: 0,
        eventCount: 0,
        stateCount: 0,
      },
      generatedAt: "2026-08-15T10:00:00.000Z",
      observability: {
        negativeAlertingReady: true,
        redactedStructuredLogs: true,
      },
      readOnly: true,
      ready: true,
      releaseId,
      scopeFingerprint: "c2df556c5505",
      validUntil: "2026-08-15T11:00:00.000Z",
    });
    expect(result.manifestChecksum).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(result)).not.toContain(scope.tenantId);
    expect(JSON.stringify(result)).not.toContain(origin);
  });

  test("blocks stale runtime, missing alerting and non-empty cutover state", () => {
    const config = readProductionPartyShadowRuntimeReadinessConfig(env());
    const stale = {
      ...attestation(),
      negativeAlertingReady: false,
      releaseId: "ba579d1b8abff772275efa19c33f4ccea0d67c64",
    };
    expect(evaluateProductionPartyShadowRuntimeAttestation({
      attestation: stale,
      config,
    }).blockers).toEqual(expect.arrayContaining([
      "NEGATIVE_ALERTING_NOT_READY",
      "RUNTIME_RELEASE_MISMATCH",
    ]));

    const cutover = cutoverPreflight();
    cutover.cutover = {
      auditCount: 1,
      eventCount: 1,
      state: {
        mode: "SHADOW_READ",
        parityChecksum: "a".repeat(64),
        revisionNo: 1,
      },
      stateCount: 1,
    };
    expect(runProductionPartyShadowRuntimeReadinessPreflight({
      attestation: attestation(),
      config,
      cutoverPreflight: cutover,
    }).blockers).toContain("INITIAL_CUTOVER_STATE_NOT_EMPTY");
  });

  test("decodes only canonical base64 attestation JSON", () => {
    const encoded = Buffer.from(JSON.stringify(attestation())).toString("base64");
    expect(decodeProductionPartyShadowRuntimeAttestation(encoded))
      .toEqual(attestation());
    expect(() => decodeProductionPartyShadowRuntimeAttestation("%%%"))
      .toThrow(/attestation/);
  });
});

function env() {
  return {
    DATABASE_URL: "postgresql://readonly:secret@db.example.com/noa",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_SHA: releaseId,
    NOA_EXPECTED_RELEASE_SHA: releaseId,
    NOA_APPROVED_PRODUCTION_ORIGIN: origin,
    NOA_PARTY_CUTOVER_ACTOR_USER_ID: "user-production-bootstrap",
    NOA_PARTY_CUTOVER_COMPANY_ID: scope.companyId,
    NOA_PARTY_CUTOVER_PERIOD_ID: scope.periodId,
    NOA_PARTY_CUTOVER_TENANT_ID: scope.tenantId,
    NOA_PARTY_SHADOW_PRODUCTION_ORIGIN: origin,
    NOA_PRODUCTION_PARTY_SHADOW_RUNTIME_CONFIRMATION:
      "production-party-shadow-runtime-readiness",
    NOA_RELEASE_ID: releaseId,
    NOA_RUNTIME_ENV: "production",
    NOA_SOURCE_REF: "refs/heads/main",
  };
}

function attestation(): PartyShadowRuntimeAttestation {
  return {
    contractChecksum: partyShadowRuntimeContractChecksum(),
    legacyAuthoritative: true,
    negativeAlertingReady: true,
    originFingerprint: partyShadowRuntimeOriginFingerprint(origin),
    ready: true,
    redactedStructuredLogs: true,
    releaseId,
    safetyStatuses: [...PARTY_SHADOW_RUNTIME_SAFETY_STATUSES],
    version: "party-shadow-runtime-v1",
  };
}

function cutoverPreflight(): ProductionPartyCutoverPreflightResult {
  return {
    blockers: [],
    businessChecksum: "1".repeat(64),
    cutover: { auditCount: 0, eventCount: 0, state: null, stateCount: 0 },
    eligibilityManifestChecksum: "2".repeat(64),
    manifestChecksum: "3".repeat(64),
    migration: {
      appliedMigrationCount: 70,
      pendingMigrationNames: [],
      schemaState: "POST_MIGRATION",
    },
    parity: {
      issueChecksum: "4".repeat(64),
      issueCount: 0,
      legacyChecksum: "5".repeat(64),
      legacyCount: 0,
      matchedCount: 0,
      parityChecksum: "6".repeat(64),
      partyChecksum: "7".repeat(64),
      partyCount: 0,
      ready: true,
      roleCount: 0,
    },
    periodClosed: false,
    readOnly: true,
    ready: true,
    releaseId,
    scopeFingerprint: "c2df556c5505",
    stateManifestChecksum: "8".repeat(64),
  };
}
