import { describe, expect, test } from "vitest";

import type { AuditLogEntry } from "./audit-log";
import {
  buildEFaturaWebhookAuditFilterOptions,
  buildEFaturaWebhookAuditSearchText,
  formatEFaturaWebhookAuditProviderStatus,
  formatEFaturaWebhookRetryHint,
  formatEFaturaWebhookAuditTypeLabel,
  formatEFaturaWebhookProviderStatusLabel,
  getAuditMetadataValue,
} from "./e-fatura-webhook-audit";

describe("e-fatura webhook audit helpers", () => {
  const auditEntry: AuditLogEntry = {
    action: "e-fatura.webhook.accepted",
    actorUserId: "system-webhook",
    companyId: "company-demo-insaat",
    createdAt: "2026-07-11T08:45:00.000Z",
    entityId: "event-001",
    entityLabel: "EFA-2026-0001",
    entityType: "e-fatura-webhook",
    id: "audit-001",
    metadata: {
      providerRef: "gib-ref-001",
      providerStatus: "delivered",
      type: "e-fatura.invoice.sent",
    },
    occurredAt: "2026-07-11T08:45:00.000Z",
    periodId: "period-2026",
    tenantId: "tenant-noa-demo",
  };

  test("builds a searchable audit text and label", () => {
    expect(buildEFaturaWebhookAuditSearchText(auditEntry)).toContain(
      "efa-2026-0001",
    );
    expect(buildEFaturaWebhookAuditSearchText(auditEntry)).toContain(
      "event-001",
    );
    expect(buildEFaturaWebhookAuditSearchText(auditEntry)).toContain(
      "gib-ref-001",
    );
    expect(
      formatEFaturaWebhookAuditTypeLabel(auditEntry.metadata),
    ).toBe("Fatura gönderildi");
  });

  test("formats common provider status codes as Turkish labels", () => {
    expect(formatEFaturaWebhookProviderStatusLabel("delivered")).toBe("İletildi");
    expect(formatEFaturaWebhookProviderStatusLabel("APPROVED")).toBe("Onaylandı");
    expect(formatEFaturaWebhookProviderStatusLabel("rejected")).toBe("Reddedildi");
    expect(formatEFaturaWebhookProviderStatusLabel("cancelled")).toBe("İptal edildi");
    expect(formatEFaturaWebhookProviderStatusLabel("beklemede")).toBe("beklemede");
    expect(formatEFaturaWebhookAuditProviderStatus({ providerStatus: "sent" })).toBe(
      "İletildi",
    );
  });

  test("formats retry hints for known and unknown provider status codes", () => {
    expect(formatEFaturaWebhookRetryHint({ providerStatus: "failed" })).toBe(
      "Tekrar deneme gerekebilir",
    );
    expect(formatEFaturaWebhookRetryHint({ providerStatus: "sent" })).toBe(
      "Tekrar deneme gerekmez",
    );
    expect(formatEFaturaWebhookRetryHint({ providerStatus: "accepted" })).toBe(
      "Başarıyla işlendi",
    );
    expect(formatEFaturaWebhookRetryHint({ providerStatus: "processing" })).toBe(
      "processing",
    );
    expect(formatEFaturaWebhookRetryHint({ providerStatus: " " })).toBe("—");
  });

  test("falls back to a dash for blank metadata values", () => {
    expect(getAuditMetadataValue({ type: " " }, "type")).toBe("—");
    expect(getAuditMetadataValue({}, "providerRef")).toBe("—");
  });

  test("builds Turkish-sorted filter options and excludes blank metadata", () => {
    const secondEntry: AuditLogEntry = {
      ...auditEntry,
      id: "audit-002",
      metadata: {
        providerRef: "gib-ref-002",
        providerStatus: "approved",
        type: "e-fatura.invoice.status.changed",
      },
    };
    const blankStatusEntry: AuditLogEntry = {
      ...auditEntry,
      id: "audit-003",
      metadata: { providerStatus: " ", type: "e-fatura.invoice.sent" },
    };

    expect(
      buildEFaturaWebhookAuditFilterOptions(
        [auditEntry, secondEntry, blankStatusEntry],
        "providerStatus",
        formatEFaturaWebhookAuditProviderStatus,
      ),
    ).toEqual([
      { label: "İletildi", value: "delivered" },
      { label: "Onaylandı", value: "approved" },
    ]);
    expect(
      buildEFaturaWebhookAuditFilterOptions(
        [auditEntry, secondEntry],
        "type",
        formatEFaturaWebhookAuditTypeLabel,
      ),
    ).toEqual([
      {
        label: "Fatura durumu güncellendi",
        value: "e-fatura.invoice.status.changed",
      },
      { label: "Fatura gönderildi", value: "e-fatura.invoice.sent" },
    ]);
  });
});
