import { describe, expect, test } from "vitest";

import type { AuditLogEntryInput } from "./audit-log";
import {
  createPayrollAccrualService,
  createSeededPayrollAccrualMemoryRepository,
} from "./payroll-accrual-service";
import { defaultTenantScope } from "./tenant-scope";
import type { TimesheetRow } from "./timesheet-service";

describe("createPayrollAccrualService", () => {
  test("creates payroll accrual from a posted timesheet with line totals", async () => {
    const auditLogs: AuditLogEntryInput[] = [];
    const service = createPayrollAccrualService({
      auditLogRepository: {
        async record(entry) {
          auditLogs.push(entry);
        },
      },
      now: () => "2026-06-30T09:00:00.000Z",
      repository: createSeededPayrollAccrualMemoryRepository(),
    });

    const result = await service.createFromTimesheet({
      scope: defaultTenantScope,
      timesheet: createTimesheet(),
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.data.documentNo : undefined).toBe(
      "MAAS-PNT-2026-06-001",
    );
    expect(result.ok ? result.data.status : undefined).toBe("Taslak");
    expect(result.ok ? result.data.grossTotal : undefined).toBe(32000);
    expect(result.ok ? result.data.deductionTotal : undefined).toBe(500);
    expect(result.ok ? result.data.netTotal : undefined).toBe(31500);
    expect(result.ok ? result.data.lines.map((line) => line.personCode) : [])
      .toEqual(["PRS-0001", "PRS-0002"]);
    expect(auditLogs.map((entry) => entry.action)).toEqual([
      "payroll-accrual.create",
    ]);
  });

  test("rejects draft timesheets and duplicate source timesheets", async () => {
    const service = createPayrollAccrualService({
      now: () => "2026-06-30T09:00:00.000Z",
      repository: createSeededPayrollAccrualMemoryRepository(),
    });
    const draftResult = await service.createFromTimesheet({
      scope: defaultTenantScope,
      timesheet: createTimesheet({ status: "Taslak" }),
    });
    const created = await service.createFromTimesheet({
      scope: defaultTenantScope,
      timesheet: createTimesheet(),
    });
    const duplicate = await service.createFromTimesheet({
      scope: defaultTenantScope,
      timesheet: createTimesheet(),
    });

    expect(draftResult.ok).toBe(false);
    expect(draftResult.ok ? [] : draftResult.errors).toContain(
      "Yalnız kesinleşmiş puantajdan maaş tahakkuku üretilebilir.",
    );
    expect(created.ok).toBe(true);
    expect(duplicate.ok).toBe(false);
    expect(duplicate.ok ? [] : duplicate.errors).toContain(
      "Bu puantaj için maaş tahakkuku zaten oluşturulmuş: PNT-2026-06-001",
    );
  });

  test("cancels draft payroll accruals with audit trail", async () => {
    const auditLogs: AuditLogEntryInput[] = [];
    const service = createPayrollAccrualService({
      auditLogRepository: {
        async record(entry) {
          auditLogs.push(entry);
        },
      },
      now: () => "2026-06-30T09:00:00.000Z",
      repository: createSeededPayrollAccrualMemoryRepository(),
    });
    const created = await service.createFromTimesheet({
      scope: defaultTenantScope,
      timesheet: createTimesheet(),
    });

    if (!created.ok) {
      throw new Error(created.errors.join(" "));
    }

    const cancelled = await service.cancel({
      id: created.data.id,
      scope: defaultTenantScope,
    });
    const postCancelled = await service.post({
      id: created.data.id,
      scope: defaultTenantScope,
    });

    expect(cancelled.ok ? cancelled.data.status : undefined).toBe("İptal");
    expect(postCancelled.ok).toBe(false);
    expect(postCancelled.ok ? [] : postCancelled.errors).toContain(
      "İptal edilmiş maaş tahakkuku kesinleştirilemez.",
    );
    expect(auditLogs.map((entry) => entry.action)).toEqual([
      "payroll-accrual.create",
      "payroll-accrual.cancel",
    ]);
  });

  test("blocks direct cancellation after payroll accrual posting", async () => {
    const service = createPayrollAccrualService({
      now: () => "2026-06-30T09:00:00.000Z",
      repository: createSeededPayrollAccrualMemoryRepository(),
    });
    const created = await service.createFromTimesheet({
      scope: defaultTenantScope,
      timesheet: createTimesheet(),
    });

    if (!created.ok) {
      throw new Error(created.errors.join(" "));
    }

    const posted = await service.post({
      id: created.data.id,
      scope: defaultTenantScope,
    });
    const cancelled = await service.cancel({
      id: created.data.id,
      scope: defaultTenantScope,
    });

    expect(posted.ok ? posted.data.status : undefined).toBe("Kaydedildi");
    expect(cancelled).toEqual({
      ok: false,
      errors: [
        "Kaydedilmiş maaş tahakkuku doğrudan iptal edilemez; önce kontrollü ters kayıt akışı tamamlanmalıdır.",
      ],
    });
  });
});

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
