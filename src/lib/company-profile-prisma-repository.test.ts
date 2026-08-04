import { describe, expect, it, vi } from "vitest";

import type { CompanyProfileSnapshot } from "./company-profile";
import {
  createCompanyProfilePrismaRepository,
  type CompanyProfilePrismaClientLike,
} from "./company-profile-prisma-repository";
import { defaultTenantScope } from "./tenant-scope";

const row: CompanyProfileSnapshot = {
  addressLine: "Adres",
  city: "İstanbul",
  companyId: defaultTenantScope.companyId,
  createdAt: "2026-07-30T15:00:00.000Z",
  createdBy: "admin",
  district: "Kadıköy",
  email: "bilgi@ornek.com",
  id: "profile-1",
  lastMutationKey: "key-1",
  legalName: "Örnek İnşaat A.Ş.",
  mersisNumber: "0123456789012345",
  phone: "+90 212 555 00 00",
  postalCode: "34710",
  revisionNo: 1,
  taxNumber: "1234567890",
  taxOffice: "Kadıköy",
  tenantId: defaultTenantScope.tenantId,
  updatedAt: "2026-07-30T15:00:00.000Z",
  updatedBy: "admin",
};

describe("company profile prisma repository", () => {
  it("reads by tenant and company without period", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
    const repository = createCompanyProfilePrismaRepository({
      companyProfile: {
        create: vi.fn(),
        findFirst,
        updateMany: vi.fn(),
      },
    } as unknown as CompanyProfilePrismaClientLike);

    await expect(repository.find(defaultTenantScope)).resolves.toMatchObject({
      legalName: row.legalName,
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        companyId: defaultTenantScope.companyId,
        tenantId: defaultTenantScope.tenantId,
      },
    });
  });

  it("uses revision-scoped updates and rejects stale writes", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const repository = createCompanyProfilePrismaRepository({
      companyProfile: {
        create: vi.fn(),
        findFirst: vi.fn(),
        updateMany,
      },
    } as unknown as CompanyProfilePrismaClientLike);

    await expect(
      repository.update({
        expectedRevisionNo: 1,
        row: { ...row, revisionNo: 2 },
      }),
    ).rejects.toThrow("beklenen revizyonda");
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: row.companyId,
          revisionNo: 1,
          tenantId: row.tenantId,
        }),
      }),
    );
  });
});
