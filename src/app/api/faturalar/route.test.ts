import { describe, expect, test, vi } from "vitest";

const authenticateBearerApiKeyMock = vi.hoisted(() => vi.fn());
const buildTenantScopeFromApiKeyMock = vi.hoisted(() => vi.fn());
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const purchaseInvoiceRepositoryMock = vi.hoisted(() => ({
  kind: "purchase-invoice-repo",
  list: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/purchase-invoice-prisma-repository", () => ({
  createPurchaseInvoicePrismaRepository: vi.fn(() => purchaseInvoiceRepositoryMock),
}));

vi.mock("@/lib/api-key-auth", () => ({
  authenticateBearerApiKey: authenticateBearerApiKeyMock,
  buildTenantScopeFromApiKey: buildTenantScopeFromApiKeyMock,
}));

vi.mock("@/lib/api-key-prisma-repository", () => ({
  createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock),
}));

import { GET } from "./route";

describe("invoice api route", () => {
  test("lists invoices for the api key tenant scope", async () => {
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
    const rows = [
      {
        companyId: "company-demo-insaat",
        createdAt: "2026-07-11T08:30:00.000Z",
        createdBy: "user-main",
        currency: "TL",
        discountTotal: 0,
        documentNo: "FAT-0006",
        dueDate: "2026-07-23",
        grandTotal: 16200,
        id: "invoice-1",
        isOfficial: false,
        lineCount: 1,
        lines: [],
        movementGroup: "",
        netTotal: 13500,
        periodId: "period-2026",
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        status: "Taslak",
        subtotal: 15000,
        tenantId: "tenant-noa-demo",
        updatedAt: "2026-07-11T08:30:00.000Z",
        updatedBy: "user-main",
        vatTotal: 2700,
        withholdingTotal: 0,
        counterpartyCode: "TED-0001",
        counterpartyName: "ÖRNEK TEDARİKÇİ",
        description: "",
        exchangeRate: 1,
        invoiceDate: "2026-07-11",
      },
    ];

    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: true,
      data: { apiKey, bearerToken: "noa_live_1234567890abcdefghijklmnop" },
    });
    buildTenantScopeFromApiKeyMock.mockReturnValue(scope);
    purchaseInvoiceRepositoryMock.list.mockResolvedValue(rows);

    const response = await GET(
      new Request("http://localhost/api/faturalar", {
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
        rows,
      },
    });
    expect(authenticateBearerApiKeyMock).toHaveBeenCalledWith({
      authorizationHeader: "Bearer noa_live_1234567890abcdefghijklmnop",
      requiredScopes: ["invoices"],
      repository: apiKeyRepositoryMock,
    });
    expect(buildTenantScopeFromApiKeyMock).toHaveBeenCalledWith(apiKey);
    expect(purchaseInvoiceRepositoryMock.list).toHaveBeenCalledWith({ scope });
  });

  test("returns a bearer challenge when authorization is missing", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });

    const response = await GET(new Request("http://localhost/api/faturalar"));

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });
  });
});
