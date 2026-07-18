import type { WebhookDeliveryEventType } from "./webhook-delivery-events";
import type { WebhookEndpointRow } from "./webhook-endpoint-service";

export type WebhookDeliveryTarget = {
  createdAt: string;
  endpointId: string;
  endpointName: string;
  endpointUrl: string;
  eventTypes: WebhookDeliveryEventType[];
  secretPrefix: string;
};

export type WebhookDeliveryPlan = {
  deliverable: boolean;
  eventType: WebhookDeliveryEventType;
  matchingEndpointCount: number;
  targets: WebhookDeliveryTarget[];
  unroutableReason: string | null;
};

export function planWebhookDeliveries(input: {
  endpoints: WebhookEndpointRow[];
  eventType: WebhookDeliveryEventType;
}): WebhookDeliveryPlan {
  const targets = input.endpoints
    .filter((endpoint) => endpoint.isActive)
    .filter((endpoint) => endpoint.eventTypes.includes(input.eventType))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((endpoint) => ({
      createdAt: endpoint.createdAt,
      endpointId: endpoint.id,
      endpointName: endpoint.name,
      endpointUrl: endpoint.url,
      eventTypes: endpoint.eventTypes,
      secretPrefix: endpoint.secretPrefix,
    }));

  return {
    deliverable: targets.length > 0,
    eventType: input.eventType,
    matchingEndpointCount: targets.length,
    targets,
    unroutableReason:
      targets.length > 0
        ? null
        : "Bu event türü için etkin webhook endpoint bulunamadı.",
  };
}
