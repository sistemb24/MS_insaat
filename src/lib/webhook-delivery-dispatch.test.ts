import { createHmac } from "node:crypto";
import { describe, expect, test } from "vitest";

import {
  buildWebhookDeliveryAttemptDraft,
  createWebhookDeliverySignature,
} from "./webhook-delivery-dispatch";

describe("webhook delivery dispatch", () => {
  test("builds a signed delivery attempt draft without sending anything", () => {
    const body = JSON.stringify({
      eventType: "invoice.created",
      invoiceNo: "FTR-2026-0001",
    });
    const draft = buildWebhookDeliveryAttemptDraft({
      body: JSON.parse(body),
      endpointId: "webhook-endpoint-1",
      endpointName: "Fatura Bildirimi",
      endpointUrl: "https://hooks.example.com/webhooks/noa",
      eventType: "invoice.created",
      now: () => new Date("2026-07-12T12:00:00.000Z"),
      secret: "whsec_test_secret",
    });

    expect(draft).toEqual({
      body,
      endpointId: "webhook-endpoint-1",
      endpointName: "Fatura Bildirimi",
      endpointUrl: "https://hooks.example.com/webhooks/noa",
      eventType: "invoice.created",
      headers: {
        "content-type": "application/json",
        "x-noa-webhook-signature": `sha256=${createHmac("sha256", "whsec_test_secret")
          .update(body)
          .digest("hex")}`,
      },
      nextAttemptAt: null,
      retryPolicy: {
        backoffSeconds: [30, 120, 600],
        maxAttempts: 3,
        strategyLabel: "Üssel geri deneme",
      },
      signatureHeaderName: "x-noa-webhook-signature",
      signatureHeaderValue: createWebhookDeliverySignature(body, "whsec_test_secret"),
      transport: "HTTPS/JSON + HMAC-SHA256",
    });
  });
});
