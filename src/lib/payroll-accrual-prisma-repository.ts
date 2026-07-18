import type {
  PayrollAccrualRepository,
  PayrollAccrualRepositoryListInput,
  PayrollAccrualRow,
  PayrollAccrualStatus,
} from "./payroll-accrual-service";

type PayrollAccrualWithLines = {
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
  contractorCode?: string | null;
  contractorName?: string | null;
  status: string;
  grossTotal: unknown;
  deductionTotal: unknown;
  netTotal: unknown;
  lineCount: number;
  createdBy: string;
  updatedBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  lines: PayrollAccrualLineRecord[];
};

type PayrollAccrualLineRecord = {
  advanceDeduction?: unknown;
  debtDeduction?: unknown;
  deductionTotal?: unknown;
  grossTotal?: unknown;
  netTotal?: unknown;
  overtimeHours?: unknown;
  personCode?: string;
  personName?: string;
  regularWorkedDays?: unknown;
};

type PayrollAccrualClient = {
  create(input: {
    data: ReturnType<typeof rowToCreateData>;
    include: ReturnType<typeof lineInclude>;
  }): Promise<PayrollAccrualWithLines>;
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
  }): Promise<PayrollAccrualWithLines[]>;
  update(input: {
    where: {
      id: string;
    };
    data: ReturnType<typeof rowToUpdateData>;
    include: ReturnType<typeof lineInclude>;
  }): Promise<PayrollAccrualWithLines>;
};

export type PayrollAccrualPrismaClientLike = {
  payrollAccrual: PayrollAccrualClient;
};

export function createPayrollAccrualPrismaRepository(
  prisma: PayrollAccrualPrismaClientLike,
): PayrollAccrualRepository {
  return {
    async list({ scope }: PayrollAccrualRepositoryListInput) {
      const rows = await prisma.payrollAccrual.findMany({
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
      const created = await prisma.payrollAccrual.create({
        data: rowToCreateData(row),
        include: lineInclude(),
      });

      return recordToRow(created);
    },

    async update(row) {
      const updated = await prisma.payrollAccrual.update({
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

function rowToCreateData(row: PayrollAccrualRow) {
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

function rowToUpdateData(row: PayrollAccrualRow) {
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

function rowToPersistedFields(row: PayrollAccrualRow) {
  return {
    contractorCode: row.contractorCode || null,
    contractorName: row.contractorName || null,
    deductionTotal: row.deductionTotal,
    documentNo: row.documentNo,
    grossTotal: row.grossTotal,
    lineCount: row.lineCount,
    month: row.month,
    netTotal: row.netTotal,
    siteCode: row.siteCode,
    siteName: row.siteName,
    sourceTimesheetId: row.sourceTimesheetId,
    sourceTimesheetNo: row.sourceTimesheetNo,
    status: row.status,
    updatedAt: new Date(row.updatedAt),
    updatedBy: row.updatedBy,
    year: row.year,
  };
}

function rowToLineCreateManyData(row: PayrollAccrualRow) {
  return row.lines.map((line, index) => ({
    advanceDeduction: line.advanceDeduction,
    debtDeduction: line.debtDeduction,
    deductionTotal: line.deductionTotal,
    grossTotal: line.grossTotal,
    lineNo: index + 1,
    netTotal: line.netTotal,
    overtimeHours: line.overtimeHours,
    personCode: line.personCode,
    personName: line.personName,
    regularWorkedDays: line.regularWorkedDays,
  }));
}

function recordToRow(record: PayrollAccrualWithLines): PayrollAccrualRow {
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
    documentNo: record.documentNo,
    grossTotal: numberFromDecimal(record.grossTotal),
    lineCount: record.lineCount,
    lines: record.lines.map((line) => ({
      advanceDeduction: numberFromDecimal(line.advanceDeduction),
      debtDeduction: numberFromDecimal(line.debtDeduction),
      deductionTotal: numberFromDecimal(line.deductionTotal),
      grossTotal: numberFromDecimal(line.grossTotal),
      netTotal: numberFromDecimal(line.netTotal),
      overtimeHours: numberFromDecimal(line.overtimeHours),
      personCode: line.personCode ?? "",
      personName: line.personName ?? "",
      regularWorkedDays: numberFromDecimal(line.regularWorkedDays),
    })),
    month: record.month,
    netTotal: numberFromDecimal(record.netTotal),
    siteCode: record.siteCode,
    siteName: record.siteName,
    sourceTimesheetId: record.sourceTimesheetId,
    sourceTimesheetNo: record.sourceTimesheetNo,
    status: readStatus(record.status),
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

function readStatus(value: string): PayrollAccrualStatus {
  if (value === "Kaydedildi" || value === "İptal") {
    return value;
  }

  return "Taslak";
}
