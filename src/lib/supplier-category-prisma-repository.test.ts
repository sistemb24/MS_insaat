import { describe, expect, it, vi } from "vitest";

import { createSupplierCategoryPrismaRepository } from "./supplier-category-prisma-repository";

describe("supplier category prisma repository", () => {
  it("scopes managed categories and federates normalized supplier usage", async () => {
    const supplierCategory = { findMany: vi.fn().mockResolvedValue([]) };
    const entityRecord = {
      findMany: vi.fn().mockResolvedValue([
        { data: { category: "İş  Makinesi" } },
        { data: { category: " iş makinesi " } },
        { data: { category: "Nakliye" } },
      ]),
    };
    const repository = createSupplierCategoryPrismaRepository({
      entityRecord: entityRecord as never,
      supplierCategory: supplierCategory as never,
    });
    const scope = { companyId: "company-1", tenantId: "tenant-1" };

    await repository.listManaged(scope);
    const usage = await repository.listUsage(scope);

    expect(supplierCategory.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      where: scope,
    });
    expect(entityRecord.findMany).toHaveBeenCalledWith({
      select: { data: true },
      where: { ...scope, slug: "tedarikciler" },
    });
    expect(usage).toEqual(expect.arrayContaining([
      expect.objectContaining({ normalizedName: "iş makinesi", usageCount: 2 }),
      expect.objectContaining({ normalizedName: "nakliye", usageCount: 1 }),
    ]));
  });

  it("uses scope and revision in optimistic updates", async () => {
    const row = {
      companyId: "company-1",
      createdAt: new Date("2026-07-31T10:00:00.000Z"),
      createdBy: "admin",
      description: "",
      id: "category-1",
      lastMutationKey: "key",
      name: "Malzeme",
      normalizedName: "malzeme",
      revisionNo: 2,
      status: "ACTIVE",
      tenantId: "tenant-1",
      updatedAt: new Date("2026-07-31T11:00:00.000Z"),
      updatedBy: "admin",
    };
    const supplierCategory = {
      findFirst: vi.fn().mockResolvedValue(row),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    };
    const repository = createSupplierCategoryPrismaRepository({
      entityRecord: {} as never,
      supplierCategory: supplierCategory as never,
    });
    await repository.update({
      expectedRevisionNo: 1,
      row: {
        ...row,
        createdAt: row.createdAt.toISOString(),
        status: "ACTIVE",
        updatedAt: row.updatedAt.toISOString(),
      },
    });
    expect(supplierCategory.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: "company-1",
          id: "category-1",
          revisionNo: 1,
          tenantId: "tenant-1",
        },
      }),
    );
  });
});
