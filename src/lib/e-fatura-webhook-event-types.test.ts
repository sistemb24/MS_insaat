import { describe, expect, test } from "vitest";

import {
  EFATURA_WEBHOOK_EVENT_TYPE_OPTIONS,
  formatEFaturaWebhookEventTypeLabel,
  isEFaturaWebhookEventType,
} from "./e-fatura-webhook-event-types";

describe("e-fatura webhook event types", () => {
  test("exposes the planned event type options", () => {
    expect(EFATURA_WEBHOOK_EVENT_TYPE_OPTIONS).toEqual([
      {
        label: "Fatura gönderimi",
        type: "e-fatura.invoice.sent",
      },
      {
        label: "Durum güncellemesi",
        type: "e-fatura.invoice.status.changed",
      },
    ]);
  });

  test("detects known event types and formats their labels", () => {
    expect(isEFaturaWebhookEventType("e-fatura.invoice.sent")).toBe(true);
    expect(
      isEFaturaWebhookEventType("e-fatura.invoice.status.changed"),
    ).toBe(true);
    expect(isEFaturaWebhookEventType("custom.event")).toBe(false);
    expect(formatEFaturaWebhookEventTypeLabel("e-fatura.invoice.sent")).toBe(
      "Fatura gönderildi",
    );
    expect(
      formatEFaturaWebhookEventTypeLabel("e-fatura.invoice.status.changed"),
    ).toBe("Fatura durumu güncellendi");
    expect(formatEFaturaWebhookEventTypeLabel("custom.event")).toBe(
      "custom.event",
    );
  });
});
