"use client";

import { useState } from "react";

import {
  PurchaseInvoiceSurface,
  type PurchaseInvoiceSurfaceProps,
} from "@/components/purchase-invoice-surface";
import { DeliveryNoteSurface } from "@/components/delivery-note-surface";
import { Icon, type IconName } from "@/components/ui";
import type { ComponentProps } from "react";

export function InvoiceManagementSurface({
  purchase,
  sales,
  deliveryNotes,
}: {
  purchase: PurchaseInvoiceSurfaceProps;
  sales: PurchaseInvoiceSurfaceProps;
  deliveryNotes: ComponentProps<typeof DeliveryNoteSurface>;
}) {
  const [activeTab, setActiveTab] = useState<"delivery" | "purchase" | "sales">(
    sales.highlightedRecordId &&
      sales.rows.some((row) => row.id === sales.highlightedRecordId)
      ? "sales"
      : "purchase",
  );
  const purchaseTotal = getInvoiceTotal(purchase.rows);
  const salesTotal = getInvoiceTotal(sales.rows);
  const draftCount = [...purchase.rows, ...sales.rows].filter(
    (row) => row.status === "Taslak",
  ).length + deliveryNotes.rows.filter((row) => row.status === "Taslak").length;
  const postedDeliveryNotes = deliveryNotes.rows.filter(
    (row) => row.status === "Kaydedildi",
  );
  const receivedQuantity = postedDeliveryNotes.reduce(
    (total, row) => total + row.totalQuantity,
    0,
  );

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <nav aria-label="İçerik yolu" className="text-xs font-semibold text-content-muted">
            Finans / Faturalar ve İrsaliyeler
          </nav>
          <h1 className="mt-2 text-3xl font-bold leading-[2.375rem] tracking-[-0.02em] text-content">
            Faturalar ve İrsaliyeler
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-content-subtle">
            Alış ve satış faturalarını, ödeme/tahsilat bağlantılarını ve stok girişine dönüşen alış irsaliyelerini tek çalışma alanında yönetin.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-xs font-semibold text-content-subtle shadow-sm">
          <Icon name="receipt" size={18} />
          {purchase.rows.length + sales.rows.length + deliveryNotes.rows.length} toplam belge
        </div>
      </header>

      <div aria-label="Fatura ve irsaliye özet metrikleri" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DocumentSummaryCard icon="wallet" label="Alış Hacmi" tone="warning" value={formatMoney(purchaseTotal)} />
        <DocumentSummaryCard icon="chart" label="Satış Hacmi" tone="success" value={formatMoney(salesTotal)} />
        <DocumentSummaryCard detail="İşlem bekleyen belge" icon="file" label="Taslak Belge" value={String(draftCount)} />
        <DocumentSummaryCard detail={`${postedDeliveryNotes.length} kesinleşen irsaliye`} icon="box" label="Depoya Giren" tone="brand" value={formatQuantity(receivedQuantity)} />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav
          aria-label="Fatura türleri"
          className="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-[calc(var(--ds-app-header-height)+1rem)] lg:flex-col lg:overflow-visible lg:pb-0"
          role="tablist"
        >
          <InvoiceTab
            active={activeTab === "purchase"}
            icon="receipt"
            label={`Alış Faturaları (${purchase.rows.length})`}
            onClick={() => setActiveTab("purchase")}
          />
          <InvoiceTab
            active={activeTab === "sales"}
            icon="chart"
            label={`Satış Faturaları (${sales.rows.length})`}
            onClick={() => setActiveTab("sales")}
          />
          <InvoiceTab
            active={activeTab === "delivery"}
            icon="box"
            label={`Alış İrsaliyeleri (${deliveryNotes.rows.length})`}
            onClick={() => setActiveTab("delivery")}
          />
        </nav>
        <div className="min-w-0" role="tabpanel">
          {activeTab === "purchase" ? (
            <PurchaseInvoiceSurface embedded key="purchase" {...purchase} variant="purchase" />
          ) : activeTab === "sales" ? (
            <PurchaseInvoiceSurface embedded key="sales" {...sales} variant="sales" />
          ) : (
            <DeliveryNoteSurface embedded {...deliveryNotes} />
          )}
        </div>
      </div>
    </section>
  );
}

function InvoiceTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: IconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={`inline-flex min-h-12 shrink-0 items-center gap-3 rounded-ui-control border-l-4 px-4 py-3 text-left text-sm font-semibold transition-colors lg:w-full ${
        active
          ? "border-brand-primary bg-brand-primary-subtle text-brand-primary shadow-sm"
          : "border-transparent bg-surface-raised text-content-subtle hover:bg-surface-muted hover:text-content"
      }`}
      onClick={onClick}
      role="tab"
      type="button"
    >
      <Icon name={icon} size={18} />
      {label}
    </button>
  );
}

function DocumentSummaryCard({
  detail,
  icon,
  label,
  tone = "brand",
  value,
}: {
  detail?: string;
  icon: IconName;
  label: string;
  tone?: "brand" | "success" | "warning";
  value: string;
}) {
  const toneClasses = {
    brand: "bg-brand-primary-subtle text-brand-primary",
    success: "bg-success-subtle text-success",
    warning: "bg-warning-subtle text-warning",
  }[tone];

  return (
    <article className="relative overflow-hidden rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-content-muted">{label}</p>
          <p className="mt-4 font-mono text-xl font-bold tabular-nums text-content">{value}</p>
          {detail ? <p className="mt-1 text-xs text-content-subtle">{detail}</p> : null}
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-ui-control ${toneClasses}`}>
          <Icon name={icon} size={19} />
        </span>
      </div>
    </article>
  );
}

function getInvoiceTotal(rows: PurchaseInvoiceSurfaceProps["rows"]) {
  return rows
    .filter((row) => row.status !== "İptal")
    .reduce((total, row) => total + row.grandTotal, 0);
}

function formatMoney(value: number) {
  return `${value.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`;
}

function formatQuantity(value: number) {
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 4 });
}
