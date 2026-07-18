import type { EFaturaWebhookPlan } from "./e-fatura-service";
import { EFATURA_WEBHOOK_EVENT_TYPE_OPTIONS } from "./e-fatura-webhook-event-types";

export type EFaturaWebhookAdapter = {
  getPlan(): EFaturaWebhookPlan;
};

export function createPlannedEFaturaWebhookAdapter(): EFaturaWebhookAdapter {
  return {
    getPlan() {
      return {
        endpoint: "/api/e-fatura/webhook",
        nextStep:
          "Sağlayıcı event'leri bu endpoint'e HMAC imzalı olarak akıtılacak.",
        secretName: "NOA_EFATURA_WEBHOOK_SECRET",
        transport: "POST + JSON + HMAC-SHA256",
        supportedEventTypes: EFATURA_WEBHOOK_EVENT_TYPE_OPTIONS,
      };
    },
  };
}
