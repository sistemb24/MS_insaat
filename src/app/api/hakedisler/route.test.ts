import { describe, expect, test, vi } from "vitest";

const authenticateBearerApiKeyMock = vi.hoisted(() => vi.fn());
const buildTenantScopeFromApiKeyMock = vi.hoisted(() => vi.fn());
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const progressPaymentRepositoryMock = vi.hoisted(() => ({
  kind: "progress-payment-repo",
  list: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/progress-payment-prisma-repository", () => ({
  createProgressPaymentPrismaRepository: vi.fn(
    () => progressPaymentRepositoryMock,
  ),
}));
vi.mock("@/lib/api-key-auth", () => ({
  authenticateBearerApiKey: authenticateBearerApiKeyMock,
  buildTenantScopeFromApiKey: buildTenantScopeFromApiKeyMock,
}));
vi.mock("@/lib/api-key-prisma-repository", () => ({
  createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock),
}));

import { GET } from "./route";

describe("progress payment api route", () => {
  test("lists progress payments for the api key tenant scope", async () => {
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
        id: "progress-payment-1",
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        periodId: scope.periodId,
        documentNo: "HK-0001",
        issueDate: "2026-07-13",
        paymentType: "Taşeron Hakedişi",
        counterpartyCode: "TAS-0001",
        counterpartyName: "Örnek Taşeron",
        siteCode: "SANT-0001",
        siteName: "Merkez Şantiye",
        currency: "TL",
        description: "API okuma testi",
        retentionRate: 0,
        status: "Kaydedildi",
        grossTotal: 100000,
        retentionTotal: 0,
        netTotal: 100000,
        vatTotal: 20000,
        grandTotal: 120000,
        lineCount: 1,
        createdBy: "user-main",
        updatedBy: "user-main",
        createdAt: "2026-07-13T08:00:00.000Z",
        updatedAt: "2026-07-13T08:00:00.000Z",
      },
    ];

    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: true,
      data: { apiKey, bearerToken: "noa_live_test" },
    });
    buildTenantScopeFromApiKeyMock.mockReturnValue(scope);
    progressPaymentRepositoryMock.list.mockResolvedValue(rows);

    const response = await GET(
      new Request("http://localhost/api/hakedisler", {
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
      requiredScopes: ["progress-payments"],
      repository: apiKeyRepositoryMock,
    });
    expect(progressPaymentRepositoryMock.list).toHaveBeenCalledWith({ scope });
  });

  test("returns a bearer challenge when authorization is missing", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });

    const response = await GET(new Request("http://localhost/api/hakedisler"));

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
  });
});
