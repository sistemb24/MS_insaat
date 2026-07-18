import { describe, expect, test, vi } from "vitest";

const authenticateBearerApiKeyMock = vi.hoisted(() => vi.fn());
const buildTenantScopeFromApiKeyMock = vi.hoisted(() => vi.fn());
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const entityServiceMock = vi.hoisted(() => ({
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

import { GET } from "./route";

describe("site api route", () => {
  test("lists project site cards for the api key scope", async () => {
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
        code: "SANT-0001",
        companyId: "company-demo-insaat",
        createdAt: "2026-07-11T08:30:00.000Z",
        createdBy: "user-main",
        name: "ANKARA ÇANKAYA REZİDANS PROJESİ",
        periodId: "period-2026",
        projectAmount: "37.200.000,00 TL",
        responsible: "Emre Aydın",
        status: "Aktif",
        tenantId: "tenant-noa-demo",
        updatedAt: "2026-07-11T08:30:00.000Z",
        updatedBy: "user-main",
      },
    ];

    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: true,
      data: { apiKey, bearerToken: "noa_live_1234567890abcdefghijklmnop" },
    });
    buildTenantScopeFromApiKeyMock.mockReturnValue(scope);
    entityServiceMock.list.mockResolvedValue({
      ok: true,
      data: {
        definition: { slug: "santiyeler" },
        nextCode: "SANT-0002",
        rows,
        scopeKey: "scope-key",
      },
    });

    const response = await GET(
      new Request("http://localhost/api/santiyeler", {
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
        nextCode: "SANT-0002",
        rows,
        scopeKey: "scope-key",
      },
    });
    expect(authenticateBearerApiKeyMock).toHaveBeenCalledWith({
      authorizationHeader: "Bearer noa_live_1234567890abcdefghijklmnop",
      requiredScopes: ["projects"],
      repository: apiKeyRepositoryMock,
    });
    expect(buildTenantScopeFromApiKeyMock).toHaveBeenCalledWith(apiKey);
    expect(entityServiceMock.list).toHaveBeenCalledWith({ scope, slug: "santiyeler" });
  });

  test("returns a bearer challenge when authorization is missing", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });

    const response = await GET(new Request("http://localhost/api/santiyeler"));

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });
  });
});
