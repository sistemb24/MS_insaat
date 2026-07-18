import { describe, expect, test } from "vitest";

import { createWebhookDeliveryEventEnvelope } from "./webhook-delivery-event-envelope";

describe("webhook delivery event envelope", () => {
  test("builds a stable versioned envelope for a planned event", () => {
    expect(
      createWebhookDeliveryEventEnvelope({
        data: { invoiceNo: "FAT-001" },
        eventId: "evt_fatura_001",
        eventType: "invoice.created",
        now: () => new Date("2026-07-12T14:05:00.000Z"),
      }),
    ).toEqual({
      data: { invoiceNo: "FAT-001" },
      eventId: "evt_fatura_001",
      eventType: "invoice.created",
      occurredAt: "2026-07-12T14:05:00.000Z",
      version: "2026-07",
    });
  });
});
