import { describe, expect, it, vi } from "vitest";

import {
  buildPartyParityReadModel,
  readPartyParityReadModel,
  type PartyParitySnapshot,
} from "./party-parity-read-model";

const scope = {
  companyId: "company-1",
  periodId: "period-1",
  tenantId: "tenant-1",
};

describe("Party parity read model", () => {
  it("accepts an empty exact scope with deterministic checksums", () => {
    const snapshot = emptySnapshot();
    const first = buildPartyParityReadModel({ scope, snapshot });
    const second = buildPartyParityReadModel({ scope, snapshot });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      issues: [],
      legacyCount: 0,
      matchedCount: 0,
      partyCount: 0,
      ready: true,
      roleCount: 0,
    });
    expect(first.parityChecksum).toMatch(/^[a-f0-9]{64}$/);
    expect(first.scopeFingerprint).toMatch(/^[a-f0-9]{12}$/);
  });

  it("matches canonical shared fields while ignoring legacy role extensions", () => {
    const snapshot = matchingCustomerSnapshot();
    snapshot.legacyRecords[0].data = {
      ...(snapshot.legacyRecords[0].data as Record<string, string>),
      balance: "1.250.000,00 TL",
      customerType: "Kurumsal",
    };

    const result = buildPartyParityReadModel({ scope, snapshot });

    expect(result).toMatchObject({
      issues: [],
      legacyCount: 1,
      matchedCount: 1,
      partyCount: 1,
      ready: true,
      roleCount: 1,
    });
  });

  it("fails closed on canonical drift without exposing field values", () => {
    const snapshot = matchingCustomerSnapshot();
    snapshot.parties[0].displayName = "Farklı Müşteri";
    snapshot.parties[0].normalizedName = "FARKLI MÜŞTERİ";
    snapshot.roles[0].status = "INACTIVE";

    const result = buildPartyParityReadModel({ scope, snapshot });

    expect(result.ready).toBe(false);
    expect(result.matchedCount).toBe(0);
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "CANONICAL_FIELD_MISMATCH",
        differingFields: ["displayName", "normalizedName", "roleStatus"],
        partyFingerprints: [expect.stringMatching(/^[a-f0-9]{12}$/)],
        roleKeyFingerprints: [expect.stringMatching(/^[a-f0-9]{12}$/)],
      }),
    ]);
    expect(JSON.stringify(result.issues)).not.toContain("Farklı Müşteri");
    expect(JSON.stringify(result.issues)).not.toContain("6840127593");
  });

  it("reports unmatched, orphan, unreferenced, duplicate and foreign-scope rows", () => {
    const snapshot = matchingCustomerSnapshot();
    snapshot.legacyRecords.push({
      ...snapshot.legacyRecords[0],
      code: "MUS-0001",
    });
    snapshot.legacyRecords.push({
      ...snapshot.legacyRecords[0],
      code: "MUS-FOREIGN",
      tenantId: "tenant-foreign",
    });
    snapshot.parties.push({ ...snapshot.parties[0], id: "party-unreferenced" });
    snapshot.roles.push({
      ...snapshot.roles[0],
      code: "TED-ORPHAN",
      id: "role-orphan",
      kind: "supplier",
      legacyCode: "TED-ORPHAN",
      legacySlug: "tedarikciler",
      normalizedCode: "TED-ORPHAN",
      partyId: "party-missing",
    });

    const result = buildPartyParityReadModel({ scope, snapshot });
    const codes = result.issues.map((issue) => issue.code);

    expect(result.ready).toBe(false);
    expect(codes).toEqual(expect.arrayContaining([
      "DUPLICATE_LEGACY_ROLE_KEY",
      "LEGACY_SCOPE_MISMATCH",
      "ORPHAN_PARTY_ROLE",
      "UNMATCHED_PARTY_ROLE",
      "UNREFERENCED_PARTY",
    ]));
  });

  it("reads one repository snapshot before building the model", async () => {
    const snapshot = matchingCustomerSnapshot();
    const repository = { readScope: vi.fn().mockResolvedValue(snapshot) };

    const result = await readPartyParityReadModel({ repository, scope });

    expect(repository.readScope).toHaveBeenCalledWith({ scope });
    expect(result.ready).toBe(true);
  });
});

function emptySnapshot(): PartyParitySnapshot {
  return { legacyRecords: [], parties: [], roles: [] };
}

function matchingCustomerSnapshot(): PartyParitySnapshot {
  return {
    legacyRecords: [{
      code: "MUS-0001",
      companyId: scope.companyId,
      data: {
        email: "info@bayraktar.example",
        name: "BAYRAKTAR GAYRİMENKUL YATIRIM A.Ş.",
        phone: "0 212 340 55 00",
        status: "Aktif",
        taxNumber: "6840127593",
      },
      periodId: scope.periodId,
      slug: "musteriler",
      tenantId: scope.tenantId,
    }],
    parties: [{
      companyId: scope.companyId,
      displayName: "BAYRAKTAR GAYRİMENKUL YATIRIM A.Ş.",
      email: "info@bayraktar.example",
      id: "party-1",
      normalizedName: "BAYRAKTAR GAYRİMENKUL YATIRIM A.Ş.",
      normalizedTaxNumber: "6840127593",
      periodId: scope.periodId,
      phone: "0 212 340 55 00",
      status: "ACTIVE",
      taxNumber: "6840127593",
      tenantId: scope.tenantId,
    }],
    roles: [{
      code: "MUS-0001",
      companyId: scope.companyId,
      id: "role-1",
      kind: "customer",
      legacyCode: "MUS-0001",
      legacySlug: "musteriler",
      normalizedCode: "MUS-0001",
      partyId: "party-1",
      periodId: scope.periodId,
      status: "ACTIVE",
      tenantId: scope.tenantId,
    }],
  };
}
