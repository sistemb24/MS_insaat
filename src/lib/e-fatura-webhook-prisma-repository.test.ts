import { describe, expect, test, vi } from "vitest";

import { createEFaturaWebhookPrismaRepository } from "./e-fatura-webhook-prisma-repository";

const payload = {
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
  type: "e-fatura.invoice.status.changed" as const,
};

describe("e-fatura webhook prisma repository", () => {
  test("claims a new event with its tenant, company, and period scope", async () => {
    const create = vi.fn().mockResolvedValue({});
    const repository = createEFaturaWebhookPrismaRepository({
      eFaturaWebhookEvent: { create, delete: vi.fn() },
    });

    await expect(
      repository.claimEvent({
        payload,
        receivedAt: "2026-07-11T10:00:00.000Z",
      }),
    ).resolves.toBe("claimed");

    expect(create).toHaveBeenCalledWith({
      data: {
        companyId: "company-demo-insaat",
        eventId: "efatura-event-001",
        eventType: "e-fatura.invoice.status.changed",
        invoiceNo: "EFAT-20260711-0001",
        periodId: "period-2026",
        providerRef: "provider-ref-001",
        providerStatus: "delivered",
        receivedAt: new Date("2026-07-11T10:00:00.000Z"),
        tenantId: "tenant-noa-demo",
      },
    });
  });

  test("maps the database uniqueness race to a duplicate event", async () => {
    const repository = createEFaturaWebhookPrismaRepository({
      eFaturaWebhookEvent: {
        create: vi.fn().mockRejectedValue({ code: "P2002" }),
        delete: vi.fn(),
      },
    });

    await expect(
      repository.claimEvent({
        payload,
        receivedAt: "2026-07-11T10:00:00.000Z",
      }),
    ).resolves.toBe("duplicate");
  });

  test("releases a claimed event with the tenant-scoped unique identity", async () => {
    const deleteEvent = vi.fn().mockResolvedValue({});
    const repository = createEFaturaWebhookPrismaRepository({
      eFaturaWebhookEvent: {
        create: vi.fn(),
        delete: deleteEvent,
      },
    });

    await repository.releaseEvent?.({ payload });

    expect(deleteEvent).toHaveBeenCalledWith({
      where: {
        tenantId_eventId: {
          eventId: "efatura-event-001",
          tenantId: "tenant-noa-demo",
        },
      },
    });
  });
});
