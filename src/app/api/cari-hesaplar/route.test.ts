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

describe("counterparty api route", () => {
  test("lists customer, supplier and subcontractor counterparties for the api key scope", async () => {
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
    entityServiceMock.list.mockImplementation(async ({ slug }: { slug: string }) => {
      const rows = {
        musteriler: [{ code: "MUS-0001", name: "Müşteri A" }],
        tedarikciler: [{ code: "TED-0001", name: "Tedarikçi A" }],
        taseronlar: [{ code: "TSR-0001", name: "Taşeron A" }],
      } as const;

      return {
        data: {
          definition: { slug },
          nextCode: "NEXT-0001",
          rows: rows[slug as keyof typeof rows],
          scopeKey: "scope-key",
        },
        ok: true as const,
      };
    });

    const response = await GET(
      new Request("http://localhost/api/cari-hesaplar", {
        headers: {
          Authorization: "Bearer noa_live_1234567890abcdefghijklmnop",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        count: 3,
        musteriCariKartlari: [{ code: "MUS-0001", name: "Müşteri A" }],
        tedarikciCariKartlari: [{ code: "TED-0001", name: "Tedarikçi A" }],
        taseronCariKartlari: [{ code: "TSR-0001", name: "Taşeron A" }],
      },
    });
    expect(authenticateBearerApiKeyMock).toHaveBeenCalledWith({
      authorizationHeader: "Bearer noa_live_1234567890abcdefghijklmnop",
      requiredScopes: ["counterparties"],
      repository: apiKeyRepositoryMock,
    });
    expect(buildTenantScopeFromApiKeyMock).toHaveBeenCalledWith(apiKey);
    expect(entityServiceMock.list).toHaveBeenCalledWith({ scope, slug: "musteriler" });
    expect(entityServiceMock.list).toHaveBeenCalledWith({ scope, slug: "tedarikciler" });
    expect(entityServiceMock.list).toHaveBeenCalledWith({ scope, slug: "taseronlar" });
  });

  test("returns a bearer challenge when credentials are missing", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });

    const response = await GET(new Request("http://localhost/api/cari-hesaplar"));

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });
  });
});
