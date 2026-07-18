import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const processWebhookMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const subscriptionRepositoryMock = vi.hoisted(() => ({ kind: "subscription-repo" }));
const auditLogRepositoryMock = vi.hoisted(() => ({ kind: "audit-repo" }));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/subscription-prisma-repository", () => ({
  createSubscriptionPrismaRepository: vi.fn(() => subscriptionRepositoryMock),
}));

vi.mock("@/lib/audit-log-prisma-repository", () => ({
  createAuditLogPrismaRepository: vi.fn(() => auditLogRepositoryMock),
}));

vi.mock("@/lib/subscription-payment-webhook", () => ({
  processSubscriptionPaymentWebhook: processWebhookMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { POST } from "./route";

describe("subscription webhook route", () => {
  const originalSecret = process.env.NOA_PAYMENT_WEBHOOK_SECRET;

  beforeEach(() => {
    processWebhookMock.mockReset();
    revalidatePathMock.mockReset();
    process.env.NOA_PAYMENT_WEBHOOK_SECRET = "webhook-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.NOA_PAYMENT_WEBHOOK_SECRET;
    } else {
      process.env.NOA_PAYMENT_WEBHOOK_SECRET = originalSecret;
    }
  });

  test("passes raw body and signature header to the payment webhook processor", async () => {
    processWebhookMock.mockResolvedValue({
      ok: true,
      data: {
        eventId: "evt_payment_success",
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        providerRef: "provider-payment-001",
        status: "activated",
      },
    });
    const rawBody = JSON.stringify({ eventId: "evt_payment_success" });

    const response = await POST(
      new Request("http://localhost/api/subscription/webhook", {
        body: rawBody,
        headers: {
          "x-noa-payment-signature": "sha256=test",
        },
        method: "POST",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        eventId: "evt_payment_success",
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        providerRef: "provider-payment-001",
        status: "activated",
      },
    });
    expect(response.status).toBe(200);
    expect(processWebhookMock).toHaveBeenCalledWith({
      auditLogRepository: auditLogRepositoryMock,
      rawBody,
      repository: subscriptionRepositoryMock,
      secret: "webhook-secret",
      signatureHeader: "sha256=test",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/abonelik");
    expect(revalidatePathMock).toHaveBeenCalledWith("/ayarlar");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
  });

  test("does not revalidate surfaces for duplicate provider events", async () => {
    processWebhookMock.mockResolvedValue({
      ok: true,
      data: {
        eventId: "evt_duplicate_success",
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        providerRef: "provider-payment-001",
        status: "duplicate",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/subscription/webhook", {
        body: "{}",
        headers: {
          "x-noa-payment-signature": "sha256=test",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        eventId: "evt_duplicate_success",
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        providerRef: "provider-payment-001",
        status: "duplicate",
      },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
  test("returns a bad request without revalidating when processor rejects the event", async () => {
    processWebhookMock.mockResolvedValue({
      ok: false,
      errors: ["Ödeme sağlayıcı webhook imzası doğrulanamadı."],
    });

    const response = await POST(
      new Request("http://localhost/api/subscription/webhook", {
        body: "{}",
        method: "POST",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      errors: ["Ödeme sağlayıcı webhook imzası doğrulanamadı."],
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("returns a server error when webhook secret is not configured", async () => {
    delete process.env.NOA_PAYMENT_WEBHOOK_SECRET;

    const response = await POST(
      new Request("http://localhost/api/subscription/webhook", {
        body: "{}",
        method: "POST",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      errors: ["Ödeme sağlayıcı webhook secret yapılandırılmamış."],
    });
    expect(processWebhookMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
