import { describe, expect, test, vi } from "vitest";

const authenticateBearerApiKeyMock = vi.hoisted(() => vi.fn());
const buildTenantScopeFromApiKeyMock = vi.hoisted(() => vi.fn());
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const timesheetRepositoryMock = vi.hoisted(() => ({
  kind: "timesheet-repo",
  list: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/timesheet-prisma-repository", () => ({
  createTimesheetPrismaRepository: vi.fn(() => timesheetRepositoryMock),
}));
vi.mock("@/lib/api-key-auth", () => ({
  authenticateBearerApiKey: authenticateBearerApiKeyMock,
  buildTenantScopeFromApiKey: buildTenantScopeFromApiKeyMock,
}));
vi.mock("@/lib/api-key-prisma-repository", () => ({
  createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock),
}));

import { GET } from "./route";

describe("timesheet api route", () => {
  test("lists timesheets for the api key tenant scope", async () => {
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
        id: "timesheet-1",
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        periodId: scope.periodId,
        documentNo: "PNT-0001",
        month: 7,
        year: 2026,
        siteCode: "SANT-0001",
        siteName: "Merkez Şantiye",
        contractorCode: "TAS-0001",
        contractorName: "Örnek Taşeron",
        status: "Kaydedildi",
        totalDays: 26,
        totalHours: 208,
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
    timesheetRepositoryMock.list.mockResolvedValue(rows);

    const response = await GET(
      new Request("http://localhost/api/puantaj", {
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
      requiredScopes: ["timesheets"],
      repository: apiKeyRepositoryMock,
    });
    expect(timesheetRepositoryMock.list).toHaveBeenCalledWith({ scope });
  });

  test("returns a bearer challenge when authorization is missing", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });

    const response = await GET(new Request("http://localhost/api/puantaj"));

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
  });
});
