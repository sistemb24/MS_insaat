import { describe, expect, test } from "vitest";

import { defaultTenantScope } from "./tenant-scope";
import { buildPayrollAccrualLedgerPostingCommand, createPayrollAccrualLedgerPostingService, type PayrollAccrualLedgerPostingCommand } from "./payroll-accrual-ledger-posting-service";
import type { PayrollAccrualRow } from "./payroll-accrual-service";

function createRow(overrides: Partial<PayrollAccrualRow> = {}): PayrollAccrualRow {
  return {
    id: "payroll-accrual-1",
    tenantId: defaultTenantScope.tenantId,
    companyId: defaultTenantScope.companyId,
    periodId: defaultTenantScope.periodId,
    documentNo: "MAAS-PNT-0001",
    sourceTimesheetId: "timesheet-1",
    sourceTimesheetNo: "PNT-0001",
    year: 2026,
    month: 7,
    siteCode: "SANT-001",
    siteName: "Örnek Şantiye",
    contractorCode: "",
    contractorName: "",
    status: "Taslak",
    grossTotal: 10000,
    deductionTotal: 1000,
    netTotal: 9000,
    lineCount: 1,
    lines: [{ advanceDeduction: 600, debtDeduction: 400, deductionTotal: 1000, grossTotal: 10000, netTotal: 9000, overtimeHours: 0, personCode: "PER-001", personName: "Örnek Personel", regularWorkedDays: 22 }],
    createdBy: defaultTenantScope.userId,
    updatedBy: defaultTenantScope.userId,
    createdAt: "2026-07-15T10:00:00.000Z",
    updatedAt: "2026-07-15T10:00:00.000Z",
    ...overrides,
  };
}

describe("payroll accrual ledger posting", () => {
  test("builds a balanced gross/net/deduction payroll journal", () => {
    const result = buildPayrollAccrualLedgerPostingCommand({ payrollAccrual: createRow(), scope: defaultTenantScope, timestamp: "2026-07-15T12:00:00.000Z" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.ledgerEntry).toMatchObject({ sourceType: "payroll-accrual", sourceId: "payroll-accrual-1", documentNo: "YVM-MAAS-MAAS-PNT-0001", debitTotal: 10000, creditTotal: 10000 });
    expect(result.data.ledgerEntry.lines).toEqual([
      expect.objectContaining({ accountCode: "730", direction: "debit", amount: 10000 }),
      expect.objectContaining({ accountCode: "335", direction: "credit", amount: 9000 }),
      expect.objectContaining({ accountCode: "135", direction: "credit", amount: 600 }),
      expect.objectContaining({ accountCode: "136", direction: "credit", amount: 400 }),
    ]);
  });

  test("rejects viewer, closed period, posted status and inconsistent deductions", () => {
    expect(buildPayrollAccrualLedgerPostingCommand({ payrollAccrual: createRow(), scope: { ...defaultTenantScope, userRole: "viewer" }, timestamp: "2026-07-15T12:00:00.000Z" })).toMatchObject({ ok: false, reasonCode: "permission-denied" });
    expect(buildPayrollAccrualLedgerPostingCommand({ payrollAccrual: createRow(), scope: { ...defaultTenantScope, periodClosed: true }, timestamp: "2026-07-15T12:00:00.000Z" })).toMatchObject({ ok: false, reasonCode: "period-closed" });
    expect(buildPayrollAccrualLedgerPostingCommand({ payrollAccrual: createRow({ status: "Kaydedildi" }), scope: defaultTenantScope, timestamp: "2026-07-15T12:00:00.000Z" })).toMatchObject({ ok: false, reasonCode: "invalid-status" });
    expect(buildPayrollAccrualLedgerPostingCommand({ payrollAccrual: createRow({ deductionTotal: 900 }), scope: defaultTenantScope, timestamp: "2026-07-15T12:00:00.000Z" })).toMatchObject({ ok: false, reasonCode: "invalid-total" });
  });

  test("delegates accepted commands to the idempotent repository boundary", async () => {
    const repository = { commit: async (command: PayrollAccrualLedgerPostingCommand) => ({ ok: true as const, data: { payrollAccrual: command.payrollAccrual, ledgerEntry: command.ledgerEntry, created: false } }) };
    const service = createPayrollAccrualLedgerPostingService({ repository, now: () => "2026-07-15T12:00:00.000Z" });
    await expect(service.post({ payrollAccrual: createRow(), scope: defaultTenantScope })).resolves.toMatchObject({ ok: true, data: { created: false, ledgerEntry: { documentNo: "YVM-MAAS-MAAS-PNT-0001" } } });
  });
});
