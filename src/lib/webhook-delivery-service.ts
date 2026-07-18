import {
  WEBHOOK_DELIVERY_EVENT_TYPES,
  formatWebhookDeliveryEventType,
} from "./webhook-delivery-events";
import type { WebhookDeliveryEventType } from "./webhook-delivery-events";

export type WebhookDeliveryStatus = {
  apiKeyId: string;
  configuredEndpointCount: number;
  configuredEventTypes: WebhookDeliveryEventType[];
  configuredEventTypeLabels: string[];
  unconfiguredEventTypes: WebhookDeliveryEventType[];
  unconfiguredEventTypeLabels: string[];
  deliverySignatureHeaderName: string;
  dryRunEndpoint: string;
  endpoint: string;
  nextStep: string;
  retryPolicy: {
    backoffSeconds: number[];
    maxAttempts: number;
    strategyLabel: string;
  };
  scope: "webhooks";
  status: "planned";
  statusLabel: string;
  supportedEventTypes: typeof WEBHOOK_DELIVERY_EVENT_TYPES;
  transport: string;
};

export function buildDefaultWebhookDeliveryStatus(
  apiKeyId: string,
  configuredEndpointCount = 0,
  configuredEventTypes: WebhookDeliveryEventType[] = [],
): WebhookDeliveryStatus {
  const unconfiguredEventTypes = WEBHOOK_DELIVERY_EVENT_TYPES.map(
    (eventType) => eventType.type,
  ).filter((eventType) => !configuredEventTypes.includes(eventType));

  return {
    apiKeyId,
    configuredEndpointCount,
    configuredEventTypes,
    configuredEventTypeLabels: configuredEventTypes.map((eventType) =>
      formatWebhookDeliveryEventType(eventType),
    ),
    unconfiguredEventTypes,
    unconfiguredEventTypeLabels: unconfiguredEventTypes.map((eventType) =>
      formatWebhookDeliveryEventType(eventType),
    ),
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
    supportedEventTypes: WEBHOOK_DELIVERY_EVENT_TYPES,
    transport: "HTTPS/JSON + HMAC-SHA256",
  };
}
