import { describe, expect, it } from "vitest";

import {
  buildPartyBackfillPlan,
  type ExistingPartyRole,
  type LegacyPartyRecord,
} from "./party-backfill";

const scope = {
  companyId: "company-1",
  periodId: "period-2026",
  tenantId: "tenant-1",
};

describe("party backfill dry-run domain", () => {
  it("creates deterministic role-separated candidates without mutating the source", () => {
    const records = [
      legacy({ code: " mus-001 ", slug: "musteriler", name: "  Örnek   Firma " }),
      legacy({ code: "ted-001", slug: "tedarikciler", name: "Örnek Firma" }),
    ];

    const first = buildPartyBackfillPlan({ records, scope });
    const second = buildPartyBackfillPlan({ records: [...records].reverse(), scope });

    expect(first.run).toEqual(second.run);
    expect(first.candidates.map((row) => row.checksum)).toEqual(
      second.candidates.map((row) => row.checksum),
    );
    expect(first.candidates).toHaveLength(2);
    expect(first.candidates.map((row) => row.role.kind).sort()).toEqual([
      "customer",
      "supplier",
    ].sort());
    expect(first.candidates.find((row) => row.role.kind === "customer")).toMatchObject({
      party: { displayName: "Örnek Firma", normalizedName: "ÖRNEK FİRMA" },
      role: { normalizedCode: "MUS-001" },
    });
    expect(records[0].code).toBe(" mus-001 ");
  });

  it("quarantines normalized role-code collisions and only warns for repeated tax numbers", () => {
    const plan = buildPartyBackfillPlan({
      records: [
        legacy({ code: "mus-001", slug: "musteriler", name: "Müşteri Bir" }),
        legacy({ code: " MUS-001 ", slug: "musteriler", name: "Müşteri İki" }),
        legacy({ code: "ted-001", slug: "tedarikciler", name: "Tedarikçi", taxNumber: "123 456 7890" }),
        legacy({ code: "tas-001", slug: "taseronlar", name: "Taşeron", taxNumber: "1234567890" }),
      ],
      scope,
    });

    expect(plan.candidates).toHaveLength(2);
    expect(plan.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ issueCode: "DUPLICATE_NORMALIZED_CODE", severity: "BLOCKING" }),
      expect.objectContaining({ issueCode: "DUPLICATE_TAX_NUMBER", severity: "WARNING" }),
    ]));
    expect(plan.issues.find((issue) => issue.issueCode === "DUPLICATE_TAX_NUMBER")?.details)
      .not.toHaveProperty("taxNumber");
  });

  it("fails closed for invalid and cross-scope legacy records", () => {
    const plan = buildPartyBackfillPlan({
      records: [
        legacy({ code: "", slug: "musteriler", name: "Kodsuz" }),
        legacy({ code: "MUS-2", slug: "musteriler", name: "" }),
        legacy({ code: "MUS-3", slug: "musteriler", name: "Durumsuz", status: "Bekliyor" }),
        { ...legacy({ code: "MUS-4", slug: "musteriler", name: "Yanlış Kapsam" }), companyId: "company-2" },
      ],
      scope,
    });

    expect(plan.candidates).toHaveLength(0);
    expect(plan.issues.map((issue) => issue.issueCode).sort()).toEqual([
      "INVALID_CODE",
      "INVALID_NAME",
      "INVALID_STATUS",
      "SCOPE_MISMATCH",
    ].sort());
  });

  it("skips exact existing roles and quarantines divergent records", () => {
    const record = legacy({ code: "MUS-001", slug: "musteriler", name: "Müşteri" });
    const initial = buildPartyBackfillPlan({ records: [record], scope });
    const existing = fromCandidate(initial.candidates[0]);

    const unchanged = buildPartyBackfillPlan({ existingRoles: [existing], records: [record], scope });
    const mismatch = buildPartyBackfillPlan({
      existingRoles: [{ ...existing, party: { ...existing.party, displayName: "Başka Müşteri" } }],
      records: [record],
      scope,
    });

    expect(unchanged.run).toMatchObject({ candidateCount: 0, unchangedCount: 1 });
    expect(unchanged.issues).toHaveLength(0);
    expect(mismatch.candidates).toHaveLength(0);
    expect(mismatch.issues).toEqual([
      expect.objectContaining({
        issueCode: "EXISTING_PARTY_MISMATCH",
        severity: "BLOCKING",
      }),
    ]);
  });

  it("keeps issue keys stable but namespaces persisted issue ids by run", () => {
    const records = [legacy({ code: "", slug: "musteriler", name: "Kodsuz" })];

    const first = buildPartyBackfillPlan({ records, scope, version: "party-v1" });
    const second = buildPartyBackfillPlan({ records, scope, version: "party-v2" });

    expect(first.issues[0].issueKey).toBe(second.issues[0].issueKey);
    expect(first.issues[0].id).not.toBe(second.issues[0].id);
    expect(first.run.id).not.toBe(second.run.id);
  });
});

function legacy({
  code,
  name,
  slug,
  status = "Aktif",
  taxNumber,
}: {
  code: string;
  name: string;
  slug: string;
  status?: string;
  taxNumber?: string;
}): LegacyPartyRecord {
  return {
    ...scope,
    code,
    createdAt: "2026-08-14T09:00:00.000Z",
    createdBy: "admin-1",
    data: { name, status, taxNumber: taxNumber ?? "" },
    slug,
    updatedAt: "2026-08-14T10:00:00.000Z",
    updatedBy: "admin-1",
  };
}

function fromCandidate(
  candidate: ReturnType<typeof buildPartyBackfillPlan>["candidates"][number],
): ExistingPartyRole {
  return {
    code: candidate.role.code,
    kind: candidate.role.kind,
    legacyCode: candidate.role.legacyCode,
    legacySlug: candidate.role.legacySlug,
    normalizedCode: candidate.role.normalizedCode,
    party: {
      displayName: candidate.party.displayName,
      email: candidate.party.email,
      normalizedName: candidate.party.normalizedName,
      normalizedTaxNumber: candidate.party.normalizedTaxNumber,
      phone: candidate.party.phone,
      status: candidate.party.status,
      taxNumber: candidate.party.taxNumber,
    },
    status: candidate.role.status,
  };
}
