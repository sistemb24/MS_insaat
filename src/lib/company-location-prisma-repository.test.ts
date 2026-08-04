import { describe, expect, test, vi } from "vitest";

import { createCompanyLocationPrismaRepository } from "./company-location-prisma-repository";

describe("company location prisma repository", () => {
  test("scopes managed locations and sites by tenant/company/period", async () => {
    const companyLocation = {
      findMany: vi.fn().mockResolvedValue([]),
    };
    const entityRecord = {
      findMany: vi.fn().mockResolvedValue([{
        code: "SANT-0001",
        data: { name: "Kuzey Şantiyesi", responsible: "Ali", status: "Aktif" },
        updatedAt: new Date("2026-07-30T10:00:00.000Z"),
      }]),
    };
    const repository = createCompanyLocationPrismaRepository({
      companyLocation: companyLocation as never,
      entityRecord: entityRecord as never,
    });
    const scope = {
      companyId: "company-1",
      periodId: "period-1",
      tenantId: "tenant-1",
    };

    await repository.list(scope);
    const sites = await repository.listSites(scope);

    expect(companyLocation.findMany).toHaveBeenCalledWith({
      orderBy: { code: "asc" },
      where: { companyId: "company-1", tenantId: "tenant-1" },
    });
    expect(entityRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: "company-1",
          periodId: "period-1",
          slug: "santiyeler",
          tenantId: "tenant-1",
        },
      }),
    );
    expect(sites[0]).toMatchObject({
      code: "SANT-0001",
      name: "Kuzey Şantiyesi",
      status: "ACTIVE",
    });
  });

  test("uses revision and scope in optimistic update", async () => {
    const row = {
      addressLine: "",
      city: "",
      code: "OF-01",
      companyId: "company-1",
      createdAt: new Date("2026-07-30T10:00:00.000Z"),
      createdBy: "user-1",
      district: "",
      email: "",
      id: "location-1",
      lastMutationKey: "key",
      name: "Ofis",
      phone: "",
      postalCode: "",
      responsiblePerson: "",
      revisionNo: 2,
      status: "ACTIVE",
      tenantId: "tenant-1",
      type: "OFFICE",
      updatedAt: new Date("2026-07-30T11:00:00.000Z"),
      updatedBy: "user-1",
    };
    const companyLocation = {
      findFirst: vi.fn().mockResolvedValue(row),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    };
    const repository = createCompanyLocationPrismaRepository({
      companyLocation: companyLocation as never,
      entityRecord: {} as never,
    });

    await repository.update({
      expectedRevisionNo: 1,
      row: {
        ...row,
        createdAt: row.createdAt.toISOString(),
        status: "ACTIVE",
        type: "OFFICE",
        updatedAt: row.updatedAt.toISOString(),
      },
    });

    expect(companyLocation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: "company-1",
          id: "location-1",
          revisionNo: 1,
          tenantId: "tenant-1",
        },
      }),
    );
  });
});
