/**
 * @vitest-environment jsdom
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { CashBankMovementRow } from "@/lib/cash-bank-movement-service";
import type { ChequeRow } from "@/lib/cheque-service";
import type { ExpenseRow } from "@/lib/expense-service";
import type { PayrollAccrualRow } from "@/lib/payroll-accrual-service";
import type { ProgressPaymentRow } from "@/lib/progress-payment-service";
import type { PurchaseInvoiceRow } from "@/lib/purchase-invoice-service";
import type { TimesheetRow } from "@/lib/timesheet-service";

import { ReportsSurface } from "./reports-surface";

const originalPrint = window.print;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Object.defineProperty(window, "print", {
    configurable: true,
    value: originalPrint,
  });
});

describe("ReportsSurface", () => {
  test("renders operational report summaries from existing movement data", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ReportsSurface
        cashBankMovements={[createCashBankMovement()]}
        cheques={[createCheque()]}
        payrollAccruals={[createPayrollAccrual()]}
        purchaseInvoices={[createPurchaseInvoice()]}
        progressPayments={[createProgressPayment()]}
        timesheets={[createTimesheet()]}
        today="2026-06-27"
      />,
    );

    expect(screen.getByText("Raporlar")).toBeTruthy();
    expect(screen.getByText("Rapor Para Birimi")).toBeTruthy();
    expect(screen.getByText("TL")).toBeTruthy();
    expect(screen.getByText("Operasyon Özeti")).toBeTruthy();
    expect(screen.getByText("Alış Fatura Borcu")).toBeTruthy();
    expect(screen.getByText("Kasa/Banka Net")).toBeTruthy();
    expect(screen.getByText("Portföy Çek")).toBeTruthy();
    expect(screen.getByText("Hakediş Toplamı")).toBeTruthy();
    expect(screen.getByText("Puantaj Net")).toBeTruthy();
    expect(screen.getByText("Maaş Tahakkuku")).toBeTruthy();
    expect(screen.getAllByText("15.000,00 TL").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("5.000,00 TL").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("7.000,00 TL").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("11.400,00 TL").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("31.500,00 TL").length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText("Son Hareketler")).toBeTruthy();
    expect(screen.getAllByText("FAT-0001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("THS-0001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CEK-0001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("HAK-0001").length).toBeGreaterThan(0);
    expect(screen.getByText("PNT-2026-06-001")).toBeTruthy();
    expect(screen.getAllByText("MAAS-PNT-2026-06-001").length).toBeGreaterThan(0);
    expect(
      consoleError.mock.calls.some((call) =>
        String(call[0]).includes('unique "key" prop'),
      ),
    ).toBe(false);
  });

  test("renders report tables without React key warnings", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ReportsSurface
        cashBankMovements={[createCashBankMovement()]}
        cheques={[createCheque()]}
        payrollAccruals={[createPayrollAccrual()]}
        purchaseInvoices={[createPurchaseInvoice()]}
        progressPayments={[createProgressPayment()]}
        timesheets={[createTimesheet()]}
        today="2026-06-27"
      />,
    );

    expect(
      consoleError.mock.calls.some((call) =>
        String(call[0]).includes("unique \"key\" prop"),
      ),
    ).toBe(false);
  });
  test("filters report summaries by source and date range", () => {
    render(
      <ReportsSurface
        cashBankMovements={[createCashBankMovement()]}
        cheques={[createCheque()]}
        payrollAccruals={[createPayrollAccrual()]}
        purchaseInvoices={[createPurchaseInvoice()]}
        progressPayments={[createProgressPayment()]}
        timesheets={[createTimesheet()]}
        today="2026-06-27"
      />,
    );

    fireEvent.change(screen.getByLabelText("Rapor kaynağı"), {
      target: { value: "Kasa/Banka" },
    });
    fireEvent.change(screen.getByLabelText("Başlangıç tarihi"), {
      target: { value: "2026-06-25" },
    });
    fireEvent.change(screen.getByLabelText("Bitiş tarihi"), {
      target: { value: "2026-06-27" },
    });

    expect(screen.getAllByText("5.000,00 TL").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("THS-0001").length).toBeGreaterThan(0);
    expect(screen.queryByText("FAT-0001")).toBeNull();
    expect(screen.queryByText("CEK-0001")).toBeNull();
    expect(screen.queryByText("HAK-0001")).toBeNull();
    expect(screen.queryByText("PNT-2026-06-001")).toBeNull();
    expect(screen.queryByText("MAAS-PNT-2026-06-001")).toBeNull();
  });

  test("filters report summaries by posted expenses", () => {
    render(
      <ReportsSurface
        cashBankMovements={[]}
        cheques={[]}
        expenses={[createExpense()]}
        payrollAccruals={[]}
        purchaseInvoices={[createPurchaseInvoice()]}
        progressPayments={[]}
        timesheets={[]}
        today="2026-06-30"
      />,
    );

    fireEvent.change(screen.getByLabelText("Rapor kaynağı"), {
      target: { value: "Gider" },
    });

    expect(screen.getByText("Gider Toplamı")).toBeTruthy();
    expect(screen.getAllByText("15.000,00 TL").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("GDR-0001").length).toBeGreaterThan(0);
    expect(
      screen
        .getByRole("link", { name: "GDR-0001 evrakına git" })
        .getAttribute("href"),
    ).toBe("/giderler?evrak=GDR-0001");
    expect(screen.queryByText("FAT-0001")).toBeNull();
  });

  test("filters report summaries by posted progress payments", () => {
    render(
      <ReportsSurface
        cashBankMovements={[createCashBankMovement()]}
        cheques={[createCheque()]}
        payrollAccruals={[createPayrollAccrual()]}
        purchaseInvoices={[createPurchaseInvoice()]}
        progressPayments={[createProgressPayment()]}
        timesheets={[createTimesheet()]}
        today="2026-06-27"
      />,
    );

    fireEvent.change(screen.getByLabelText("Rapor kaynağı"), {
      target: { value: "Hakediş" },
    });

    expect(screen.getAllByText("11.400,00 TL").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("HAK-0001").length).toBeGreaterThan(0);
    expect(screen.queryByText("FAT-0001")).toBeNull();
    expect(screen.queryByText("THS-0001")).toBeNull();
    expect(screen.queryByText("CEK-0001")).toBeNull();
    expect(screen.queryByText("MAAS-PNT-2026-06-001")).toBeNull();
  });

  test("filters report summaries by posted timesheets", () => {
    render(
      <ReportsSurface
        cashBankMovements={[createCashBankMovement()]}
        cheques={[createCheque()]}
        payrollAccruals={[createPayrollAccrual()]}
        purchaseInvoices={[createPurchaseInvoice()]}
        progressPayments={[createProgressPayment()]}
        timesheets={[createTimesheet()]}
        today="2026-06-27"
      />,
    );

    fireEvent.change(screen.getByLabelText("Rapor kaynağı"), {
      target: { value: "Puantaj" },
    });

    expect(screen.getAllByText("31.500,00 TL").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("PNT-2026-06-001")).toBeTruthy();
    expect(screen.queryByText("FAT-0001")).toBeNull();
    expect(screen.queryByText("THS-0001")).toBeNull();
    expect(screen.queryByText("CEK-0001")).toBeNull();
    expect(screen.queryByText("HAK-0001")).toBeNull();
    expect(screen.queryByText("MAAS-PNT-2026-06-001")).toBeNull();
  });

  test("filters report summaries by posted payroll accruals", () => {
    render(
      <ReportsSurface
        cashBankMovements={[createCashBankMovement()]}
        cheques={[createCheque()]}
        payrollAccruals={[createPayrollAccrual()]}
        purchaseInvoices={[createPurchaseInvoice()]}
        progressPayments={[createProgressPayment()]}
        timesheets={[createTimesheet()]}
        today="2026-06-27"
      />,
    );

    fireEvent.change(screen.getByLabelText("Rapor kaynağı"), {
      target: { value: "Maaş" },
    });

    expect(screen.getAllByText("31.500,00 TL").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("MAAS-PNT-2026-06-001").length).toBeGreaterThan(0);
    expect(screen.queryByText("FAT-0001")).toBeNull();
    expect(screen.queryByText("THS-0001")).toBeNull();
    expect(screen.queryByText("CEK-0001")).toBeNull();
    expect(screen.queryByText("HAK-0001")).toBeNull();
    expect(screen.queryByText("PNT-2026-06-001")).toBeNull();
  });

  test("renders payroll paid and payment waiting totals", () => {
    render(
      <ReportsSurface
        cashBankMovements={[
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
        ]}
        cheques={[]}
        payrollAccruals={[
          createPayrollAccrual(),
          createPayrollAccrual({
            documentNo: "MAAS-PNT-2026-06-002",
            id: "payroll-accrual-2",
            netTotal: 12000,
            sourceTimesheetId: "timesheet-2",
            sourceTimesheetNo: "PNT-2026-06-002",
          }),
        ]}
        purchaseInvoices={[]}
        progressPayments={[]}
        timesheets={[]}
        today="2026-06-27"
      />,
    );

    expect(screen.getByText("Ödenen Maaş")).toBeTruthy();
    expect(screen.getByText("Ödeme Bekleyen Maaş")).toBeTruthy();
    expect(screen.getAllByText("31.500,00 TL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("12.000,00 TL")).toHaveLength(2);
  });

  test("renders purchase invoice paid and payment waiting totals", () => {
    render(
      <ReportsSurface
        cashBankMovements={[
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
        ]}
        cheques={[]}
        payrollAccruals={[]}
        purchaseInvoices={[
          createPurchaseInvoice({
            documentNo: "FAT-0006",
            grandTotal: 16200,
            id: "invoice-1",
          }),
          createPurchaseInvoice({
            documentNo: "FAT-0007",
            grandTotal: 12000,
            id: "invoice-2",
          }),
        ]}
        progressPayments={[]}
        timesheets={[]}
        today="2026-06-27"
      />,
    );

    expect(screen.getByText("Ödenen Fatura")).toBeTruthy();
    expect(screen.getByText("Ödeme Bekleyen Fatura")).toBeTruthy();
    expect(screen.getAllByText("16.200,00 TL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("12.000,00 TL").length).toBeGreaterThan(0);
  });

  test("renders site income progress payment collection totals", () => {
    render(
      <ReportsSurface
        cashBankMovements={[
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
        ]}
        cheques={[]}
        payrollAccruals={[]}
        purchaseInvoices={[]}
        progressPayments={[
          createProgressPayment({
            counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
            documentNo: "HAK-0004",
            grandTotal: 15000,
            id: "progress-payment-4",
            paymentType: "Şantiye Geliri",
          }),
          createProgressPayment({
            counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
            documentNo: "HAK-0005",
            grandTotal: 8000,
            id: "progress-payment-5",
            paymentType: "Şantiye Geliri",
          }),
        ]}
        timesheets={[]}
        today="2026-06-27"
      />,
    );

    expect(screen.getByText("Tahsil Edilen Hakediş Geliri")).toBeTruthy();
    expect(screen.getByText("Tahsilat Bekleyen Hakediş Geliri")).toBeTruthy();
    expect(screen.getAllByText("15.000,00 TL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("8.000,00 TL").length).toBeGreaterThan(0);
  });

  test("renders site profitability summary rows", () => {
    render(
      <ReportsSurface
        cashBankMovements={[]}
        cheques={[]}
        payrollAccruals={[
          createPayrollAccrual({
            netTotal: 31500,
            sourceTimesheetId: "timesheet-1",
          }),
        ]}
        purchaseInvoices={[createPurchaseInvoice({ grandTotal: 12000 })]}
        progressPayments={[
          createProgressPayment({
            counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
            documentNo: "HAK-GELIR-0001",
            grandTotal: 90000,
            id: "progress-payment-income-1",
            paymentType: "Şantiye Geliri",
          }),
          createProgressPayment({
            documentNo: "HAK-TAS-0001",
            grandTotal: 18000,
            id: "progress-payment-cost-1",
            paymentType: "Taşeron Hakedişi",
          }),
        ]}
        timesheets={[
          createTimesheet(),
          createTimesheet({
            documentNo: "PNT-2026-06-002",
            id: "timesheet-2",
            netTotal: 8500,
          }),
        ]}
        today="2026-06-27"
      />,
    );

    expect(screen.getByText("Şantiye Kârlılık Özeti")).toBeTruthy();
    expect(screen.getAllByText("ŞİRKET MERKEZ ŞANTİYESİ").length).toBeGreaterThan(0);
    expect(screen.getAllByText("90.000,00 TL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("70.000,00 TL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("20.000,00 TL").length).toBeGreaterThan(0);
  });

  test("renders counterparty balance summary rows", () => {
    render(
      <ReportsSurface
        cashBankMovements={[
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
        ]}
        cheques={[]}
        payrollAccruals={[]}
        purchaseInvoices={[
          createPurchaseInvoice({
            counterpartyName: "ABC Beton",
            grandTotal: 12000,
            id: "invoice-1",
          }),
        ]}
        progressPayments={[
          createProgressPayment({
            counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
            documentNo: "HAK-GELIR-0001",
            grandTotal: 15000,
            id: "progress-payment-income-1",
            paymentType: "Şantiye Geliri",
          }),
        ]}
        timesheets={[]}
        today="2026-06-27"
      />,
    );

    expect(screen.getByText("Cari Bakiye Özeti")).toBeTruthy();
    expect(screen.getAllByText("ABC Beton").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ŞİRKET MERKEZ ŞANTİYESİ").length).toBeGreaterThan(0);
    expect(screen.getAllByText("12.000,00 TL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-7.000,00 TL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("11.000,00 TL").length).toBeGreaterThan(0);
  });

  test("renders selected counterparty statement detail rows", () => {
    render(
      <ReportsSurface
        cashBankMovements={[
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
        ]}
        cheques={[]}
        payrollAccruals={[]}
        purchaseInvoices={[
          createPurchaseInvoice({
            counterpartyName: "ABC Beton",
            documentNo: "FAT-0001",
            grandTotal: 12000,
            id: "invoice-1",
            invoiceDate: "2026-06-20",
          }),
        ]}
        progressPayments={[
          createProgressPayment({
            counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
            documentNo: "HAK-GELIR-0001",
            grandTotal: 15000,
            id: "progress-payment-income-1",
            issueDate: "2026-06-27",
            paymentType: "Şantiye Geliri",
          }),
        ]}
        timesheets={[]}
        today="2026-06-27"
      />,
    );

    fireEvent.change(screen.getByLabelText("Cari ekstresi"), {
      target: { value: "ABC Beton" },
    });

    expect(screen.getByText("Cari Hareket Ekstresi")).toBeTruthy();

    const detailTable = screen.getByLabelText("Cari hareket ekstresi tablosu");

    expect(within(detailTable).getByText("FAT-0001")).toBeTruthy();
    expect(within(detailTable).getByText("ODM-FAT-0001")).toBeTruthy();
    expect(
      within(detailTable).getAllByText("-12.000,00 TL").length,
    ).toBeGreaterThan(0);
    expect(within(detailTable).getByText("-7.000,00 TL")).toBeTruthy();
    expect(
      within(detailTable)
        .getByRole("link", {
          name: "FAT-0001 evrakına git",
        })
        .getAttribute("href"),
    ).toBe("/faturalar?evrak=FAT-0001");
    expect(within(detailTable).queryByText("HAK-GELIR-0001")).toBeNull();
  });

  test("exports the visible counterparty statement rows as csv", () => {
    render(
      <ReportsSurface
        cashBankMovements={[
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
        ]}
        cheques={[]}
        payrollAccruals={[]}
        purchaseInvoices={[
          createPurchaseInvoice({
            counterpartyName: "ABC Beton",
            documentNo: "FAT-0001",
            grandTotal: 12000,
            id: "invoice-1",
            invoiceDate: "2026-06-20",
          }),
        ]}
        progressPayments={[
          createProgressPayment({
            counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
            documentNo: "HAK-GELIR-0001",
            grandTotal: 15000,
            id: "progress-payment-income-1",
            issueDate: "2026-06-27",
            paymentType: "Şantiye Geliri",
          }),
        ]}
        timesheets={[]}
        today="2026-06-27"
      />,
    );

    fireEvent.change(screen.getByLabelText("Cari ekstresi"), {
      target: { value: "ABC Beton" },
    });

    const csvLink = screen.getByRole("link", {
      name: "Cari ekstresi CSV indir",
    });

    expect(csvLink.getAttribute("download")).toBe(
      "cari-ekstresi-abc-beton.csv",
    );
    expect(decodeURIComponent(csvLink.getAttribute("href") ?? "")).toContain(
      "FAT-0001",
    );
    expect(decodeURIComponent(csvLink.getAttribute("href") ?? "")).toContain(
      "ODM-FAT-0001",
    );
    expect(decodeURIComponent(csvLink.getAttribute("href") ?? "")).not.toContain(
      "HAK-GELIR-0001",
    );
  });

  test("exports visible report summary tables as csv", () => {
    render(
      <ReportsSurface
        cashBankMovements={[
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
        ]}
        cheques={[]}
        payrollAccruals={[]}
        purchaseInvoices={[
          createPurchaseInvoice({
            counterpartyName: "ABC Beton",
            documentNo: "FAT-0001",
            grandTotal: 12000,
            id: "invoice-1",
            invoiceDate: "2026-06-20",
          }),
        ]}
        progressPayments={[
          createProgressPayment({
            counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
            documentNo: "HAK-GELIR-0001",
            grandTotal: 90000,
            id: "progress-payment-income-1",
            issueDate: "2026-06-27",
            paymentType: "Şantiye Geliri",
          }),
        ]}
        timesheets={[]}
        today="2026-06-27"
      />,
    );

    const siteCsvLink = screen.getByRole("link", {
      name: "Şantiye kârlılık CSV indir",
    });
    const balanceCsvLink = screen.getByRole("link", {
      name: "Cari bakiye CSV indir",
    });
    const activityCsvLink = screen.getByRole("link", {
      name: "Son hareketler CSV indir",
    });

    expect(siteCsvLink.getAttribute("download")).toBe(
      "rapor-santiye-karlilik.csv",
    );
    expect(decodeURIComponent(siteCsvLink.getAttribute("href") ?? "")).toContain(
      "ŞİRKET MERKEZ ŞANTİYESİ",
    );
    expect(balanceCsvLink.getAttribute("download")).toBe(
      "rapor-cari-bakiye.csv",
    );
    expect(
      decodeURIComponent(balanceCsvLink.getAttribute("href") ?? ""),
    ).toContain("ABC Beton");
    expect(activityCsvLink.getAttribute("download")).toBe(
      "rapor-son-hareketler.csv",
    );
    expect(
      decodeURIComponent(activityCsvLink.getAttribute("href") ?? ""),
    ).toContain("ODM-FAT-0001");
  });

  test("prints the currently filtered report scope", () => {
    const print = vi.fn();

    Object.defineProperty(window, "print", {
      configurable: true,
      value: print,
    });

    render(
      <ReportsSurface
        cashBankMovements={[createCashBankMovement()]}
        cheques={[createCheque()]}
        payrollAccruals={[createPayrollAccrual()]}
        purchaseInvoices={[createPurchaseInvoice()]}
        progressPayments={[createProgressPayment()]}
        timesheets={[createTimesheet()]}
        today="2026-06-27"
      />,
    );

    fireEvent.change(screen.getByLabelText("Rapor kaynağı"), {
      target: { value: "Kasa/Banka" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Yazdır" }));

    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe(
      "Yazdırma kapsamı hazır: 1 hareket.",
    );
  });

  test("renders progress payment paid and payment waiting totals", () => {
    render(
      <ReportsSurface
        cashBankMovements={[
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
        ]}
        cheques={[]}
        payrollAccruals={[]}
        purchaseInvoices={[]}
        progressPayments={[
          createProgressPayment(),
          createProgressPayment({
            documentNo: "HAK-0002",
            grandTotal: 9000,
            id: "progress-payment-2",
          }),
        ]}
        timesheets={[]}
        today="2026-06-27"
      />,
    );

    expect(screen.getByText("Ödenen Hakediş")).toBeTruthy();
    expect(screen.getByText("Ödeme Bekleyen Hakediş")).toBeTruthy();
    expect(screen.getAllByText("11.400,00 TL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("9.000,00 TL").length).toBeGreaterThan(0);
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

function createCheque(): ChequeRow {
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




