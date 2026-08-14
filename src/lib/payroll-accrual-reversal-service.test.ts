import { describe, expect, test, vi } from "vitest";

import type { CashBankMovementRow } from "./cash-bank-movement-service";
import type { LedgerJournalRow } from "./ledger-service";
import {
  buildPayrollAccrualReversalCommand,
  createPayrollAccrualReversalService,
} from "./payroll-accrual-reversal-service";
import type { PayrollAccrualRow } from "./payroll-accrual-service";
import { defaultTenantScope } from "./tenant-scope";

const adminScope = { ...defaultTenantScope, userRole: "admin" as const };

describe("payroll accrual reversal service", () => {
  test("builds balanced accrual and payment reversal records", () => {
    const result = buildPayrollAccrualReversalCommand({
      payrollAccrual: createPayroll(),
      originalAccrualLedger: createAccrualLedger(),
      originalPayment: createPayment(),
      originalPaymentLedger: createPaymentLedger(),
      scope: adminScope,
      timestamp: "2026-08-14T10:00:00.000Z",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.cancelledPayrollAccrual.status).toBe("İptal");
    expect(result.data.reversal.accrualLedger).toMatchObject({
      documentNo: "YVM-IA-YVM-MAAS-MAAS-001",
      sourceType: "payroll-accrual-reversal",
      sourceId: "payroll-1",
    });
    expect(result.data.reversal.accrualLedger.lines).toEqual([
      expect.objectContaining({ accountCode: "730", direction: "credit" }),
      expect.objectContaining({ accountCode: "335", direction: "debit" }),
    ]);
    expect(result.data.reversal.payment?.movement).toMatchObject({
      direction: "Giriş",
      sourceType: "cash-bank-movement-reversal",
      sourceId: "movement-1",
    });
    expect(result.data.reversal.payment?.ledger.lines).toEqual([
      expect.objectContaining({ accountCode: "335", direction: "credit" }),
      expect.objectContaining({ accountCode: "100", direction: "debit" }),
    ]);
    expect(result.data.auditEntries).toHaveLength(4);
  });

  test("fails closed when payment and its ledger are not paired", () => {
    const result = buildPayrollAccrualReversalCommand({
      payrollAccrual: createPayroll(),
      originalAccrualLedger: createAccrualLedger(),
      originalPayment: createPayment(),
      scope: adminScope,
      timestamp: "2026-08-14T10:00:00.000Z",
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Maaş ödemesi ve kaynak muhasebe fişi birlikte bulunmalıdır."],
      reasonCode: "invalid-source",
    });
  });

  test("rejects non-admin users before persistence", async () => {
    const commit = vi.fn();
    const service = createPayrollAccrualReversalService({ repository: { commit } });
    const result = await service.reverse({
      payrollAccrualId: "payroll-1",
      scope: defaultTenantScope,
    });

    expect(result.ok).toBe(false);
    expect(commit).not.toHaveBeenCalled();
  });
});

export function createPayroll(): PayrollAccrualRow {
  return {
    id: "payroll-1",
    tenantId: adminScope.tenantId,
    companyId: adminScope.companyId,
    periodId: adminScope.periodId,
    documentNo: "MAAS-001",
    sourceTimesheetId: "timesheet-1",
    sourceTimesheetNo: "PNT-001",
    year: 2026,
    month: 6,
    siteCode: "SANT-001",
    siteName: "MERKEZ ŞANTİYE",
    contractorCode: "",
    contractorName: "",
    status: "Kaydedildi",
    grossTotal: 32000,
    deductionTotal: 500,
    netTotal: 31500,
    lineCount: 1,
    lines: [],
    createdBy: "accounting",
    updatedBy: "accounting",
    createdAt: "2026-06-01T08:00:00.000Z",
    updatedAt: "2026-06-01T08:00:00.000Z",
  };
}

export function createAccrualLedger(): LedgerJournalRow {
  return createLedger({
    id: "ledger-accrual-1",
    documentNo: "YVM-MAAS-MAAS-001",
    sourceType: "payroll-accrual",
    sourceId: "payroll-1",
    lines: [
      { accountCode: "730", accountName: "Genel Üretim Giderleri", amount: 32000, direction: "debit" },
      { accountCode: "335", accountName: "Personele Borçlar", amount: 32000, direction: "credit" },
    ],
    debitTotal: 32000,
    creditTotal: 32000,
  });
}

export function createPayment(): CashBankMovementRow {
  return {
    id: "movement-1",
    tenantId: adminScope.tenantId,
    companyId: adminScope.companyId,
    periodId: adminScope.periodId,
    accountCode: "KASA-0001",
    accountName: "MERKEZ KASA",
    movementDate: "2026-06-30",
    movementType: "Maaş Ödemesi",
    direction: "Çıkış",
    documentNo: "ODM-MAAS-001",
    counterpartyName: "MERKEZ ŞANTİYE PERSONELİ",
    amount: 31500,
    currency: "TL",
    description: "Maaş ödemesi",
    sourceType: "payroll-accrual",
    sourceId: "payroll-1",
    sourceLabel: "MAAS-001",
    createdBy: "accounting",
    updatedBy: "accounting",
    createdAt: "2026-06-30T08:00:00.000Z",
    updatedAt: "2026-06-30T08:00:00.000Z",
  };
}

export function createPaymentLedger(): LedgerJournalRow {
  return createLedger({
    id: "ledger-payment-1",
    documentNo: "YVM-ODM-ODM-MAAS-001",
    sourceType: "cash-bank-movement",
    sourceId: "movement-1",
    entryDate: "2026-06-30",
    lines: [
      { accountCode: "335", accountName: "Personele Borçlar", amount: 31500, direction: "debit" },
      { accountCode: "100", accountName: "MERKEZ KASA", amount: 31500, direction: "credit" },
    ],
    debitTotal: 31500,
    creditTotal: 31500,
  });
}

function createLedger(
  overrides: Partial<LedgerJournalRow>,
): LedgerJournalRow {
  return {
    id: "ledger-1",
    tenantId: adminScope.tenantId,
    companyId: adminScope.companyId,
    periodId: adminScope.periodId,
    entryDate: "2026-06-01",
    documentNo: "YVM-001",
    description: "Kaynak fiş",
    currency: "TL",
    lines: [],
    status: "posted",
    debitTotal: 0,
    creditTotal: 0,
    createdBy: "accounting",
    updatedBy: "accounting",
    createdAt: "2026-06-01T08:00:00.000Z",
    updatedAt: "2026-06-01T08:00:00.000Z",
    ...overrides,
  };
}
