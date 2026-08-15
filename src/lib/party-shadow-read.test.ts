import { describe, expect, it } from "vitest";

import { buildPartyParityReadModel } from "./party-parity-read-model";
import {
  evaluatePartyShadowRead,
  partyShadowScopeFingerprint,
} from "./party-shadow-read";

const scope = { companyId: "company", periodId: "period", tenantId: "tenant" };
const releaseId = "a".repeat(40);

describe("Party shadow-read policy", () => {
  it("fingerprints only the canonical Party scope fields", () => {
    const runtimeScope = {
      ...scope,
      tenantName: "Runtime Tenant",
      userId: "runtime-user",
      userRole: "admin",
    };

    expect(partyShadowScopeFingerprint(runtimeScope))
      .toBe(partyShadowScopeFingerprint(scope));
  });

  it("keeps a missing state legacy-only without parity evidence", () => {
    expect(evaluatePartyShadowRead({
      runtimeReleaseId: releaseId,
      scope,
      slug: "musteriler",
      state: null,
      stateCount: 0,
    })).toMatchObject({ mode: "LEGACY_ONLY", status: "LEGACY_ONLY" });
  });

  it("fails safe to legacy output for invalid state and release drift", () => {
    expect(evaluatePartyShadowRead({
      runtimeReleaseId: releaseId,
      scope,
      slug: "tedarikciler",
      state: { mode: "DUAL_WRITE", releaseId, revisionNo: 2 },
      stateCount: 1,
    })).toMatchObject({ mode: "UNKNOWN", status: "INVALID_CUTOVER_STATE" });

    expect(evaluatePartyShadowRead({
      runtimeReleaseId: releaseId,
      scope,
      slug: "tedarikciler",
      state: { mode: "SHADOW_READ", releaseId, revisionNo: 2 },
      stateCount: 1,
    })).toMatchObject({ mode: "SHADOW_READ", status: "INVALID_CUTOVER_STATE" });

    expect(evaluatePartyShadowRead({
      runtimeReleaseId: "b".repeat(40),
      scope,
      slug: "tedarikciler",
      state: { mode: "SHADOW_READ", releaseId, revisionNo: 1 },
      stateCount: 1,
    })).toMatchObject({ mode: "SHADOW_READ", status: "RELEASE_MISMATCH" });
  });

  it("reports matched and drifted parity without exposing business values", () => {
    const snapshot = matchingSnapshot();
    const matching = buildPartyParityReadModel({ scope, snapshot });
    const matched = evaluatePartyShadowRead({
      parity: matching,
      runtimeReleaseId: releaseId,
      scope,
      slug: "musteriler",
      state: { mode: "SHADOW_READ", releaseId, revisionNo: 1 },
      stateCount: 1,
    });
    expect(matched).toMatchObject({ issueCodes: [], status: "SHADOW_MATCH" });
    expect(JSON.stringify(matched)).not.toContain("Müşteri");

    const drifted = buildPartyParityReadModel({
      scope,
      snapshot: { ...snapshot, parties: [] },
    });
    const observation = evaluatePartyShadowRead({
      parity: drifted,
      runtimeReleaseId: releaseId,
      scope,
      slug: "musteriler",
      state: { mode: "SHADOW_READ", releaseId, revisionNo: 1 },
      stateCount: 1,
    });
    expect(observation.status).toBe("SHADOW_DRIFT");
    expect(observation.issueCodes).toContain("ORPHAN_PARTY_ROLE");
  });
});

function matchingSnapshot() {
  return {
    legacyRecords: [{ code: "MUS-1", data: { name: "Müşteri", status: "Aktif" }, slug: "musteriler", ...scope }],
    parties: [{ displayName: "Müşteri", id: "party-1", normalizedName: "MÜŞTERİ", status: "ACTIVE", ...scope }],
    roles: [{ code: "MUS-1", id: "role-1", kind: "customer", legacyCode: "MUS-1", legacySlug: "musteriler", normalizedCode: "MUS-1", partyId: "party-1", status: "ACTIVE", ...scope }],
  };
}
