import { describe, expect, it } from "vitest";

import {
  buildEffectiveCustomerTypes,
  normalizeCustomerTypeName,
  validateCustomerTypeAssignment,
  validateCustomerTypeValues,
} from "./customer-type";

describe("customer type domain", () => {
  it("normalizes Turkish case and whitespace and rejects punctuation-only names", () => {
    expect(normalizeCustomerTypeName("  KAMU  İŞTİRAKİ ")).toBe("kamu iştiraki");
    expect(() => validateCustomerTypeValues({ description: "", name: "---" }))
      .toThrow("en az bir harf veya rakam");
  });

  it("federates managed and discovered values without duplicates", () => {
    const rows = buildEffectiveCustomerTypes({
      managed: [{
        companyId: "company",
        createdAt: "2026-07-31T00:00:00.000Z",
        createdBy: "admin",
        description: "Tüzel kişiler",
        id: "type-1",
        lastMutationKey: null,
        name: "Kurumsal",
        normalizedName: "kurumsal",
        revisionNo: 1,
        status: "ACTIVE",
        tenantId: "tenant",
        updatedAt: "2026-07-31T00:00:00.000Z",
        updatedBy: "admin",
      }],
      role: "admin",
      usage: [
        { name: "Kurumsal", normalizedName: "kurumsal", usageCount: 3 },
        { name: "Kamu", normalizedName: "kamu", usageCount: 2 },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.name === "Kurumsal")).toMatchObject({
      canManage: true,
      source: "managed",
      usageCount: 3,
    });
    expect(rows.find((row) => row.name === "Kamu")).toMatchObject({
      canManage: false,
      source: "existing-record",
      usageCount: 2,
    });
  });

  it("allows an unchanged legacy value but rejects a new inactive value", () => {
    const customerTypes = [{
      canManage: true,
      description: "",
      id: "inactive",
      name: "Eski Tip",
      normalizedName: "eski tip",
      revisionNo: 2,
      source: "managed" as const,
      status: "INACTIVE" as const,
      updatedAt: null,
      updatedBy: null,
      usageCount: 1,
    }];
    expect(validateCustomerTypeAssignment({
      customerTypes,
      currentValue: "Eski Tip",
      value: "Eski Tip",
    })).toEqual([]);
    expect(validateCustomerTypeAssignment({
      customerTypes,
      value: "Eski Tip",
    })[0]).toContain("aktif sözlükte");
  });
});
