import { describe, expect, test } from "vitest";
import { buildSiteFinanceSummary } from "./site-finance-summary";

describe("site finance summary", () => {
  test("combines posted site income and costs with de-duplicated labor", () => {
    const base = { siteCode: "SANT-1", siteName: "Merkez" };
    const result = buildSiteFinanceSummary({
      expenses: [
        { ...base, status: "Kaydedildi", grandTotal: 100 },
        { ...base, status: "Taslak", grandTotal: 800 },
        { ...base, status: "İptal", grandTotal: 900 },
      ] as never,
      payrollAccruals: [
        {
          ...base,
          status: "Kaydedildi",
          netTotal: 80,
          sourceTimesheetId: "timesheet-linked",
        },
      ] as never,
      purchaseInvoices: [{ ...base, status: "Kaydedildi", grandTotal: 200 }] as never,
      salesInvoices: [{ ...base, status: "Kaydedildi", grandTotal: 250 }, { ...base, status: "İptal", grandTotal: 700 }] as never,
      progressPayments: [{ ...base, status: "Kaydedildi", paymentType: "Şantiye Geliri", grandTotal: 1000 }, { ...base, status: "Kaydedildi", paymentType: "Taşeron Hakedişi", grandTotal: 300 }] as never,
      timesheets: [
        { ...base, id: "timesheet-linked", status: "Kaydedildi", netTotal: 70 },
        { ...base, id: "timesheet-standalone", status: "Kaydedildi", netTotal: 20 },
      ] as never,
    });
    expect(result).toEqual([
      {
        ...base,
        incomeTotal: 1250,
        expenseTotal: 100,
        laborTotal: 100,
        purchaseTotal: 200,
        subcontractorTotal: 300,
        netTotal: 550,
      },
    ]);
  });
});
