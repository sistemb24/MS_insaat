import { describe, expect, it, vi } from "vitest";

import { createCustomerTypePrismaRepository } from "./customer-type-prisma-repository";

describe("customer type prisma repository", () => {
  it("scopes managed types and federates normalized customer usage", async () => {
    const customerType = { findMany: vi.fn().mockResolvedValue([]) };
    const entityRecord = {
      findMany: vi.fn().mockResolvedValue([
        { data: { customerType: "Kamu  İştiraki" } },
        { data: { customerType: " kamu iştiraki " } },
        { data: { customerType: "Kurumsal" } },
      ]),
    };
    const repository = createCustomerTypePrismaRepository({
      customerType: customerType as never,
      entityRecord: entityRecord as never,
    });
    const scope = { companyId: "company-1", tenantId: "tenant-1" };

    await repository.listManaged(scope);
    const usage = await repository.listUsage(scope);

    expect(customerType.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      where: scope,
    });
    expect(entityRecord.findMany).toHaveBeenCalledWith({
      select: { data: true },
      where: { ...scope, slug: "musteriler" },
    });
    expect(usage).toEqual(expect.arrayContaining([
      expect.objectContaining({
        normalizedName: "kamu iştiraki",
        usageCount: 2,
      }),
      expect.objectContaining({
        normalizedName: "kurumsal",
        usageCount: 1,
      }),
    ]));
  });

  it("uses scope and revision in optimistic updates", async () => {
    const row = {
      companyId: "company-1",
      createdAt: new Date("2026-07-31T10:00:00.000Z"),
      createdBy: "admin",
      description: "",
      id: "type-1",
      lastMutationKey: "key",
      name: "Kurumsal",
      normalizedName: "kurumsal",
      revisionNo: 2,
      status: "ACTIVE",
      tenantId: "tenant-1",
      updatedAt: new Date("2026-07-31T11:00:00.000Z"),
      updatedBy: "admin",
    };
    const customerType = {
      findFirst: vi.fn().mockResolvedValue(row),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    };
    const repository = createCustomerTypePrismaRepository({
      customerType: customerType as never,
      entityRecord: {} as never,
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
    expect(customerType.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: "company-1",
          id: "type-1",
          revisionNo: 1,
          tenantId: "tenant-1",
        },
      }),
    );
  });
});
