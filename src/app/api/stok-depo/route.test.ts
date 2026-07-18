import { describe, expect, test, vi } from "vitest";

const authenticateBearerApiKeyMock = vi.hoisted(() => vi.fn());
const buildTenantScopeFromApiKeyMock = vi.hoisted(() => vi.fn());
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const entityServiceMock = vi.hoisted(() => ({
  list: vi.fn(),
}));
const purchaseInvoiceServiceMock = vi.hoisted(() => ({
  list: vi.fn(),
}));
const stockMinimumSettingServiceMock = vi.hoisted(() => ({
  list: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/api-key-prisma-repository", () => ({
  createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock),
}));

vi.mock("@/lib/api-key-auth", () => ({
  authenticateBearerApiKey: authenticateBearerApiKeyMock,
  buildTenantScopeFromApiKey: buildTenantScopeFromApiKeyMock,
}));

vi.mock("@/lib/entity-crud-service", () => ({
  createEntityCrudService: vi.fn(() => entityServiceMock),
}));

vi.mock("@/lib/entity-prisma-repository", () => ({
  createEntityPrismaRepository: vi.fn(() => ({ kind: "entity-repo" })),
}));

vi.mock("@/lib/purchase-invoice-prisma-repository", () => ({
  createPurchaseInvoicePrismaRepository: vi.fn(() => ({ kind: "purchase-invoice-repo" })),
}));

vi.mock("@/lib/purchase-invoice-service", () => ({
  createPurchaseInvoiceService: vi.fn(() => purchaseInvoiceServiceMock),
}));

vi.mock("@/lib/stock-minimum-setting-prisma-repository", () => ({
  createStockMinimumSettingPrismaRepository: vi.fn(() => ({ kind: "stock-minimum-repo" })),
}));

vi.mock("@/lib/stock-minimum-setting-service", () => ({
  buildStockMinimumThresholds: vi.fn((settings) =>
    settings.map((setting: { minimumQuantity: number }) => ({
      minimumQuantity: setting.minimumQuantity,
      stockCode: "STK-0001",
      stockName: "Çimento Torba",
      warehouse: "Merkez Depo",
    })),
  ),
  buildStockMinimumThresholdsFromStockCards: vi.fn((rows) =>
    rows.map((row: { minimumQuantity: string }) => ({
      minimumQuantity: Number(row.minimumQuantity),
      stockCode: "STK-0001",
      stockName: "Çimento Torba",
      warehouse: "Merkez Depo",
    })),
  ),
  createStockMinimumSettingService: vi.fn(() => stockMinimumSettingServiceMock),
  mergeStockMinimumThresholds: vi.fn(({ settings, stockCards }) => [
    ...stockCards,
    ...settings,
  ]),
}));

vi.mock("@/lib/stock-depot-service", () => ({
  summarizeStockDepotFromInvoices: vi.fn((invoices) => ({
    movementRows: invoices.length
      ? [
          {
            documentNo: "FAT-1001",
            incomingQuantity: 100,
            invoiceDate: "2026-07-11",
            netTotal: 13500,
            siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
            sourceId: "invoice-1::line-1",
            sourceType: "purchase-invoice",
            stockCode: "STK-0001",
            stockName: "Çimento Torba",
            supplierName: "ÖRNEK TEDARİKÇİ",
            unit: "Adet",
            warehouse: "Merkez Depo",
          },
        ]
      : [],
    summaryRows: invoices.length
      ? [
          {
            incomingQuantity: 100,
            netTotal: 13500,
            stockCode: "STK-0001",
            stockName: "Çimento Torba",
            unit: "Adet",
            warehouse: "Merkez Depo",
          },
        ]
      : [],
  })),
}));

import { GET } from "./route";

describe("stock depot api route", () => {
  test("returns stock depot summary, card rows and minimum thresholds for the api key scope", async () => {
    const apiKey = {
      companyId: "company-demo-insaat",
      createdBy: "user-main",
      periodId: "period-2026",
      tenantId: "tenant-noa-demo",
    };
    const scope = {
      companyId: "company-demo-insaat",
      companyName: "API Company",
      licenseLabel: "API",
      periodId: "period-2026",
      periodLabel: "API",
      tenantId: "tenant-noa-demo",
      tenantName: "API Tenant",
      userId: "user-main",
      userName: "API Kullanıcısı",
      userRole: "viewer" as const,
    };

    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: true,
      data: { apiKey, bearerToken: "noa_live_1234567890abcdefghijklmnop" },
    });
    buildTenantScopeFromApiKeyMock.mockReturnValue(scope);
    purchaseInvoiceServiceMock.list.mockResolvedValue({
      ok: true,
      data: {
        rows: [{ id: "invoice-1" }],
      },
    });
    entityServiceMock.list.mockResolvedValue({
      ok: true,
      data: {
        definition: { slug: "stok-kartlari" },
        nextCode: "STK-0002",
        rows: [
          {
            code: "STK-0001",
            defaultWarehouse: "Merkez Depo",
            minimumQuantity: "120",
            name: "Çimento Torba",
            status: "Aktif",
            unit: "Adet",
          },
        ],
        scopeKey: "scope-key",
      },
    });
    stockMinimumSettingServiceMock.list.mockResolvedValue({
      ok: true,
      data: {
        rows: [
          {
            companyId: "company-demo-insaat",
            createdAt: "2026-07-11T10:00:00.000Z",
            id: "setting-1",
            isActive: true,
            minimumQuantity: 80,
            periodId: "period-2026",
            stockCode: "STK-0001",
            stockName: "Çimento Torba",
            tenantId: "tenant-noa-demo",
            unit: "Adet",
            updatedAt: "2026-07-11T10:00:00.000Z",
            updatedBy: "user-main",
            warehouse: "Merkez Depo",
          },
        ],
      },
    });

    const response = await GET(
      new Request("http://localhost/api/stok-depo", {
        headers: {
          Authorization: "Bearer noa_live_1234567890abcdefghijklmnop",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        count: 1,
        movementRows: [
          {
            documentNo: "FAT-1001",
            incomingQuantity: 100,
            invoiceDate: "2026-07-11",
            netTotal: 13500,
            siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
            sourceId: "invoice-1::line-1",
            sourceType: "purchase-invoice",
            stockCode: "STK-0001",
            stockName: "Çimento Torba",
            supplierName: "ÖRNEK TEDARİKÇİ",
            unit: "Adet",
            warehouse: "Merkez Depo",
          },
        ],
        stockCardRows: [
          {
            code: "STK-0001",
            defaultWarehouse: "Merkez Depo",
            minimumQuantity: "120",
            name: "Çimento Torba",
            status: "Aktif",
            unit: "Adet",
          },
        ],
        stockMinimumSettings: [
          {
            companyId: "company-demo-insaat",
            createdAt: "2026-07-11T10:00:00.000Z",
            id: "setting-1",
            isActive: true,
            minimumQuantity: 80,
            periodId: "period-2026",
            stockCode: "STK-0001",
            stockName: "Çimento Torba",
            tenantId: "tenant-noa-demo",
            unit: "Adet",
            updatedAt: "2026-07-11T10:00:00.000Z",
            updatedBy: "user-main",
            warehouse: "Merkez Depo",
          },
        ],
        summaryRows: [
          {
            incomingQuantity: 100,
            netTotal: 13500,
            stockCode: "STK-0001",
            stockName: "Çimento Torba",
            unit: "Adet",
            warehouse: "Merkez Depo",
          },
        ],
        thresholds: [
          {
            minimumQuantity: 120,
            stockCode: "STK-0001",
            stockName: "Çimento Torba",
            warehouse: "Merkez Depo",
          },
          {
            minimumQuantity: 80,
            stockCode: "STK-0001",
            stockName: "Çimento Torba",
            warehouse: "Merkez Depo",
          },
        ],
      },
    });
    expect(authenticateBearerApiKeyMock).toHaveBeenCalledWith({
      authorizationHeader: "Bearer noa_live_1234567890abcdefghijklmnop",
      requiredScopes: ["stock"],
      repository: apiKeyRepositoryMock,
    });
    expect(buildTenantScopeFromApiKeyMock).toHaveBeenCalledWith(apiKey);
  });

  test("returns a bearer challenge when authorization is missing", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });

    const response = await GET(new Request("http://localhost/api/stok-depo"));

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });
  });
});
