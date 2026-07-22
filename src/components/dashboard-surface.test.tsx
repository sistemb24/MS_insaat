/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { CashBankMovementRow } from "@/lib/cash-bank-movement-service";
import type { ChequeRow } from "@/lib/cheque-service";
import type { EntityRow } from "@/lib/entities";
import type { ExpenseRow } from "@/lib/expense-service";
import type { PayrollAccrualRow } from "@/lib/payroll-accrual-service";
import type { ProgressPaymentRow } from "@/lib/progress-payment-service";
import type { PurchaseInvoiceRow } from "@/lib/purchase-invoice-service";
import type { TimesheetRow } from "@/lib/timesheet-service";
import type { TenderRow } from "@/lib/tender-service";

import {
  DashboardSurface,
  normalizeDashboardCompanyPeriodFilter,
} from "./dashboard-surface";

const originalPrint = window.print;

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "print", {
    configurable: true,
    value: originalPrint,
  });
});

describe("DashboardSurface", () => {
  test("normalizes dashboard company period query values", () => {
    expect(normalizeDashboardCompanyPeriodFilter("day")).toBe("day");
    expect(normalizeDashboardCompanyPeriodFilter(["year", "month"])).toBe("year");
    expect(normalizeDashboardCompanyPeriodFilter("unknown")).toBe("month");
    expect(normalizeDashboardCompanyPeriodFilter(undefined)).toBe("month");
  });

  test("renders the P0 operational summary from existing report data", () => {
    render(
      <DashboardSurface
        cashBankMovements={[createCashBankMovement()]}
        cheques={[createCheque()]}
        payrollAccruals={[createPayrollAccrual()]}
        purchaseInvoices={[createPurchaseInvoice()]}
        progressPayments={[createProgressPayment()]}
        timesheets={[createTimesheet()]}
        today="2026-06-27"
      />,
    );

    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Rapor Para Birimi")).toBeTruthy();
    expect(screen.getByText("TL")).toBeTruthy();
    expect(screen.getByText("Bugünkü Operasyon Özeti")).toBeTruthy();
    expect(screen.getByText("Alış Fatura Borcu")).toBeTruthy();
    expect(screen.getByText("Kasa/Banka Net")).toBeTruthy();
    expect(screen.getByText("Portföy Çek")).toBeTruthy();
    expect(screen.getByText("Hakediş Toplamı")).toBeTruthy();
    expect(screen.getByText("Puantaj Net")).toBeTruthy();
    expect(screen.getByText("Maaş Tahakkuku")).toBeTruthy();
    expect(screen.getByText("Vadesi Geçen Çek")).toBeTruthy();
    expect(screen.getByText("Hızlı Modül Geçişleri")).toBeTruthy();
    expect(screen.getByText("Son Hareketler")).toBeTruthy();
    expect(screen.getAllByText("15.000,00 TL").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("5.000,00 TL").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("7.000,00 TL").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("11.400,00 TL").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("31.500,00 TL").length).toBeGreaterThanOrEqual(5);
    expect(
      screen.getByRole("img", {
        name: "Seçili dönem tahsilat ve ödeme akış grafiği",
      }),
    ).toBeTruthy();
    expect(screen.getByText("FAT-0001")).toBeTruthy();
    expect(screen.getByText("THS-0001")).toBeTruthy();
    expect(screen.getByText("CEK-0001")).toBeTruthy();
    expect(screen.getByText("HAK-0001")).toBeTruthy();
    expect(screen.getByText("PNT-2026-06-001")).toBeTruthy();
    expect(screen.getByText("MAAS-PNT-2026-06-001")).toBeTruthy();
  });

  test("renders expense totals from report data", () => {
    render(
      <DashboardSurface
        cashBankMovements={[]}
        cheques={[]}
        expenses={[createExpense()]}
        payrollAccruals={[]}
        purchaseInvoices={[]}
        progressPayments={[]}
        timesheets={[]}
        today="2026-06-30"
      />,
    );

    expect(screen.getByText("Gider Toplamı")).toBeTruthy();
    expect(screen.getAllByText("15.000,00 TL").length).toBeGreaterThan(0);
    expect(screen.getByText("GDR-0001")).toBeTruthy();
    expect(screen.getAllByText("Gider").length).toBeGreaterThanOrEqual(1);
  });

  test("renders tender dashboard alert band with upcoming deadlines and waiting results", () => {
    render(
      <DashboardSurface
        cashBankMovements={[]}
        cheques={[]}
        payrollAccruals={[]}
        purchaseInvoices={[]}
        progressPayments={[]}
        tenders={[
          createDashboardTender({
            id: "tender-upcoming-1",
            status: "Takip",
            submissionDeadline: "2026-07-02T10:00",
            tenderNo: "IHL-2026-010",
            title: "Köprü bakım yapım işi",
          }),
          createDashboardTender({
            id: "tender-upcoming-2",
            status: "Hazırlanıyor",
            submissionDeadline: "2026-07-06T12:00",
            tenderNo: "IHL-2026-011",
            title: "Okul güçlendirme yapım işi",
          }),
          createDashboardTender({
            id: "tender-waiting",
            status: "Sunuldu",
            submissionDeadline: "2026-06-28T17:00",
            tenderNo: "IHL-2026-012",
            title: "Spor salonu ikmal inşaatı",
          }),
          createDashboardTender({
            id: "tender-won",
            status: "Kazanıldı",
            submissionDeadline: "2026-07-09T11:00",
            tenderNo: "IHL-2026-013",
            title: "Kazanılan arıtma tesisi işi",
          }),
          createDashboardTender({
            id: "tender-lost",
            status: "Kaybedildi",
            submissionDeadline: "2026-07-10T11:00",
            tenderNo: "IHL-2026-014",
            title: "Kaybedilen yol yenileme işi",
          }),
        ]}
        timesheets={[]}
        today="2026-07-01"
      />,
    );

    const tenderAlerts = screen.getByLabelText("İhale dashboard uyarıları");

    expect(within(tenderAlerts).getByText("İhale Uyarıları")).toBeTruthy();
    expect(within(tenderAlerts).getByText("Yaklaşan Son Teklif")).toBeTruthy();
    expect(within(tenderAlerts).getByText("Sonuç Bekleyen")).toBeTruthy();
    expect(within(tenderAlerts).getByText("Bu Ay Kazanma Oranı")).toBeTruthy();
    expect(within(tenderAlerts).getByText("2")).toBeTruthy();
    expect(within(tenderAlerts).getByText("1")).toBeTruthy();
    expect(within(tenderAlerts).getByText("%50")).toBeTruthy();
    expect(within(tenderAlerts).getByText("Köprü bakım yapım işi")).toBeTruthy();
    expect(within(tenderAlerts).getByText("Spor salonu ikmal inşaatı")).toBeTruthy();
    expect(within(tenderAlerts).getByText("Süre doldu")).toBeTruthy();
    expect(
      within(tenderAlerts)
        .getByRole("link", { name: "İhale Yönetimine Git" })
        .getAttribute("href"),
    ).toBe("/ihale-yonetimi");
  });
  test("links to the P0 workflow routes from the dashboard", () => {
    render(
      <DashboardSurface
        cashBankMovements={[]}
        cheques={[]}
        payrollAccruals={[]}
        purchaseInvoices={[]}
        progressPayments={[]}
        timesheets={[]}
        today="2026-06-27"
      />,
    );

    expect(screen.getByRole("link", { name: "Faturalar" }).getAttribute("href"))
      .toBe("/faturalar");
    expect(screen.getByRole("link", { name: "Giderler" }).getAttribute("href"))
      .toBe("/giderler");
    expect(
      screen.getByRole("link", { name: "Kasa/Banka" }).getAttribute("href"),
    ).toBe("/kasa-banka");
    expect(screen.getByRole("link", { name: "Çek" }).getAttribute("href")).toBe(
      "/cek",
    );
    expect(screen.getByRole("link", { name: "Raporlar" }).getAttribute("href"))
      .toBe("/raporlar");
  });

  test("renders the P1 company dashboard counts and route links", () => {
    render(
      <DashboardSurface
        cashBankMovements={[]}
        cheques={[]}
        customerRows={[
          createEntityRow({ code: "MUS-0001", name: "ÖRNEK MÜŞTERİ" }),
          createEntityRow({ code: "MUS-0002", name: "YENİ MÜŞTERİ" }),
        ]}
        payrollAccruals={[]}
        purchaseInvoices={[]}
        progressPayments={[]}
        subcontractorRows={[
          createEntityRow({ code: "TAS-0001", name: "ŞİRKETİN TAŞERONU" }),
        ]}
        supplierRows={[
          createEntityRow({ code: "TED-0001", name: "ÖRNEK TEDARİKÇİ" }),
          createEntityRow({ code: "TED-0002", name: "ABC Beton" }),
          createEntityRow({ code: "TED-0003", name: "DEF Hafriyat" }),
        ]}
        timesheets={[]}
        today="2026-06-27"
      />,
    );

    const companyDashboard = screen.getByLabelText("Firmalar dashboard sayaçları");

    expect(within(companyDashboard).getByText("Firmalar Dashboard")).toBeTruthy();
    expect(within(companyDashboard).getByText("Toplam Firma")).toBeTruthy();
    expect(within(companyDashboard).getByText("6")).toBeTruthy();
    expect(within(companyDashboard).getAllByText("Müşteriler").length).toBeGreaterThan(0);
    expect(within(companyDashboard).getByText("2")).toBeTruthy();
    expect(within(companyDashboard).getAllByText("Tedarikçiler").length).toBeGreaterThan(0);
    expect(within(companyDashboard).getByText("3")).toBeTruthy();
    expect(within(companyDashboard).getAllByText("Taşeronlar").length).toBeGreaterThan(0);
    expect(within(companyDashboard).getByText("1")).toBeTruthy();
    expect(
      within(companyDashboard)
        .getByRole("link", { name: "Müşteriler 2" })
        .getAttribute("href"),
    ).toBe("/musteriler");
    expect(
      within(companyDashboard)
        .getByRole("link", { name: "Tedarikçiler 3" })
        .getAttribute("href"),
    ).toBe("/tedarikciler");
    expect(
      within(companyDashboard)
        .getByRole("link", { name: "Taşeronlar 1" })
        .getAttribute("href"),
    ).toBe("/taseronlar");
  });
  test("renders the P1 company dashboard financial metrics", () => {
    render(
      <DashboardSurface
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
          createCashBankMovement({
            amount: 16200,
            counterpartyName: "ABC Beton",
            direction: "Çıkış",
            documentNo: "ODM-FAT-0006",
            movementDate: "2026-06-30",
            movementType: "Fatura Ödemesi",
            sourceId: "invoice-6",
            sourceLabel: "FAT-0006",
            sourceType: "purchase-invoice",
          }),
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
        purchaseInvoices={[
          createPurchaseInvoice({
            counterpartyName: "ABC Beton",
            documentNo: "FAT-0006",
            grandTotal: 16200,
            id: "invoice-6",
          }),
        ]}
        progressPayments={[
          createProgressPayment({
            counterpartyName: "ŞİRKETİN TAŞERONU",
            documentNo: "HAK-0001",
            grandTotal: 11400,
            id: "progress-payment-1",
            paymentType: "Taşeron Hakedişi",
          }),
          createProgressPayment({
            counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
            documentNo: "HAK-0004",
            grandTotal: 15000,
            id: "progress-payment-4",
            paymentType: "Şantiye Geliri",
          }),
        ]}
        timesheets={[]}
        today="2026-06-30"
      />,
    );

    const companyDashboard = screen.getByLabelText("Firmalar dashboard sayaçları");

    expect(within(companyDashboard).getByText("Müşteri Tahsilatı")).toBeTruthy();
    expect(within(companyDashboard).getByText("15.000,00 TL")).toBeTruthy();
    expect(within(companyDashboard).getByText("Tedarikçi Ödemeleri")).toBeTruthy();
    expect(within(companyDashboard).getByText("16.200,00 TL")).toBeTruthy();
    expect(within(companyDashboard).getByText("Taşeron Ödemeleri")).toBeTruthy();
    expect(within(companyDashboard).getByText("11.400,00 TL")).toBeTruthy();
    expect(within(companyDashboard).getByText("Net Nakit Akışı")).toBeTruthy();
    expect(within(companyDashboard).getByText("-12.600,00 TL")).toBeTruthy();
  });

  test("filters the P1 company dashboard financial and activity metrics by period", () => {
    render(
      <DashboardSurface
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
          createCashBankMovement({
            amount: 8000,
            counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
            direction: "Giriş",
            documentNo: "THS-HAK-0005",
            movementDate: "2026-05-20",
            movementType: "Hakediş Tahsilatı",
            sourceId: "progress-payment-5",
            sourceLabel: "HAK-0005",
            sourceType: "progress-payment",
          }),
        ]}
        cheques={[]}
        companyPeriodFilter="month"
        customerRows={[
          createEntityRow({
            code: "MUS-0001",
            createdAt: "2026-06-01T09:00:00.000Z",
            name: "ŞİRKET MERKEZ ŞANTİYESİ",
          }),
        ]}
        payrollAccruals={[]}
        purchaseInvoices={[]}
        progressPayments={[
          createProgressPayment({
            counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
            documentNo: "HAK-0004",
            grandTotal: 15000,
            id: "progress-payment-4",
            issueDate: "2026-06-30",
            paymentType: "Şantiye Geliri",
          }),
          createProgressPayment({
            counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
            documentNo: "HAK-0005",
            grandTotal: 8000,
            id: "progress-payment-5",
            issueDate: "2026-05-20",
            paymentType: "Şantiye Geliri",
          }),
        ]}
        timesheets={[]}
        today="2026-06-30"
      />,
    );

    const companyDashboard = screen.getByLabelText("Firmalar dashboard sayaçları");

    expect(within(companyDashboard).getByText("Dönem: Bu Ay")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Bugün" }).getAttribute("href")).toBe(
      "/?period=day",
    );
    expect(
      screen.getByRole("link", { name: "Bu Ay" }).getAttribute("aria-current"),
    ).toBe("true");
    expect(within(companyDashboard).getByText("Müşteri Tahsilatı")).toBeTruthy();
    expect(within(companyDashboard).getAllByText("15.000,00 TL").length).toBeGreaterThan(0);
    expect(within(companyDashboard).queryByText("23.000,00 TL")).toBeNull();
    expect(within(companyDashboard).getByText("2 işlem")).toBeTruthy();
  });
  test("renders the P1 company dashboard distribution and company lists", () => {
    render(
      <DashboardSurface
        cashBankMovements={[
          createCashBankMovement({
            amount: 16200,
            counterpartyName: "ABC Beton",
            direction: "Çıkış",
            documentNo: "ODM-FAT-0006",
            movementDate: "2026-06-30",
            movementType: "Fatura Ödemesi",
            sourceId: "invoice-6",
            sourceLabel: "FAT-0006",
            sourceType: "purchase-invoice",
          }),
          createCashBankMovement({
            amount: 11400,
            counterpartyName: "ŞİRKETİN TAŞERONU",
            direction: "Çıkış",
            documentNo: "ODM-HAK-0001",
            movementDate: "2026-06-29",
            movementType: "Hakediş Ödemesi",
            sourceId: "progress-payment-1",
            sourceLabel: "HAK-0001",
            sourceType: "progress-payment",
          }),
        ]}
        cheques={[]}
        customerRows={[
          createEntityRow({
            code: "MUS-0001",
            createdAt: "2026-06-28T09:00:00.000Z",
            name: "ÖRNEK MÜŞTERİ",
          }),
          createEntityRow({
            code: "MUS-0002",
            createdAt: "2026-06-30T09:00:00.000Z",
            name: "YENİ MÜŞTERİ",
          }),
        ]}
        payrollAccruals={[]}
        purchaseInvoices={[
          createPurchaseInvoice({
            counterpartyName: "ABC Beton",
            documentNo: "FAT-0006",
            grandTotal: 16200,
            id: "invoice-6",
          }),
        ]}
        progressPayments={[
          createProgressPayment({
            counterpartyName: "ŞİRKETİN TAŞERONU",
            documentNo: "HAK-0001",
            grandTotal: 11400,
            id: "progress-payment-1",
            paymentType: "Taşeron Hakedişi",
          }),
        ]}
        subcontractorRows={[
          createEntityRow({
            code: "TAS-0001",
            createdAt: "2026-06-29T09:00:00.000Z",
            name: "ŞİRKETİN TAŞERONU",
          }),
        ]}
        supplierRows={[
          createEntityRow({
            code: "TED-0001",
            createdAt: "2026-06-27T09:00:00.000Z",
            name: "ÖRNEK TEDARİKÇİ",
          }),
          createEntityRow({
            code: "TED-0002",
            createdAt: "2026-06-26T09:00:00.000Z",
            name: "ABC Beton",
          }),
          createEntityRow({
            code: "TED-0003",
            createdAt: "2026-06-25T09:00:00.000Z",
            name: "DEF Hafriyat",
          }),
        ]}
        timesheets={[]}
        today="2026-06-30"
      />,
    );

    const companyDashboard = screen.getByLabelText("Firmalar dashboard sayaçları");

    expect(within(companyDashboard).getByText("Firma Tipi Dağılımı")).toBeTruthy();
    expect(within(companyDashboard).getByText("%33")).toBeTruthy();
    expect(within(companyDashboard).getByText("%50")).toBeTruthy();
    expect(within(companyDashboard).getByText("%17")).toBeTruthy();
    expect(within(companyDashboard).getByText("En Aktif Firmalar")).toBeTruthy();
    expect(within(companyDashboard).getByText("ABC Beton")).toBeTruthy();
    expect(within(companyDashboard).getAllByText("2 işlem").length).toBeGreaterThan(0);
    expect(within(companyDashboard).getAllByText("ŞİRKETİN TAŞERONU").length).toBeGreaterThan(0);
    expect(within(companyDashboard).getAllByText("2 işlem").length).toBeGreaterThan(0);
    expect(within(companyDashboard).getByText("Son Eklenen Firmalar")).toBeTruthy();
    expect(within(companyDashboard).getByText("YENİ MÜŞTERİ")).toBeTruthy();
    expect(within(companyDashboard).getByText("30.06.2026")).toBeTruthy();
  });

  test("renders the P1 monthly new company trend from created dates", () => {
    render(
      <DashboardSurface
        cashBankMovements={[]}
        cheques={[]}
        customerRows={[
          createEntityRow({
            code: "MUS-0001",
            createdAt: "2026-05-05T09:00:00.000Z",
            name: "MAYIS MÜŞTERİ",
          }),
          createEntityRow({
            code: "MUS-0002",
            createdAt: "2026-06-10T09:00:00.000Z",
            name: "HAZİRAN MÜŞTERİ",
          }),
        ]}
        payrollAccruals={[]}
        purchaseInvoices={[]}
        progressPayments={[]}
        subcontractorRows={[
          createEntityRow({
            code: "TAS-0001",
            createdAt: "2026-07-02T09:00:00.000Z",
            name: "TEMMUZ TAŞERON",
          }),
        ]}
        supplierRows={[
          createEntityRow({
            code: "TED-0001",
            createdAt: "2026-06-15T09:00:00.000Z",
            name: "HAZİRAN TEDARİKÇİ",
          }),
          createEntityRow({
            code: "TED-0002",
            createdAt: "2026-07-01T09:00:00.000Z",
            name: "TEMMUZ TEDARİKÇİ",
          }),
        ]}
        timesheets={[]}
        today="2026-07-15"
      />,
    );

    const companyDashboard = screen.getByLabelText("Firmalar dashboard sayaçları");

    expect(within(companyDashboard).getByText("Aylık Yeni Firma Trendi")).toBeTruthy();
    expect(within(companyDashboard).getByText("May 2026")).toBeTruthy();
    expect(within(companyDashboard).getByText("Haz 2026")).toBeTruthy();
    expect(within(companyDashboard).getByText("Tem 2026")).toBeTruthy();
    expect(within(companyDashboard).getByText("1 yeni firma")).toBeTruthy();
    expect(within(companyDashboard).getAllByText("2 yeni firma").length).toBeGreaterThanOrEqual(2);
  });

  test("renders accessible chart layers for the P1 company dashboard analytics", () => {
    render(
      <DashboardSurface
        cashBankMovements={[]}
        cheques={[]}
        customerRows={[
          createEntityRow({
            code: "MUS-0001",
            createdAt: "2026-06-01T09:00:00.000Z",
            name: "MÜŞTERİ A",
          }),
          createEntityRow({
            code: "MUS-0002",
            createdAt: "2026-06-03T09:00:00.000Z",
            name: "MÜŞTERİ B",
          }),
        ]}
        payrollAccruals={[]}
        purchaseInvoices={[]}
        progressPayments={[]}
        subcontractorRows={[
          createEntityRow({
            code: "TAS-0001",
            createdAt: "2026-07-02T09:00:00.000Z",
            name: "TAŞERON A",
          }),
        ]}
        supplierRows={[
          createEntityRow({
            code: "TED-0001",
            createdAt: "2026-07-01T09:00:00.000Z",
            name: "TEDARİKÇİ A",
          }),
        ]}
        timesheets={[]}
        today="2026-07-15"
      />,
    );

    const companyDashboard = screen.getByLabelText("Firmalar dashboard sayaçları");

    expect(
      within(companyDashboard).getByRole("img", {
        name: "Firma tipi dağılım grafiği",
      }),
    ).toBeTruthy();
    expect(
      within(companyDashboard).getByRole("img", {
        name: "Aylık yeni firma trend grafiği",
      }),
    ).toBeTruthy();
    expect(
      within(companyDashboard).getByText("Müşteriler %50"),
    ).toBeTruthy();
    expect(within(companyDashboard).getByText("Tem 2026 2 yeni firma")).toBeTruthy();
  });

  test("prints the dashboard operational summary scope", () => {
    const print = vi.fn();
    Object.defineProperty(window, "print", {
      configurable: true,
      value: print,
    });

    render(
      <DashboardSurface
        cashBankMovements={[createCashBankMovement()]}
        cheques={[]}
        payrollAccruals={[]}
        purchaseInvoices={[]}
        progressPayments={[]}
        timesheets={[]}
        today="2026-06-27"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Dashboard Özetini Yazdır" }),
    );

    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toContain(
      "Yazdırma kapsamı hazır: 1 son hareket.",
    );
  });

  test("renders payroll paid and payment waiting totals from report data", () => {
    render(
      <DashboardSurface
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
    expect(screen.getAllByText("12.000,00 TL").length).toBeGreaterThan(0);
  });

  test("renders purchase invoice paid and payment waiting totals from report data", () => {
    render(
      <DashboardSurface
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

  test("renders site income progress payment collection totals from report data", () => {
    render(
      <DashboardSurface
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
  test("renders progress payment paid and payment waiting totals from report data", () => {
    render(
      <DashboardSurface
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

function createTimesheet(): TimesheetRow {
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
  };
}

function createEntityRow(overrides: Partial<EntityRow> = {}): EntityRow {
  return {
    balance: "0,00 TL",
    code: "CAR-0001",
    name: "ÖRNEK FİRMA",
    status: "Aktif",
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
function createDashboardTender(overrides: Partial<TenderRow>): TenderRow {
  return {
    authorityName: "İstanbul Büyükşehir Belediyesi",
    bidValue: 0,
    contractValue: 0,
    estimatedValue: 0,
    id: "dashboard-tender",
    ikn: "2026/100001",
    procedure: "Açık",
    status: "Takip",
    submissionDeadline: "2026-07-01T12:00",
    tenderNo: "IHL-0001",
    title: "Altyapı yenileme yapım işi",
    ...overrides,
  };
}



