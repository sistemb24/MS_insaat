/**
 * @vitest-environment jsdom
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { CashBankMovementRow } from "@/lib/cash-bank-movement-service";
import type { PayrollAccrualRow } from "@/lib/payroll-accrual-service";
import type { TimesheetRow } from "@/lib/timesheet-service";

import { PayrollAccrualSurface } from "./payroll-accrual-surface";

const originalPrint = window.print;

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "print", {
    configurable: true,
    value: originalPrint,
  });
});

describe("PayrollAccrualSurface", () => {
  test("renders accrual list and totals", () => {
    render(
      <PayrollAccrualSurface
        rows={[createPayrollAccrualRow()]}
        sourceTimesheets={[createTimesheetRow()]}
      />,
    );

    expect(screen.getByText("Maaş Tahakkuku")).toBeTruthy();
    expect(screen.getByText("PNT-2026-06-001")).toBeTruthy();
    expect(screen.getByText("MAAS-PNT-2026-06-001")).toBeTruthy();
    expect(screen.getAllByText("31.500,00 TL")).toHaveLength(3);
    expect(screen.getByText("Bekleyen Puantaj")).toBeTruthy();
  });

  test("highlights the payroll accrual row matching the requested document number", () => {
    render(
      <PayrollAccrualSurface
        highlightedDocumentNo="MAAS-PNT-2026-06-002"
        rows={[
          createPayrollAccrualRow(),
          createPayrollAccrualRow({
            documentNo: "MAAS-PNT-2026-06-002",
            id: "payroll-accrual-2",
            sourceTimesheetId: "timesheet-2",
            sourceTimesheetNo: "PNT-2026-06-002",
          }),
        ]}
        sourceTimesheets={[]}
      />,
    );

    const highlightedRow = screen.getAllByRole("row", {
      name: /MAAS-PNT-2026-06-002/i,
    })[0];

    expect(highlightedRow?.getAttribute("data-highlighted")).toBe("true");
  });

  test("shows the linked ledger document for a posted payroll accrual", () => {
    render(
      <PayrollAccrualSurface
        rows={[createPayrollAccrualRow({ status: "Kaydedildi", ledgerDocumentNo: "YVM-MAAS-MAAS-PNT-2026-06-001" })]}
        sourceTimesheets={[]}
      />,
    );

    expect(screen.getByText("Fiş: YVM-MAAS-MAAS-PNT-2026-06-001")).toBeTruthy();
  });

  test("creates accrual from posted timesheet", async () => {
    const createPayrollAccrualFromTimesheet = vi.fn(
      async (
        timesheetId: string,
      ): Promise<{ ok: true; data: PayrollAccrualRow }> => ({
        ok: true,
        data: createPayrollAccrualRow({ sourceTimesheetId: timesheetId }),
      }),
    );

    render(
      <PayrollAccrualSurface
        persistence={{ createPayrollAccrualFromTimesheet }}
        rows={[]}
        sourceTimesheets={[createTimesheetRow()]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Tahakkuk Oluştur" }),
    );

    await waitFor(() =>
      expect(createPayrollAccrualFromTimesheet).toHaveBeenCalledWith(
        "timesheet-1",
      ),
    );
    expect(screen.getByText("MAAS-PNT-2026-06-001")).toBeTruthy();
  });

  test("posts accrual rows and disables unsafe direct cancellation", async () => {
    const postPayrollAccrual = vi.fn(
      async (id: string): Promise<{ ok: true; data: PayrollAccrualRow }> => ({
        ok: true,
        data: createPayrollAccrualRow({ id, status: "Kaydedildi" }),
      }),
    );
    const cancelPayrollAccrual = vi.fn(
      async (id: string): Promise<{ ok: true; data: PayrollAccrualRow }> => ({
        ok: true,
        data: createPayrollAccrualRow({ id, status: "İptal" }),
      }),
    );

    render(
      <PayrollAccrualSurface
        persistence={{ cancelPayrollAccrual, postPayrollAccrual }}
        rows={[createPayrollAccrualRow()]}
        sourceTimesheets={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Kesinleştir" }));

    await waitFor(() =>
      expect(postPayrollAccrual).toHaveBeenCalledWith("payroll-accrual-1"),
    );
    expect(screen.getByText("Kaydedildi")).toBeTruthy();

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "İptal" }).hasAttribute("disabled"),
      ).toBe(true),
    );
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));

    expect(cancelPayrollAccrual).not.toHaveBeenCalled();
  });

  test("cancels draft accrual rows from the list", async () => {
    const cancelPayrollAccrual = vi.fn(
      async (id: string): Promise<{ ok: true; data: PayrollAccrualRow }> => ({
        ok: true,
        data: createPayrollAccrualRow({ id, status: "İptal" }),
      }),
    );

    render(
      <PayrollAccrualSurface
        persistence={{ cancelPayrollAccrual }}
        rows={[createPayrollAccrualRow()]}
        sourceTimesheets={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "İptal" }));

    await waitFor(() =>
      expect(cancelPayrollAccrual).toHaveBeenCalledWith("payroll-accrual-1"),
    );
    expect(screen.getAllByText("İptal").length).toBeGreaterThan(0);
  });

  test("creates an admin-confirmed controlled reversal for posted accruals", async () => {
    const reversePayrollAccrual = vi.fn(
      async (id: string): Promise<{ ok: true; data: PayrollAccrualRow }> => ({
        ok: true,
        data: createPayrollAccrualRow({ id, status: "İptal" }),
      }),
    );
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <PayrollAccrualSurface
        canReverse
        paymentMovements={[createPayrollPaymentMovement()]}
        persistence={{ reversePayrollAccrual }}
        rows={[createPayrollAccrualRow({ status: "Kaydedildi" })]}
        sourceTimesheets={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ters Kayıt" }));

    await waitFor(() =>
      expect(reversePayrollAccrual).toHaveBeenCalledWith("payroll-accrual-1"),
    );
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("İptal").length).toBeGreaterThan(0);
    expect(screen.queryByText("Ödendi")).toBeNull();
    confirm.mockRestore();
  });

  test("keeps controlled reversal disabled for non-admin users", () => {
    const reversePayrollAccrual = vi.fn();

    render(
      <PayrollAccrualSurface
        persistence={{ reversePayrollAccrual }}
        rows={[createPayrollAccrualRow({ status: "Kaydedildi" })]}
        sourceTimesheets={[]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Ters Kayıt" }).hasAttribute("disabled"),
    ).toBe(true);
  });

  test("creates payment movement for posted accrual rows", async () => {
    const payPayrollAccrual = vi.fn(
      async (id: string): Promise<{ ok: true; data: CashBankMovementRow }> => ({
        ok: true,
        data: createPayrollPaymentMovement({ sourceId: id }),
      }),
    );

    render(
      <PayrollAccrualSurface
        paymentMovements={[]}
        persistence={{ payPayrollAccrual }}
        rows={[createPayrollAccrualRow({ status: "Kaydedildi" })]}
        sourceTimesheets={[]}
      />,
    );

    expect(screen.getByText("Bekliyor")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ödeme Oluştur" }));

    await waitFor(() =>
      expect(payPayrollAccrual).toHaveBeenCalledWith("payroll-accrual-1"),
    );
    expect(screen.getByText("Ödendi")).toBeTruthy();
  });

  test("uses selected cash bank account when creating payment movement", async () => {
    const payPayrollAccrual = vi.fn(
      async (
        id: string,
        account?: { code: string; name: string },
      ): Promise<{ ok: true; data: CashBankMovementRow }> => ({
        ok: true,
        data: createPayrollPaymentMovement({
          accountCode: account?.code ?? "KASA-0001",
          accountName: account?.name ?? "MERKEZ KASA",
          sourceId: id,
        }),
      }),
    );

    render(
      <PayrollAccrualSurface
        accountOptions={[
          { code: "KASA-0001", name: "MERKEZ KASA" },
          { code: "BANKA-0002", name: "MERKEZ BANKA" },
        ]}
        paymentMovements={[]}
        persistence={{ payPayrollAccrual }}
        rows={[createPayrollAccrualRow({ status: "Kaydedildi" })]}
        sourceTimesheets={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Ödeme hesabı"), {
      target: { value: "BANKA-0002" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ödeme Oluştur" }));

    await waitFor(() =>
      expect(payPayrollAccrual).toHaveBeenCalledWith("payroll-accrual-1", {
        code: "BANKA-0002",
        name: "MERKEZ BANKA",
      }),
    );
    expect(screen.getByText("Ödendi")).toBeTruthy();
  });

  test("shows payment account and movement date for paid accrual rows", () => {
    render(
      <PayrollAccrualSurface
        paymentMovements={[
          createPayrollPaymentMovement({
            accountCode: "BANKA-0002",
            accountName: "MERKEZ BANKA",
            movementDate: "2026-06-30",
            ledgerDocumentNo: "YVM-ODM-ODM-MAAS-PNT-2026-06-001",
          }),
        ]}
        rows={[createPayrollAccrualRow({ status: "Kaydedildi" })]}
        sourceTimesheets={[]}
      />,
    );

    expect(screen.getByText("Ödendi")).toBeTruthy();
    expect(screen.getByText("MERKEZ BANKA")).toBeTruthy();
    expect(screen.getByText("30.06.2026")).toBeTruthy();
    expect(screen.getByText("Muhasebe fişi: YVM-ODM-ODM-MAAS-PNT-2026-06-001")).toBeTruthy();
  });

  test("summarizes paid and payment waiting accrual counts", () => {
    render(
      <PayrollAccrualSurface
        paymentMovements={[createPayrollPaymentMovement()]}
        rows={[
          createPayrollAccrualRow({ status: "Kaydedildi" }),
          createPayrollAccrualRow({
            documentNo: "MAAS-PNT-2026-06-002",
            id: "payroll-accrual-2",
            sourceTimesheetId: "timesheet-2",
            sourceTimesheetNo: "PNT-2026-06-002",
            status: "Kaydedildi",
          }),
        ]}
        sourceTimesheets={[]}
      />,
    );

    expectMetric("Ödenen Tahakkuk", "1");
    expectMetric("Ödeme Bekleyen", "1");
  });

  test("prints the visible payroll accrual list scope", () => {
    const print = vi.fn();
    Object.defineProperty(window, "print", {
      configurable: true,
      value: print,
    });

    render(
      <PayrollAccrualSurface
        rows={[createPayrollAccrualRow()]}
        sourceTimesheets={[]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Tahakkukları Yazdır" }),
    );

    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toContain(
      "Yazdırma kapsamı hazır: 1 tahakkuk.",
    );
  });

  test("filters bordro metrics, list and print scope from the same rows", () => {
    const print = vi.fn();
    Object.defineProperty(window, "print", {
      configurable: true,
      value: print,
    });

    render(
      <PayrollAccrualSurface
        paymentMovements={[createPayrollPaymentMovement()]}
        rows={[
          createPayrollAccrualRow({ status: "Kaydedildi" }),
          createPayrollAccrualRow({
            documentNo: "MAAS-PNT-2026-06-002",
            id: "payroll-accrual-2",
            sourceTimesheetId: "timesheet-2",
            sourceTimesheetNo: "PNT-2026-06-002",
            status: "Taslak",
          }),
        ]}
        sourceTimesheets={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ödenmiş" }));

    expect(screen.getByText("MAAS-PNT-2026-06-001")).toBeTruthy();
    expect(screen.queryByText("MAAS-PNT-2026-06-002")).toBeNull();
    expectMetric("Tahakkuk", "1");
    fireEvent.click(screen.getByRole("button", { name: "Tahakkukları Yazdır" }));

    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toContain(
      "Yazdırma kapsamı hazır: 1 tahakkuk.",
    );
  });
});

function expectMetric(label: string, value: string) {
  const metric = screen.getByText(label).closest("article");

  expect(metric).toBeTruthy();
  expect(within(metric!).getByText(value)).toBeTruthy();
}

function createTimesheetRow(): TimesheetRow {
  return {
    id: "timesheet-1",
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    contractorCode: "TAS-0001",
    contractorName: "ŞİRKETİN TAŞERONU",
    createdAt: "2026-06-27T10:00:00.000Z",
    createdBy: "user-main",
    deductionTotal: 500,
    description: "Haziran puantajı",
    documentNo: "PNT-2026-06-001",
    grossTotal: 32000,
    lineCount: 2,
    lines: [
      {
        advanceDeduction: 500,
        dailyWage: 1000,
        debtDeduction: 0,
        overtimeHourlyRate: 100,
        overtimeHours: 10,
        personCode: "PRS-0001",
        personName: "MEHMET YILMAZ",
        workedDays: 20,
      },
      {
        advanceDeduction: 0,
        dailyWage: 1100,
        debtDeduction: 0,
        overtimeHourlyRate: 90,
        overtimeHours: 0,
        personCode: "PRS-0002",
        personName: "AYŞE DEMİR",
        workedDays: 10,
      },
    ],
    month: 6,
    netTotal: 31500,
    siteCode: "SANT-0001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    status: "Kaydedildi",
    totalOvertimeHours: 10,
    totalWorkedDays: 30,
    updatedAt: "2026-06-27T11:00:00.000Z",
    updatedBy: "user-main",
    year: 2026,
  };
}

function createPayrollAccrualRow(
  overrides: Partial<PayrollAccrualRow> = {},
): PayrollAccrualRow {
  return {
    id: "payroll-accrual-1",
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    contractorCode: "TAS-0001",
    contractorName: "ŞİRKETİN TAŞERONU",
    createdAt: "2026-06-27T12:00:00.000Z",
    createdBy: "user-main",
    deductionTotal: 500,
    documentNo: "MAAS-PNT-2026-06-001",
    grossTotal: 32000,
    lineCount: 2,
    lines: [
      {
        advanceDeduction: 500,
        debtDeduction: 0,
        deductionTotal: 500,
        grossTotal: 21000,
        netTotal: 20500,
        overtimeHours: 10,
        personCode: "PRS-0001",
        personName: "MEHMET YILMAZ",
        regularWorkedDays: 20,
      },
      {
        advanceDeduction: 0,
        debtDeduction: 0,
        deductionTotal: 0,
        grossTotal: 11000,
        netTotal: 11000,
        overtimeHours: 0,
        personCode: "PRS-0002",
        personName: "AYŞE DEMİR",
        regularWorkedDays: 10,
      },
    ],
    month: 6,
    netTotal: 31500,
    siteCode: "SANT-0001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    sourceTimesheetId: "timesheet-1",
    sourceTimesheetNo: "PNT-2026-06-001",
    status: "Taslak",
    updatedAt: "2026-06-27T12:00:00.000Z",
    updatedBy: "user-main",
    year: 2026,
    ...overrides,
  };
}

function createPayrollPaymentMovement(
  overrides: Partial<CashBankMovementRow> = {},
): CashBankMovementRow {
  return {
    id: "payroll-payment-1",
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    accountCode: "KASA-0001",
    accountName: "MERKEZ KASA",
    amount: 31500,
    counterpartyName: "ŞİRKETİN TAŞERONU",
    createdAt: "2026-06-30T12:00:00.000Z",
    createdBy: "user-main",
    currency: "TL",
    description: "MAAS-PNT-2026-06-001 maaş ödemesi",
    direction: "Çıkış",
    documentNo: "ODM-MAAS-PNT-2026-06-001",
    movementDate: "2026-06-30",
    movementType: "Maaş Ödemesi",
    sourceId: "payroll-accrual-1",
    sourceLabel: "MAAS-PNT-2026-06-001",
    sourceType: "payroll-accrual",
    updatedAt: "2026-06-30T12:00:00.000Z",
    updatedBy: "user-main",
    ...overrides,
  };
}
