import type { ExpenseRow } from "./expense-service";
import type { PayrollAccrualRow } from "./payroll-accrual-service";
import type { ProgressPaymentRow } from "./progress-payment-service";
import type { PurchaseInvoiceRow } from "./purchase-invoice-service";
import { buildOperationalSiteProfitRows } from "./reports-service";
import type { SalesInvoiceRow } from "./sales-invoice-service";
import type { TimesheetRow } from "./timesheet-service";

export type SiteFinanceSummaryRow = {
  siteCode: string;
  siteName: string;
  incomeTotal: number;
  laborTotal: number;
  expenseTotal: number;
  purchaseTotal: number;
  subcontractorTotal: number;
  netTotal: number;
};

export function buildSiteFinanceSummary(input: {
  expenses: ExpenseRow[];
  payrollAccruals?: PayrollAccrualRow[];
  progressPayments: ProgressPaymentRow[];
  purchaseInvoices: PurchaseInvoiceRow[];
  salesInvoices?: SalesInvoiceRow[];
  timesheets?: TimesheetRow[];
}): SiteFinanceSummaryRow[] {
  return buildOperationalSiteProfitRows({
    expenses: input.expenses.filter((row) => row.status === "Kaydedildi"),
    payrollAccruals: (input.payrollAccruals ?? []).filter(
      (row) => row.status === "Kaydedildi",
    ),
    progressPayments: input.progressPayments.filter(
      (row) => row.status === "Kaydedildi",
    ),
    purchaseInvoices: input.purchaseInvoices.filter(
      (row) => row.status === "Kaydedildi",
    ),
    salesInvoices: (input.salesInvoices ?? []).filter(
      (row) => row.status === "Kaydedildi",
    ),
    timesheets: (input.timesheets ?? []).filter(
      (row) => row.status === "Kaydedildi",
    ),
  })
    .map((row) => ({
      expenseTotal: row.expenseCostTotal,
      incomeTotal: row.incomeTotal,
      laborTotal: row.laborCostTotal,
      netTotal: row.netProfit,
      purchaseTotal: row.purchaseCostTotal,
      siteCode: row.siteCode,
      siteName: row.siteName,
      subcontractorTotal: row.progressPaymentCostTotal,
    }))
    .sort((left, right) => left.siteCode.localeCompare(right.siteCode, "tr"));
}
