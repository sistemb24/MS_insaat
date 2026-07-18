"use client";

import { useState } from "react";

import {
  PurchaseInvoiceSurface,
  type PurchaseInvoiceSurfaceProps,
} from "@/components/purchase-invoice-surface";
import { DeliveryNoteSurface } from "@/components/delivery-note-surface";
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
  const [activeTab, setActiveTab] = useState<"delivery" | "purchase" | "sales">("purchase");

  return (
    <div className="grid gap-4">
      <nav
        aria-label="Fatura türleri"
        className="mx-auto flex w-full max-w-7xl gap-2 rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-2"
      >
        <InvoiceTab
          active={activeTab === "purchase"}
          label={`Alış Faturaları (${purchase.rows.length})`}
          onClick={() => setActiveTab("purchase")}
        />
        <InvoiceTab
          active={activeTab === "sales"}
          label={`Satış Faturaları (${sales.rows.length})`}
          onClick={() => setActiveTab("sales")}
        />
        <InvoiceTab
          active={activeTab === "delivery"}
          label={`Alış İrsaliyeleri (${deliveryNotes.rows.length})`}
          onClick={() => setActiveTab("delivery")}
        />
      </nav>
      {activeTab === "purchase" ? (
        <PurchaseInvoiceSurface key="purchase" {...purchase} variant="purchase" />
      ) : activeTab === "sales" ? (
        <PurchaseInvoiceSurface key="sales" {...sales} variant="sales" />
      ) : (
        <DeliveryNoteSurface {...deliveryNotes} />
      )}
    </div>
  );
}

function InvoiceTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`rounded-[var(--radius-control)] px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-[var(--primary)] text-white"
          : "bg-[var(--surface-container-low)] hover:bg-[var(--primary-fixed)]"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
