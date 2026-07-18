import { randomUUID } from "node:crypto";

import type { WebhookDeliveryEventType } from "./webhook-delivery-events";

export type WebhookDeliveryEventEnvelope = {
  data: Record<string, unknown>;
  eventId: string;
  eventType: WebhookDeliveryEventType;
  occurredAt: string;
  version: "2026-07";
};

export function createWebhookDeliveryEventEnvelope(input: {
  data?: Record<string, unknown>;
  eventId?: string;
  eventType: WebhookDeliveryEventType;
  now?: () => Date;
}): WebhookDeliveryEventEnvelope {
  return {
    data: input.data ?? {},
    eventId: input.eventId ?? randomUUID(),
    eventType: input.eventType,
    occurredAt: (input.now ?? (() => new Date()))().toISOString(),
    version: "2026-07",
  };
}
