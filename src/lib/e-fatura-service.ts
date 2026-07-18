import { createPlannedEFaturaProviderAdapter } from "./e-fatura-provider-adapter";
import { createPlannedEFaturaWebhookAdapter } from "./e-fatura-webhook-adapter";
import {
  formatEFaturaWebhookEventTypeLabel as formatEFaturaWebhookEventTypeLabelBase,
  type EFaturaWebhookEventTypeOption,
} from "./e-fatura-webhook-event-types";
import { getDefaultEFaturaSupportedActions } from "./e-fatura-capabilities";

export type EFaturaOverview = {
  endpoint: string;
  requiredScope: "e-invoice";
  providerLabel: string;
  status: "planned" | "active" | "error";
  statusLabel: string;
  summary: string;
  notes: string[];
};

export type EFaturaProviderPlan = {
  providerLabel: string;
  transport: string;
  connectionStatus: "planned" | "active" | "error";
  connectionStatusLabel: string;
  supportedOperations: Array<{
    label: string;
    type: "gönderim" | "sorgulama" | "iptal";
  }>;
  nextStep: string;
};

export type EFaturaWebhookPlan = {
  endpoint: string;
  secretName: string;
  transport: string;
  supportedEventTypes: EFaturaWebhookEventTypeOption[];
  nextStep: string;
};

export type EFaturaStatusPayload = {
  apiKeyId: string;
  configured: boolean;
  endpoint: string;
  provider: null;
  providerLabel: string;
  scope: EFaturaOverview["requiredScope"];
  status: EFaturaOverview["status"];
  statusLabel: string;
  supportedActions: string[];
};

export type EFaturaStatusResponse = {
  eInvoice: EFaturaStatusPayload;
  providerPlan: EFaturaProviderPlan;
  webhookPlan: EFaturaWebhookPlan;
};

export function formatEFaturaWebhookEventTypeLabel(
  eventType: string,
): string {
  return formatEFaturaWebhookEventTypeLabelBase(eventType);
}

export function getDefaultEFaturaOverview(): EFaturaOverview {
  return {
    endpoint: "/api/e-fatura/durum",
    requiredScope: "e-invoice",
    providerLabel: "GİB",
    status: "planned",
    statusLabel: "Planlı",
    summary:
      "E-Fatura ve e-Arşiv entegrasyonunun ilk adımı, API anahtarıyla korunan durum endpoint’i üzerinden okunur.",
    notes: [
      "Bu yüzeyde yalnız başlangıç sözleşmesi görünür.",
      "Sağlayıcı bağlantısı sonraki P2-S4 diliminde bağlanacaktır.",
      "API scope olmadan durum okunamaz.",
    ],
  };
}

export function getDefaultEFaturaProviderPlan(): EFaturaProviderPlan {
  return createPlannedEFaturaProviderAdapter().getPlan();
}

export function getDefaultEFaturaWebhookPlan(): EFaturaWebhookPlan {
  return createPlannedEFaturaWebhookAdapter().getPlan();
}

export function buildDefaultEFaturaStatusPayload(
  apiKeyId: string,
): EFaturaStatusPayload {
  const overview = getDefaultEFaturaOverview();

  return {
    apiKeyId,
    configured: false,
    endpoint: overview.endpoint,
    provider: null,
    providerLabel: overview.providerLabel,
    scope: overview.requiredScope,
    status: overview.status,
    statusLabel: overview.statusLabel,
    supportedActions: getDefaultEFaturaSupportedActions(),
  };
}

export function buildDefaultEFaturaStatusResponse(
  apiKeyId: string,
): EFaturaStatusResponse {
  return {
    eInvoice: buildDefaultEFaturaStatusPayload(apiKeyId),
    providerPlan: getDefaultEFaturaProviderPlan(),
    webhookPlan: getDefaultEFaturaWebhookPlan(),
  };
}
