import type {
  AuditLogReadRepository,
  AuditLogRepository,
} from "./audit-log";
import type { TenantScope } from "./tenant-scope";
import type { TimesheetService } from "./timesheet-service";

export type SeedDefaultTimesheetsInput = {
  scope: TenantScope;
  service: TimesheetService;
};

export type SeedDefaultTimesheetsResult = {
  seeded: string[];
  skipped: string[];
  totalRows: number;
};

export type SeedDefaultTimesheetAuditLogsInput = {
  auditLogRepository: AuditLogRepository & AuditLogReadRepository;
  scope: TenantScope;
  service: TimesheetService;
};

export type SeedDefaultTimesheetAuditLogsResult = {
  seeded: string[];
  skipped: string[];
};

const defaultTimesheets = [
  {
    contractorCode: "TAS-0001",
    contractorName: "ŞİRKETİN TAŞERONU",
    description: "Haziran demo puantajı",
    documentNo: "PNT-2026-06-001",
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
    siteCode: "SANT-0001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    year: 2026,
  },
  {
    contractorCode: "TAS-0002",
    contractorName: "DOĞAN YAPI TAŞERONLUK LTD. ŞTİ.",
    description: "Temmuz Antalya projesi sıvacı ekibi puantajı",
    documentNo: "PNT-2026-07-001",
    lines: [
      {
        advanceDeduction: 2000,
        dailyWage: 1250,
        debtDeduction: 0,
        overtimeHourlyRate: 100,
        overtimeHours: 16,
        personCode: "PRS-0003",
        personName: "HASAN ÇELİK",
        workedDays: 22,
      },
      {
        advanceDeduction: 0,
        dailyWage: 850,
        debtDeduction: 500,
        overtimeHourlyRate: 70,
        overtimeHours: 8,
        personCode: "PRS-0005",
        personName: "EMİR AKIN",
        workedDays: 18,
      },
      {
        advanceDeduction: 1500,
        dailyWage: 1100,
        debtDeduction: 0,
        overtimeHourlyRate: 90,
        overtimeHours: 12,
        personCode: "PRS-0006",
        personName: "YUSUF KARA",
        workedDays: 20,
      },
    ],
    month: 7,
    siteCode: "SANT-0002",
    siteName: "ANTALYA KONYAALTI 120 KONUT PROJESİ",
    year: 2026,
  },
  {
    contractorCode: "TAS-0003",
    contractorName: "YILDIZ ELEKTRİK TESİSAT",
    description: "Haziran İstanbul iş merkezi elektrik ekibi puantajı",
    documentNo: "PNT-2026-06-002",
    lines: [
      {
        advanceDeduction: 0,
        dailyWage: 1500,
        debtDeduction: 0,
        overtimeHourlyRate: 130,
        overtimeHours: 24,
        personCode: "PRS-0004",
        personName: "FATMA ÖZKAN",
        workedDays: 21,
      },
      {
        advanceDeduction: 3000,
        dailyWage: 950,
        debtDeduction: 1000,
        overtimeHourlyRate: 80,
        overtimeHours: 6,
        personCode: "PRS-0007",
        personName: "MURAT DEMİR",
        workedDays: 19,
      },
    ],
    month: 6,
    siteCode: "SANT-0003",
    siteName: "İSTANBUL KARTAL İŞ MERKEZİ İNŞAATI",
    year: 2026,
  },
];

export async function seedDefaultTimesheets({
  scope,
  service,
}: SeedDefaultTimesheetsInput): Promise<SeedDefaultTimesheetsResult> {
  const existingResult = await service.list({ scope });

  if (!existingResult.ok) {
    throw new Error(existingResult.errors.join(" "));
  }

  const result: SeedDefaultTimesheetsResult = {
    seeded: [],
    skipped: [],
    totalRows: existingResult.data.rows.length,
  };
  const existingDocumentNumbers = new Set(
    existingResult.data.rows.map((row) => row.documentNo),
  );

  for (const timesheet of defaultTimesheets) {
    if (existingDocumentNumbers.has(timesheet.documentNo)) {
      result.skipped.push(timesheet.documentNo);
      continue;
    }

    const createResult = await service.create({
      scope,
      values: timesheet,
    });

    if (!createResult.ok) {
      throw new Error(createResult.errors.join(" "));
    }

    result.seeded.push(timesheet.documentNo);
    result.totalRows += 1;
  }

  return result;
}

export async function seedDefaultTimesheetAuditLogs({
  auditLogRepository,
  scope,
  service,
}: SeedDefaultTimesheetAuditLogsInput): Promise<SeedDefaultTimesheetAuditLogsResult> {
  const timesheetResult = await service.list({ scope });

  if (!timesheetResult.ok) {
    throw new Error(timesheetResult.errors.join(" "));
  }

  const existingAuditLogs = await auditLogRepository.listByEntityType({
    entityType: "timesheet",
    scope,
  });
  const result: SeedDefaultTimesheetAuditLogsResult = {
    seeded: [],
    skipped: [],
  };

  for (const timesheet of defaultTimesheets) {
    const row = timesheetResult.data.rows.find(
      (current) => current.documentNo === timesheet.documentNo,
    );

    if (!row) {
      continue;
    }

    const hasCreateAudit = existingAuditLogs.some(
      (log) => log.entityId === row.id && log.action === "timesheet.create",
    );

    if (hasCreateAudit) {
      result.skipped.push(row.documentNo);
      continue;
    }

    await auditLogRepository.record({
      tenantId: row.tenantId,
      companyId: row.companyId,
      periodId: row.periodId,
      actorUserId: row.createdBy,
      action: "timesheet.create",
      entityType: "timesheet",
      entityId: row.id,
      entityLabel: row.documentNo,
      occurredAt: row.createdAt,
      metadata: {
        documentNo: row.documentNo,
        grossTotal: row.grossTotal,
        lineCount: row.lineCount,
        month: row.month,
        netTotal: row.netTotal,
        siteCode: row.siteCode,
        siteName: row.siteName,
        statusTo: row.status,
        totalWorkedDays: row.totalWorkedDays,
        year: row.year,
      },
    });
    existingAuditLogs.push({
      id: `seeded-${row.id}`,
      tenantId: row.tenantId,
      companyId: row.companyId,
      periodId: row.periodId,
      actorUserId: row.createdBy,
      action: "timesheet.create",
      entityType: "timesheet",
      entityId: row.id,
      entityLabel: row.documentNo,
      occurredAt: row.createdAt,
      createdAt: row.createdAt,
      metadata: {},
    });
    result.seeded.push(row.documentNo);
  }

  return result;
}
