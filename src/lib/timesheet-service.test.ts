import { describe, expect, test } from "vitest";

import type { AuditLogEntryInput } from "./audit-log";
import {
  createSeededTimesheetMemoryRepository,
  createTimesheetService,
  type TimesheetLineDraft,
} from "./timesheet-service";
import { defaultTenantScope } from "./tenant-scope";

describe("createTimesheetService", () => {
  test("creates a draft timesheet with calculated person and header totals", async () => {
    const auditLogs: AuditLogEntryInput[] = [];
    const service = createTimesheetService({
      auditLogRepository: {
        async record(entry) {
          auditLogs.push(entry);
        },
      },
      now: () => "2026-06-27T09:00:00.000Z",
      repository: createSeededTimesheetMemoryRepository(),
    });

    const result = await service.create({
      scope: defaultTenantScope,
      values: {
        contractorCode: "TAS-0001",
        contractorName: "ŞİRKETİN TAŞERONU",
        documentNo: "PNT-2026-06-001",
        lines: [
          createLine({ personCode: "PRS-0001", workedDays: 20 }),
          createLine({
            dailyWage: 900,
            overtimeHours: 10,
            overtimeHourlyRate: 120,
            personCode: "PRS-0002",
            personName: "AYŞE DEMİR",
            workedDays: 12,
          }),
        ],
        month: 6,
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        year: 2026,
      },
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.data.status : undefined).toBe("Taslak");
    expect(result.ok ? result.data.totalWorkedDays : undefined).toBe(32);
    expect(result.ok ? result.data.totalOvertimeHours : undefined).toBe(10);
    expect(result.ok ? result.data.grossTotal : undefined).toBe(32000);
    expect(result.ok ? result.data.deductionTotal : undefined).toBe(0);
    expect(result.ok ? result.data.netTotal : undefined).toBe(32000);
    expect(result.ok ? result.data.lineCount : undefined).toBe(2);
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      action: "timesheet.create",
      entityLabel: "PNT-2026-06-001",
      entityType: "timesheet",
    });
  });

  test("rejects duplicate personnel and invalid day counts", async () => {
    const service = createTimesheetService({
      now: () => "2026-06-27T09:00:00.000Z",
      repository: createSeededTimesheetMemoryRepository(),
    });

    const result = await service.create({
      scope: defaultTenantScope,
      values: {
        documentNo: "PNT-2026-02-001",
        lines: [
          createLine({ personCode: "PRS-0001", workedDays: 29 }),
          createLine({ personCode: "PRS-0001", workedDays: 2 }),
        ],
        month: 2,
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        year: 2026,
      },
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors).toContain(
      "1. satır çalışma günü 2026-02 ayı için 0 ile 28 arasında olmalıdır.",
    );
    expect(result.ok ? [] : result.errors).toContain(
      "Aynı personel aynı puantaj içinde bir kez yer alabilir: PRS-0001",
    );
  });

  test("posts and cancels timesheets with audit history", async () => {
    const auditLogs: AuditLogEntryInput[] = [];
    const service = createTimesheetService({
      auditLogRepository: {
        async record(entry) {
          auditLogs.push(entry);
        },
      },
      now: () => "2026-06-27T09:00:00.000Z",
      repository: createSeededTimesheetMemoryRepository(),
    });
    const created = await service.create({
      scope: defaultTenantScope,
      values: {
        documentNo: "PNT-2026-06-001",
        lines: [createLine()],
        month: 6,
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        year: 2026,
      },
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
    expect(cancelled.ok ? cancelled.data.status : undefined).toBe("İptal");
    expect(auditLogs.map((entry) => entry.action)).toEqual([
      "timesheet.create",
      "timesheet.post",
      "timesheet.cancel",
    ]);
  });
});

function createLine(
  overrides: Partial<TimesheetLineDraft> = {},
): TimesheetLineDraft {
  return {
    advanceDeduction: 0,
    dailyWage: 1000,
    debtDeduction: 0,
    overtimeHourlyRate: 80,
    overtimeHours: 0,
    personCode: "PRS-0001",
    personName: "MEHMET YILMAZ",
    workedDays: 20,
    ...overrides,
  };
}
