import { describe, expect, test } from "vitest";

import {
  formatWebhookDeliveryEventType,
  WEBHOOK_DELIVERY_EVENT_TYPES,
} from "./webhook-delivery-events";

describe("webhook delivery event contract", () => {
  test("provides stable event types and Turkish labels", () => {
    expect(WEBHOOK_DELIVERY_EVENT_TYPES).toHaveLength(3);
    expect(formatWebhookDeliveryEventType("invoice.created")).toBe("Fatura oluşturuldu");
    expect(formatWebhookDeliveryEventType("unknown.event")).toBe("unknown.event");
  });
});