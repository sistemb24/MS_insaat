import { createHmac } from "node:crypto";

import type { WebhookDeliveryEventType } from "./webhook-delivery-events";

export type WebhookDeliveryRetryPolicy = {
  backoffSeconds: number[];
  maxAttempts: number;
  strategyLabel: string;
};

export type WebhookDeliveryAttemptDraft = {
  body: string;
  endpointId: string;
  endpointName: string;
  endpointUrl: string;
  eventType: WebhookDeliveryEventType;
  headers: Record<string, string>;
  nextAttemptAt: string | null;
  retryPolicy: WebhookDeliveryRetryPolicy;
  signatureHeaderName: string;
  signatureHeaderValue: string;
  transport: "HTTPS/JSON + HMAC-SHA256";
};

export type BuildWebhookDeliveryAttemptDraftInput = {
  body?: unknown;
  endpointId: string;
  endpointName: string;
  endpointUrl: string;
  eventType: WebhookDeliveryEventType;
  now?: () => Date;
  retryPolicy?: WebhookDeliveryRetryPolicy;
  secret: string;
};

const defaultRetryPolicy: WebhookDeliveryRetryPolicy = {
  backoffSeconds: [30, 120, 600],
  maxAttempts: 3,
  strategyLabel: "Üssel geri deneme",
};

const defaultSignatureHeaderName = "x-noa-webhook-signature";

export function buildWebhookDeliveryAttemptDraft(
  input: BuildWebhookDeliveryAttemptDraftInput,
): WebhookDeliveryAttemptDraft {
  const now = (input.now ?? (() => new Date()))();
  const body = JSON.stringify(
    input.body ?? {
      endpointId: input.endpointId,
      eventType: input.eventType,
      occurredAt: now.toISOString(),
    },
  );
  const retryPolicy = input.retryPolicy ?? defaultRetryPolicy;

  return {
    body,
    endpointId: input.endpointId,
    endpointName: input.endpointName,
    endpointUrl: input.endpointUrl,
    eventType: input.eventType,
    headers: {
      "content-type": "application/json",
      [defaultSignatureHeaderName]: createWebhookDeliverySignature(body, input.secret),
    },
    nextAttemptAt: null,
    retryPolicy,
    signatureHeaderName: defaultSignatureHeaderName,
    signatureHeaderValue: createWebhookDeliverySignature(body, input.secret),
    transport: "HTTPS/JSON + HMAC-SHA256",
  };
}

export function createWebhookDeliverySignature(body: string, secret: string) {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}
