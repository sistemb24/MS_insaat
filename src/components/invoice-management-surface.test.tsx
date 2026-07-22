/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { InvoiceManagementSurface } from "./invoice-management-surface";
import type { PurchaseInvoiceRow } from "@/lib/purchase-invoice-service";

afterEach(cleanup);

const purchaseInvoice: PurchaseInvoiceRow = {
  id: "purchase-1",
  tenantId: "tenant-noa-demo",
  companyId: "company-demo-insaat",
  periodId: "period-2026",
  documentNo: "AF-TEST-001",
  invoiceDate: "2026-07-14",
  dueDate: "2026-08-13",
  counterpartyCode: "TED-TEST",
  counterpartyName: "TEST TEDARİKÇİ",
  siteCode: "SANT-TEST",
  siteName: "TEST ŞANTİYE",
  currency: "TL",
  exchangeRate: 1,
  movementGroup: "",
  isOfficial: false,
  description: "",
  lines: [],
  status: "Kaydedildi",
  createdBy: "user-main",
  updatedBy: "user-main",
  createdAt: "2026-07-14T10:00:00.000Z",
  updatedAt: "2026-07-14T10:00:00.000Z",
  subtotal: 100,
  discountTotal: 0,
  netTotal: 100,
  vatTotal: 20,
  withholdingTotal: 0,
  grandTotal: 120,
  lineCount: 0,
};

const salesInvoice: PurchaseInvoiceRow = {
  ...purchaseInvoice,
  id: "sales-1",
  documentNo: "SF-TEST-001",
  counterpartyCode: "MUS-TEST",
  counterpartyName: "TEST MÜŞTERİ",
};

describe("InvoiceManagementSurface", () => {
  test("composes the template overview from real invoice and delivery rows", () => {
    render(
      <InvoiceManagementSurface
        deliveryNotes={{
          rows: [
            { status: "Kaydedildi", totalQuantity: 12 },
            { status: "Taslak", totalQuantity: 4 },
          ],
        } as never}
        purchase={{ rows: [purchaseInvoice] }}
        sales={{ rows: [{ ...salesInvoice, status: "Taslak" }] }}
      />,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Faturalar ve İrsaliyeler" }),
    ).toBeDefined();

    const metrics = screen.getByLabelText("Fatura ve irsaliye özet metrikleri");
    expect(within(metrics).getByText("Alış Hacmi")).toBeDefined();
    expect(within(metrics).getByText("Satış Hacmi")).toBeDefined();
    expect(within(metrics).getByText("Taslak Belge")).toBeDefined();
    expect(within(metrics).getByText("Depoya Giren")).toBeDefined();
    expect(within(metrics).getAllByText("120,00 TL")).toHaveLength(2);
    expect(within(metrics).getByText("2")).toBeDefined();
    expect(within(metrics).getByText("12")).toBeDefined();

    const tabs = screen.getByRole("tablist", { name: "Fatura türleri" });
    expect(within(tabs).getAllByRole("tab")).toHaveLength(3);
    expect(
      within(tabs).getByRole("tab", { name: "Alış Faturaları (1)" }).getAttribute(
        "aria-selected",
      ),
    ).toBe("true");
  });

  test("resets invoice surface state when switching from purchase to sales", () => {
    render(
      <InvoiceManagementSurface
        deliveryNotes={{ rows: [] } as never}
        purchase={{ rows: [purchaseInvoice] }}
        sales={{ rows: [salesInvoice] }}
      />,
    );

    expect(screen.getByText("AF-TEST-001")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Satış Faturaları (1)" }));

    expect(screen.queryByText("AF-TEST-001")).toBeNull();
    expect(screen.getByText("SF-TEST-001")).toBeTruthy();
    expect(screen.getByText("TEST MÜŞTERİ")).toBeTruthy();
  });
});
