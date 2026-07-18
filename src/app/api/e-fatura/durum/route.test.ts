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

describe("e-fatura status api route", () => {
  test("passes the authorization header and e-invoice scope to the api key authenticator", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: true,
      data: {
        apiKey: {
          companyId: "company-demo-insaat",
          id: "api-key-1",
          lastUsedAt: "2026-07-11T10:00:00.000Z",
          periodId: "period-2026",
          rateLimitPerSecond: 20,
          scopes: ["e-invoice", "webhooks"],
          status: "active",
          tenantId: "tenant-noa-demo",
        },
        bearerToken: "noa_live_1234567890abcdefghijklmnop",
      },
    });

    const response = await GET(
      new Request("http://localhost/api/e-fatura/durum", {
        headers: {
          Authorization: "Bearer noa_live_1234567890abcdefghijklmnop",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        eInvoice: {
          apiKeyId: "api-key-1",
          configured: false,
          endpoint: "/api/e-fatura/durum",
          provider: null,
          providerLabel: "GİB",
          scope: "e-invoice",
          statusLabel: "Planlı",
          supportedActions: ["gönderim", "sorgulama", "iptal"],
          status: "planned",
        },
        providerPlan: {
          connectionStatus: "planned",
          connectionStatusLabel: "Planlı bağlantı",
          nextStep: "GİB sağlayıcı adaptörü sonraki P2-S4 diliminde bağlanacak.",
          providerLabel: "GİB",
          supportedOperations: [
            {
              label: "Fatura gönderimi",
              type: "gönderim",
            },
            {
              label: "Durum sorgulama",
              type: "sorgulama",
            },
            {
              label: "İptal bildirimi",
              type: "iptal",
            },
          ],
          transport: "HTTPS/JSON",
        },
        webhookPlan: {
          endpoint: "/api/e-fatura/webhook",
          nextStep:
            "Sağlayıcı event'leri bu endpoint'e HMAC imzalı olarak akıtılacak.",
          secretName: "NOA_EFATURA_WEBHOOK_SECRET",
          transport: "POST + JSON + HMAC-SHA256",
          supportedEventTypes: [
            {
              label: "Fatura gönderimi",
              type: "e-fatura.invoice.sent",
            },
            {
              label: "Durum güncellemesi",
              type: "e-fatura.invoice.status.changed",
            },
          ],
        },
      },
    });
    expect(authenticateBearerApiKeyMock).toHaveBeenCalledWith({
      authorizationHeader: "Bearer noa_live_1234567890abcdefghijklmnop",
      repository: apiKeyRepositoryMock,
      requiredScopes: ["e-invoice"],
    });
  });

  test("returns bearer auth challenges on missing credentials", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });

    const response = await GET(
      new Request("http://localhost/api/e-fatura/durum"),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });
  });

  test("returns forbidden when the api key lacks e-invoice scope", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: false,
      errors: ["API anahtarı bu kaynak için gerekli kapsamları içermiyor."],
      status: 403,
    });

    const response = await GET(
      new Request("http://localhost/api/e-fatura/durum", {
        headers: {
          Authorization: "Bearer noa_live_1234567890abcdefghijklmnop",
        },
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      errors: ["API anahtarı bu kaynak için gerekli kapsamları içermiyor."],
      status: 403,
    });
  });
});
