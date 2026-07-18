/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  test("resets invoice surface state when switching from purchase to sales", () => {
    render(
      <InvoiceManagementSurface
        deliveryNotes={{ rows: [] } as never}
        purchase={{ rows: [purchaseInvoice] }}
        sales={{ rows: [salesInvoice] }}
      />,
    );

    expect(screen.getByText("AF-TEST-001")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Satış Faturaları (1)" }));

    expect(screen.queryByText("AF-TEST-001")).toBeNull();
    expect(screen.getByText("SF-TEST-001")).toBeTruthy();
    expect(screen.getByText("TEST MÜŞTERİ")).toBeTruthy();
  });
});
