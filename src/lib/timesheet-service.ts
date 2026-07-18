import type { AuditLogRepository } from "./audit-log";
import { createAuditLogEntry } from "./audit-log";
import {
  buildTenantScopeKey,
  type TenantScope,
  validateTenantScope,
} from "./tenant-scope";

export type TimesheetStatus = "Taslak" | "Kaydedildi" | "İptal";

export type TimesheetLineDraft = {
  advanceDeduction: number;
  dailyWage: number;
  debtDeduction: number;
  overtimeHourlyRate: number;
  overtimeHours: number;
  personCode: string;
  personName: string;
  workedDays: number;
};

export type TimesheetDraft = {
  contractorCode: string;
  contractorName: string;
  description: string;
  documentNo: string;
  lines: TimesheetLineDraft[];
  month: number;
  siteCode: string;
  siteName: string;
  year: number;
};

export type TimesheetLineTotals = {
  deductionTotal: number;
  grossTotal: number;
  lineNo: number;
  netTotal: number;
  overtimeTotal: number;
  regularTotal: number;
};

export type TimesheetTotals = {
  deductionTotal: number;
  grossTotal: number;
  lines: TimesheetLineTotals[];
  netTotal: number;
  totalOvertimeHours: number;
  totalWorkedDays: number;
};

export type TimesheetRow = TimesheetDraft &
  Omit<TimesheetTotals, "lines"> & {
    id: string;
    tenantId: string;
    companyId: string;
    periodId: string;
    status: TimesheetStatus;
    createdBy: string;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
    lineCount: number;
  };

export type TimesheetCreateValues = Partial<Omit<TimesheetDraft, "lines">> & {
  lines?: TimesheetLineDraft[];
};

export type TimesheetRepositoryListInput = {
  scope: TenantScope;
};

export type TimesheetRepository = {
  create(input: TimesheetRow): Promise<TimesheetRow>;
  list(input: TimesheetRepositoryListInput): Promise<TimesheetRow[]>;
  update(input: TimesheetRow): Promise<TimesheetRow>;
};

export type TimesheetServiceResult<T> =
  | { ok: true; data: T; errors?: never }
  | { ok: false; errors: string[]; data?: never };

export type TimesheetListData = {
  rows: TimesheetRow[];
};

export type TimesheetService = {
  cancel(
    input: TimesheetStatusInput,
  ): Promise<TimesheetServiceResult<TimesheetRow>>;
  create(
    input: TimesheetCreateInput,
  ): Promise<TimesheetServiceResult<TimesheetRow>>;
  list(
    input: TimesheetListInput,
  ): Promise<TimesheetServiceResult<TimesheetListData>>;
  post(input: TimesheetStatusInput): Promise<TimesheetServiceResult<TimesheetRow>>;
};

export type TimesheetListInput = {
  scope: TenantScope;
};

export type TimesheetCreateInput = TimesheetListInput & {
  values: TimesheetCreateValues;
};

export type TimesheetStatusInput = TimesheetListInput & {
  id: string;
};

export type TimesheetServiceOptions = {
  auditLogRepository?: AuditLogRepository;
  now: () => string;
  repository: TimesheetRepository;
};

const timesheetMutationPermissionError =
  "Puantaj işlemi için muhasebe yetkisi gereklidir.";

export function createTimesheetDraft(
  input: TimesheetCreateValues,
): TimesheetDraft {
  return {
    contractorCode: input.contractorCode?.trim() ?? "",
    contractorName: input.contractorName?.trim() ?? "",
    description: input.description?.trim() ?? "",
    documentNo: input.documentNo?.trim() ?? "",
    lines: input.lines?.map(normalizeLine) ?? [],
    month: Number(input.month ?? 0),
    siteCode: input.siteCode?.trim() ?? "",
    siteName: input.siteName?.trim() ?? "",
    year: Number(input.year ?? 0),
  };
}

export function validateTimesheetDraft(draft: TimesheetDraft): string[] {
  const errors: string[] = [];
  const daysInSelectedMonth = daysInMonth(draft.year, draft.month);
  const seenPersonCodes = new Set<string>();

  if (!draft.documentNo) {
    errors.push("Puantaj no zorunludur.");
  }

  if (!draft.siteCode || !draft.siteName) {
    errors.push("Şantiye zorunludur.");
  }

  if (!Number.isInteger(draft.year) || draft.year < 2000 || draft.year > 2100) {
    errors.push("Puantaj yılı 2000 ile 2100 arasında olmalıdır.");
  }

  if (!Number.isInteger(draft.month) || draft.month < 1 || draft.month > 12) {
    errors.push("Puantaj ayı 1 ile 12 arasında olmalıdır.");
  }

  if (draft.lines.length === 0) {
    errors.push("En az bir personel satırı girilmelidir.");
  }

  draft.lines.forEach((line, index) => {
    const lineNo = index + 1;

    if (!line.personCode || !line.personName) {
      errors.push(`${lineNo}. satır personel bilgisi zorunludur.`);
    }

    if (line.personCode) {
      if (seenPersonCodes.has(line.personCode)) {
        errors.push(
          `Aynı personel aynı puantaj içinde bir kez yer alabilir: ${line.personCode}`,
        );
      }

      seenPersonCodes.add(line.personCode);
    }

    if (line.workedDays < 0 || line.workedDays > daysInSelectedMonth) {
      errors.push(
        `${lineNo}. satır çalışma günü ${draft.year}-${String(draft.month).padStart(2, "0")} ayı için 0 ile ${daysInSelectedMonth} arasında olmalıdır.`,
      );
    }

    if (line.overtimeHours < 0) {
      errors.push(`${lineNo}. satır mesai saati negatif olamaz.`);
    }

    if (line.dailyWage < 0 || line.overtimeHourlyRate < 0) {
      errors.push(`${lineNo}. satır ücret bilgisi negatif olamaz.`);
    }

    if (line.advanceDeduction < 0 || line.debtDeduction < 0) {
      errors.push(`${lineNo}. satır kesinti bilgisi negatif olamaz.`);
    }
  });

  return errors;
}

export function calculateTimesheetTotals(
  draft: TimesheetDraft,
): TimesheetTotals {
  const lines = draft.lines.map((line, index) => {
    const regularTotal = roundMoney(line.workedDays * line.dailyWage);
    const overtimeTotal = roundMoney(
      line.overtimeHours * line.overtimeHourlyRate,
    );
    const grossTotal = roundMoney(regularTotal + overtimeTotal);
    const deductionTotal = roundMoney(
      line.advanceDeduction + line.debtDeduction,
    );

    return {
      deductionTotal,
      grossTotal,
      lineNo: index + 1,
      netTotal: roundMoney(grossTotal - deductionTotal),
      overtimeTotal,
      regularTotal,
    };
  });

  return {
    deductionTotal: sum(lines.map((line) => line.deductionTotal)),
    grossTotal: sum(lines.map((line) => line.grossTotal)),
    lines,
    netTotal: sum(lines.map((line) => line.netTotal)),
    totalOvertimeHours: sum(draft.lines.map((line) => line.overtimeHours)),
    totalWorkedDays: sum(draft.lines.map((line) => line.workedDays)),
  };
}

export function createTimesheetService({
  auditLogRepository,
  now,
  repository,
}: TimesheetServiceOptions): TimesheetService {
  async function resolveRows(scope: TenantScope) {
    const errors = validateTenantScope(scope);

    if (errors.length > 0) {
      return { ok: false as const, errors };
    }

    return { ok: true as const, rows: await repository.list({ scope }) };
  }

  return {
    async list({ scope }) {
      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      return {
        ok: true,
        data: {
          rows: resolved.rows,
        },
      };
    },

    async create({ scope, values }) {
      const permissionErrors = validateTimesheetMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const draft = createTimesheetDraft(values);
      const errors = validateTimesheetDraft(draft);
      const duplicateDocument = resolved.rows.find(
        (row) => row.documentNo === draft.documentNo,
      );

      if (duplicateDocument) {
        errors.push(`Puantaj no bu dönem için zaten kullanılıyor: ${draft.documentNo}`);
      }

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      const createdAt = now();
      const totals = calculateTimesheetTotals(draft);
      const row: TimesheetRow = {
        ...draft,
        id: createTimesheetId(scope, draft.documentNo),
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        periodId: scope.periodId,
        status: "Taslak",
        createdBy: scope.userId,
        updatedBy: scope.userId,
        createdAt,
        updatedAt: createdAt,
        deductionTotal: totals.deductionTotal,
        grossTotal: totals.grossTotal,
        lineCount: draft.lines.length,
        netTotal: totals.netTotal,
        totalOvertimeHours: totals.totalOvertimeHours,
        totalWorkedDays: totals.totalWorkedDays,
      };

      const created = await repository.create(row);

      await recordTimesheetAudit(auditLogRepository, {
        action: "timesheet.create",
        occurredAt: created.updatedAt,
        row: created,
        scope,
        statusTo: created.status,
      });

      return {
        ok: true,
        data: created,
      };
    },

    async post({ scope, id }) {
      const permissionErrors = validateTimesheetMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const existing = resolved.rows.find((row) => row.id === id);

      if (!existing) {
        return { ok: false, errors: ["Puantaj kaydı bulunamadı."] };
      }

      if (existing.status === "İptal") {
        return { ok: false, errors: ["İptal edilmiş puantaj kesinleştirilemez."] };
      }

      if (existing.status === "Kaydedildi") {
        return { ok: true, data: existing };
      }

      const posted = await repository.update({
        ...existing,
        status: "Kaydedildi",
        updatedBy: scope.userId,
        updatedAt: now(),
      });

      await recordTimesheetAudit(auditLogRepository, {
        action: "timesheet.post",
        occurredAt: posted.updatedAt,
        row: posted,
        scope,
        statusFrom: existing.status,
        statusTo: posted.status,
      });

      return { ok: true, data: posted };
    },

    async cancel({ scope, id }) {
      const permissionErrors = validateTimesheetMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const existing = resolved.rows.find((row) => row.id === id);

      if (!existing) {
        return { ok: false, errors: ["Puantaj kaydı bulunamadı."] };
      }

      if (existing.status === "İptal") {
        return { ok: true, data: existing };
      }

      const cancelled = await repository.update({
        ...existing,
        status: "İptal",
        updatedBy: scope.userId,
        updatedAt: now(),
      });

      await recordTimesheetAudit(auditLogRepository, {
        action: "timesheet.cancel",
        occurredAt: cancelled.updatedAt,
        row: cancelled,
        scope,
        statusFrom: existing.status,
        statusTo: cancelled.status,
      });

      return { ok: true, data: cancelled };
    },
  };
}

type TimesheetAuditInput = {
  action: "timesheet.cancel" | "timesheet.create" | "timesheet.post";
  occurredAt: string;
  row: TimesheetRow;
  scope: TenantScope;
  statusFrom?: TimesheetStatus;
  statusTo: TimesheetStatus;
};

async function recordTimesheetAudit(
  auditLogRepository: AuditLogRepository | undefined,
  input: TimesheetAuditInput,
) {
  if (!auditLogRepository) {
    return;
  }

  await auditLogRepository.record(
    createAuditLogEntry(input.scope, {
      action: input.action,
      entityType: "timesheet",
      entityId: input.row.id,
      entityLabel: input.row.documentNo,
      occurredAt: input.occurredAt,
      metadata: {
        contractorCode: input.row.contractorCode,
        contractorName: input.row.contractorName,
        documentNo: input.row.documentNo,
        grossTotal: input.row.grossTotal,
        lineCount: input.row.lineCount,
        month: input.row.month,
        netTotal: input.row.netTotal,
        siteCode: input.row.siteCode,
        siteName: input.row.siteName,
        statusFrom: input.statusFrom,
        statusTo: input.statusTo,
        totalWorkedDays: input.row.totalWorkedDays,
        year: input.row.year,
      },
    }),
  );
}

export function canMutateTimesheets(scope: TenantScope) {
  return scope.userRole === "admin" || scope.userRole === "accounting";
}

export function createSeededTimesheetMemoryRepository(): TimesheetRepository {
  const store = new Map<string, TimesheetRow[]>();

  return {
    async list({ scope }) {
      return (store.get(buildTenantScopeKey(scope)) ?? []).map(cloneRow);
    },

    async create(row) {
      const key = `${row.tenantId}::${row.companyId}::${row.periodId}`;
      const persisted = cloneRow(row);
      const rows = store.get(key) ?? [];

      store.set(key, [persisted, ...rows]);

      return persisted;
    },

    async update(row) {
      const key = `${row.tenantId}::${row.companyId}::${row.periodId}`;
      const persisted = cloneRow(row);
      const rows = store.get(key) ?? [];

      store.set(
        key,
        rows.map((current) => (current.id === row.id ? persisted : current)),
      );

      return persisted;
    },
  };
}

function validateTimesheetMutationPermission(scope: TenantScope) {
  return canMutateTimesheets(scope) ? [] : [timesheetMutationPermissionError];
}

function createTimesheetId(scope: TenantScope, documentNo: string) {
  const normalizedDocumentNo = documentNo
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${buildTenantScopeKey(scope)}::timesheet::${normalizedDocumentNo}`;
}

function cloneRow(row: TimesheetRow): TimesheetRow {
  return {
    ...row,
    lines: row.lines.map((line) => ({ ...line })),
  };
}

function normalizeLine(line: TimesheetLineDraft): TimesheetLineDraft {
  return {
    advanceDeduction: Number(line.advanceDeduction),
    dailyWage: Number(line.dailyWage),
    debtDeduction: Number(line.debtDeduction),
    overtimeHourlyRate: Number(line.overtimeHourlyRate),
    overtimeHours: Number(line.overtimeHours),
    personCode: line.personCode.trim(),
    personName: line.personName.trim(),
    workedDays: Number(line.workedDays),
  };
}

function daysInMonth(year: number, month: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return 31;
  }

  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function sum(values: number[]) {
  return roundMoney(values.reduce((total, value) => total + value, 0));
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
