export type EFaturaWebhookEventType =
  | "e-fatura.invoice.sent"
  | "e-fatura.invoice.status.changed";

export type EFaturaWebhookEventTypeOption = {
  label: string;
  type: EFaturaWebhookEventType;
};

export const EFATURA_WEBHOOK_EVENT_TYPE_OPTIONS: EFaturaWebhookEventTypeOption[] =
  [
    {
      label: "Fatura gönderimi",
      type: "e-fatura.invoice.sent",
    },
    {
      label: "Durum güncellemesi",
      type: "e-fatura.invoice.status.changed",
    },
  ];

export function formatEFaturaWebhookEventTypeLabel(
  eventType: string,
): string {
  if (eventType === "e-fatura.invoice.sent") {
    return "Fatura gönderildi";
  }

  if (eventType === "e-fatura.invoice.status.changed") {
    return "Fatura durumu güncellendi";
  }

  return eventType;
}

export function isEFaturaWebhookEventType(
  value: string,
): value is EFaturaWebhookEventType {
  return EFATURA_WEBHOOK_EVENT_TYPE_OPTIONS.some(
    (option) => option.type === value,
  );
}
