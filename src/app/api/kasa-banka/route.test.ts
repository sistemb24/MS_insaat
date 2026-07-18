import { describe, expect, test, vi } from "vitest";

const authenticateBearerApiKeyMock = vi.hoisted(() => vi.fn());
const buildTenantScopeFromApiKeyMock = vi.hoisted(() => vi.fn());
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const cashBankRepositoryMock = vi.hoisted(() => ({
  kind: "cash-bank-repo",
  list: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/cash-bank-movement-prisma-repository", () => ({
  createCashBankMovementPrismaRepository: vi.fn(() => cashBankRepositoryMock),
}));
vi.mock("@/lib/api-key-auth", () => ({
  authenticateBearerApiKey: authenticateBearerApiKeyMock,
  buildTenantScopeFromApiKey: buildTenantScopeFromApiKeyMock,
}));
vi.mock("@/lib/api-key-prisma-repository", () => ({
  createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock),
}));

import { GET } from "./route";

describe("cash bank api route", () => {
  test("lists cash bank movements for the api key tenant scope", async () => {
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
        id: "cash-bank-1",
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        periodId: scope.periodId,
        documentNo: "KB-0001",
        movementDate: "2026-07-13",
        movementType: "Tahsilat",
        direction: "Giriş",
        amount: 12500,
        currency: "TL",
        accountName: "Merkez Kasa",
        description: "API okuma testi",
        status: "Aktif",
      },
    ];

    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: true,
      data: { apiKey, bearerToken: "noa_live_test" },
    });
    buildTenantScopeFromApiKeyMock.mockReturnValue(scope);
    cashBankRepositoryMock.list.mockResolvedValue(rows);

    const response = await GET(
      new Request("http://localhost/api/kasa-banka", {
        headers: { Authorization: "Bearer noa_live_test" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: { count: 1, rows },
    });
    expect(authenticateBearerApiKeyMock).toHaveBeenCalledWith({
      authorizationHeader: "Bearer noa_live_test",
      requiredScopes: ["cash-bank"],
      repository: apiKeyRepositoryMock,
    });
    expect(cashBankRepositoryMock.list).toHaveBeenCalledWith({ scope });
  });

  test("returns a bearer challenge when authorization is missing", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });

    const response = await GET(new Request("http://localhost/api/kasa-banka"));

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
  });
});
