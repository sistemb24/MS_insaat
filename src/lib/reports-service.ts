import type { CashBankMovementRow } from "./cash-bank-movement-service";
import type { ChequeRow } from "./cheque-service";
import type { ExpenseRow } from "./expense-service";
import type { DeliveryNoteRow } from "./delivery-note-service";
import { createPartyKey, type PartyKind } from "./party-read-model";
import type { PayrollAccrualRow } from "./payroll-accrual-service";
import type { ProgressPaymentRow } from "./progress-payment-service";
import type { PurchaseInvoiceRow } from "./purchase-invoice-service";
import type { SalesInvoiceRow } from "./sales-invoice-service";
import { getP0BaseCurrencyTransactionValue } from "./settings-contract";
import type { TimesheetRow } from "./timesheet-service";

export type OperationalReportActivityRow = {
  amount: number;
  date: string;
  id: string;
  documentNo: string;
  label: string;
  source:
    | "Fatura"
    | "İrsaliye"
    | "Gider"
    | "Kasa/Banka"
    | "Çek"
    | "Hakediş"
    | "Puantaj"
    | "Maaş";
};

export type OperationalReportSourceFilter =
  | "all"
  | OperationalReportActivityRow["source"];

export type OperationalReportFilters = {
  endDate?: string;
  source?: OperationalReportSourceFilter;
  startDate?: string;
};

export type OperationalReportSummary = {
  activityRows: OperationalReportActivityRow[];
  cashIncomingTotal: number;
  cashNetTotal: number;
  cashOutgoingTotal: number;
  counterpartyStatementDetailRows: OperationalReportCounterpartyStatementDetailRow[];
  counterpartyStatementRows: OperationalReportCounterpartyStatementRow[];
  currency: ReturnType<typeof getP0BaseCurrencyTransactionValue>;
  expenseTotal: number;
  overdueChequeTotal: number;
  payrollAccrualNetTotal: number;
  payrollPaidTotal: number;
  payrollPaymentWaitingTotal: number;
  progressPaymentPaidTotal: number;
  progressPaymentPaymentWaitingTotal: number;
  progressPaymentCollectedTotal: number;
  progressPaymentCollectionWaitingTotal: number;
  portfolioChequeTotal: number;
  progressPaymentTotal: number;
  purchaseInvoiceDebt: number;
  purchaseInvoicePaidTotal: number;
  purchaseInvoicePaymentWaitingTotal: number;
  siteProfitRows: OperationalReportSiteProfitRow[];
  timesheetNetTotal: number;
};

export type OperationalReportCounterpartyStatementRow = {
  cashPaidTotal: number;
  cashReceivedTotal: number;
  counterpartyName: string;
  netBalance: number;
  payableTotal: number;
  receivableTotal: number;
};

export type OperationalReportCounterpartyStatementDetailRow = {
  amount: number;
  balanceAfter: number;
  counterpartyCode?: string;
  counterpartyKind?: PartyKind;
  counterpartyName: string;
  date: string;
  documentNo: string;
  effect: "Alacak" | "Borç" | "Ödeme" | "Tahsilat";
  ledgerDocumentNo?: string;
  partyKey?: string;
  source: "Fatura" | "Gider" | "Hakediş" | "Kasa/Banka" | "Maaş";
  targetHref: string;
};

export type OperationalReportSiteProfitRow = {
  expenseCostTotal: number;
  incomeTotal: number;
  laborCostTotal: number;
  netProfit: number;
  progressPaymentCostTotal: number;
  purchaseCostTotal: number;
  siteCode: string;
  siteName: string;
  totalCost: number;
};

export type OperationalReportInput = {
  cashBankMovements: CashBankMovementRow[];
  cheques: ChequeRow[];
  expenses?: ExpenseRow[];
  deliveryNotes?: DeliveryNoteRow[];
  filters?: OperationalReportFilters;
  payrollAccruals: PayrollAccrualRow[];
  progressPayments: ProgressPaymentRow[];
  purchaseInvoices: PurchaseInvoiceRow[];
  salesInvoices?: SalesInvoiceRow[];
  timesheets: TimesheetRow[];
  today: string;
};

export function summarizeOperationalReports({
  cashBankMovements,
  cheques,
  expenses = [],
  deliveryNotes = [],
  filters = {},
  payrollAccruals,
  progressPayments,
  purchaseInvoices,
  salesInvoices = [],
  timesheets,
  today,
}: OperationalReportInput): OperationalReportSummary {
  const postedInvoices = purchaseInvoices.filter(
    (invoice) =>
      invoice.status === "Kaydedildi" &&
      matchesReportFilter("Fatura", invoice.invoiceDate, filters),
  );
  const postedSalesInvoices = salesInvoices.filter(
    (invoice) =>
      invoice.status === "Kaydedildi" &&
      matchesReportFilter("Fatura", invoice.invoiceDate, filters),
  );
  const postedExpenses = expenses.filter(
    (expense) =>
      expense.status === "Kaydedildi" &&
      matchesReportFilter("Gider", expense.expenseDate, filters),
  );
  const postedDeliveryNotes = deliveryNotes.filter(
    (note) =>
      note.status === "Kaydedildi" &&
      matchesReportFilter("İrsaliye", note.deliveryDate, filters),
  );
  const portfolioCheques = cheques.filter(
    (cheque) =>
      cheque.status === "Portföyde" &&
      matchesReportFilter("Çek", cheque.dueDate, filters),
  );
  const filteredCashBankMovements = cashBankMovements.filter((movement) =>
    matchesReportFilter("Kasa/Banka", movement.movementDate, filters),
  );
  const postedProgressPayments = progressPayments.filter(
    (progressPayment) =>
      progressPayment.status === "Kaydedildi" &&
      matchesReportFilter("Hakediş", progressPayment.issueDate, filters),
  );
  const postedTimesheets = timesheets.filter(
    (timesheet) =>
      timesheet.status === "Kaydedildi" &&
      matchesReportFilter("Puantaj", timesheetReportDate(timesheet), filters),
  );
  const postedPayrollAccruals = payrollAccruals.filter(
    (payrollAccrual) =>
      payrollAccrual.status === "Kaydedildi" &&
      matchesReportFilter(
        "Maaş",
        payrollAccrualReportDate(payrollAccrual),
        filters,
      ),
  );
  const cashIncomingTotal = sumBy(
    filteredCashBankMovements.filter(
      (movement) => movement.direction === "Giriş",
    ),
    (movement) => movement.amount,
  );
  const cashOutgoingTotal = sumBy(
    filteredCashBankMovements.filter(
      (movement) => movement.direction === "Çıkış",
    ),
    (movement) => movement.amount,
  );
  const purchaseInvoicePaymentMovements = cashBankMovements.filter(
    isPurchaseInvoicePaymentMovement,
  );
  const paidPurchaseInvoices = postedInvoices.filter((invoice) =>
    purchaseInvoicePaymentMovements.some(
      (movement) => movement.sourceId === invoice.id,
    ),
  );
  const paymentWaitingPurchaseInvoices = postedInvoices.filter(
    (invoice) =>
      !purchaseInvoicePaymentMovements.some(
        (movement) => movement.sourceId === invoice.id,
      ),
  );
  const payrollPaymentMovements = cashBankMovements.filter(
    isPayrollPaymentMovement,
  );
  const paidPayrollAccruals = postedPayrollAccruals.filter((payrollAccrual) =>
    payrollPaymentMovements.some(
      (movement) => movement.sourceId === payrollAccrual.id,
    ),
  );
  const paymentWaitingPayrollAccruals = postedPayrollAccruals.filter(
    (payrollAccrual) =>
      !payrollPaymentMovements.some(
        (movement) => movement.sourceId === payrollAccrual.id,
      ),
  );
  const progressPaymentPaymentMovements = cashBankMovements.filter(
    isProgressPaymentPaymentMovement,
  );
  const progressPaymentCollectionMovements = cashBankMovements.filter(
    isProgressPaymentCollectionMovement,
  );
  const payableProgressPayments = postedProgressPayments.filter(
    (progressPayment) => progressPayment.paymentType !== "Şantiye Geliri",
  );
  const incomeProgressPayments = postedProgressPayments.filter(
    (progressPayment) => progressPayment.paymentType === "Şantiye Geliri",
  );
  const paidProgressPayments = payableProgressPayments.filter((progressPayment) =>
    progressPaymentPaymentMovements.some(
      (movement) => movement.sourceId === progressPayment.id,
    ),
  );
  const paymentWaitingProgressPayments = payableProgressPayments.filter(
    (progressPayment) =>
      !progressPaymentPaymentMovements.some(
        (movement) => movement.sourceId === progressPayment.id,
      ),
  );
  const collectedProgressPayments = incomeProgressPayments.filter(
    (progressPayment) =>
      progressPaymentCollectionMovements.some(
        (movement) => movement.sourceId === progressPayment.id,
      ),
  );
  const collectionWaitingProgressPayments = incomeProgressPayments.filter(
    (progressPayment) =>
      !progressPaymentCollectionMovements.some(
        (movement) => movement.sourceId === progressPayment.id,
      ),
  );

  return {
    activityRows: buildActivityRows({
      cashBankMovements: filteredCashBankMovements,
      cheques: portfolioCheques,
      expenses: postedExpenses,
      deliveryNotes: postedDeliveryNotes,
      payrollAccruals: postedPayrollAccruals,
      progressPayments: postedProgressPayments,
      purchaseInvoices: postedInvoices,
      salesInvoices: postedSalesInvoices,
      timesheets: postedTimesheets,
    }),
    cashIncomingTotal,
    cashNetTotal: roundMoney(cashIncomingTotal - cashOutgoingTotal),
    cashOutgoingTotal,
    counterpartyStatementDetailRows: buildCounterpartyStatementDetailRows({
      cashBankMovements: filteredCashBankMovements,
      expenses: postedExpenses,
      payrollAccruals: postedPayrollAccruals,
      progressPayments: postedProgressPayments,
      purchaseInvoices: postedInvoices,
      salesInvoices: postedSalesInvoices,
    }),
    counterpartyStatementRows: buildCounterpartyStatementRows({
      cashBankMovements: filteredCashBankMovements,
      expenses: postedExpenses,
      payrollAccruals: postedPayrollAccruals,
      progressPayments: postedProgressPayments,
      purchaseInvoices: postedInvoices,
      salesInvoices: postedSalesInvoices,
    }),
    currency: getP0BaseCurrencyTransactionValue(),
    expenseTotal: sumBy(postedExpenses, (expense) => expense.grandTotal),
    overdueChequeTotal: sumBy(
      portfolioCheques.filter((cheque) => cheque.dueDate < today),
      (cheque) => cheque.amount,
    ),
    payrollAccrualNetTotal: sumBy(
      postedPayrollAccruals,
      (payrollAccrual) => payrollAccrual.netTotal,
    ),
    payrollPaidTotal: sumBy(
      paidPayrollAccruals,
      (payrollAccrual) => payrollAccrual.netTotal,
    ),
    payrollPaymentWaitingTotal: sumBy(
      paymentWaitingPayrollAccruals,
      (payrollAccrual) => payrollAccrual.netTotal,
    ),
    progressPaymentPaidTotal: sumBy(
      paidProgressPayments,
      (progressPayment) => progressPayment.grandTotal,
    ),
    progressPaymentPaymentWaitingTotal: sumBy(
      paymentWaitingProgressPayments,
      (progressPayment) => progressPayment.grandTotal,
    ),
    progressPaymentCollectedTotal: sumBy(
      collectedProgressPayments,
      (progressPayment) => progressPayment.grandTotal,
    ),
    progressPaymentCollectionWaitingTotal: sumBy(
      collectionWaitingProgressPayments,
      (progressPayment) => progressPayment.grandTotal,
    ),
    portfolioChequeTotal: sumBy(portfolioCheques, (cheque) => cheque.amount),
    progressPaymentTotal: sumBy(
      postedProgressPayments,
      (progressPayment) => progressPayment.grandTotal,
    ),
    purchaseInvoiceDebt: sumBy(
      paymentWaitingPurchaseInvoices,
      (invoice) => invoice.grandTotal,
    ),
    purchaseInvoicePaidTotal: sumBy(
      paidPurchaseInvoices,
      (invoice) => invoice.grandTotal,
    ),
    purchaseInvoicePaymentWaitingTotal: sumBy(
      paymentWaitingPurchaseInvoices,
      (invoice) => invoice.grandTotal,
    ),
    siteProfitRows: buildOperationalSiteProfitRows({
      expenses: postedExpenses,
      payrollAccruals: postedPayrollAccruals,
      progressPayments: postedProgressPayments,
      purchaseInvoices: postedInvoices,
      salesInvoices: postedSalesInvoices,
      timesheets: postedTimesheets,
    }),
    timesheetNetTotal: sumBy(postedTimesheets, (timesheet) => timesheet.netTotal),
  };
}

function isPurchaseInvoicePaymentMovement(movement: CashBankMovementRow) {
  return (
    movement.sourceType === "purchase-invoice" &&
    movement.movementType === "Fatura Ödemesi"
  );
}

function isPayrollPaymentMovement(movement: CashBankMovementRow) {
  return (
    movement.sourceType === "payroll-accrual" &&
    movement.movementType === "Maaş Ödemesi"
  );
}

function isProgressPaymentPaymentMovement(movement: CashBankMovementRow) {
  return (
    movement.sourceType === "progress-payment" &&
    movement.movementType === "Hakediş Ödemesi"
  );
}

function isProgressPaymentCollectionMovement(movement: CashBankMovementRow) {
  return (
    movement.sourceType === "progress-payment" &&
    movement.movementType === "Hakediş Tahsilatı"
  );
}

function matchesReportFilter(
  source: OperationalReportActivityRow["source"],
  date: string,
  filters: OperationalReportFilters,
) {
  if (filters.source && filters.source !== "all" && filters.source !== source) {
    return false;
  }

  if (filters.startDate && date < filters.startDate) {
    return false;
  }

  if (filters.endDate && date > filters.endDate) {
    return false;
  }

  return true;
}

function buildActivityRows({
  cashBankMovements,
  cheques,
  deliveryNotes = [],
  expenses = [],
  payrollAccruals,
  progressPayments,
  purchaseInvoices,
  salesInvoices = [],
  timesheets,
}: Pick<
  OperationalReportInput,
  | "cashBankMovements"
  | "cheques"
  | "deliveryNotes"
  | "expenses"
  | "payrollAccruals"
  | "progressPayments"
  | "purchaseInvoices"
  | "salesInvoices"
  | "timesheets"
>): OperationalReportActivityRow[] {
  return dedupeActivityRowIds([
    ...deliveryNotes.map((note) => ({
      amount: note.totalQuantity,
      date: note.deliveryDate,
      documentNo: note.documentNo,
      id: `delivery-note:${note.id}`,
      label: `${note.supplierName} · ${note.siteName}`,
      source: "İrsaliye" as const,
    })),
    ...purchaseInvoices.map((invoice) => ({
      amount: invoice.grandTotal,
      date: invoice.invoiceDate,
      documentNo: invoice.documentNo,
      id: `purchase-invoice:${invoice.id}`,
      label: invoice.counterpartyName,
      source: "Fatura" as const,
    })),
    ...salesInvoices.map((invoice) => ({
      amount: invoice.grandTotal,
      date: invoice.invoiceDate,
      documentNo: invoice.documentNo,
      id: `sales-invoice:${invoice.id}`,
      label: invoice.counterpartyName,
      source: "Fatura" as const,
    })),
    ...expenses.map((expense) => ({
      amount: expense.grandTotal,
      date: expense.expenseDate,
      documentNo: expense.documentNo,
      id: `expense:${expense.id}`,
      label: expense.counterpartyName,
      source: "Gider" as const,
    })),
    ...cashBankMovements.map((movement) => ({
      amount:
        movement.direction === "Giriş" ? movement.amount : -movement.amount,
      date: movement.movementDate,
      documentNo: movement.documentNo,
      id: `cash-bank-movement:${movement.id}`,
      label: movement.counterpartyName,
      source: "Kasa/Banka" as const,
    })),
    ...cheques.map((cheque) => ({
      amount: cheque.amount,
      date: cheque.dueDate,
      documentNo: cheque.documentNo,
      id: `cheque:${cheque.id}`,
      label: cheque.drawerName,
      source: "Çek" as const,
    })),
    ...progressPayments.map((progressPayment) => ({
      amount: progressPayment.grandTotal,
      date: progressPayment.issueDate,
      documentNo: progressPayment.documentNo,
      id: `progress-payment:${progressPayment.id}`,
      label: progressPayment.counterpartyName,
      source: "Hakediş" as const,
    })),
    ...timesheets.map((timesheet) => ({
      amount: timesheet.netTotal,
      date: timesheetReportDate(timesheet),
      documentNo: timesheet.documentNo,
      id: `timesheet:${timesheet.id}`,
      label: timesheet.siteName,
      source: "Puantaj" as const,
    })),
    ...payrollAccruals.map((payrollAccrual) => ({
      amount: payrollAccrual.netTotal,
      date: payrollAccrualReportDate(payrollAccrual),
      documentNo: payrollAccrual.documentNo,
      id: `payroll-accrual:${payrollAccrual.id}`,
      label: payrollAccrual.siteName,
      source: "Maaş" as const,
    })),
  ])
    .sort((first, second) => second.date.localeCompare(first.date))
    .slice(0, 8);
}

function dedupeActivityRowIds(
  rows: OperationalReportActivityRow[],
): OperationalReportActivityRow[] {
  const occurrences = new Map<string, number>();

  return rows.map((row) => {
    const occurrence = (occurrences.get(row.id) ?? 0) + 1;
    occurrences.set(row.id, occurrence);

    if (occurrence === 1) {
      return row;
    }

    return {
      ...row,
      id: `${row.id}#${occurrence}`,
    };
  });
}

export function buildOperationalSiteProfitRows({
  expenses = [],
  payrollAccruals,
  progressPayments,
  purchaseInvoices,
  salesInvoices = [],
  timesheets,
}: Pick<
  OperationalReportInput,
  | "expenses"
  | "payrollAccruals"
  | "progressPayments"
  | "purchaseInvoices"
  | "salesInvoices"
  | "timesheets"
>): OperationalReportSiteProfitRow[] {
  const rows = new Map<string, OperationalReportSiteProfitRow>();
  const payrollSourceTimesheetIds = new Set(
    payrollAccruals
      .map((payrollAccrual) => payrollAccrual.sourceTimesheetId)
      .filter((id): id is string => Boolean(id)),
  );

  function getRow(siteCode: string, siteName: string) {
    const key = siteCode || siteName;
    const existing = rows.get(key);

    if (existing) {
      return existing;
    }

    const row: OperationalReportSiteProfitRow = {
      expenseCostTotal: 0,
      incomeTotal: 0,
      laborCostTotal: 0,
      netProfit: 0,
      progressPaymentCostTotal: 0,
      purchaseCostTotal: 0,
      siteCode,
      siteName,
      totalCost: 0,
    };

    rows.set(key, row);

    return row;
  }

  for (const invoice of purchaseInvoices) {
    getRow(invoice.siteCode, invoice.siteName).purchaseCostTotal +=
      invoice.grandTotal;
  }

  for (const invoice of salesInvoices) {
    getRow(invoice.siteCode, invoice.siteName).incomeTotal += invoice.grandTotal;
  }

  for (const expense of expenses) {
    getRow(expense.siteCode, expense.siteName).expenseCostTotal +=
      expense.grandTotal;
  }

  for (const progressPayment of progressPayments) {
    const row = getRow(progressPayment.siteCode, progressPayment.siteName);

    if (progressPayment.paymentType === "Şantiye Geliri") {
      row.incomeTotal += progressPayment.grandTotal;
    } else {
      row.progressPaymentCostTotal += progressPayment.grandTotal;
    }
  }

  for (const payrollAccrual of payrollAccruals) {
    getRow(payrollAccrual.siteCode, payrollAccrual.siteName).laborCostTotal +=
      payrollAccrual.netTotal;
  }

  for (const timesheet of timesheets) {
    if (payrollSourceTimesheetIds.has(timesheet.id)) {
      continue;
    }

    getRow(timesheet.siteCode, timesheet.siteName).laborCostTotal +=
      timesheet.netTotal;
  }

  return Array.from(rows.values())
    .map((row) => {
      const totalCost = roundMoney(
        row.purchaseCostTotal +
          row.expenseCostTotal +
          row.progressPaymentCostTotal +
          row.laborCostTotal,
      );

      return {
        ...row,
        expenseCostTotal: roundMoney(row.expenseCostTotal),
        incomeTotal: roundMoney(row.incomeTotal),
        laborCostTotal: roundMoney(row.laborCostTotal),
        netProfit: roundMoney(row.incomeTotal - totalCost),
        progressPaymentCostTotal: roundMoney(row.progressPaymentCostTotal),
        purchaseCostTotal: roundMoney(row.purchaseCostTotal),
        totalCost,
      };
    })
    .filter((row) => row.incomeTotal > 0 || row.totalCost > 0)
    .sort((first, second) => first.siteName.localeCompare(second.siteName, "tr"));
}

function buildCounterpartyStatementRows({
  cashBankMovements,
  expenses = [],
  payrollAccruals,
  progressPayments,
  purchaseInvoices,
  salesInvoices = [],
}: Pick<
  OperationalReportInput,
  | "cashBankMovements"
  | "expenses"
  | "payrollAccruals"
  | "progressPayments"
  | "purchaseInvoices"
  | "salesInvoices"
>): OperationalReportCounterpartyStatementRow[] {
  const detailRows = buildCounterpartyStatementDetailRows({
    cashBankMovements,
    expenses,
    payrollAccruals,
    progressPayments,
    purchaseInvoices,
    salesInvoices,
  });
  const rows = new Map<string, OperationalReportCounterpartyStatementRow>();

  function getRow(counterpartyName: string, partyKey?: string) {
    const normalizedName = counterpartyName.trim();
    const key = partyKey ?? `legacy-name:${normalizedName || "Cari belirtilmemiş"}`;
    const existing = rows.get(key);

    if (existing) {
      return existing;
    }

    const row: OperationalReportCounterpartyStatementRow = {
      cashPaidTotal: 0,
      cashReceivedTotal: 0,
      counterpartyName: normalizedName || "Cari belirtilmemiş",
      netBalance: 0,
      payableTotal: 0,
      receivableTotal: 0,
    };

    rows.set(key, row);

    return row;
  }

  for (const detail of detailRows) {
    const row = getRow(detail.counterpartyName, detail.partyKey);

    if (detail.effect === "Alacak") row.receivableTotal += Math.abs(detail.amount);
    if (detail.effect === "Borç") row.payableTotal += Math.abs(detail.amount);
    if (detail.effect === "Ödeme") row.cashPaidTotal += Math.abs(detail.amount);
    if (detail.effect === "Tahsilat") row.cashReceivedTotal += Math.abs(detail.amount);
  }

  return Array.from(rows.values())
    .map((row) => {
      const cashPaidTotal = roundMoney(row.cashPaidTotal);
      const cashReceivedTotal = roundMoney(row.cashReceivedTotal);
      const payableTotal = roundMoney(row.payableTotal);
      const receivableTotal = roundMoney(row.receivableTotal);

      return {
        ...row,
        cashPaidTotal,
        cashReceivedTotal,
        netBalance: roundMoney(
          receivableTotal - payableTotal + cashPaidTotal - cashReceivedTotal,
        ),
        payableTotal,
        receivableTotal,
      };
    })
    .filter(
      (row) =>
        row.cashPaidTotal > 0 ||
        row.cashReceivedTotal > 0 ||
        row.payableTotal > 0 ||
        row.receivableTotal > 0,
    )
    .sort((first, second) =>
      first.counterpartyName.localeCompare(second.counterpartyName, "tr"),
    );
}

function buildCounterpartyStatementDetailRows({
  cashBankMovements,
  expenses = [],
  payrollAccruals,
  progressPayments,
  purchaseInvoices,
  salesInvoices = [],
}: Pick<
  OperationalReportInput,
  | "cashBankMovements"
  | "expenses"
  | "payrollAccruals"
  | "progressPayments"
  | "purchaseInvoices"
  | "salesInvoices"
>): OperationalReportCounterpartyStatementDetailRow[] {
  const purchaseInvoicesById = new Map(
    purchaseInvoices.map((invoice) => [invoice.id, invoice]),
  );
  const salesInvoicesById = new Map(
    salesInvoices.map((invoice) => [invoice.id, invoice]),
  );
  const progressPaymentsById = new Map(
    progressPayments.map((progressPayment) => [progressPayment.id, progressPayment]),
  );
  const payrollAccrualsById = new Map(
    payrollAccruals.map((payrollAccrual) => [payrollAccrual.id, payrollAccrual]),
  );
  const cashBankMovementsById = new Map(
    cashBankMovements.map((movement) => [movement.id, movement]),
  );
  const rows: OperationalReportCounterpartyStatementDetailRow[] = [
    ...purchaseInvoices.map((invoice) =>
      createCounterpartyStatementDetailRow({
        amount: -invoice.grandTotal,
        counterpartyCode: invoice.counterpartyCode,
        counterpartyKind: "supplier",
        counterpartyName: invoice.counterpartyName,
        date: invoice.invoiceDate,
        documentNo: invoice.documentNo,
        effect: "Borç",
        source: "Fatura",
      }),
    ),
    ...salesInvoices.map((invoice) =>
      createCounterpartyStatementDetailRow({
        amount: invoice.grandTotal,
        counterpartyCode: invoice.counterpartyCode,
        counterpartyKind: "customer",
        counterpartyName: invoice.counterpartyName,
        date: invoice.invoiceDate,
        documentNo: invoice.documentNo,
        effect: "Alacak",
        source: "Fatura",
      }),
    ),
    ...expenses.map((expense) =>
      createCounterpartyStatementDetailRow({
        amount: -expense.grandTotal,
        counterpartyName: expense.counterpartyName,
        date: expense.expenseDate,
        documentNo: expense.documentNo,
        effect: "Borç",
        source: "Gider",
      }),
    ),
    ...progressPayments.map((progressPayment) =>
      createCounterpartyStatementDetailRow({
        amount:
          progressPayment.paymentType === "Şantiye Geliri"
            ? progressPayment.grandTotal
            : -progressPayment.grandTotal,
        counterpartyCode: progressPayment.counterpartyCode,
        counterpartyKind: progressPaymentPartyKind(progressPayment.paymentType),
        counterpartyName: progressPayment.counterpartyName,
        date: progressPayment.issueDate,
        documentNo: progressPayment.documentNo,
        effect:
          progressPayment.paymentType === "Şantiye Geliri"
            ? "Alacak"
            : "Borç",
        source: "Hakediş",
      }),
    ),
    ...payrollAccruals.map((payrollAccrual) =>
      createCounterpartyStatementDetailRow({
        amount: -payrollAccrual.netTotal,
        ...(payrollAccrual.contractorCode
          ? {
              counterpartyCode: payrollAccrual.contractorCode,
              counterpartyKind: "subcontractor" as const,
            }
          : {}),
        counterpartyName: payrollAccrual.contractorName,
        date: payrollAccrualReportDate(payrollAccrual),
        documentNo: payrollAccrual.documentNo,
        effect: "Borç",
        source: "Maaş",
      }),
    ),
    ...cashBankMovements.map((movement) => {
      const partyReference = resolveCashBankMovementPartyReference({
        cashBankMovementsById,
        movement,
        payrollAccrualsById,
        progressPaymentsById,
        purchaseInvoicesById,
        salesInvoicesById,
      });

      return createCounterpartyStatementDetailRow({
        amount:
          movement.direction === "Çıkış" ? movement.amount : -movement.amount,
        ...partyReference,
        counterpartyName: movement.counterpartyName,
        date: movement.movementDate,
        documentNo: movement.documentNo,
        effect: movement.direction === "Çıkış" ? "Ödeme" : "Tahsilat",
        ledgerDocumentNo: movement.ledgerDocumentNo,
        source: "Kasa/Banka",
      });
    }),
  ].sort(compareCounterpartyStatementDetailRows);

  const balances = new Map<string, number>();

  return rows.map((row) => {
    const balanceKey = row.partyKey ?? `legacy-name:${row.counterpartyName}`;
    const previousBalance = balances.get(balanceKey) ?? 0;
    const balanceAfter = roundMoney(previousBalance + row.amount);

    balances.set(balanceKey, balanceAfter);

    return {
      ...row,
      balanceAfter,
    };
  });
}

function createCounterpartyStatementDetailRow(
  row: Omit<
    OperationalReportCounterpartyStatementDetailRow,
    "balanceAfter" | "targetHref"
  >,
): OperationalReportCounterpartyStatementDetailRow {
  return {
    ...row,
    amount: roundMoney(row.amount),
    balanceAfter: 0,
    counterpartyName: normalizeCounterpartyName(row.counterpartyName),
    ...(row.counterpartyKind && row.counterpartyCode?.trim()
      ? {
          counterpartyCode: row.counterpartyCode.trim(),
          counterpartyKind: row.counterpartyKind,
          partyKey: createPartyKey(row.counterpartyKind, row.counterpartyCode),
        }
      : {}),
    targetHref: buildCounterpartyStatementTargetHref(
      row.source,
      row.documentNo,
    ),
  };
}

function buildCounterpartyStatementTargetHref(
  source: OperationalReportCounterpartyStatementDetailRow["source"],
  documentNo: string,
) {
  const routeBySource: Record<
    OperationalReportCounterpartyStatementDetailRow["source"],
    string
  > = {
    Fatura: "/faturalar",
    Gider: "/giderler",
    Hakediş: "/hakedis",
    "Kasa/Banka": "/kasa-banka",
    Maaş: "/personel",
  };

  return `${routeBySource[source]}?evrak=${encodeURIComponent(documentNo)}`;
}

function compareCounterpartyStatementDetailRows(
  first: OperationalReportCounterpartyStatementDetailRow,
  second: OperationalReportCounterpartyStatementDetailRow,
) {
  const counterpartyComparison = first.counterpartyName.localeCompare(
    second.counterpartyName,
    "tr",
  );

  if (counterpartyComparison !== 0) {
    return counterpartyComparison;
  }

  const partyComparison = (first.partyKey ?? "").localeCompare(
    second.partyKey ?? "",
    "tr",
  );

  if (partyComparison !== 0) {
    return partyComparison;
  }

  const dateComparison = first.date.localeCompare(second.date);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  return first.documentNo.localeCompare(second.documentNo, "tr");
}

function progressPaymentPartyKind(
  paymentType: ProgressPaymentRow["paymentType"],
): PartyKind {
  if (paymentType === "Şantiye Geliri") return "customer";
  if (paymentType === "Tedarikçi Hakedişi") return "supplier";
  return "subcontractor";
}

function resolveCashBankMovementPartyReference({
  cashBankMovementsById,
  movement,
  payrollAccrualsById,
  progressPaymentsById,
  purchaseInvoicesById,
  salesInvoicesById,
  visited = new Set<string>(),
}: {
  cashBankMovementsById: Map<string, CashBankMovementRow>;
  movement: CashBankMovementRow;
  payrollAccrualsById: Map<string, PayrollAccrualRow>;
  progressPaymentsById: Map<string, ProgressPaymentRow>;
  purchaseInvoicesById: Map<string, PurchaseInvoiceRow>;
  salesInvoicesById: Map<string, PurchaseInvoiceRow>;
  visited?: Set<string>;
}): { counterpartyCode?: string; counterpartyKind?: PartyKind } {
  if (visited.has(movement.id)) return {};
  visited.add(movement.id);

  const directKind = partyKindFromCounterpartyMovementSource(movement.sourceType);
  const directCode = directKind
    ? readCounterpartyCodeFromSourceLabel(movement.sourceLabel)
    : undefined;
  if (directKind && directCode) {
    return { counterpartyCode: directCode, counterpartyKind: directKind };
  }

  if (movement.sourceType === "purchase-invoice") {
    const invoice = purchaseInvoicesById.get(movement.sourceId);
    return invoice
      ? { counterpartyCode: invoice.counterpartyCode, counterpartyKind: "supplier" }
      : {};
  }
  if (movement.sourceType === "sales-invoice") {
    const invoice = salesInvoicesById.get(movement.sourceId);
    return invoice
      ? { counterpartyCode: invoice.counterpartyCode, counterpartyKind: "customer" }
      : {};
  }
  if (movement.sourceType === "progress-payment") {
    const progressPayment = progressPaymentsById.get(movement.sourceId);
    return progressPayment
      ? {
          counterpartyCode: progressPayment.counterpartyCode,
          counterpartyKind: progressPaymentPartyKind(progressPayment.paymentType),
        }
      : {};
  }
  if (movement.sourceType === "payroll-accrual") {
    const payrollAccrual = payrollAccrualsById.get(movement.sourceId);
    return payrollAccrual?.contractorCode
      ? {
          counterpartyCode: payrollAccrual.contractorCode,
          counterpartyKind: "subcontractor",
        }
      : {};
  }
  if (movement.sourceType === "cash-bank-movement-reversal") {
    const original = cashBankMovementsById.get(movement.sourceId);
    return original
      ? resolveCashBankMovementPartyReference({
          cashBankMovementsById,
          movement: original,
          payrollAccrualsById,
          progressPaymentsById,
          purchaseInvoicesById,
          salesInvoicesById,
          visited,
        })
      : {};
  }

  return {};
}

function partyKindFromCounterpartyMovementSource(
  sourceType: string,
): PartyKind | undefined {
  if (sourceType === "counterparty-musteriler") return "customer";
  if (sourceType === "counterparty-tedarikciler") return "supplier";
  if (sourceType === "counterparty-taseronlar") return "subcontractor";
  return undefined;
}

function readCounterpartyCodeFromSourceLabel(sourceLabel: string) {
  const separatorIndex = sourceLabel.indexOf(":");
  return separatorIndex >= 0
    ? sourceLabel.slice(separatorIndex + 1).trim()
    : undefined;
}

function normalizeCounterpartyName(counterpartyName: string) {
  return counterpartyName.trim() || "Cari belirtilmemiş";
}

function timesheetReportDate(timesheet: TimesheetRow) {
  return `${timesheet.year}-${String(timesheet.month).padStart(2, "0")}-${String(
    daysInMonth(timesheet.year, timesheet.month),
  ).padStart(2, "0")}`;
}

function payrollAccrualReportDate(payrollAccrual: PayrollAccrualRow) {
  return `${payrollAccrual.year}-${String(payrollAccrual.month).padStart(
    2,
    "0",
  )}-${String(
    daysInMonth(payrollAccrual.year, payrollAccrual.month),
  ).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function sumBy<T>(rows: T[], selector: (row: T) => number) {
  return roundMoney(rows.reduce((total, row) => total + selector(row), 0));
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}





