import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createEFaturaWebhookSignature,
  processEFaturaWebhook,
  verifyEFaturaWebhookSignature,
} from "./e-fatura-webhook";

const auditLogRepositoryMock = {
  record: vi.fn(),
};

afterEach(() => {
  auditLogRepositoryMock.record.mockReset();
});

describe("e-fatura webhook", () => {
  test("verifies signed webhook bodies and accepts planned provider events", async () => {
    const secret = "e-fatura-webhook-secret";
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

    const signature = createEFaturaWebhookSignature(rawBody, secret);

    expect(
      verifyEFaturaWebhookSignature({
        rawBody,
        secret,
        signatureHeader: signature,
      }),
    ).toBe(true);

    await expect(
      processEFaturaWebhook({
        auditLogRepository: auditLogRepositoryMock,
        rawBody,
        secret,
        signatureHeader: signature,
      }),
    ).resolves.toEqual({
      ok: true,
      data: {
        eventId: "efatura-event-001",
        invoiceNo: "EFAT-20260711-0001",
        providerRef: "provider-ref-001",
        providerStatus: "delivered",
        status: "accepted",
      },
    });
    expect(auditLogRepositoryMock.record).toHaveBeenCalledWith({
      action: "e-fatura.webhook.accepted",
      actorUserId: "system-webhook",
      companyId: "company-demo-insaat",
      entityId: "efatura-event-001",
      entityLabel: "EFAT-20260711-0001",
      entityType: "e-fatura-webhook",
      metadata: {
        invoiceNo: "EFAT-20260711-0001",
        providerRef: "provider-ref-001",
        providerStatus: "delivered",
        type: "e-fatura.invoice.status.changed",
      },
      occurredAt: expect.any(String),
      periodId: "period-2026",
      tenantId: "tenant-noa-demo",
    });
  });

  test("rejects invalid signatures and malformed payloads", async () => {
    const secret = "e-fatura-webhook-secret";
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

    expect(
      verifyEFaturaWebhookSignature({
        rawBody,
        secret,
        signatureHeader: "not-a-valid-signature",
      }),
    ).toBe(false);
    await expect(
      processEFaturaWebhook({
        rawBody,
        secret,
        signatureHeader: "not-a-valid-signature",
      }),
    ).resolves.toEqual({
      errors: ["E-Fatura webhook imzası doğrulanamadı."],
      ok: false,
    });
    await expect(
      processEFaturaWebhook({
        rawBody: "{",
        secret,
        signatureHeader: createEFaturaWebhookSignature("{", secret),
      }),
    ).resolves.toEqual({
      errors: ["E-Fatura webhook gövdesi JSON olmalıdır."],
      ok: false,
    });
  });

  test("rejects unsupported webhook event types", async () => {
    const secret = "e-fatura-webhook-secret";
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
      type: "e-fatura.invoice.unknown",
    });

    await expect(
      processEFaturaWebhook({
        rawBody,
        secret,
        signatureHeader: createEFaturaWebhookSignature(rawBody, secret),
      }),
    ).resolves.toEqual({
      errors: ["E-Fatura webhook gövdesi geçerli değil."],
      ok: false,
    });
  });

  test("rejects signed payloads with empty persistence identity fields", async () => {
    const secret = "e-fatura-webhook-secret";
    const rawBody = JSON.stringify({
      data: {
        invoiceNo: " ",
        providerRef: "provider-ref-001",
        providerStatus: "delivered",
      },
      eventId: "efatura-event-empty-field",
      scope: {
        companyId: "company-demo-insaat",
        periodId: "period-2026",
        tenantId: "tenant-noa-demo",
      },
      type: "e-fatura.invoice.status.changed",
    });

    await expect(
      processEFaturaWebhook({
        rawBody,
        secret,
        signatureHeader: createEFaturaWebhookSignature(rawBody, secret),
      }),
    ).resolves.toEqual({
      errors: ["E-Fatura webhook gövdesi geçerli değil."],
      ok: false,
    });
  });

  test("returns a duplicate result before adding another audit entry", async () => {
    const secret = "e-fatura-webhook-secret";
    const rawBody = JSON.stringify({
      data: {
        invoiceNo: "EFAT-20260711-0002",
        providerRef: "provider-ref-002",
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
    const claimEvent = vi.fn().mockResolvedValue("duplicate");

    await expect(
      processEFaturaWebhook({
        auditLogRepository: auditLogRepositoryMock,
        eventRepository: { claimEvent },
        rawBody,
        secret,
        signatureHeader: createEFaturaWebhookSignature(rawBody, secret),
      }),
    ).resolves.toEqual({
      ok: true,
      data: {
        eventId: "efatura-event-duplicate",
        invoiceNo: "EFAT-20260711-0002",
        providerRef: "provider-ref-002",
        providerStatus: "delivered",
        status: "duplicate",
      },
    });
    expect(claimEvent).toHaveBeenCalledWith({
      payload: expect.objectContaining({ eventId: "efatura-event-duplicate" }),
      receivedAt: expect.any(String),
    });
    expect(auditLogRepositoryMock.record).not.toHaveBeenCalled();
  });

  test("returns a retryable result when idempotency claim persistence fails", async () => {
    const secret = "e-fatura-webhook-secret";
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
    const claimEvent = vi.fn().mockRejectedValueOnce(new Error("database unavailable"));

    await expect(
      processEFaturaWebhook({
        auditLogRepository: auditLogRepositoryMock,
        eventRepository: { claimEvent },
        rawBody,
        secret,
        signatureHeader: createEFaturaWebhookSignature(rawBody, secret),
      }),
    ).resolves.toEqual({
      errors: [
        "E-Fatura webhook olayı kaydedilemedi. Sağlayıcı tekrar deneyebilir.",
      ],
      ok: false,
      retryable: true,
    });
    expect(auditLogRepositoryMock.record).not.toHaveBeenCalled();
  });
  test("releases a claimed event and returns a retryable result when audit persistence fails", async () => {
    const secret = "e-fatura-webhook-secret";
    const rawBody = JSON.stringify({
      data: {
        invoiceNo: "EFAT-20260711-0003",
        providerRef: "provider-ref-003",
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
    const releaseEvent = vi.fn().mockResolvedValue(undefined);
    auditLogRepositoryMock.record.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(
      processEFaturaWebhook({
        auditLogRepository: auditLogRepositoryMock,
        eventRepository: {
          claimEvent: vi.fn().mockResolvedValue("claimed"),
          releaseEvent,
        },
        rawBody,
        secret,
        signatureHeader: createEFaturaWebhookSignature(rawBody, secret),
      }),
    ).resolves.toEqual({
      errors: [
        "E-Fatura webhook audit kaydı oluşturulamadı. Sağlayıcı tekrar deneyebilir.",
      ],
      ok: false,
      retryable: true,
    });
    expect(releaseEvent).toHaveBeenCalledWith({
      payload: expect.objectContaining({ eventId: "efatura-event-audit-failure" }),
    });
  });
});
