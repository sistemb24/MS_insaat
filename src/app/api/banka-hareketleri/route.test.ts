import { describe, expect, test, vi } from "vitest";

const authenticateBearerApiKeyMock = vi.hoisted(() => vi.fn());
const buildTenantScopeFromApiKeyMock = vi.hoisted(() => vi.fn());
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const bankRepositoryMock = vi.hoisted(() => ({
  kind: "bank-repo",
  listConnections: vi.fn(),
  listTransactions: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/bank-integration-prisma-repository", () => ({
  createBankIntegrationPrismaRepository: vi.fn(() => bankRepositoryMock),
}));
vi.mock("@/lib/api-key-auth", () => ({
  authenticateBearerApiKey: authenticateBearerApiKeyMock,
  buildTenantScopeFromApiKey: buildTenantScopeFromApiKeyMock,
}));
vi.mock("@/lib/api-key-prisma-repository", () => ({
  createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock),
}));

import { GET } from "./route";

describe("bank transaction api route", () => {
  test("lists scoped bank transactions", async () => {
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
    const transactions = [
      {
        id: "bank-transaction-1",
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        periodId: scope.periodId,
        connectionId: "connection-1",
        externalId: "ext-1",
        occurredAt: "2026-07-13",
        updatedAt: "2026-07-13T08:00:00.000Z",
        description: "API okuma testi",
        amount: 12500,
        currency: "TRY",
        direction: "credit",
        status: "pending",
      },
    ];

    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: true,
      data: { apiKey, bearerToken: "noa_live_test" },
    });
    buildTenantScopeFromApiKeyMock.mockReturnValue(scope);
    bankRepositoryMock.listConnections.mockResolvedValue([]);
    bankRepositoryMock.listTransactions.mockResolvedValue(transactions);

    const response = await GET(
      new Request("http://localhost/api/banka-hareketleri", {
        headers: { Authorization: "Bearer noa_live_test" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: { count: 1, rows: transactions },
    });
    expect(authenticateBearerApiKeyMock).toHaveBeenCalledWith({
      authorizationHeader: "Bearer noa_live_test",
      requiredScopes: ["bank-transactions"],
      repository: apiKeyRepositoryMock,
    });
    expect(bankRepositoryMock.listTransactions).toHaveBeenCalledWith({ scope });
  });

  test("returns a bearer challenge when authorization is missing", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });

    const response = await GET(new Request("http://localhost/api/banka-hareketleri"));

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
  });

  test("filters transactions by status, direction and occurred date", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({ ok: true, data: { apiKey: { companyId: "company-1", createdBy: "user-1", periodId: "period-1", tenantId: "tenant-1" } } });
    buildTenantScopeFromApiKeyMock.mockReturnValue({ companyId: "company-1", companyName: "API", licenseLabel: "API", periodId: "period-1", periodLabel: "API", tenantId: "tenant-1", tenantName: "API", userId: "user-1", userName: "API", userRole: "viewer" });
    bankRepositoryMock.listConnections.mockResolvedValue([]);
    bankRepositoryMock.listTransactions.mockResolvedValue([{ id: "match", status: "pending", direction: "credit", occurredAt: "2026-07-13" }, { id: "other", status: "matched", direction: "credit", occurredAt: "2026-07-12" }]);
    const response = await GET(new Request("http://localhost/api/banka-hareketleri?status=pending&direction=credit&dateFrom=2026-07-13&dateTo=2026-07-13", { headers: { Authorization: "Bearer test" } }));
    expect(await response.json()).toEqual({ ok: true, data: { count: 1, rows: [{ id: "match", status: "pending", direction: "credit", occurredAt: "2026-07-13" }] } });
  });
});
