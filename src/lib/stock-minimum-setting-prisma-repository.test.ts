import { describe, expect, test } from "vitest";

import { createStockMinimumSettingPrismaRepository } from "./stock-minimum-setting-prisma-repository";
import type { StockMinimumSettingRow } from "./stock-minimum-setting-service";
import { defaultTenantScope } from "./tenant-scope";

const setting: StockMinimumSettingRow = {
  companyId: defaultTenantScope.companyId,
  createdAt: "2026-07-02T09:00:00.000Z",
  id: "tenant-noa-demo::company-demo-insaat::period-2026::stock-minimum::a-blok::stk-003",
  isActive: true,
  minimumQuantity: 50,
  periodId: defaultTenantScope.periodId,
  stockCode: "STK-003",
  stockName: "Çimento Torba",
  tenantId: defaultTenantScope.tenantId,
  unit: "Adet",
  updatedAt: "2026-07-02T09:00:00.000Z",
  updatedBy: defaultTenantScope.userId,
  warehouse: "A Blok",
};

describe("stock minimum setting prisma repository", () => {
  test("lists active settings in tenant company period scope", async () => {
    const repository = createStockMinimumSettingPrismaRepository({
      stockMinimumSetting: {
        async findMany(input) {
          expect(input).toEqual({
            where: {
              companyId: defaultTenantScope.companyId,
              isActive: true,
              periodId: defaultTenantScope.periodId,
              tenantId: defaultTenantScope.tenantId,
            },
            orderBy: [
              { warehouse: "asc" },
              { stockCode: "asc" },
              { stockName: "asc" },
            ],
          });

          return [
            {
              ...setting,
              createdAt: new Date(setting.createdAt),
              minimumQuantity: "50",
              updatedAt: new Date(setting.updatedAt),
            },
          ];
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(repository.listSettings({ scope: defaultTenantScope })).resolves.toEqual([
      setting,
    ]);
  });

  test("upserts a scoped setting by deterministic id", async () => {
    const calls: unknown[] = [];
    const repository = createStockMinimumSettingPrismaRepository({
      stockMinimumSetting: {
        async findMany() {
          return [];
        },
        async upsert(input) {
          calls.push(input);

          return {
            ...input.create,
            createdAt: input.create.createdAt,
            minimumQuantity: input.create.minimumQuantity,
            updatedAt: input.create.updatedAt,
          };
        },
      },
    });

    await expect(
      repository.upsertSetting({ scope: defaultTenantScope, setting }),
    ).resolves.toEqual(setting);
    expect(calls).toEqual([
      expect.objectContaining({
        create: expect.objectContaining({
          companyId: defaultTenantScope.companyId,
          minimumQuantity: 50,
          periodId: defaultTenantScope.periodId,
          stockCode: "STK-003",
          tenantId: defaultTenantScope.tenantId,
          warehouse: "A Blok",
        }),
        update: expect.objectContaining({
          minimumQuantity: 50,
          stockCode: "STK-003",
          stockName: "Çimento Torba",
          updatedBy: defaultTenantScope.userId,
        }),
        where: {
          id: setting.id,
        },
      }),
    ]);
  });
});
