import { describe, expect, test } from "vitest";

import { createPlannedEFaturaWebhookAdapter } from "./e-fatura-webhook-adapter";

describe("e-fatura webhook adapter", () => {
  test("exposes the planned webhook contract", () => {
    expect(createPlannedEFaturaWebhookAdapter().getPlan()).toEqual({
      endpoint: "/api/e-fatura/webhook",
      nextStep: "Sağlayıcı event'leri bu endpoint'e HMAC imzalı olarak akıtılacak.",
      secretName: "NOA_EFATURA_WEBHOOK_SECRET",
      transport: "POST + JSON + HMAC-SHA256",
      supportedEventTypes: [
        {
          label: "Fatura gönderimi",
          type: "e-fatura.invoice.sent",
        },
        {
          label: "Durum güncellemesi",
          type: "e-fatura.invoice.status.changed",
        },
      ],
    });
  });
});
