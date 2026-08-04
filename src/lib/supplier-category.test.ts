import { describe, expect, it } from "vitest";

import {
  buildEffectiveSupplierCategories,
  normalizeSupplierCategoryName,
  validateSupplierCategoryAssignment,
  validateSupplierCategoryValues,
} from "./supplier-category";

describe("supplier category domain", () => {
  it("normalizes Turkish case and whitespace and rejects punctuation-only names", () => {
    expect(normalizeSupplierCategoryName("  İŞ  Makinesi ")).toBe("iş makinesi");
    expect(() => validateSupplierCategoryValues({ description: "", name: "---" }))
      .toThrow("en az bir harf veya rakam");
  });

  it("federates managed and discovered values without duplicates", () => {
    const rows = buildEffectiveSupplierCategories({
      managed: [{
        companyId: "company",
        createdAt: "2026-07-31T00:00:00.000Z",
        createdBy: "admin",
        description: "Malzeme alımları",
        id: "category-1",
        lastMutationKey: null,
        name: "Malzeme",
        normalizedName: "malzeme",
        revisionNo: 1,
        status: "ACTIVE",
        tenantId: "tenant",
        updatedAt: "2026-07-31T00:00:00.000Z",
        updatedBy: "admin",
      }],
      role: "admin",
      usage: [
        { name: "Malzeme", normalizedName: "malzeme", usageCount: 3 },
        { name: "Nakliye", normalizedName: "nakliye", usageCount: 2 },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.name === "Malzeme")).toMatchObject({
      canManage: true,
      source: "managed",
      usageCount: 3,
    });
    expect(rows.find((row) => row.name === "Nakliye")).toMatchObject({
      canManage: false,
      source: "existing-record",
      usageCount: 2,
    });
  });

  it("allows an unchanged legacy value but rejects a new inactive value", () => {
    const categories = [{
      canManage: true,
      description: "",
      id: "inactive",
      name: "Eski",
      normalizedName: "eski",
      revisionNo: 2,
      source: "managed" as const,
      status: "INACTIVE" as const,
      updatedAt: null,
      updatedBy: null,
      usageCount: 1,
    }];
    expect(validateSupplierCategoryAssignment({ categories, currentValue: "Eski", value: "Eski" })).toEqual([]);
    expect(validateSupplierCategoryAssignment({ categories, value: "Eski" })[0]).toContain("aktif sözlükte");
  });
});
