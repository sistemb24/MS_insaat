import { describe, expect, test, vi } from "vitest";

const authenticateBearerApiKeyMock = vi.hoisted(() => vi.fn());
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/api-key-prisma-repository", () => ({
  createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock),
}));

vi.mock("@/lib/api-key-auth", () => ({
  authenticateBearerApiKey: authenticateBearerApiKeyMock,
}));

import { GET } from "./route";

describe("integration status api route", () => {
  test("passes the authorization header to the api key authenticator", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: true,
      data: {
        apiKey: {
          companyId: "company-demo-insaat",
          id: "api-key-1",
          lastUsedAt: "2026-07-11T10:00:00.000Z",
          periodId: "period-2026",
          rateLimitPerSecond: 20,
        scopes: ["invoices", "webhooks", "integration"],
          status: "active",
          tenantId: "tenant-noa-demo",
        },
        bearerToken: "noa_live_1234567890abcdefghijklmnop",
      },
    });

    const response = await GET(
      new Request("http://localhost/api/entegrasyon/durum", {
        headers: {
          Authorization: "Bearer noa_live_1234567890abcdefghijklmnop",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        apiKey: {
          companyId: "company-demo-insaat",
          id: "api-key-1",
          lastUsedAt: "2026-07-11T10:00:00.000Z",
          periodId: "period-2026",
          rateLimitPerSecond: 20,
          scopes: ["invoices", "webhooks", "integration"],
          status: "active",
          tenantId: "tenant-noa-demo",
        },
      },
    });
    expect(authenticateBearerApiKeyMock).toHaveBeenCalledWith({
      authorizationHeader: "Bearer noa_live_1234567890abcdefghijklmnop",
      repository: apiKeyRepositoryMock,
      requiredScopes: ["integration"],
    });
  });

  test("returns bearer auth challenges on missing credentials", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });

    const response = await GET(
      new Request("http://localhost/api/entegrasyon/durum"),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });
  });

  test("returns scope denial when the key lacks integration scope", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: false,
      errors: ["API anahtarı bu kaynak için gerekli kapsamları içermiyor."],
      status: 403,
    });

    const response = await GET(
      new Request("http://localhost/api/entegrasyon/durum", {
        headers: { Authorization: "Bearer noa_live_without_integration" },
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("www-authenticate")).toBeNull();
    await expect(response.json()).resolves.toEqual({
      ok: false,
      errors: ["API anahtarı bu kaynak için gerekli kapsamları içermiyor."],
      status: 403,
    });
  });
});
