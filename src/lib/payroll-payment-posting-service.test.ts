import { describe, expect, test, vi } from "vitest";

import type { PayrollAccrualRow } from "./payroll-accrual-service";
import {
  buildPayrollPaymentPostingCommand,
  createPayrollPaymentPostingService,
} from "./payroll-payment-posting-service";
import { defaultTenantScope } from "./tenant-scope";

describe("payroll payment posting service", () => {
  test("builds a balanced payment movement and ledger command", () => {
    const result = buildPayrollPaymentPostingCommand({
      account: { code: "KASA-0001", name: "MERKEZ KASA" },
      nowIso: "2026-08-14T08:00:00.000Z",
      payrollAccrual: createPayrollAccrual(),
      scope: defaultTenantScope,
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.data.movement : undefined).toMatchObject({
      amount: 31500,
      movementType: "Maaş Ödemesi",
      sourceId: "payroll-accrual-1",
      sourceType: "payroll-accrual",
    });
    expect(result.ok ? result.data.ledgerEntry : undefined).toMatchObject({
      creditTotal: 31500,
      debitTotal: 31500,
      documentNo: "YVM-ODM-ODM-MAAS-PNT-2026-06-001",
      sourceType: "cash-bank-movement",
    });
    expect(
      result.ok
        ? result.data.ledgerEntry.lines.map((line) => [
            line.accountCode,
            line.direction,
            line.amount,
          ])
        : [],
    ).toEqual([
      ["335", "debit", 31500],
      ["100", "credit", 31500],
    ]);
  });

  test("rejects unposted or cross-scope payroll accruals before persistence", async () => {
    const commit = vi.fn();
    const service = createPayrollPaymentPostingService({
      now: () => "2026-08-14T08:00:00.000Z",
      repository: { commit },
    });

    const result = await service.post({
      account: { code: "KASA-0001", name: "MERKEZ KASA" },
      payrollAccrual: createPayrollAccrual({
        status: "Taslak",
        tenantId: "other-tenant",
      }),
      scope: defaultTenantScope,
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors).toEqual(
      expect.arrayContaining([
        "Yalnız kesinleşmiş maaş tahakkuku ödenebilir.",
        "Maaş tahakkuku aktif tenant, firma ve dönem kapsamına ait değil.",
      ]),
    );
    expect(commit).not.toHaveBeenCalled();
  });
});

export function createPayrollAccrual(
  overrides: Partial<PayrollAccrualRow> = {},
): PayrollAccrualRow {
  return {
    id: "payroll-accrual-1",
    tenantId: defaultTenantScope.tenantId,
    companyId: defaultTenantScope.companyId,
    periodId: defaultTenantScope.periodId,
    documentNo: "MAAS-PNT-2026-06-001",
    sourceTimesheetId: "timesheet-1",
    sourceTimesheetNo: "PNT-2026-06-001",
    year: 2026,
    month: 6,
    siteCode: "SANT-0001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    contractorCode: "",
    contractorName: "",
    status: "Kaydedildi",
    grossTotal: 32000,
    deductionTotal: 500,
    netTotal: 31500,
    lineCount: 1,
    lines: [],
    createdBy: defaultTenantScope.userId,
    updatedBy: defaultTenantScope.userId,
    createdAt: "2026-08-14T07:00:00.000Z",
    updatedAt: "2026-08-14T07:00:00.000Z",
    ...overrides,
  };
}
