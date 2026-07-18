import { describe, expect, test, vi } from "vitest";

const authenticateBearerApiKeyMock = vi.hoisted(() => vi.fn());
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const webhookEndpointRepositoryMock = vi.hoisted(() => ({
  countByScope: vi.fn(),
  list: vi.fn(),
  kind: "webhook-endpoint-repo",
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/api-key-prisma-repository", () => ({
  createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock),
}));
vi.mock("@/lib/webhook-endpoint-prisma-repository", () => ({
  createWebhookEndpointPrismaRepository: vi.fn(() => webhookEndpointRepositoryMock),
}));
vi.mock("@/lib/api-key-auth", () => ({
  authenticateBearerApiKey: authenticateBearerApiKeyMock,
  buildTenantScopeFromApiKey: vi.fn(() => ({
    companyId: "company-1",
    companyName: "API Company",
    licenseLabel: "API",
    periodId: "period-1",
    periodLabel: "API",
    tenantId: "tenant-1",
    tenantName: "API Tenant",
    userId: "user-1",
    userName: "API Kullanıcısı",
    userRole: "viewer",
  })),
}));

import { GET } from "./route";

describe("webhook delivery status api route", () => {
  test("returns the planned delivery contract for a webhook-scoped key", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: true,
      data: { apiKey: { companyId: "company-1", createdBy: "user-1", id: "api-key-webhooks", periodId: "period-1", tenantId: "tenant-1" } },
    });
    webhookEndpointRepositoryMock.countByScope.mockResolvedValue(2);
    webhookEndpointRepositoryMock.list.mockResolvedValue([
      {
        isActive: true,
        eventTypes: ["invoice.created", "bank.transaction.matched"],
      },
      {
        isActive: false,
        eventTypes: ["invoice.status.changed"],
      },
    ]);

    const response = await GET(
      new Request("http://localhost/api/webhooks/durum", {
        headers: { Authorization: "Bearer noa_live_webhook" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      deliveryReadiness: {
        plannedAttemptCount: 2,
        plannedEventTypeCount: 2,
        unroutableEventTypes: [],
      },
      data: {
        apiKeyId: "api-key-webhooks",
        configuredEndpointCount: 2,
        configuredEventTypes: ["invoice.created", "bank.transaction.matched"],
        configuredEventTypeLabels: ["Fatura oluşturuldu", "Banka hareketi eşleştirildi"],
        unconfiguredEventTypes: ["invoice.status.changed"],
        unconfiguredEventTypeLabels: ["Fatura durumu güncellendi"],
        deliverySignatureHeaderName: "x-noa-webhook-signature",
        dryRunEndpoint: "/api/webhooks/dry-run",
        endpoint: "/api/webhooks/durum",
        nextStep:
          "İmzalı teslimat worker'ı ve yeniden deneme yürütmesi sonraki P2-S4 diliminde açılacak.",
        retryPolicy: {
          backoffSeconds: [30, 120, 600],
          maxAttempts: 3,
          strategyLabel: "Üssel geri deneme",
        },
        scope: "webhooks",
        status: "planned",
        statusLabel: "Planlı",
        supportedEventTypes: [
          { type: "invoice.created", label: "Fatura oluşturuldu" },
          { type: "invoice.status.changed", label: "Fatura durumu güncellendi" },
          { type: "bank.transaction.matched", label: "Banka hareketi eşleştirildi" },
        ],
        transport: "HTTPS/JSON + HMAC-SHA256",
      },
      plannedEventTypeLabels: ["Fatura oluşturuldu", "Banka hareketi eşleştirildi"],
      unroutableEventTypeLabels: [],
    });
    expect(authenticateBearerApiKeyMock).toHaveBeenCalledWith({
      authorizationHeader: "Bearer noa_live_webhook",
      repository: apiKeyRepositoryMock,
      requiredScopes: ["webhooks"],
    });
    expect(webhookEndpointRepositoryMock.countByScope).toHaveBeenCalledWith({
      scope: expect.objectContaining({
        companyId: "company-1",
        periodId: "period-1",
        tenantId: "tenant-1",
      }),
    });
    expect(webhookEndpointRepositoryMock.list).toHaveBeenCalledWith({
      scope: expect.objectContaining({
        companyId: "company-1",
        periodId: "period-1",
        tenantId: "tenant-1",
      }),
    });
  });

  test("returns bearer challenge when authentication is missing", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });

    const response = await GET(new Request("http://localhost/api/webhooks/durum"));

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
  });

  test("returns forbidden when the key lacks webhook scope", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: false,
      errors: ["API anahtarı bu kaynak için gerekli kapsamları içermiyor."],
      status: 403,
    });

    const response = await GET(new Request("http://localhost/api/webhooks/durum"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      errors: ["API anahtarı bu kaynak için gerekli kapsamları içermiyor."],
      status: 403,
    });
  });
});
