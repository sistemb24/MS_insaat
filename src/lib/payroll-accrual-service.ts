import type { AuditLogRepository } from "./audit-log";
import { createAuditLogEntry } from "./audit-log";
import {
  buildTenantScopeKey,
  type TenantScope,
  validateTenantScope,
} from "./tenant-scope";
import type { TimesheetRow } from "./timesheet-service";
import type { LedgerRepository } from "./ledger-service";
import type { PayrollAccrualLedgerPostingService } from "./payroll-accrual-ledger-posting-service";

export type PayrollAccrualStatus = "Taslak" | "Kaydedildi" | "İptal";

export type PayrollAccrualLine = {
  advanceDeduction: number;
  debtDeduction: number;
  deductionTotal: number;
  grossTotal: number;
  netTotal: number;
  overtimeHours: number;
  personCode: string;
  personName: string;
  regularWorkedDays: number;
};

export type PayrollAccrualRow = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  documentNo: string;
  sourceTimesheetId: string;
  sourceTimesheetNo: string;
  year: number;
  month: number;
  siteCode: string;
  siteName: string;
  contractorCode: string;
  contractorName: string;
  status: PayrollAccrualStatus;
  grossTotal: number;
  deductionTotal: number;
  netTotal: number;
  lineCount: number;
  lines: PayrollAccrualLine[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  ledgerDocumentNo?: string;
};

export type PayrollAccrualRepositoryListInput = {
  scope: TenantScope;
};

export type PayrollAccrualRepository = {
  create(input: PayrollAccrualRow): Promise<PayrollAccrualRow>;
  list(
    input: PayrollAccrualRepositoryListInput,
  ): Promise<PayrollAccrualRow[]>;
  update(input: PayrollAccrualRow): Promise<PayrollAccrualRow>;
};

export type PayrollAccrualServiceResult<T> =
  | { ok: true; data: T; errors?: never }
  | { ok: false; errors: string[]; data?: never };

export type PayrollAccrualListData = {
  rows: PayrollAccrualRow[];
};

export type PayrollAccrualService = {
  cancel(
    input: PayrollAccrualStatusInput,
  ): Promise<PayrollAccrualServiceResult<PayrollAccrualRow>>;
  createFromTimesheet(
    input: PayrollAccrualCreateFromTimesheetInput,
  ): Promise<PayrollAccrualServiceResult<PayrollAccrualRow>>;
  list(
    input: PayrollAccrualListInput,
  ): Promise<PayrollAccrualServiceResult<PayrollAccrualListData>>;
  post(
    input: PayrollAccrualStatusInput,
  ): Promise<PayrollAccrualServiceResult<PayrollAccrualRow>>;
};

export type PayrollAccrualListInput = {
  scope: TenantScope;
};

export type PayrollAccrualCreateFromTimesheetInput =
  PayrollAccrualListInput & {
    timesheet: TimesheetRow;
  };

export type PayrollAccrualStatusInput = PayrollAccrualListInput & {
  id: string;
};

export type PayrollAccrualServiceOptions = {
  auditLogRepository?: AuditLogRepository;
  ledgerPostingService?: PayrollAccrualLedgerPostingService;
  ledgerRepository?: Pick<LedgerRepository, "list">;
  now: () => string;
  repository: PayrollAccrualRepository;
};

export function createPayrollAccrualService({
  auditLogRepository,
  ledgerPostingService,
  ledgerRepository,
  now,
  repository,
}: PayrollAccrualServiceOptions): PayrollAccrualService {
  async function hydrateLedgerReferences(rows: PayrollAccrualRow[], scope: TenantScope) {
    if (!ledgerRepository) return rows;
    const entries = await ledgerRepository.list({ scope });
    const sourceEntries = new Map(
      entries
        .filter((entry) => entry.sourceType === "payroll-accrual" && entry.sourceId)
        .map((entry) => [entry.sourceId as string, entry]),
    );
    return rows.map((row) => ({
      ...row,
      ...(sourceEntries.get(row.id) ? { ledgerDocumentNo: sourceEntries.get(row.id)?.documentNo } : {}),
    }));
  }

  async function resolveRows(scope: TenantScope) {
    const errors = validateTenantScope(scope);

    if (errors.length > 0) {
      return { ok: false as const, errors };
    }

    return { ok: true as const, rows: await hydrateLedgerReferences(await repository.list({ scope }), scope) };
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

    async cancel({ scope, id }) {
      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const existing = resolved.rows.find((row) => row.id === id);

      if (!existing) {
        return { ok: false, errors: ["Maaş tahakkuku kaydı bulunamadı."] };
      }

      if (existing.status === "İptal") {
        return { ok: true, data: existing };
      }

      if (existing.status === "Kaydedildi") {
        return {
          ok: false,
          errors: [
            "Kaydedilmiş maaş tahakkuku doğrudan iptal edilemez; önce kontrollü ters kayıt akışı tamamlanmalıdır.",
          ],
        };
      }

      const cancelled = await repository.update({
        ...existing,
        status: "İptal",
        updatedBy: scope.userId,
        updatedAt: now(),
      });

      await recordPayrollAccrualAudit(auditLogRepository, {
        action: "payroll-accrual.cancel",
        occurredAt: cancelled.updatedAt,
        row: cancelled,
        scope,
        statusFrom: existing.status,
        statusTo: cancelled.status,
      });

      return {
        ok: true,
        data: cancelled,
      };
    },

    async createFromTimesheet({ scope, timesheet }) {
      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      if (timesheet.status !== "Kaydedildi") {
        return {
          ok: false,
          errors: [
            "Yalnız kesinleşmiş puantajdan maaş tahakkuku üretilebilir.",
          ],
        };
      }

      const duplicate = resolved.rows.find(
        (row) => row.sourceTimesheetId === timesheet.id,
      );

      if (duplicate) {
        return {
          ok: false,
          errors: [
            `Bu puantaj için maaş tahakkuku zaten oluşturulmuş: ${timesheet.documentNo}`,
          ],
        };
      }

      const createdAt = now();
      const row: PayrollAccrualRow = {
        id: createPayrollAccrualId(scope, timesheet.documentNo),
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        periodId: scope.periodId,
        documentNo: `MAAS-${timesheet.documentNo}`,
        sourceTimesheetId: timesheet.id,
        sourceTimesheetNo: timesheet.documentNo,
        year: timesheet.year,
        month: timesheet.month,
        siteCode: timesheet.siteCode,
        siteName: timesheet.siteName,
        contractorCode: timesheet.contractorCode,
        contractorName: timesheet.contractorName,
        status: "Taslak",
        grossTotal: timesheet.grossTotal,
        deductionTotal: timesheet.deductionTotal,
        netTotal: timesheet.netTotal,
        lineCount: timesheet.lineCount,
        lines: timesheet.lines.map((line) => ({
          advanceDeduction: line.advanceDeduction,
          debtDeduction: line.debtDeduction,
          deductionTotal: roundMoney(
            line.advanceDeduction + line.debtDeduction,
          ),
          grossTotal: roundMoney(
            line.workedDays * line.dailyWage +
              line.overtimeHours * line.overtimeHourlyRate,
          ),
          netTotal: roundMoney(
            line.workedDays * line.dailyWage +
              line.overtimeHours * line.overtimeHourlyRate -
              line.advanceDeduction -
              line.debtDeduction,
          ),
          overtimeHours: line.overtimeHours,
          personCode: line.personCode,
          personName: line.personName,
          regularWorkedDays: line.workedDays,
        })),
        createdBy: scope.userId,
        updatedBy: scope.userId,
        createdAt,
        updatedAt: createdAt,
      };
      const created = await repository.create(row);

      await recordPayrollAccrualAudit(auditLogRepository, {
        action: "payroll-accrual.create",
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
      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const existing = resolved.rows.find((row) => row.id === id);

      if (!existing) {
        return { ok: false, errors: ["Maaş tahakkuku kaydı bulunamadı."] };
      }

      if (existing.status === "İptal") {
        return {
          ok: false,
          errors: ["İptal edilmiş maaş tahakkuku kesinleştirilemez."],
        };
      }

      if (existing.status === "Kaydedildi") {
        return { ok: true, data: existing };
      }

      if (ledgerPostingService) {
        const ledgerResult = await ledgerPostingService.post({ payrollAccrual: existing, scope });
        if (!ledgerResult.ok) return { ok: false, errors: ledgerResult.errors };
        return { ok: true, data: ledgerResult.data.payrollAccrual };
      }

      const posted = await repository.update({
        ...existing,
        status: "Kaydedildi",
        updatedBy: scope.userId,
        updatedAt: now(),
      });

      await recordPayrollAccrualAudit(auditLogRepository, {
        action: "payroll-accrual.post",
        occurredAt: posted.updatedAt,
        row: posted,
        scope,
        statusFrom: existing.status,
        statusTo: posted.status,
      });

      return {
        ok: true,
        data: posted,
      };
    },
  };
}

type PayrollAccrualAuditInput = {
  action:
    | "payroll-accrual.cancel"
    | "payroll-accrual.create"
    | "payroll-accrual.post";
  occurredAt: string;
  row: PayrollAccrualRow;
  scope: TenantScope;
  statusFrom?: PayrollAccrualStatus;
  statusTo: PayrollAccrualStatus;
};

async function recordPayrollAccrualAudit(
  auditLogRepository: AuditLogRepository | undefined,
  input: PayrollAccrualAuditInput,
) {
  if (!auditLogRepository) {
    return;
  }

  await auditLogRepository.record(
    createAuditLogEntry(input.scope, {
      action: input.action,
      entityType: "payroll-accrual",
      entityId: input.row.id,
      entityLabel: input.row.documentNo,
      occurredAt: input.occurredAt,
      metadata: {
        documentNo: input.row.documentNo,
        lineCount: input.row.lineCount,
        month: input.row.month,
        netTotal: input.row.netTotal,
        sourceTimesheetNo: input.row.sourceTimesheetNo,
        statusFrom: input.statusFrom,
        statusTo: input.statusTo,
        year: input.row.year,
      },
    }),
  );
}

export function createSeededPayrollAccrualMemoryRepository(): PayrollAccrualRepository {
  const store = new Map<string, PayrollAccrualRow[]>();

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

function createPayrollAccrualId(scope: TenantScope, sourceTimesheetNo: string) {
  const normalizedSourceNo = sourceTimesheetNo
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${buildTenantScopeKey(scope)}::payroll-accrual::${normalizedSourceNo}`;
}

function cloneRow(row: PayrollAccrualRow): PayrollAccrualRow {
  return {
    ...row,
    lines: row.lines.map((line) => ({ ...line })),
  };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
