import type { ExpenseRow } from "./expense-service";
import type { ProgressPaymentRow } from "./progress-payment-service";
import type { PurchaseInvoiceRow } from "./purchase-invoice-service";
import type { SalesInvoiceRow } from "./sales-invoice-service";

export type SiteFinanceSummaryRow = {
  siteCode: string;
  siteName: string;
  incomeTotal: number;
  expenseTotal: number;
  purchaseTotal: number;
  subcontractorTotal: number;
  netTotal: number;
};

export function buildSiteFinanceSummary(input: {
  expenses: ExpenseRow[];
  progressPayments: ProgressPaymentRow[];
  purchaseInvoices: PurchaseInvoiceRow[];
  salesInvoices?: SalesInvoiceRow[];
}): SiteFinanceSummaryRow[] {
  const rows = new Map<string, SiteFinanceSummaryRow>();
  const ensure = (siteCode: string, siteName: string) => {
    const key = siteCode.trim();
    const current = rows.get(key) ?? { siteCode: key, siteName: siteName.trim(), incomeTotal: 0, expenseTotal: 0, purchaseTotal: 0, subcontractorTotal: 0, netTotal: 0 };
    rows.set(key, current);
    return current;
  };
  for (const row of input.expenses.filter((item) => item.status !== "İptal")) ensure(row.siteCode, row.siteName).expenseTotal += row.grandTotal;
  for (const row of input.purchaseInvoices.filter((item) => item.status !== "İptal")) ensure(row.siteCode, row.siteName).purchaseTotal += row.grandTotal;
  for (const row of (input.salesInvoices ?? []).filter((item) => item.status !== "İptal")) ensure(row.siteCode, row.siteName).incomeTotal += row.grandTotal;
  for (const row of input.progressPayments.filter((item) => item.status !== "İptal")) {
    const summary = ensure(row.siteCode, row.siteName);
    if (row.paymentType === "Şantiye Geliri") summary.incomeTotal += row.grandTotal;
    else summary.subcontractorTotal += row.grandTotal;
  }
  for (const row of rows.values()) row.netTotal = row.incomeTotal - row.expenseTotal - row.purchaseTotal - row.subcontractorTotal;
  return [...rows.values()].sort((left, right) => left.siteCode.localeCompare(right.siteCode, "tr"));
}
