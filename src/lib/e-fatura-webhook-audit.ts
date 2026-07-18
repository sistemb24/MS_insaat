import type { AuditLogEntry } from "./audit-log";
import { formatEFaturaWebhookEventTypeLabel } from "./e-fatura-webhook-event-types";

export type EFaturaWebhookAuditFilterKey = "type" | "providerStatus";

export function buildEFaturaWebhookAuditSearchText(entry: AuditLogEntry) {
  return [
    entry.entityLabel,
    entry.entityId,
    entry.actorUserId,
    getAuditMetadataValue(entry.metadata, "providerRef"),
    getAuditMetadataValue(entry.metadata, "type"),
    getAuditMetadataValue(entry.metadata, "providerStatus"),
  ]
    .join(" ")
    .toLocaleLowerCase("tr-TR");
}

export function formatEFaturaWebhookAuditProviderStatus(
  metadata: Record<string, unknown>,
) {
  return formatEFaturaWebhookProviderStatusLabel(
    getAuditMetadataValue(metadata, "providerStatus"),
  );
}

export function formatEFaturaWebhookRetryHint(metadata: Record<string, unknown>) {
  const providerStatus = getAuditMetadataValue(metadata, "providerStatus");
  const normalizedStatus = providerStatus.trim().toLocaleLowerCase("tr-TR");

  if (normalizedStatus === "rejected" || normalizedStatus === "failed") {
    return "Tekrar deneme gerekebilir";
  }

  if (normalizedStatus === "delivered" || normalizedStatus === "sent") {
    return "Tekrar deneme gerekmez";
  }

  if (normalizedStatus === "approved" || normalizedStatus === "accepted") {
    return "Başarıyla işlendi";
  }

  return providerStatus;
}

export function formatEFaturaWebhookProviderStatusLabel(providerStatus: string) {
  const normalizedStatus = providerStatus.trim().toLocaleLowerCase("tr-TR");

  if (normalizedStatus === "delivered" || normalizedStatus === "sent") {
    return "İletildi";
  }

  if (normalizedStatus === "approved" || normalizedStatus === "accepted") {
    return "Onaylandı";
  }

  if (normalizedStatus === "rejected" || normalizedStatus === "failed") {
    return "Reddedildi";
  }

  if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
    return "İptal edildi";
  }

  return providerStatus;
}

export function formatEFaturaWebhookAuditTypeLabel(
  metadata: Record<string, unknown>,
) {
  return formatEFaturaWebhookEventTypeLabel(
    getAuditMetadataValue(metadata, "type"),
  );
}

export function getAuditMetadataValue(
  metadata: Record<string, unknown>,
  key: string,
) {
  const value = metadata[key];

  return typeof value === "string" && value.trim() ? value : "—";
}

export function buildEFaturaWebhookAuditFilterOptions(
  entries: AuditLogEntry[],
  metadataKey: EFaturaWebhookAuditFilterKey,
  labelFormatter?: (metadata: Record<string, unknown>) => string,
) {
  const options = new Map<string, string>();

  for (const entry of entries) {
    const value = getAuditMetadataValue(entry.metadata, metadataKey);

    if (value === "—") {
      continue;
    }

    if (!options.has(value)) {
      options.set(
        value,
        labelFormatter ? labelFormatter(entry.metadata) : value,
      );
    }
  }

  return Array.from(options, ([value, label]) => ({ label, value })).sort(
    (left, right) => left.label.localeCompare(right.label, "tr-TR", {
      sensitivity: "base",
    }),
  );
}
