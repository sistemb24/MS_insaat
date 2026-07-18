import { calculateTimesheetTotals } from "./timesheet-service";
import type {
  TimesheetRepository,
  TimesheetRepositoryListInput,
  TimesheetRow,
  TimesheetStatus,
} from "./timesheet-service";

type TimesheetWithLines = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  documentNo: string;
  year: number;
  month: number;
  contractorCode?: string | null;
  contractorName?: string | null;
  siteCode: string;
  siteName: string;
  description?: string | null;
  status: string;
  totalWorkedDays: unknown;
  totalOvertimeHours: unknown;
  grossTotal: unknown;
  deductionTotal: unknown;
  netTotal: unknown;
  lineCount: number;
  createdBy: string;
  updatedBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  lines: TimesheetLineRecord[];
};

type TimesheetLineRecord = {
  advanceDeduction?: unknown;
  dailyWage?: unknown;
  debtDeduction?: unknown;
  overtimeHourlyRate?: unknown;
  overtimeHours?: unknown;
  personCode?: string;
  personName?: string;
  workedDays?: unknown;
};

type TimesheetClient = {
  create(input: {
    data: ReturnType<typeof rowToCreateData>;
    include: ReturnType<typeof lineInclude>;
  }): Promise<TimesheetWithLines>;
  findMany(input: {
    where: {
      tenantId: string;
      companyId: string;
      periodId: string;
    };
    orderBy: Array<
      | { year: "asc" | "desc" }
      | { month: "asc" | "desc" }
      | { documentNo: "asc" | "desc" }
    >;
    include: ReturnType<typeof lineInclude>;
  }): Promise<TimesheetWithLines[]>;
  update(input: {
    where: {
      id: string;
    };
    data: ReturnType<typeof rowToUpdateData>;
    include: ReturnType<typeof lineInclude>;
  }): Promise<TimesheetWithLines>;
};

export type TimesheetPrismaClientLike = {
  timesheet: TimesheetClient;
};

export function createTimesheetPrismaRepository(
  prisma: TimesheetPrismaClientLike,
): TimesheetRepository {
  return {
    async list({ scope }: TimesheetRepositoryListInput) {
      const rows = await prisma.timesheet.findMany({
        where: {
          tenantId: scope.tenantId,
          companyId: scope.companyId,
          periodId: scope.periodId,
        },
        orderBy: [{ year: "desc" }, { month: "desc" }, { documentNo: "asc" }],
        include: lineInclude(),
      });

      return rows.map(recordToRow);
    },

    async create(row) {
      const created = await prisma.timesheet.create({
        data: rowToCreateData(row),
        include: lineInclude(),
      });

      return recordToRow(created);
    },

    async update(row) {
      const updated = await prisma.timesheet.update({
        where: {
          id: row.id,
        },
        data: rowToUpdateData(row),
        include: lineInclude(),
      });

      return recordToRow(updated);
    },
  };
}

function rowToCreateData(row: TimesheetRow) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    companyId: row.companyId,
    periodId: row.periodId,
    ...rowToPersistedFields(row),
    createdBy: row.createdBy,
    createdAt: new Date(row.createdAt),
    lines: {
      createMany: {
        data: rowToLineCreateManyData(row),
      },
    },
  };
}

function rowToUpdateData(row: TimesheetRow) {
  return {
    ...rowToPersistedFields(row),
    lines: {
      deleteMany: {},
      createMany: {
        data: rowToLineCreateManyData(row),
      },
    },
  };
}

function rowToPersistedFields(row: TimesheetRow) {
  return {
    contractorCode: row.contractorCode || null,
    contractorName: row.contractorName || null,
    deductionTotal: row.deductionTotal,
    description: row.description || null,
    documentNo: row.documentNo,
    grossTotal: row.grossTotal,
    lineCount: row.lineCount,
    month: row.month,
    netTotal: row.netTotal,
    siteCode: row.siteCode,
    siteName: row.siteName,
    status: row.status,
    totalOvertimeHours: row.totalOvertimeHours,
    totalWorkedDays: row.totalWorkedDays,
    updatedAt: new Date(row.updatedAt),
    updatedBy: row.updatedBy,
    year: row.year,
  };
}

function rowToLineCreateManyData(row: TimesheetRow) {
  const totals = calculateTimesheetTotals(row);

  return row.lines.map((line, index) => {
    const lineTotals = totals.lines[index];

    return {
      advanceDeduction: line.advanceDeduction,
      dailyWage: line.dailyWage,
      debtDeduction: line.debtDeduction,
      deductionTotal: lineTotals.deductionTotal,
      grossTotal: lineTotals.grossTotal,
      lineNo: lineTotals.lineNo,
      netTotal: lineTotals.netTotal,
      overtimeHourlyRate: line.overtimeHourlyRate,
      overtimeHours: line.overtimeHours,
      overtimeTotal: lineTotals.overtimeTotal,
      personCode: line.personCode,
      personName: line.personName,
      regularTotal: lineTotals.regularTotal,
      workedDays: line.workedDays,
    };
  });
}

function recordToRow(record: TimesheetWithLines): TimesheetRow {
  return {
    id: record.id,
    tenantId: record.tenantId,
    companyId: record.companyId,
    periodId: record.periodId,
    contractorCode: record.contractorCode ?? "",
    contractorName: record.contractorName ?? "",
    createdAt: formatIso(record.createdAt),
    createdBy: record.createdBy,
    deductionTotal: numberFromDecimal(record.deductionTotal),
    description: record.description ?? "",
    documentNo: record.documentNo,
    grossTotal: numberFromDecimal(record.grossTotal),
    lineCount: record.lineCount,
    lines: record.lines.map((line) => ({
      advanceDeduction: numberFromDecimal(line.advanceDeduction),
      dailyWage: numberFromDecimal(line.dailyWage),
      debtDeduction: numberFromDecimal(line.debtDeduction),
      overtimeHourlyRate: numberFromDecimal(line.overtimeHourlyRate),
      overtimeHours: numberFromDecimal(line.overtimeHours),
      personCode: line.personCode ?? "",
      personName: line.personName ?? "",
      workedDays: numberFromDecimal(line.workedDays),
    })),
    month: record.month,
    netTotal: numberFromDecimal(record.netTotal),
    siteCode: record.siteCode,
    siteName: record.siteName,
    status: readStatus(record.status),
    totalOvertimeHours: numberFromDecimal(record.totalOvertimeHours),
    totalWorkedDays: numberFromDecimal(record.totalWorkedDays),
    updatedAt: formatIso(record.updatedAt),
    updatedBy: record.updatedBy,
    year: record.year,
  };
}

function lineInclude() {
  return {
    lines: {
      orderBy: {
        lineNo: "asc" as const,
      },
    },
  };
}

function formatIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function numberFromDecimal(value: unknown) {
  return Number(value ?? 0);
}

function readStatus(value: string): TimesheetStatus {
  if (value === "Kaydedildi" || value === "İptal") {
    return value;
  }

  return "Taslak";
}
