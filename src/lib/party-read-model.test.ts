import { describe, expect, test } from "vitest";

import {
  buildPartyReadModel,
  linkPartyStatementRows,
} from "./party-read-model";
import { defaultTenantScope } from "./tenant-scope";

describe("party read model", () => {
  test("creates stable kind and code based identities from legacy entity rows", () => {
    const model = buildPartyReadModel({
      groups: [
        {
          slug: "musteriler",
          rows: [
            scopedRow({ code: " mus-0001 ", name: "  Örnek   Müşteri " }),
          ],
        },
        {
          slug: "tedarikciler",
          rows: [scopedRow({ code: "TED-0001", name: "Örnek Müşteri" })],
        },
      ],
      scope: defaultTenantScope,
    });

    expect(model.parties).toEqual([
      expect.objectContaining({
        code: "MUS-0001",
        kind: "customer",
        name: "Örnek Müşteri",
        partyKey: "customer:MUS-0001",
      }),
      expect.objectContaining({
        code: "TED-0001",
        kind: "supplier",
        partyKey: "supplier:TED-0001",
      }),
    ]);
  });

  test("diagnoses scope, duplicate code, name and tax number conflicts", () => {
    const model = buildPartyReadModel({
      groups: [
        {
          slug: "musteriler",
          rows: [
            scopedRow({ code: "MUS-0001", name: "Aynı Ad", taxNumber: "123" }),
            scopedRow({ code: "mus-0001", name: "Aynı Ad", taxNumber: "123" }),
            scopedRow({ code: "MUS-0002", name: "Aynı Ad", taxNumber: "123" }),
            scopedRow({ code: "MUS-0099", name: "Scope Dışı", tenantId: "other" }),
          ],
        },
      ],
      scope: defaultTenantScope,
    });

    expect(model.diagnostics.map((row) => row.code)).toEqual(
      expect.arrayContaining([
        "duplicate-code",
        "duplicate-name",
        "duplicate-tax-number",
        "scope-mismatch",
      ]),
    );
  });

  test("links by code first and only uses an unambiguous legacy name fallback", () => {
    const model = buildPartyReadModel({
      groups: [
        {
          slug: "taseronlar",
          rows: [
            scopedRow({ code: "TAS-0001", name: "Tekil Taşeron" }),
            scopedRow({ code: "TAS-0002", name: "Çakışan Taşeron" }),
            scopedRow({ code: "TAS-0003", name: "Çakışan Taşeron" }),
          ],
        },
      ],
      scope: defaultTenantScope,
    });
    const linked = linkPartyStatementRows({
      model,
      targetKind: "subcontractor",
      rows: [
        { counterpartyCode: "TAS-0001", counterpartyKind: "subcontractor" as const, counterpartyName: "Eski Ad" },
        { counterpartyName: "Tekil Taşeron" },
        { counterpartyName: "Çakışan Taşeron" },
        { counterpartyCode: "MUS-0001", counterpartyKind: "customer" as const, counterpartyName: "Müşteri" },
      ],
    });

    expect(linked.rows.map((row) => row.partyKey)).toEqual([
      "subcontractor:TAS-0001",
      "subcontractor:TAS-0001",
    ]);
    expect(linked.diagnostics.map((row) => row.code)).toEqual([
      "ambiguous-name",
    ]);
  });
});

function scopedRow(overrides: Record<string, string>) {
  return {
    tenantId: defaultTenantScope.tenantId,
    companyId: defaultTenantScope.companyId,
    periodId: defaultTenantScope.periodId,
    status: "Aktif",
    taxNumber: "",
    ...overrides,
  };
}
