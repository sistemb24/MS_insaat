"use client";

import { useState } from "react";

import type {
  EFaturaOverview,
  EFaturaProviderPlan,
  EFaturaWebhookPlan,
} from "@/lib/e-fatura-service";
import { formatEFaturaWebhookEventTypeLabel } from "@/lib/e-fatura-service";
import type { AuditLogEntry } from "@/lib/audit-log";
import type { ModuleContent } from "@/lib/module-content";
import {
  buildEFaturaWebhookAuditFilterOptions,
  buildEFaturaWebhookAuditSearchText,
  formatEFaturaWebhookAuditProviderStatus,
  formatEFaturaWebhookRetryHint,
  formatEFaturaWebhookAuditTypeLabel,
  formatEFaturaWebhookProviderStatusLabel,
  getAuditMetadataValue,
} from "@/lib/e-fatura-webhook-audit";

import { ModuleSurface } from "./module-surface";

type EFaturaSurfaceProps = {
  content: ModuleContent;
  overview: EFaturaOverview;
  providerPlan: EFaturaProviderPlan;
  webhookAuditEntries?: AuditLogEntry[];
  webhookPlan: EFaturaWebhookPlan;
};

export function EFaturaSurface({
  content,
  overview,
  providerPlan,
  webhookAuditEntries = [],
  webhookPlan,
}: EFaturaSurfaceProps) {
  const [searchText, setSearchText] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [providerStatusFilter, setProviderStatusFilter] = useState("all");
  const [retryHintFilter, setRetryHintFilter] = useState("all");
  const [auditStartDate, setAuditStartDate] = useState("");
  const [auditEndDate, setAuditEndDate] = useState("");
  const [selectedWebhookEventId, setSelectedWebhookEventId] = useState<string | null>(
    webhookAuditEntries[0]?.id ?? null,
  );
  const hasInvalidAuditDateRange = Boolean(
    auditStartDate && auditEndDate && auditStartDate > auditEndDate,
  );
  const hasActiveAuditFilters = Boolean(
    searchText.trim() ||
      eventTypeFilter !== "all" ||
      providerStatusFilter !== "all" ||
      retryHintFilter !== "all" ||
      auditStartDate ||
      auditEndDate,
  );
  const activeAuditFilterLabels = [
    searchText.trim() ? `Arama: ${searchText.trim()}` : null,
    eventTypeFilter !== "all"
      ? `Olay tipi: ${formatEFaturaWebhookEventTypeLabel(eventTypeFilter)}`
      : null,
    providerStatusFilter !== "all"
      ? `Sağlayıcı durumu: ${formatEFaturaWebhookProviderStatusLabel(providerStatusFilter)}`
      : null,
    retryHintFilter !== "all"
      ? `Tekrar deneme: ${retryHintFilter === "retryable" ? "Gerekebilir" : "Gerekmez"}`
      : null,
    auditStartDate ? `Başlangıç: ${auditStartDate}` : null,
    auditEndDate ? `Bitiş: ${auditEndDate}` : null,
  ].filter((label): label is string => label !== null);
  const filteredWebhookAuditEntries = webhookAuditEntries.filter((entry) => {
    const eventType = getAuditMetadataValue(entry.metadata, "type");
    const providerStatus = getAuditMetadataValue(entry.metadata, "providerStatus");
    const searchableText = buildEFaturaWebhookAuditSearchText(entry);
    const normalizedSearchText = searchText.trim().toLocaleLowerCase("tr-TR");
    const matchesSearch =
      normalizedSearchText.length === 0 ||
      searchableText.includes(normalizedSearchText);
    const matchesEventType =
      eventTypeFilter === "all" || eventType === eventTypeFilter;
    const matchesProviderStatus =
      providerStatusFilter === "all" || providerStatus === providerStatusFilter;
    const matchesRetryHint =
      retryHintFilter === "all" ||
      (retryHintFilter === "retryable" &&
        (providerStatus === "rejected" || providerStatus === "failed")) ||
      (retryHintFilter === "settled" &&
        (providerStatus === "delivered" ||
          providerStatus === "sent" ||
          providerStatus === "approved" ||
          providerStatus === "accepted"));
    const entryDate = getWebhookLocalDateKey(entry.occurredAt);
    const matchesDateRange =
      !hasInvalidAuditDateRange &&
      (!auditStartDate || entryDate >= auditStartDate) &&
      (!auditEndDate || entryDate <= auditEndDate);

    return (
      matchesSearch &&
      matchesEventType &&
      matchesProviderStatus &&
      matchesRetryHint &&
      matchesDateRange
    );
  });
  const eventTypeOptions = buildEFaturaWebhookAuditFilterOptions(
    webhookAuditEntries,
    "type",
    formatWebhookEventType,
  );
  const providerStatusOptions = buildEFaturaWebhookAuditFilterOptions(
    webhookAuditEntries,
    "providerStatus",
    formatEFaturaWebhookAuditProviderStatus,
  );
  const retryableWebhookAuditCount = filteredWebhookAuditEntries.filter((entry) => {
    const providerStatus = getAuditMetadataValue(entry.metadata, "providerStatus");
    const normalizedStatus = providerStatus.trim().toLocaleLowerCase("tr-TR");

    return normalizedStatus === "rejected" || normalizedStatus === "failed";
  }).length;
  const selectedWebhookAuditEntry =
    selectedWebhookEventId === null
      ? null
      : filteredWebhookAuditEntries.find((entry) => entry.id === selectedWebhookEventId) ??
        filteredWebhookAuditEntries[0] ??
        null;
  const selectedWebhookAuditEntryPosition = selectedWebhookAuditEntry
    ? filteredWebhookAuditEntries.findIndex(
        (entry) => entry.id === selectedWebhookAuditEntry.id,
      ) + 1
    : 0;
  const selectedWebhookAuditEntryCountLabel = selectedWebhookAuditEntry
    ? ` · Seçili ${selectedWebhookAuditEntryPosition} / ${filteredWebhookAuditEntries.length}`
    : "";
  const visibleSelectedWebhookEventId = selectedWebhookAuditEntry?.id ?? null;
  const activeAuditFilterSummaryId = "e-fatura-webhook-active-filters";

  return (
    <div className="space-y-4">
      <ModuleSurface content={content} />
      <section className="mx-auto grid max-w-7xl gap-3 rounded-ui-panel border border-divider bg-surface-raised p-5 md:grid-cols-[1.4fr_1fr] md:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
            E-Fatura başlangıç durumu
          </p>
          <h2 className="mt-2 text-lg font-semibold">{overview.statusLabel} yüzey</h2>
          <p className="mt-2 text-sm leading-6 text-content-subtle">
            {overview.summary}
          </p>
        </div>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <InfoRow label="Durum endpoint'i" value={overview.endpoint} />
          <InfoRow label="Gerekli scope" value={overview.requiredScope} />
          <InfoRow label="Sağlayıcı" value={overview.providerLabel} />
          <InfoRow label="Takip" value={overview.statusLabel} />
        </dl>
        <ul className="md:col-span-2 mt-1 grid gap-2 text-sm text-content-subtle">
          {overview.notes.map((note) => (
            <li className="flex items-start gap-2" key={note}>
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-primary" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
        <section className="md:col-span-2 rounded-ui-control border border-divider bg-surface-muted p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
                Sağlayıcı bağlantı planı
              </p>
              <h3 className="mt-1 text-sm font-semibold text-content">
                {providerPlan.providerLabel} · {providerPlan.connectionStatusLabel}
              </h3>
            </div>
            <div className="rounded-ui-control border border-divider bg-surface-raised px-3 py-1.5 text-xs font-semibold text-content-subtle">
              {providerPlan.transport}
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-content-subtle">
            {providerPlan.nextStep}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-content-subtle">
            {providerPlan.supportedOperations.map((operation) => (
              <li
                className="rounded-ui-control border border-divider bg-surface-raised px-3 py-1.5"
                key={operation.type}
              >
                {operation.label} · {operation.type}
              </li>
            ))}
          </ul>
        </section>
        <section className="md:col-span-2 rounded-ui-control border border-divider bg-surface-muted p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
                Webhook hazırlığı
              </p>
              <h3 className="mt-1 text-sm font-semibold text-content">
                {webhookPlan.endpoint}
              </h3>
            </div>
            <div className="rounded-ui-control border border-divider bg-surface-raised px-3 py-1.5 text-xs font-semibold text-content-subtle">
              {webhookPlan.transport}
            </div>
          </div>
          <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
            <InfoRow label="Secret adı" value={webhookPlan.secretName} />
            <InfoRow label="Hazırlık" value="Planlı" />
          </dl>
          <ul className="mt-3 grid gap-2 text-sm text-content-subtle">
            {webhookPlan.supportedEventTypes.map((eventType) => (
              <li className="flex items-start gap-2" key={eventType.type}>
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-primary" />
                <span>
                  {eventType.label} — {eventType.type}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-6 text-content-subtle">
            {webhookPlan.nextStep}
          </p>
        </section>
        <section className="md:col-span-2 overflow-hidden rounded-ui-control border border-divider bg-surface-muted">
          <div className="flex flex-col gap-4 border-b border-divider px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
                  Son webhook olayları
                </p>
                <h3 className="mt-1 text-sm font-semibold text-content">
                  Kabul edilen sağlayıcı bildirimleri
                </h3>
              </div>
              <span className="text-xs font-semibold text-content-subtle">
                Son {filteredWebhookAuditEntries.length} / {webhookAuditEntries.length} olay
                {selectedWebhookAuditEntryCountLabel}
              </span>
            </div>
            <p className="text-xs font-semibold text-content-subtle">
              Tekrar deneme gerekebilir: {retryableWebhookAuditCount}
            </p>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,0.8fr))_auto]">
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-content-subtle">
                Arama
                <input
                  aria-label="Webhook olaylarında ara"
                  className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-medium text-content outline-none transition focus:border-brand-primary"
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Fatura, olay ID, ref veya kullanıcı"
                  value={searchText}
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-content-subtle">
                Olay tipi
                <select
                  aria-label="Webhook olay tipi filtresi"
                  className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-medium text-content outline-none transition focus:border-brand-primary"
                  onChange={(event) => setEventTypeFilter(event.target.value)}
                  value={eventTypeFilter}
                >
                  <option value="all">Tümü</option>
                  {eventTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-content-subtle">
                Sağlayıcı durumu
                <select
                  aria-label="Webhook sağlayıcı durumu filtresi"
                  className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-medium text-content outline-none transition focus:border-brand-primary"
                  onChange={(event) => setProviderStatusFilter(event.target.value)}
                  value={providerStatusFilter}
                >
                  <option value="all">Tümü</option>
                  {providerStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-content-subtle">
                Tekrar deneme
                <select
                  aria-label="Webhook tekrar deneme filtresi"
                  className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-medium text-content outline-none transition focus:border-brand-primary"
                  onChange={(event) => setRetryHintFilter(event.target.value)}
                  value={retryHintFilter}
                >
                  <option value="all">Tümü</option>
                  <option value="retryable">Gerekebilir</option>
                  <option value="settled">Gerekmez</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-content-subtle">
                Başlangıç tarihi
                <input
                  aria-label="Webhook başlangıç tarihi"
                  className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-medium text-content outline-none transition focus:border-brand-primary"
                  onChange={(event) => setAuditStartDate(event.target.value)}
                  type="date"
                  value={auditStartDate}
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-content-subtle">
                Bitiş tarihi
                <input
                  aria-label="Webhook bitiş tarihi"
                  className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-medium text-content outline-none transition focus:border-brand-primary"
                  onChange={(event) => setAuditEndDate(event.target.value)}
                  type="date"
                  value={auditEndDate}
                />
              </label>
              <button
                className="self-end rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-semibold text-content-subtle transition hover:border-brand-primary hover:text-content disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-divider disabled:hover:text-content-subtle"
                disabled={!hasActiveAuditFilters}
                type="button"
                onClick={() => {
                  setSearchText("");
                  setEventTypeFilter("all");
                  setProviderStatusFilter("all");
                  setRetryHintFilter("all");
                  setAuditStartDate("");
                  setAuditEndDate("");
                }}
              >
                Filtreleri temizle
              </button>
            </div>
            {hasInvalidAuditDateRange ? (
              <p className="text-xs font-semibold text-danger">
                Başlangıç tarihi bitiş tarihinden sonra olamaz.
              </p>
            ) : null}
            {activeAuditFilterLabels.length > 0 ? (
              <p
                id={activeAuditFilterSummaryId}
                aria-live="polite"
                className="text-xs font-semibold text-content-subtle"
                role="status"
              >
                Aktif filtreler: {activeAuditFilterLabels.join(" · ")}
              </p>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table
              aria-describedby={
                activeAuditFilterLabels.length > 0
                  ? activeAuditFilterSummaryId
                  : undefined
              }
              aria-label="E-Fatura webhook olayları"
              className="min-w-[980px] w-full text-left text-sm"
            >
              <thead className="bg-surface-raised text-xs uppercase text-content-subtle">
                <tr>
                  <th className="px-4 py-3 font-semibold">Zaman</th>
                  <th className="px-4 py-3 font-semibold">Fatura</th>
                  <th className="px-4 py-3 font-semibold">Olay ID</th>
                  <th className="px-4 py-3 font-semibold">Olay</th>
                  <th className="px-4 py-3 font-semibold">Sağlayıcı durumu</th>
                  <th className="px-4 py-3 font-semibold">Tekrar deneme</th>
                  <th className="px-4 py-3 font-semibold">Referans</th>
                  <th className="px-4 py-3 font-semibold">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {filteredWebhookAuditEntries.map((entry) => (
                  <tr
                    aria-label={`Webhook kaydı ${entry.entityLabel} ${formatWebhookEventType(entry.metadata)} ${entry.entityId}`}
                    aria-pressed={entry.id === visibleSelectedWebhookEventId}
                    className={
                      entry.id === visibleSelectedWebhookEventId
                        ? "cursor-pointer bg-surface-selected/50 ring-1 ring-inset ring-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary"
                        : "cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-primary"
                    }
                    onClick={() => {
                      setSelectedWebhookEventId(entry.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedWebhookEventId(entry.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    key={entry.id}
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatDateTime(entry.occurredAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                      {entry.entityLabel}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-content-subtle">
                      {entry.entityId}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatWebhookEventType(entry.metadata)}
                    </td>
                    <td className="px-4 py-3">
                      {formatEFaturaWebhookAuditProviderStatus(entry.metadata)}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-content-subtle">
                      {formatEFaturaWebhookRetryHint(entry.metadata)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-content-subtle">
                      {getAuditMetadataValue(entry.metadata, "providerRef")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded-ui-control border border-divider bg-surface-raised px-3 py-1.5 text-xs font-semibold text-content transition hover:border-brand-primary"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedWebhookEventId(entry.id);
                        }}
                        type="button"
                      >
                        {entry.id === visibleSelectedWebhookEventId ? "Açık" : "Detay"}
                      </button>
                    </td>
                  </tr>
                ))}
                {webhookAuditEntries.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-6 text-center font-semibold text-content-subtle"
                      colSpan={7}
                    >
                      Henüz kabul edilmiş webhook olayı bulunamadı.
                    </td>
                  </tr>
                ) : filteredWebhookAuditEntries.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-6 text-center font-semibold text-content-subtle"
                      colSpan={7}
                    >
                      Filtreye uyan webhook olayı bulunamadı.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {selectedWebhookAuditEntry ? (
            <div className="border-t border-divider bg-surface-raised px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
                    Seçili olay detayı
                  </p>
                  <p className="mt-1 text-xs font-semibold text-content-subtle">
                    Seçili kayıt {selectedWebhookAuditEntryPosition} / {filteredWebhookAuditEntries.length}
                  </p>
                  <h4 className="mt-1 text-sm font-semibold text-content">
                    {selectedWebhookAuditEntry.entityLabel} ·{" "}
                    {formatWebhookEventType(selectedWebhookAuditEntry.metadata)} ·{" "}
                    {selectedWebhookAuditEntry.entityId}
                  </h4>
                </div>
                <button
                  className="rounded-ui-control border border-divider bg-surface-muted px-3 py-1.5 text-xs font-semibold text-content transition hover:border-brand-primary"
                  onClick={() => setSelectedWebhookEventId(null)}
                  type="button"
                >
                  Ayrıntıyı Kapat
                </button>
              </div>
              <dl className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <InfoRow
                  label="Sağlayıcı referansı"
                  value={getAuditMetadataValue(selectedWebhookAuditEntry.metadata, "providerRef")}
                />
                <InfoRow
                  label="Sağlayıcı durumu"
                  value={formatEFaturaWebhookAuditProviderStatus(selectedWebhookAuditEntry.metadata)}
                />
                <InfoRow
                  label="Tekrar deneme"
                  value={formatEFaturaWebhookRetryHint(selectedWebhookAuditEntry.metadata)}
                />
                <InfoRow label="Olay ID" value={selectedWebhookAuditEntry.entityId} />
                <InfoRow label="Kayıt zamanı" value={formatDateTime(selectedWebhookAuditEntry.occurredAt)} />
              </dl>
              <dl className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <InfoRow label="Olay türü" value={formatEFaturaWebhookAuditTypeLabel(selectedWebhookAuditEntry.metadata)} />
                <InfoRow label="Kullanıcı" value={selectedWebhookAuditEntry.actorUserId} />
                <InfoRow label="Firma" value={selectedWebhookAuditEntry.companyId} />
                <InfoRow label="Dönem" value={selectedWebhookAuditEntry.periodId} />
              </dl>
            </div>
          ) : null}
        </section>
      </section>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatWebhookEventType(metadata: Record<string, unknown>) {
  const eventType = getAuditMetadataValue(metadata, "type");
  return formatEFaturaWebhookEventTypeLabel(eventType);
}

function getWebhookLocalDateKey(value: string) {
  return new Date(value).toLocaleDateString("en-CA");
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-ui-control border border-divider bg-surface-muted px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
        {label}
      </dt>
      <dd className="mt-1 font-medium text-content">{value}</dd>
    </div>
  );
}
