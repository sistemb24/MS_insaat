import { afterEach, describe, expect, test, vi } from "vitest";

import { createEFaturaWebhookSignature } from "@/lib/e-fatura-webhook";

const auditLogRepositoryMock = vi.hoisted(() => ({
  record: vi.fn(),
}));
const eventRepositoryMock = vi.hoisted(() => ({
  claimEvent: vi.fn(),
  releaseEvent: vi.fn(),
}));
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.hoisted(() => {
  process.env.NOA_EFATURA_WEBHOOK_SECRET =
    process.env.NOA_EFATURA_WEBHOOK_SECRET ?? "e-fatura-webhook-secret";
});

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/audit-log-prisma-repository", () => ({
  createAuditLogPrismaRepository: vi.fn(() => auditLogRepositoryMock),
}));

vi.mock("@/lib/e-fatura-webhook-prisma-repository", () => ({
  createEFaturaWebhookPrismaRepository: vi.fn(() => eventRepositoryMock),
}));

import { POST } from "./route";

afterEach(() => {
  auditLogRepositoryMock.record.mockReset();
  eventRepositoryMock.claimEvent.mockReset();
  eventRepositoryMock.claimEvent.mockResolvedValue("claimed");
  eventRepositoryMock.releaseEvent.mockReset();
  revalidatePathMock.mockReset();
});

describe("e-fatura webhook route", () => {
  test("accepts signed provider webhook events", async () => {
    const rawBody = JSON.stringify({
      data: {
        invoiceNo: "EFAT-20260711-0001",
        providerRef: "provider-ref-001",
        providerStatus: "delivered",
      },
      eventId: "efatura-event-001",
      scope: {
        companyId: "company-demo-insaat",
        periodId: "period-2026",
        tenantId: "tenant-noa-demo",
      },
      type: "e-fatura.invoice.status.changed",
    });
    const signature = createEFaturaWebhookSignature(
      rawBody,
      "e-fatura-webhook-secret",
    );

    const response = await POST(
      new Request("http://localhost/api/e-fatura/webhook", {
        body: rawBody,
        headers: {
          "x-noa-e-fatura-signature": signature,
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        eventId: "efatura-event-001",
        invoiceNo: "EFAT-20260711-0001",
        providerRef: "provider-ref-001",
        providerStatus: "delivered",
        status: "accepted",
      },
      ok: true,
    });
    expect(auditLogRepositoryMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "e-fatura.webhook.accepted",
        entityType: "e-fatura-webhook",
        entityId: "efatura-event-001",
        entityLabel: "EFAT-20260711-0001",
      }),
    );
    expect(eventRepositoryMock.claimEvent).toHaveBeenCalledWith({
      payload: expect.objectContaining({ eventId: "efatura-event-001" }),
      receivedAt: expect.any(String),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/e-fatura-yonetimi");
  });

  test("returns a successful duplicate response without another audit entry", async () => {
    eventRepositoryMock.claimEvent.mockResolvedValue("duplicate");
    const rawBody = JSON.stringify({
      data: {
        invoiceNo: "EFAT-20260711-0003",
        providerRef: "provider-ref-003",
        providerStatus: "delivered",
      },
      eventId: "efatura-event-duplicate",
      scope: {
        companyId: "company-demo-insaat",
        periodId: "period-2026",
        tenantId: "tenant-noa-demo",
      },
      type: "e-fatura.invoice.sent",
    });

    const response = await POST(
      new Request("http://localhost/api/e-fatura/webhook", {
        body: rawBody,
        headers: {
          "x-noa-e-fatura-signature": createEFaturaWebhookSignature(
            rawBody,
            "e-fatura-webhook-secret",
          ),
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        eventId: "efatura-event-duplicate",
        invoiceNo: "EFAT-20260711-0003",
        providerRef: "provider-ref-003",
        providerStatus: "delivered",
        status: "duplicate",
      },
      ok: true,
    });
    expect(auditLogRepositoryMock.record).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("returns a helpful error when the webhook secret is missing", async () => {
    delete process.env.NOA_EFATURA_WEBHOOK_SECRET;

    const response = await POST(
      new Request("http://localhost/api/e-fatura/webhook", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      errors: ["E-Fatura webhook secret yapılandırılmamış."],
      ok: false,
    });

    process.env.NOA_EFATURA_WEBHOOK_SECRET = "e-fatura-webhook-secret";
  });

  test("returns a retryable server error when idempotency claim persistence fails", async () => {
    eventRepositoryMock.claimEvent.mockRejectedValueOnce(new Error("database unavailable"));
    const rawBody = JSON.stringify({
      data: {
        invoiceNo: "EFAT-20260712-0001",
        providerRef: "provider-ref-claim-failure",
        providerStatus: "delivered",
      },
      eventId: "efatura-event-claim-failure",
      scope: {
        companyId: "company-demo-insaat",
        periodId: "period-2026",
        tenantId: "tenant-noa-demo",
      },
      type: "e-fatura.invoice.sent",
    });

    const response = await POST(
      new Request("http://localhost/api/e-fatura/webhook", {
        body: rawBody,
        headers: {
          "x-noa-e-fatura-signature": createEFaturaWebhookSignature(
            rawBody,
            "e-fatura-webhook-secret",
          ),
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      errors: [
        "E-Fatura webhook olayı kaydedilemedi. Sağlayıcı tekrar deneyebilir.",
      ],
      ok: false,
      retryable: true,
    });
    expect(auditLogRepositoryMock.record).not.toHaveBeenCalled();
    expect(eventRepositoryMock.releaseEvent).not.toHaveBeenCalled();
  });
  test("returns retryable server error and releases the event when audit persistence fails", async () => {
    auditLogRepositoryMock.record.mockRejectedValueOnce(new Error("database unavailable"));
    const rawBody = JSON.stringify({
      data: {
        invoiceNo: "EFAT-20260711-0004",
        providerRef: "provider-ref-004",
        providerStatus: "delivered",
      },
      eventId: "efatura-event-audit-failure",
      scope: {
        companyId: "company-demo-insaat",
        periodId: "period-2026",
        tenantId: "tenant-noa-demo",
      },
      type: "e-fatura.invoice.sent",
    });

    const response = await POST(
      new Request("http://localhost/api/e-fatura/webhook", {
        body: rawBody,
        headers: {
          "x-noa-e-fatura-signature": createEFaturaWebhookSignature(
            rawBody,
            "e-fatura-webhook-secret",
          ),
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      errors: [
        "E-Fatura webhook audit kaydı oluşturulamadı. Sağlayıcı tekrar deneyebilir.",
      ],
      ok: false,
      retryable: true,
    });
    expect(eventRepositoryMock.releaseEvent).toHaveBeenCalledWith({
      payload: expect.objectContaining({ eventId: "efatura-event-audit-failure" }),
    });
  });

  test("returns a bad request for invalid signatures and unsupported event types", async () => {
    const rawBody = JSON.stringify({
      data: {
        invoiceNo: "EFAT-20260711-0001",
        providerRef: "provider-ref-001",
        providerStatus: "delivered",
      },
      eventId: "efatura-event-002",
      scope: {
        companyId: "company-demo-insaat",
        periodId: "period-2026",
        tenantId: "tenant-noa-demo",
      },
      type: "e-fatura.invoice.unknown",
    });
    const signature = createEFaturaWebhookSignature(
      rawBody,
      "e-fatura-webhook-secret",
    );

    const unsupportedEventResponse = await POST(
      new Request("http://localhost/api/e-fatura/webhook", {
        body: rawBody,
        headers: {
          "x-noa-e-fatura-signature": signature,
        },
        method: "POST",
      }),
    );

    expect(unsupportedEventResponse.status).toBe(400);
    await expect(unsupportedEventResponse.json()).resolves.toEqual({
      errors: ["E-Fatura webhook gövdesi geçerli değil."],
      ok: false,
    });

    const invalidSignatureResponse = await POST(
      new Request("http://localhost/api/e-fatura/webhook", {
        body: rawBody,
        headers: {
          "x-noa-e-fatura-signature": "not-a-valid-signature",
        },
        method: "POST",
      }),
    );

    expect(invalidSignatureResponse.status).toBe(400);
    await expect(invalidSignatureResponse.json()).resolves.toEqual({
      errors: ["E-Fatura webhook imzası doğrulanamadı."],
      ok: false,
    });
  });
});
