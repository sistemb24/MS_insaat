import { describe, expect, test, vi } from "vitest";

const authenticateBearerApiKeyMock = vi.hoisted(() => vi.fn());
const buildTenantScopeFromApiKeyMock = vi.hoisted(() => vi.fn());
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const chequeRepositoryMock = vi.hoisted(() => ({
  kind: "cheque-repo",
  list: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/cheque-prisma-repository", () => ({
  createChequePrismaRepository: vi.fn(() => chequeRepositoryMock),
}));
vi.mock("@/lib/api-key-auth", () => ({
  authenticateBearerApiKey: authenticateBearerApiKeyMock,
  buildTenantScopeFromApiKey: buildTenantScopeFromApiKeyMock,
}));
vi.mock("@/lib/api-key-prisma-repository", () => ({
  createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock),
}));

import { GET } from "./route";

describe("cheque api route", () => {
  test("lists cheques for the api key tenant scope", async () => {
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
        id: "cheque-1",
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        periodId: scope.periodId,
        direction: "Gelen",
        documentNo: "CK-0001",
        checkNo: "123456",
        bankName: "NOA Bank",
        branchName: "Merkez",
        drawerName: "Örnek Müşteri",
        issueDate: "2026-07-01",
        dueDate: "2026-07-30",
        amount: 12500,
        currency: "TL",
        status: "Portföyde",
        description: "API okuma testi",
        createdBy: "user-main",
        updatedBy: "user-main",
        createdAt: "2026-07-01T08:00:00.000Z",
        updatedAt: "2026-07-01T08:00:00.000Z",
      },
    ];

    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: true,
      data: { apiKey, bearerToken: "noa_live_test" },
    });
    buildTenantScopeFromApiKeyMock.mockReturnValue(scope);
    chequeRepositoryMock.list.mockResolvedValue(rows);

    const response = await GET(
      new Request("http://localhost/api/cekler", {
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
      requiredScopes: ["checks"],
      repository: apiKeyRepositoryMock,
    });
    expect(chequeRepositoryMock.list).toHaveBeenCalledWith({ scope });
  });

  test("returns a bearer challenge when authorization is missing", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });

    const response = await GET(new Request("http://localhost/api/cekler"));

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
  });
});
