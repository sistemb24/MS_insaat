import { describe, expect, it } from "vitest";

import { getEntityDefinition } from "./entities";
import {
  buildTenantScopeKey,
  createScopedEntityRows,
  defaultTenantScope,
  filterRowsByTenantScope,
  getTenantScopeLabel,
  saveScopedEntityDraft,
  validateTenantScope,
} from "./tenant-scope";

describe("tenant, company and period scope", () => {
  it("keeps a stable default SaaS scope for the demo shell", () => {
    expect(defaultTenantScope).toMatchObject({
      tenantId: "tenant-noa-demo",
      companyId: "company-demo-insaat",
      periodId: "period-2026",
      userId: "user-main",
      userRole: "accounting",
    });

    expect(getTenantScopeLabel(defaultTenantScope)).toBe(
      "NOA Demo Tenant / DEMO İNŞAAT / 2026",
    );
  });

  it("builds a storage key that isolates tenant, company and period data", () => {
    expect(buildTenantScopeKey(defaultTenantScope)).toBe(
      "tenant-noa-demo::company-demo-insaat::period-2026",
    );
  });

  it("validates required scope identifiers before mutations", () => {
    expect(
      validateTenantScope({
        ...defaultTenantScope,
        companyId: "",
        periodId: "",
      }),
    ).toEqual(["Firma kapsamı zorunludur.", "Dönem kapsamı zorunludur."]);
  });

  it("stamps entity rows with scope and audit metadata without mutating samples", () => {
    const definition = getEntityDefinition("santiyeler");

    expect(definition).toBeDefined();

    const rows = createScopedEntityRows({
      definition: definition!,
      scope: defaultTenantScope,
      nowIso: "2026-06-24T12:00:00.000Z",
    });

    expect(rows[0]).toMatchObject({
      code: "SANT-0001",
      tenantId: "tenant-noa-demo",
      companyId: "company-demo-insaat",
      periodId: "period-2026",
      createdBy: "user-main",
      updatedBy: "user-main",
      createdAt: "2026-06-24T12:00:00.000Z",
      updatedAt: "2026-06-24T12:00:00.000Z",
    });
    expect(definition!.sampleRows[0]).not.toHaveProperty("tenantId");
  });

  it("filters mixed entity rows back to the active scope", () => {
    const definition = getEntityDefinition("kasa-banka");

    expect(definition).toBeDefined();

    const scopedRows = createScopedEntityRows({
      definition: definition!,
      scope: defaultTenantScope,
      nowIso: "2026-06-24T12:00:00.000Z",
    });

    const otherScopeRow = {
      ...scopedRows[0],
      code: "KASA-9999",
      tenantId: "tenant-other",
    };

    expect(
      filterRowsByTenantScope(defaultTenantScope, [...scopedRows, otherScopeRow]),
    ).toHaveLength(scopedRows.length);
  });

  it("saves entity drafts inside the active scope and stamps the changed row", () => {
    const definition = getEntityDefinition("tedarikciler");

    expect(definition).toBeDefined();

    const rows = createScopedEntityRows({
      definition: definition!,
      scope: defaultTenantScope,
      nowIso: "2026-06-24T12:00:00.000Z",
    });

    const result = saveScopedEntityDraft({
      definition: definition!,
      scope: defaultTenantScope,
      rows,
      draft: {
        mode: "create",
        values: {
          code: "TED-0006",
          name: "Scope Test Tedarikçi",
          taxNumber: "2222222222",
          phone: "0 242 111 11 11",
          balance: "0,00 TL",
          status: "Aktif",
        },
      },
      nowIso: "2026-06-24T13:00:00.000Z",
    });

    expect(result.errors).toEqual([]);
    expect(result.rows.at(-1)).toMatchObject({
      code: "TED-0006",
      tenantId: "tenant-noa-demo",
      companyId: "company-demo-insaat",
      periodId: "period-2026",
      createdAt: "2026-06-24T13:00:00.000Z",
      updatedAt: "2026-06-24T13:00:00.000Z",
      createdBy: "user-main",
      updatedBy: "user-main",
    });
  });
});
