import { describe, expect, it, vi } from "vitest";

import {
  createFinanceSettingsPrismaRepository,
  type FinanceSettingsPrismaClientLike,
} from "./finance-settings-prisma-repository";
import type { FinanceSettingsSnapshot } from "./finance-settings";
import { defaultTenantScope } from "./tenant-scope";

const row: FinanceSettingsSnapshot = {
  companyId: defaultTenantScope.companyId,
  createdAt: "2026-07-30T12:00:00.000Z",
  createdBy: "user-admin",
  defaultVatRate: 18,
  id: "finance-1",
  lastMutationKey: "key-1",
  periodId: defaultTenantScope.periodId,
  revisionNo: 1,
  showVatBreakdown: false,
  tenantId: defaultTenantScope.tenantId,
  updatedAt: "2026-07-30T12:00:00.000Z",
  updatedBy: "user-admin",
};

describe("finance settings prisma repository", () => {
  it("always reads by tenant, company and period", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      ...row,
      createdAt: new Date(row.createdAt),
      defaultVatRate: { toNumber: () => 18 },
      updatedAt: new Date(row.updatedAt),
    });
    const repository = createFinanceSettingsPrismaRepository({
      financeSetting: {
        create: vi.fn(),
        findFirst,
        updateMany: vi.fn(),
      },
    } as unknown as FinanceSettingsPrismaClientLike);

    await expect(repository.find(defaultTenantScope)).resolves.toMatchObject({
      defaultVatRate: 18,
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    });
  });

  it("uses revision-scoped update and fails on a stale write", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const repository = createFinanceSettingsPrismaRepository({
      financeSetting: {
        create: vi.fn(),
        findFirst: vi.fn(),
        updateMany,
      },
    } as unknown as FinanceSettingsPrismaClientLike);

    await expect(
      repository.update({ expectedRevisionNo: 1, row: { ...row, revisionNo: 2 } }),
    ).rejects.toThrow("beklenen revizyonda");
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: row.companyId,
          periodId: row.periodId,
          revisionNo: 1,
          tenantId: row.tenantId,
        }),
      }),
    );
  });
});
