export const WEBHOOK_DELIVERY_EVENT_TYPES = [
  { type: "invoice.created", label: "Fatura oluşturuldu" },
  { type: "invoice.status.changed", label: "Fatura durumu güncellendi" },
  { type: "bank.transaction.matched", label: "Banka hareketi eşleştirildi" },
] as const;

export type WebhookDeliveryEventType =
  (typeof WEBHOOK_DELIVERY_EVENT_TYPES)[number]["type"];

export function formatWebhookDeliveryEventType(value: string) {
  return (
    WEBHOOK_DELIVERY_EVENT_TYPES.find((event) => event.type === value)?.label ??
    value
  );
}