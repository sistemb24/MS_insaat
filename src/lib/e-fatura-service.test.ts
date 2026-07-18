import { describe, expect, test } from "vitest";

import {
  buildDefaultEFaturaStatusPayload,
  buildDefaultEFaturaStatusResponse,
  formatEFaturaWebhookEventTypeLabel,
  getDefaultEFaturaOverview,
  getDefaultEFaturaProviderPlan,
  getDefaultEFaturaWebhookPlan,
} from "./e-fatura-service";

describe("e-fatura service", () => {
  test("exposes a planned initial overview for the e-fatura module", () => {
    expect(getDefaultEFaturaOverview()).toEqual({
      endpoint: "/api/e-fatura/durum",
      notes: [
        "Bu yüzeyde yalnız başlangıç sözleşmesi görünür.",
        "Sağlayıcı bağlantısı sonraki P2-S4 diliminde bağlanacaktır.",
        "API scope olmadan durum okunamaz.",
      ],
      providerLabel: "GİB",
      requiredScope: "e-invoice",
      status: "planned",
      statusLabel: "Planlı",
      summary:
        "E-Fatura ve e-Arşiv entegrasyonunun ilk adımı, API anahtarıyla korunan durum endpoint’i üzerinden okunur.",
    });
  });

  test("exposes the planned provider connection sketch", () => {
    expect(getDefaultEFaturaProviderPlan()).toEqual({
      connectionStatus: "planned",
      connectionStatusLabel: "Planlı bağlantı",
      nextStep: "GİB sağlayıcı adaptörü sonraki P2-S4 diliminde bağlanacak.",
      providerLabel: "GİB",
      supportedOperations: [
        {
          label: "Fatura gönderimi",
          type: "gönderim",
        },
        {
          label: "Durum sorgulama",
          type: "sorgulama",
        },
        {
          label: "İptal bildirimi",
          type: "iptal",
        },
      ],
      transport: "HTTPS/JSON",
    });
  });

  test("builds the default status payload from the planned overview", () => {
    expect(buildDefaultEFaturaStatusPayload("api-key-1")).toEqual({
      apiKeyId: "api-key-1",
      configured: false,
      endpoint: "/api/e-fatura/durum",
      provider: null,
      providerLabel: "GİB",
      scope: "e-invoice",
      status: "planned",
      statusLabel: "Planlı",
      supportedActions: ["gönderim", "sorgulama", "iptal"],
    });
  });

  test("builds the default status response with the planned provider sketch", () => {
    expect(buildDefaultEFaturaStatusResponse("api-key-1")).toEqual({
      eInvoice: {
        apiKeyId: "api-key-1",
        configured: false,
        endpoint: "/api/e-fatura/durum",
        provider: null,
        providerLabel: "GİB",
        scope: "e-invoice",
        status: "planned",
        statusLabel: "Planlı",
        supportedActions: ["gönderim", "sorgulama", "iptal"],
      },
      providerPlan: {
        connectionStatus: "planned",
        connectionStatusLabel: "Planlı bağlantı",
        nextStep: "GİB sağlayıcı adaptörü sonraki P2-S4 diliminde bağlanacak.",
        providerLabel: "GİB",
        supportedOperations: [
          {
            label: "Fatura gönderimi",
            type: "gönderim",
          },
          {
            label: "Durum sorgulama",
            type: "sorgulama",
          },
          {
            label: "İptal bildirimi",
            type: "iptal",
          },
        ],
        transport: "HTTPS/JSON",
      },
      webhookPlan: {
        endpoint: "/api/e-fatura/webhook",
        nextStep:
          "Sağlayıcı event'leri bu endpoint'e HMAC imzalı olarak akıtılacak.",
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
      },
    });
  });

  test("exposes the planned e-fatura webhook sketch", () => {
    expect(getDefaultEFaturaWebhookPlan()).toEqual({
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

  test("formats known webhook event type labels", () => {
    expect(formatEFaturaWebhookEventTypeLabel("e-fatura.invoice.sent")).toBe(
      "Fatura gönderildi",
    );
    expect(
      formatEFaturaWebhookEventTypeLabel(
        "e-fatura.invoice.status.changed",
      ),
    ).toBe("Fatura durumu güncellendi");
    expect(formatEFaturaWebhookEventTypeLabel("custom.event")).toBe(
      "custom.event",
    );
  });
});
