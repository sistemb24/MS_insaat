import { describe, expect, test } from "vitest";

import type { CashBankMovementRow } from "./cash-bank-movement-service";
import type { ChequeRow } from "./cheque-service";
import type { ExpenseRow } from "./expense-service";
import type { PayrollAccrualRow } from "./payroll-accrual-service";
import type { ProgressPaymentRow } from "./progress-payment-service";
import type { PurchaseInvoiceRow } from "./purchase-invoice-service";
import { getP0BaseCurrencyTransactionValue } from "./settings-contract";
import { summarizeOperationalReports } from "./reports-service";
import type { TimesheetRow } from "./timesheet-service";

describe("summarizeOperationalReports", () => {
  test("includes only posted delivery notes in the invoice/delivery report activity", () => {
    const report = summarizeOperationalReports({
      cashBankMovements: [],
      cheques: [],
      deliveryNotes: [
        { id: "delivery-1", documentNo: "IRS-0001", deliveryDate: "2026-07-14", status: "Kaydedildi", supplierName: "ABC Beton", siteName: "Merkez", totalQuantity: 25 },
        { id: "delivery-2", documentNo: "IRS-0002", deliveryDate: "2026-07-14", status: "Taslak", supplierName: "ABC Beton", siteName: "Merkez", totalQuantity: 50 },
      ] as never,
      filters: { source: "İrsaliye" },
      payrollAccruals: [],
      progressPayments: [],
      purchaseInvoices: [],
      timesheets: [],
      today: "2026-07-14",
    });
    expect(report.activityRows).toEqual([
      expect.objectContaining({ documentNo: "IRS-0001", id: "delivery-note:delivery-1", source: "İrsaliye" }),
    ]);
  });

  test("adds posted sales invoices to customer receivables and site income", () => {
    const salesInvoice = createPurchaseInvoice({
      counterpartyCode: "MUS-0001",
      counterpartyName: "ÖRNEK MÜŞTERİ",
      documentNo: "SAT-0001",
      grandTotal: 12000,
      id: "sales-invoice-1",
      status: "Kaydedildi",
    });
    const report = summarizeOperationalReports({
      cashBankMovements: [],
      cheques: [],
      payrollAccruals: [],
      progressPayments: [],
      purchaseInvoices: [],
      salesInvoices: [salesInvoice],
      timesheets: [],
      today: "2026-07-14",
    });

    expect(report.counterpartyStatementRows).toEqual([
      expect.objectContaining({
        counterpartyName: "ÖRNEK MÜŞTERİ",
        netBalance: 12000,
        receivableTotal: 12000,
      }),
    ]);
    expect(report.counterpartyStatementDetailRows).toEqual([
      expect.objectContaining({
        amount: 12000,
        documentNo: "SAT-0001",
        effect: "Alacak",
      }),
    ]);
    expect(report.siteProfitRows).toEqual([
      expect.objectContaining({ incomeTotal: 12000, netProfit: 12000 }),
    ]);
    expect(report.activityRows[0]).toEqual(
      expect.objectContaining({ id: "sales-invoice:sales-invoice-1" }),
    );
  });

  test("assigns stable unique ids to activity rows from their source records", () => {
    const report = summarizeOperationalReports({
      cashBankMovements: [
        createCashBankMovement({
          amount: 465455,
          documentNo: "THS-AYNI",
          id: "cash-bank-movement-1",
          movementDate: "2026-06-27",
        }),
        createCashBankMovement({
          amount: 465455,
          documentNo: "THS-AYNI",
          id: "cash-bank-movement-2",
          movementDate: "2026-06-27",
        }),
      ],
      cheques: [],
      filters: {
        source: "Kasa/Banka",
      },
      payrollAccruals: [],
      progressPayments: [],
      purchaseInvoices: [],
      timesheets: [],
      today: "2026-06-27",
    });

    expect(report.activityRows.map((row) => row.id)).toEqual([
      "cash-bank-movement:cash-bank-movement-1",
      "cash-bank-movement:cash-bank-movement-2",
    ]);
    expect(new Set(report.activityRows.map((row) => row.id)).size).toBe(
      report.activityRows.length,
    );
  });
  test("deduplicates activity ids when duplicated source rows are received", () => {
    const report = summarizeOperationalReports({
      cashBankMovements: [
        createCashBankMovement({
          documentNo: "THS-AYNI-1",
          id: "cash-bank-movement-duplicate",
        }),
        createCashBankMovement({
          documentNo: "THS-AYNI-2",
          id: "cash-bank-movement-duplicate",
        }),
      ],
      cheques: [],
      filters: {
        source: "Kasa/Banka",
      },
      payrollAccruals: [],
      progressPayments: [],
      purchaseInvoices: [],
      timesheets: [],
      today: "2026-06-27",
    });

    expect(report.activityRows.map((row) => row.id)).toEqual([
      "cash-bank-movement:cash-bank-movement-duplicate",
      "cash-bank-movement:cash-bank-movement-duplicate#2",
    ]);
  });
  test("summarizes posted invoices, cash movements and open cheques", () => {
    const report = summarizeOperationalReports({
      cashBankMovements: [
        createCashBankMovement({ amount: 5000, direction: "Giriş" }),
        createCashBankMovement({
          amount: 1200,
          direction: "Çıkış",
          documentNo: "ODM-0001",
        }),
      ],
      cheques: [
        createCheque({ amount: 7000, dueDate: "2026-07-10" }),
        createCheque({
          amount: 2000,
          checkNo: "CK-0002",
          documentNo: "CEK-0002",
          dueDate: "2026-06-01",
        }),
        createCheque({
          amount: 3000,
          checkNo: "CK-0003",
          documentNo: "CEK-0003",
          status: "Tahsil Edildi",
        }),
      ],
      purchaseInvoices: [
        createPurchaseInvoice({ grandTotal: 15000, status: "Kaydedildi" }),
        createPurchaseInvoice({
          documentNo: "FAT-0002",
          grandTotal: 25000,
          status: "Taslak",
        }),
        createPurchaseInvoice({
          documentNo: "FAT-0003",
          grandTotal: 30000,
          status: "İptal",
        }),
      ],
      payrollAccruals: [],
      progressPayments: [],
      timesheets: [],
      today: "2026-06-27",
    });

    expect(report.purchaseInvoiceDebt).toBe(15000);
    expect(report.cashIncomingTotal).toBe(5000);
    expect(report.cashOutgoingTotal).toBe(1200);
    expect(report.cashNetTotal).toBe(3800);
    expect(report.portfolioChequeTotal).toBe(9000);
    expect(report.overdueChequeTotal).toBe(2000);
    expect(report.activityRows.map((row) => row.documentNo)).toEqual([
      "CEK-0001",
      "THS-0001",
      "ODM-0001",
      "FAT-0001",
      "CEK-0002",
    ]);
  });

  test("reports the P0 summary currency independently from legacy source row currencies", () => {
    const report = summarizeOperationalReports({
      cashBankMovements: [
        createCashBankMovement({ amount: 5000, currency: "USD" }),
        createCashBankMovement({
          amount: 1200,
          currency: "EUR",
          direction: "Çıkış",
          documentNo: "ODM-0001",
        }),
      ],
      cheques: [createCheque({ amount: 7000, currency: "USD" })],
      payrollAccruals: [],
      progressPayments: [
        createProgressPayment({
          currency: "EUR",
          grandTotal: 11400,
          status: "Kaydedildi",
        }),
      ],
      purchaseInvoices: [
        createPurchaseInvoice({
          currency: "USD",
          grandTotal: 15000,
          status: "Kaydedildi",
        }),
      ],
      timesheets: [],
      today: "2026-06-27",
    });

    expect(report.currency).toBe(getP0BaseCurrencyTransactionValue());
    expect(report.purchaseInvoiceDebt).toBe(15000);
    expect(report.progressPaymentTotal).toBe(11400);
    expect(report.cashNetTotal).toBe(3800);
    expect(report.portfolioChequeTotal).toBe(7000);
  });

  test("filters summaries by source and date range", () => {
    const report = summarizeOperationalReports({
      cashBankMovements: [
        createCashBankMovement({ amount: 5000, direction: "Giriş" }),
        createCashBankMovement({
          amount: 1200,
          direction: "Çıkış",
          documentNo: "ODM-0001",
          movementDate: "2026-06-28",
        }),
      ],
      cheques: [createCheque({ amount: 7000, dueDate: "2026-07-10" })],
      filters: {
        endDate: "2026-06-27",
        source: "Kasa/Banka",
        startDate: "2026-06-25",
      },
      payrollAccruals: [],
      purchaseInvoices: [
        createPurchaseInvoice({
          grandTotal: 15000,
          invoiceDate: "2026-06-20",
          status: "Kaydedildi",
        }),
      ],
      progressPayments: [],
      timesheets: [],
      today: "2026-06-27",
    });

    expect(report.purchaseInvoiceDebt).toBe(0);
    expect(report.cashIncomingTotal).toBe(5000);
    expect(report.cashOutgoingTotal).toBe(0);
    expect(report.cashNetTotal).toBe(5000);
    expect(report.portfolioChequeTotal).toBe(0);
    expect(report.activityRows.map((row) => row.documentNo)).toEqual([
      "THS-0001",
    ]);
  });


  test("includes posted expenses in totals, activity, site profit and counterparty statements", () => {
    const report = summarizeOperationalReports({
      cashBankMovements: [
        createCashBankMovement({
          amount: 15000,
          counterpartyName: "ABC Beton",
          direction: "Çıkış",
          documentNo: "ODM-GDR-0001",
          movementDate: "2026-06-30",
          movementType: "Gider Ödemesi",
          sourceId: "expense-1",
          sourceLabel: "GDR-0001",
          sourceType: "expense",
        }),
      ],
      cheques: [],
      expenses: [createExpense()],
      filters: {
        source: "Gider",
      },
      payrollAccruals: [],
      progressPayments: [],
      purchaseInvoices: [],
      timesheets: [],
      today: "2026-06-30",
    });

    expect(report.expenseTotal).toBe(15000);
    expect(report.cashOutgoingTotal).toBe(0);
    expect(report.activityRows).toEqual([
      {
        amount: 15000,
        date: "2026-06-30",
        documentNo: "GDR-0001",
        id: "expense:expense-1",
        label: "ABC Beton",
        source: "Gider",
      },
    ]);
    expect(report.siteProfitRows).toEqual([
      {
        expenseCostTotal: 15000,
        incomeTotal: 0,
        laborCostTotal: 0,
        netProfit: -15000,
        progressPaymentCostTotal: 0,
        purchaseCostTotal: 0,
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        totalCost: 15000,
      },
    ]);
    expect(report.counterpartyStatementRows).toEqual([
      {
        cashPaidTotal: 0,
        cashReceivedTotal: 0,
        counterpartyName: "ABC Beton",
        netBalance: -15000,
        payableTotal: 15000,
        receivableTotal: 0,
      },
    ]);
    expect(report.counterpartyStatementDetailRows).toEqual([
      {
        amount: -15000,
        balanceAfter: -15000,
        counterpartyName: "ABC Beton",
        date: "2026-06-30",
        documentNo: "GDR-0001",
        effect: "Borç",
        source: "Gider",
        targetHref: "/giderler?evrak=GDR-0001",
      },
    ]);
  });
  test("includes posted progress payments in totals and activity rows", () => {
    const report = summarizeOperationalReports({
      cashBankMovements: [],
      cheques: [],
      filters: {
        source: "Hakediş",
      },
      payrollAccruals: [],
      purchaseInvoices: [],
      progressPayments: [
        createProgressPayment({
          grandTotal: 11400,
          status: "Kaydedildi",
        }),
        createProgressPayment({
          documentNo: "HAK-0002",
          grandTotal: 25000,
          status: "Taslak",
        }),
      ],
      timesheets: [],
      today: "2026-06-27",
    });

    expect(report.progressPaymentTotal).toBe(11400);
    expect(report.purchaseInvoiceDebt).toBe(0);
    expect(report.cashNetTotal).toBe(0);
    expect(report.portfolioChequeTotal).toBe(0);
    expect(report.activityRows).toEqual([
      {
        amount: 11400,
        date: "2026-06-27",
        documentNo: "HAK-0001",
        id: "progress-payment:progress-payment-1",
        label: "ŞİRKETİN TAŞERONU",
        source: "Hakediş",
      },
    ]);
  });

  test("includes posted timesheets as labor net totals and activity rows", () => {
    const report = summarizeOperationalReports({
      cashBankMovements: [],
      cheques: [],
      filters: {
        source: "Puantaj",
      },
      payrollAccruals: [],
      progressPayments: [],
      purchaseInvoices: [],
      timesheets: [
        createTimesheet({
          netTotal: 31500,
          status: "Kaydedildi",
        }),
        createTimesheet({
          documentNo: "PNT-2026-06-002",
          netTotal: 12000,
          status: "Taslak",
        }),
      ],
      today: "2026-06-27",
    });

    expect(report.timesheetNetTotal).toBe(31500);
    expect(report.progressPaymentTotal).toBe(0);
    expect(report.purchaseInvoiceDebt).toBe(0);
    expect(report.activityRows).toEqual([
      {
        amount: 31500,
        date: "2026-06-30",
        documentNo: "PNT-2026-06-001",
        id: "timesheet:timesheet-1",
        label: "ŞİRKET MERKEZ ŞANTİYESİ",
        source: "Puantaj",
      },
    ]);
  });

  test("includes posted payroll accruals as payroll liability totals and activity rows", () => {
    const report = summarizeOperationalReports({
      cashBankMovements: [],
      cheques: [],
      filters: {
        source: "Maaş",
      },
      payrollAccruals: [
        createPayrollAccrual({
          netTotal: 31500,
          status: "Kaydedildi",
        }),
        createPayrollAccrual({
          documentNo: "MAAS-PNT-2026-06-002",
          netTotal: 12000,
          status: "Taslak",
        }),
      ],
      progressPayments: [],
      purchaseInvoices: [],
      timesheets: [],
      today: "2026-06-27",
    });

    expect(report.payrollAccrualNetTotal).toBe(31500);
    expect(report.timesheetNetTotal).toBe(0);
    expect(report.activityRows).toEqual([
      {
        amount: 31500,
        date: "2026-06-30",
        documentNo: "MAAS-PNT-2026-06-001",
        id: "payroll-accrual:payroll-accrual-1",
        label: "ŞİRKET MERKEZ ŞANTİYESİ",
        source: "Maaş",
      },
    ]);
  });

  test("splits posted payroll accruals into paid and payment waiting totals", () => {
    const report = summarizeOperationalReports({
      cashBankMovements: [
        createCashBankMovement({
          amount: 31500,
          counterpartyName: "ŞİRKETİN TAŞERONU",
          direction: "Çıkış",
          documentNo: "ODM-MAAS-PNT-2026-06-001",
          movementDate: "2026-06-30",
          movementType: "Maaş Ödemesi",
          sourceId: "payroll-accrual-1",
          sourceLabel: "MAAS-PNT-2026-06-001",
          sourceType: "payroll-accrual",
        }),
      ],
      cheques: [],
      filters: {
        source: "Maaş",
      },
      payrollAccruals: [
        createPayrollAccrual({
          id: "payroll-accrual-1",
          netTotal: 31500,
          status: "Kaydedildi",
        }),
        createPayrollAccrual({
          documentNo: "MAAS-PNT-2026-06-002",
          id: "payroll-accrual-2",
          netTotal: 12000,
          sourceTimesheetId: "timesheet-2",
          sourceTimesheetNo: "PNT-2026-06-002",
          status: "Kaydedildi",
        }),
        createPayrollAccrual({
          documentNo: "MAAS-PNT-2026-06-003",
          id: "payroll-accrual-3",
          netTotal: 8000,
          status: "Taslak",
        }),
      ],
      progressPayments: [],
      purchaseInvoices: [],
      timesheets: [],
      today: "2026-06-27",
    });

    expect(report.payrollAccrualNetTotal).toBe(43500);
    expect(report.payrollPaidTotal).toBe(31500);
    expect(report.payrollPaymentWaitingTotal).toBe(12000);
  });

  test("splits posted purchase invoices into paid and payment waiting totals", () => {
    const report = summarizeOperationalReports({
      cashBankMovements: [
        createCashBankMovement({
          amount: 16200,
          counterpartyName: "ÖRNEK TEDARİKÇİ",
          direction: "Çıkış",
          documentNo: "ODM-FAT-0006",
          movementDate: "2026-06-30",
          movementType: "Fatura Ödemesi",
          sourceId: "invoice-1",
          sourceLabel: "FAT-0006",
          sourceType: "purchase-invoice",
        }),
      ],
      cheques: [],
      filters: {
        source: "Fatura",
      },
      payrollAccruals: [],
      progressPayments: [],
      purchaseInvoices: [
        createPurchaseInvoice({
          documentNo: "FAT-0006",
          grandTotal: 16200,
          id: "invoice-1",
          status: "Kaydedildi",
        }),
        createPurchaseInvoice({
          documentNo: "FAT-0007",
          grandTotal: 12000,
          id: "invoice-2",
          status: "Kaydedildi",
        }),
        createPurchaseInvoice({
          documentNo: "FAT-0008",
          grandTotal: 8000,
          id: "invoice-3",
          status: "Taslak",
        }),
      ],
      timesheets: [],
      today: "2026-06-27",
    });

    expect(report.purchaseInvoicePaidTotal).toBe(16200);
    expect(report.purchaseInvoicePaymentWaitingTotal).toBe(12000);
    expect(report.purchaseInvoiceDebt).toBe(12000);
  });

  test("splits site income progress payments into collected and collection waiting totals", () => {
    const report = summarizeOperationalReports({
      cashBankMovements: [
        createCashBankMovement({
          amount: 15000,
          counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
          direction: "Giriş",
          documentNo: "THS-HAK-0004",
          movementDate: "2026-06-30",
          movementType: "Hakediş Tahsilatı",
          sourceId: "progress-payment-4",
          sourceLabel: "HAK-0004",
          sourceType: "progress-payment",
        }),
      ],
      cheques: [],
      filters: {
        source: "Hakediş",
      },
      payrollAccruals: [],
      progressPayments: [
        createProgressPayment({
          documentNo: "HAK-0001",
          grandTotal: 11400,
          id: "progress-payment-1",
          paymentType: "Taşeron Hakedişi",
          status: "Kaydedildi",
        }),
        createProgressPayment({
          counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
          documentNo: "HAK-0004",
          grandTotal: 15000,
          id: "progress-payment-4",
          paymentType: "Şantiye Geliri",
          status: "Kaydedildi",
        }),
        createProgressPayment({
          counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
          documentNo: "HAK-0005",
          grandTotal: 8000,
          id: "progress-payment-5",
          paymentType: "Şantiye Geliri",
          status: "Kaydedildi",
        }),
      ],
      purchaseInvoices: [],
      timesheets: [],
      today: "2026-06-27",
    });

    expect(report.progressPaymentTotal).toBe(34400);
    expect(report.progressPaymentPaidTotal).toBe(0);
    expect(report.progressPaymentPaymentWaitingTotal).toBe(11400);
    expect(report.progressPaymentCollectedTotal).toBe(15000);
    expect(report.progressPaymentCollectionWaitingTotal).toBe(8000);
  });

  test("summarizes site profit without double counting payroll sourced timesheets", () => {
    const report = summarizeOperationalReports({
      cashBankMovements: [],
      cheques: [],
      payrollAccruals: [
        createPayrollAccrual({
          id: "payroll-accrual-1",
          netTotal: 31500,
          sourceTimesheetId: "timesheet-1",
          status: "Kaydedildi",
        }),
      ],
      progressPayments: [
        createProgressPayment({
          counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
          documentNo: "HAK-GELIR-0001",
          grandTotal: 90000,
          id: "progress-payment-income-1",
          paymentType: "Şantiye Geliri",
          status: "Kaydedildi",
        }),
        createProgressPayment({
          documentNo: "HAK-TAS-0001",
          grandTotal: 18000,
          id: "progress-payment-cost-1",
          paymentType: "Taşeron Hakedişi",
          status: "Kaydedildi",
        }),
      ],
      purchaseInvoices: [
        createPurchaseInvoice({
          grandTotal: 12000,
          id: "invoice-1",
          status: "Kaydedildi",
        }),
      ],
      timesheets: [
        createTimesheet({
          id: "timesheet-1",
          netTotal: 31500,
          status: "Kaydedildi",
        }),
        createTimesheet({
          documentNo: "PNT-2026-06-002",
          id: "timesheet-2",
          netTotal: 8500,
          status: "Kaydedildi",
        }),
      ],
      today: "2026-06-27",
    });

    expect(report.siteProfitRows).toEqual([
      {
        expenseCostTotal: 0,
        incomeTotal: 90000,
        laborCostTotal: 40000,
        netProfit: 20000,
        progressPaymentCostTotal: 18000,
        purchaseCostTotal: 12000,
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        totalCost: 70000,
      },
    ]);
  });

  test("summarizes counterparty statement balances from posted documents and cash movements", () => {
    const report = summarizeOperationalReports({
      cashBankMovements: [
        createCashBankMovement({
          amount: 5000,
          counterpartyName: "ABC Beton",
          direction: "Çıkış",
          documentNo: "ODM-FAT-0001",
          movementDate: "2026-06-30",
          movementType: "Fatura Ödemesi",
          sourceId: "invoice-1",
          sourceLabel: "FAT-0001",
          sourceType: "purchase-invoice",
        }),
        createCashBankMovement({
          amount: 4000,
          counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
          direction: "Giriş",
          documentNo: "THS-HAK-GELIR-0001",
          movementDate: "2026-06-30",
          movementType: "Hakediş Tahsilatı",
          sourceId: "progress-payment-income-1",
          sourceLabel: "HAK-GELIR-0001",
          sourceType: "progress-payment",
        }),
      ],
      cheques: [],
      payrollAccruals: [],
      progressPayments: [
        createProgressPayment({
          counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
          documentNo: "HAK-GELIR-0001",
          grandTotal: 15000,
          id: "progress-payment-income-1",
          paymentType: "Şantiye Geliri",
          status: "Kaydedildi",
        }),
      ],
      purchaseInvoices: [
        createPurchaseInvoice({
          counterpartyName: "ABC Beton",
          documentNo: "FAT-0001",
          grandTotal: 12000,
          id: "invoice-1",
          status: "Kaydedildi",
        }),
      ],
      timesheets: [],
      today: "2026-06-27",
    });

    expect(report.counterpartyStatementRows).toEqual([
      {
        cashPaidTotal: 5000,
        cashReceivedTotal: 0,
        counterpartyName: "ABC Beton",
        netBalance: -7000,
        payableTotal: 12000,
        receivableTotal: 0,
      },
      {
        cashPaidTotal: 0,
        cashReceivedTotal: 4000,
        counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
        netBalance: 11000,
        payableTotal: 0,
        receivableTotal: 15000,
      },
    ]);
  });

  test("builds counterparty statement detail rows with running balances", () => {
    const report = summarizeOperationalReports({
      cashBankMovements: [
        createCashBankMovement({
          amount: 5000,
          counterpartyName: "ABC Beton",
          direction: "Çıkış",
          documentNo: "ODM-FAT-0001",
          movementDate: "2026-06-30",
          movementType: "Fatura Ödemesi",
          sourceId: "invoice-1",
          sourceLabel: "FAT-0001",
          sourceType: "purchase-invoice",
        }),
        createCashBankMovement({
          amount: 4000,
          counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
          direction: "Giriş",
          documentNo: "THS-HAK-GELIR-0001",
          movementDate: "2026-06-30",
          movementType: "Hakediş Tahsilatı",
          sourceId: "progress-payment-income-1",
          sourceLabel: "HAK-GELIR-0001",
          sourceType: "progress-payment",
        }),
      ],
      cheques: [],
      payrollAccruals: [],
      progressPayments: [
        createProgressPayment({
          counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
          documentNo: "HAK-GELIR-0001",
          grandTotal: 15000,
          id: "progress-payment-income-1",
          issueDate: "2026-06-27",
          paymentType: "Şantiye Geliri",
          status: "Kaydedildi",
        }),
      ],
      purchaseInvoices: [
        createPurchaseInvoice({
          counterpartyName: "ABC Beton",
          documentNo: "FAT-0001",
          grandTotal: 12000,
          id: "invoice-1",
          invoiceDate: "2026-06-20",
          status: "Kaydedildi",
        }),
      ],
      timesheets: [],
      today: "2026-06-27",
    });

    expect(report.counterpartyStatementDetailRows).toEqual([
      {
        amount: -12000,
        balanceAfter: -12000,
        counterpartyCode: "TED-0001",
        counterpartyKind: "supplier",
        counterpartyName: "ABC Beton",
        date: "2026-06-20",
        documentNo: "FAT-0001",
        effect: "Borç",
        partyKey: "supplier:TED-0001",
        source: "Fatura",
        targetHref: "/faturalar?evrak=FAT-0001",
      },
      {
        amount: 5000,
        balanceAfter: -7000,
        counterpartyCode: "TED-0001",
        counterpartyKind: "supplier",
        counterpartyName: "ABC Beton",
        date: "2026-06-30",
        documentNo: "ODM-FAT-0001",
        effect: "Ödeme",
        ledgerDocumentNo: undefined,
        partyKey: "supplier:TED-0001",
        source: "Kasa/Banka",
        targetHref: "/kasa-banka?evrak=ODM-FAT-0001",
      },
      {
        amount: 15000,
        balanceAfter: 15000,
        counterpartyCode: "TAS-0001",
        counterpartyKind: "customer",
        counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
        date: "2026-06-27",
        documentNo: "HAK-GELIR-0001",
        effect: "Alacak",
        partyKey: "customer:TAS-0001",
        source: "Hakediş",
        targetHref: "/hakedis?evrak=HAK-GELIR-0001",
      },
      {
        amount: -4000,
        balanceAfter: 11000,
        counterpartyCode: "TAS-0001",
        counterpartyKind: "customer",
        counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
        date: "2026-06-30",
        documentNo: "THS-HAK-GELIR-0001",
        effect: "Tahsilat",
        ledgerDocumentNo: undefined,
        partyKey: "customer:TAS-0001",
        source: "Kasa/Banka",
        targetHref: "/kasa-banka?evrak=THS-HAK-GELIR-0001",
      },
    ]);
  });

  test("keeps same-name supplier balances separate by counterparty code", () => {
    const report = summarizeOperationalReports({
      cashBankMovements: [],
      cheques: [],
      payrollAccruals: [],
      progressPayments: [],
      purchaseInvoices: [
        createPurchaseInvoice({
          counterpartyCode: "TED-0001",
          counterpartyName: "AYNI UNVAN",
          documentNo: "FAT-0001",
          grandTotal: 1000,
          id: "invoice-1",
          invoiceDate: "2026-06-20",
          status: "Kaydedildi",
        }),
        createPurchaseInvoice({
          counterpartyCode: "TED-0002",
          counterpartyName: "AYNI UNVAN",
          documentNo: "FAT-0002",
          grandTotal: 250,
          id: "invoice-2",
          invoiceDate: "2026-06-21",
          status: "Kaydedildi",
        }),
      ],
      timesheets: [],
      today: "2026-06-27",
    });

    expect(
      report.counterpartyStatementDetailRows.map((row) => ({
        balanceAfter: row.balanceAfter,
        partyKey: row.partyKey,
      })),
    ).toEqual([
      { balanceAfter: -1000, partyKey: "supplier:TED-0001" },
      { balanceAfter: -250, partyKey: "supplier:TED-0002" },
    ]);
  });

  test("splits posted progress payments into paid and payment waiting totals", () => {
    const report = summarizeOperationalReports({
      cashBankMovements: [
        createCashBankMovement({
          amount: 11400,
          counterpartyName: "ŞİRKETİN TAŞERONU",
          direction: "Çıkış",
          documentNo: "ODM-HAK-0001",
          movementDate: "2026-06-30",
          movementType: "Hakediş Ödemesi",
          sourceId: "progress-payment-1",
          sourceLabel: "HAK-0001",
          sourceType: "progress-payment",
        }),
      ],
      cheques: [],
      filters: {
        source: "Hakediş",
      },
      payrollAccruals: [],
      progressPayments: [
        createProgressPayment({
          documentNo: "HAK-0001",
          grandTotal: 11400,
          id: "progress-payment-1",
          status: "Kaydedildi",
        }),
        createProgressPayment({
          documentNo: "HAK-0002",
          grandTotal: 9000,
          id: "progress-payment-2",
          status: "Kaydedildi",
        }),
        createProgressPayment({
          documentNo: "HAK-0003",
          grandTotal: 7000,
          id: "progress-payment-3",
          status: "Taslak",
        }),
      ],
      purchaseInvoices: [],
      timesheets: [],
      today: "2026-06-27",
    });

    expect(report.progressPaymentTotal).toBe(20400);
    expect(report.progressPaymentPaidTotal).toBe(11400);
    expect(report.progressPaymentPaymentWaitingTotal).toBe(9000);
  });
});

function createExpense(overrides: Partial<ExpenseRow> = {}): ExpenseRow {
  return {
    id: "expense-1",
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    accountCode: "KASA-0001",
    accountName: "MERKEZ KASA",
    amount: 12500,
    counterpartyName: "ABC Beton",
    createdAt: "2026-06-30T13:00:00.000Z",
    createdBy: "user-main",
    currency: "TL",
    description: "Şantiye nakliye gideri",
    documentNo: "GDR-0001",
    expenseDate: "2026-06-30",
    grandTotal: 15000,
    movementGroup: "Nakliye",
    siteCode: "SANT-0001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    status: "Kaydedildi",
    updatedAt: "2026-06-30T13:00:00.000Z",
    updatedBy: "user-main",
    vatRate: 20,
    vatTotal: 2500,
    ...overrides,
  };
}
function createPurchaseInvoice(
  overrides: Partial<PurchaseInvoiceRow> = {},
): PurchaseInvoiceRow {
  return {
    id: "invoice-1",
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    createdBy: "user-main",
    updatedBy: "user-main",
    createdAt: "2026-06-20T09:00:00.000Z",
    updatedAt: "2026-06-20T09:00:00.000Z",
    counterpartyCode: "TED-0001",
    counterpartyName: "ABC Beton",
    currency: "TL",
    description: "",
    discountTotal: 0,
    documentNo: "FAT-0001",
    dueDate: "2026-07-20",
    exchangeRate: 1,
    grandTotal: 15000,
    invoiceDate: "2026-06-20",
    isOfficial: false,
    lineCount: 1,
    lines: [],
    movementGroup: "Malzeme Alımı",
    netTotal: 12500,
    siteCode: "SANT-0001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    status: "Kaydedildi",
    subtotal: 12500,
    vatTotal: 2500,
    withholdingTotal: 0,
    ...overrides,
  };
}

function createCashBankMovement(
  overrides: Partial<CashBankMovementRow> = {},
): CashBankMovementRow {
  return {
    id: "movement-1",
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    accountCode: "KASA-0001",
    accountName: "MERKEZ KASA",
    amount: 5000,
    counterpartyName: "ABC Beton",
    createdAt: "2026-06-26T09:00:00.000Z",
    createdBy: "user-main",
    currency: "TL",
    description: "",
    direction: "Giriş",
    documentNo: "THS-0001",
    movementDate: "2026-06-26",
    movementType: "Tahsilat",
    sourceId: "ths-0001",
    sourceLabel: "THS-0001",
    sourceType: "manual",
    updatedAt: "2026-06-26T09:00:00.000Z",
    updatedBy: "user-main",
    ...overrides,
  };
}

function createCheque(overrides: Partial<ChequeRow> = {}): ChequeRow {
  return {
    id: "cheque-1",
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    amount: 7000,
    bankName: "Ziraat",
    branchName: "Merkez",
    checkNo: "CK-0001",
    createdAt: "2026-06-27T09:00:00.000Z",
    createdBy: "user-main",
    currency: "TL",
    description: "",
    direction: "Gelen",
    documentNo: "CEK-0001",
    drawerName: "XYZ İnşaat",
    dueDate: "2026-07-10",
    issueDate: "2026-06-27",
    status: "Portföyde",
    updatedAt: "2026-06-27T09:00:00.000Z",
    updatedBy: "user-main",
    ...overrides,
  };
}

function createProgressPayment(
  overrides: Partial<ProgressPaymentRow> = {},
): ProgressPaymentRow {
  return {
    id: "progress-payment-1",
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    counterpartyCode: "TAS-0001",
    counterpartyName: "ŞİRKETİN TAŞERONU",
    createdAt: "2026-06-27T09:00:00.000Z",
    createdBy: "user-main",
    currency: "TL",
    description: "",
    documentNo: "HAK-0001",
    grandTotal: 11400,
    grossTotal: 10000,
    issueDate: "2026-06-27",
    lineCount: 1,
    lines: [
      {
        description: "Kaba inşaat imalatı",
        quantity: 1,
        unit: "adet",
        unitPrice: 10000,
        vatRate: 20,
      },
    ],
    netTotal: 9500,
    paymentType: "Taşeron Hakedişi",
    retentionRate: 5,
    retentionTotal: 500,
    siteCode: "SANT-0001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    status: "Kaydedildi",
    updatedAt: "2026-06-27T09:00:00.000Z",
    updatedBy: "user-main",
    vatTotal: 1900,
    ...overrides,
  };
}

function createTimesheet(overrides: Partial<TimesheetRow> = {}): TimesheetRow {
  return {
    id: "timesheet-1",
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    contractorCode: "TAS-0001",
    contractorName: "ŞİRKETİN TAŞERONU",
    createdAt: "2026-06-27T09:00:00.000Z",
    createdBy: "user-main",
    deductionTotal: 500,
    description: "",
    documentNo: "PNT-2026-06-001",
    grossTotal: 32000,
    lineCount: 2,
    lines: [
      {
        advanceDeduction: 0,
        dailyWage: 1000,
        debtDeduction: 0,
        overtimeHourlyRate: 80,
        overtimeHours: 0,
        personCode: "PRS-0001",
        personName: "MEHMET YILMAZ",
        workedDays: 20,
      },
      {
        advanceDeduction: 500,
        dailyWage: 900,
        debtDeduction: 0,
        overtimeHourlyRate: 120,
        overtimeHours: 10,
        personCode: "PRS-0002",
        personName: "AYŞE DEMİR",
        workedDays: 12,
      },
    ],
    month: 6,
    netTotal: 31500,
    siteCode: "SANT-0001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    status: "Kaydedildi",
    totalOvertimeHours: 10,
    totalWorkedDays: 32,
    updatedAt: "2026-06-27T09:00:00.000Z",
    updatedBy: "user-main",
    year: 2026,
    ...overrides,
  };
}

function createPayrollAccrual(
  overrides: Partial<PayrollAccrualRow> = {},
): PayrollAccrualRow {
  return {
    id: "payroll-accrual-1",
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    contractorCode: "TAS-0001",
    contractorName: "ŞİRKETİN TAŞERONU",
    createdAt: "2026-06-30T09:00:00.000Z",
    createdBy: "user-main",
    deductionTotal: 500,
    documentNo: "MAAS-PNT-2026-06-001",
    grossTotal: 32000,
    lineCount: 2,
    lines: [],
    month: 6,
    netTotal: 31500,
    siteCode: "SANT-0001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    sourceTimesheetId: "timesheet-1",
    sourceTimesheetNo: "PNT-2026-06-001",
    status: "Kaydedildi",
    updatedAt: "2026-06-30T09:00:00.000Z",
    updatedBy: "user-main",
    year: 2026,
    ...overrides,
  };
}






