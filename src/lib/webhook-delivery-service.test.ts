import { describe, expect, test } from "vitest";

import { buildDefaultWebhookDeliveryStatus } from "./webhook-delivery-service";

describe("webhook delivery service", () => {
  test("builds a planned webhook delivery status with retry metadata", () => {
    expect(buildDefaultWebhookDeliveryStatus("api-key-1", 2, ["invoice.created"])).toEqual(
      {
        apiKeyId: "api-key-1",
        configuredEndpointCount: 2,
        configuredEventTypes: ["invoice.created"],
        configuredEventTypeLabels: ["Fatura oluşturuldu"],
        unconfiguredEventTypes: [
          "invoice.status.changed",
          "bank.transaction.matched",
        ],
        unconfiguredEventTypeLabels: [
          "Fatura durumu güncellendi",
          "Banka hareketi eşleştirildi",
        ],
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
        supportedEventTypes: [
          { type: "invoice.created", label: "Fatura oluşturuldu" },
          { type: "invoice.status.changed", label: "Fatura durumu güncellendi" },
          { type: "bank.transaction.matched", label: "Banka hareketi eşleştirildi" },
        ],
        transport: "HTTPS/JSON + HMAC-SHA256",
      },
    );
  });
});
