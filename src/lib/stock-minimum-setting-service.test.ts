import { describe, expect, test } from "vitest";

import {
  buildStockMinimumThresholds,
  buildStockMinimumThresholdsFromStockCards,
  createSeededStockMinimumSettingMemoryRepository,
  createStockMinimumSettingService,
  mergeStockMinimumThresholds,
  type StockMinimumSettingRow,
} from "./stock-minimum-setting-service";
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

describe("stock minimum setting service", () => {
  test("saves a normalized tenant scoped minimum setting", async () => {
    const service = createStockMinimumSettingService({
      now: () => "2026-07-02T09:00:00.000Z",
      repository: createSeededStockMinimumSettingMemoryRepository(),
    });

    const result = await service.save({
      scope: defaultTenantScope,
      values: {
        minimumQuantity: 50,
        stockCode: " STK-003 ",
        stockName: " Çimento Torba ",
        unit: "",
        warehouse: " A Blok ",
      },
    });

    expect(result).toEqual({
      ok: true,
      data: {
        row: setting,
      },
    });
    await expect(service.list({ scope: defaultTenantScope })).resolves.toEqual({
      ok: true,
      data: {
        rows: [setting],
      },
    });
  });

  test("rejects missing stock identity and non-positive minimum quantity", async () => {
    const service = createStockMinimumSettingService({
      repository: createSeededStockMinimumSettingMemoryRepository(),
    });

    await expect(
      service.save({
        scope: defaultTenantScope,
        values: {
          minimumQuantity: 0,
          stockCode: "",
          stockName: "",
          unit: "Adet",
          warehouse: "",
        },
      }),
    ).resolves.toEqual({
      ok: false,
      errors: [
        "Depo zorunludur.",
        "Stok kodu veya stok adı zorunludur.",
        "Minimum miktar sıfırdan büyük olmalıdır.",
      ],
    });
  });

  test("builds notification thresholds only from active settings", () => {
    expect(
      buildStockMinimumThresholds([
        setting,
        {
          ...setting,
          id: "inactive",
          isActive: false,
          stockCode: "STK-004",
        },
      ]),
    ).toEqual([
      {
        minimumQuantity: 50,
        stockCode: "STK-003",
        stockName: "Çimento Torba",
        warehouse: "A Blok",
      },
    ]);
  });

  test("builds notification thresholds from active stock cards with minimum quantity", () => {
    expect(
      buildStockMinimumThresholdsFromStockCards([
        {
          code: "STK-0001",
          defaultWarehouse: "Merkez Depo",
          minimumQuantity: "120",
          name: "Çimento Torba",
          status: "Aktif",
          unit: "Adet",
        },
        {
          code: "STK-0002",
          defaultWarehouse: "Şantiye Depo",
          minimumQuantity: "0",
          name: "Demir Çubuk",
          status: "Aktif",
          unit: "Kg",
        },
        {
          code: "STK-0003",
          defaultWarehouse: "A Blok",
          minimumQuantity: "40",
          name: "Gaz Beton",
          status: "Pasif",
          unit: "Adet",
        },
      ]),
    ).toEqual([
      {
        minimumQuantity: 120,
        stockCode: "STK-0001",
        stockName: "Çimento Torba",
        warehouse: "Merkez Depo",
      },
    ]);
  });

  test("lets explicit stock minimum settings override stock card thresholds", () => {
    expect(
      mergeStockMinimumThresholds({
        settings: [
          {
            minimumQuantity: 150,
            stockCode: "STK-0001",
            stockName: "Çimento Torba",
            warehouse: "Merkez Depo",
          },
        ],
        stockCards: [
          {
            minimumQuantity: 120,
            stockCode: "STK-0001",
            stockName: "Çimento Torba",
            warehouse: "Merkez Depo",
          },
          {
            minimumQuantity: 250,
            stockCode: "STK-0002",
            stockName: "Demir Çubuk",
            warehouse: "Şantiye Depo",
          },
        ],
      }),
    ).toEqual([
      {
        minimumQuantity: 150,
        stockCode: "STK-0001",
        stockName: "Çimento Torba",
        warehouse: "Merkez Depo",
      },
      {
        minimumQuantity: 250,
        stockCode: "STK-0002",
        stockName: "Demir Çubuk",
        warehouse: "Şantiye Depo",
      },
    ]);
  });
});
