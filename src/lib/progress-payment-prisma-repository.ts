import { calculateProgressPaymentTotals } from "./progress-payment-service";
import type {
  ProgressPaymentRepository,
  ProgressPaymentRepositoryListInput,
  ProgressPaymentRow,
  ProgressPaymentStatus,
  ProgressPaymentType,
} from "./progress-payment-service";
import { getP0BaseCurrencyTransactionValue } from "./settings-contract";

type ProgressPaymentWithLines = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  documentNo: string;
  issueDate: Date | string;
  paymentType: string;
  counterpartyCode: string;
  counterpartyName: string;
  siteCode: string;
  siteName: string;
  currency: string;
  description?: string | null;
  retentionRate: unknown;
  status: string;
  grossTotal: unknown;
  retentionTotal: unknown;
  netTotal: unknown;
  vatTotal: unknown;
  grandTotal: unknown;
  lineCount: number;
  createdBy: string;
  updatedBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  lines: ProgressPaymentLineRecord[];
};

type ProgressPaymentLineRecord = {
  description?: string;
  quantity?: unknown;
  unit?: string;
  unitPrice?: unknown;
  vatRate?: unknown;
};

type ProgressPaymentClient = {
  create(input: {
    data: ReturnType<typeof progressPaymentRowToCreateData>;
    include: ReturnType<typeof lineInclude>;
  }): Promise<ProgressPaymentWithLines>;
  findMany(input: {
    where: {
      tenantId: string;
      companyId: string;
      periodId: string;
    };
    orderBy: Array<{ issueDate: "asc" | "desc" } | { documentNo: "asc" | "desc" }>;
    include: ReturnType<typeof lineInclude>;
  }): Promise<ProgressPaymentWithLines[]>;
  update(input: {
    where: {
      id: string;
    };
    data: ReturnType<typeof rowToUpdateData>;
    include: ReturnType<typeof lineInclude>;
  }): Promise<ProgressPaymentWithLines>;
};

export type ProgressPaymentPrismaClientLike = {
  progressPayment: ProgressPaymentClient;
};

export function createProgressPaymentPrismaRepository(
  prisma: ProgressPaymentPrismaClientLike,
): ProgressPaymentRepository {
  return {
    async list({ scope }: ProgressPaymentRepositoryListInput) {
      const rows = await prisma.progressPayment.findMany({
        where: {
          tenantId: scope.tenantId,
          companyId: scope.companyId,
          periodId: scope.periodId,
        },
        orderBy: [{ issueDate: "desc" }, { documentNo: "asc" }],
        include: lineInclude(),
      });

      return rows.map(progressPaymentRecordToRow);
    },

    async create(row) {
      const created = await prisma.progressPayment.create({
        data: progressPaymentRowToCreateData(row),
        include: lineInclude(),
      });

      return progressPaymentRecordToRow(created);
    },

    async update(row) {
      const updated = await prisma.progressPayment.update({
        where: {
          id: row.id,
        },
        data: rowToUpdateData(row),
        include: lineInclude(),
      });

      return progressPaymentRecordToRow(updated);
    },
  };
}

export function progressPaymentRowToCreateData(row: ProgressPaymentRow) {
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

function rowToUpdateData(row: ProgressPaymentRow) {
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

function rowToPersistedFields(row: ProgressPaymentRow) {
  return {
    documentNo: row.documentNo,
    issueDate: parseDate(row.issueDate),
    paymentType: row.paymentType,
    counterpartyCode: row.counterpartyCode,
    counterpartyName: row.counterpartyName,
    siteCode: row.siteCode,
    siteName: row.siteName,
    currency: getP0BaseCurrencyTransactionValue(),
    description: row.description || null,
    retentionRate: row.retentionRate,
    status: row.status,
    grossTotal: row.grossTotal,
    retentionTotal: row.retentionTotal,
    netTotal: row.netTotal,
    vatTotal: row.vatTotal,
    grandTotal: row.grandTotal,
    lineCount: row.lineCount,
    updatedBy: row.updatedBy,
    updatedAt: new Date(row.updatedAt),
  };
}

function rowToLineCreateManyData(row: ProgressPaymentRow) {
  const totals = calculateProgressPaymentTotals(row);

  return row.lines.map((line, index) => {
    const lineTotals = totals.lines[index];

    return {
      lineNo: lineTotals.lineNo,
      description: line.description,
      unit: line.unit,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      vatRate: line.vatRate,
      grossTotal: lineTotals.grossTotal,
      vatTotal: lineTotals.vatTotal,
    };
  });
}

export function progressPaymentRecordToRow(record: ProgressPaymentWithLines): ProgressPaymentRow {
  return {
    id: record.id,
    tenantId: record.tenantId,
    companyId: record.companyId,
    periodId: record.periodId,
    counterpartyCode: record.counterpartyCode,
    counterpartyName: record.counterpartyName,
    currency: readCurrency(record.currency),
    description: record.description ?? "",
    documentNo: record.documentNo,
    grossTotal: numberFromDecimal(record.grossTotal),
    issueDate: formatDateOnly(record.issueDate),
    lineCount: record.lineCount,
    lines: record.lines.map((line) => ({
      description: line.description ?? "",
      quantity: numberFromDecimal(line.quantity),
      unit: line.unit ?? "",
      unitPrice: numberFromDecimal(line.unitPrice),
      vatRate: numberFromDecimal(line.vatRate),
    })),
    netTotal: numberFromDecimal(record.netTotal),
    paymentType: readPaymentType(record.paymentType),
    retentionRate: numberFromDecimal(record.retentionRate),
    retentionTotal: numberFromDecimal(record.retentionTotal),
    siteCode: record.siteCode,
    siteName: record.siteName,
    status: readStatus(record.status),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdAt: formatIso(record.createdAt),
    updatedAt: formatIso(record.updatedAt),
    vatTotal: numberFromDecimal(record.vatTotal),
    grandTotal: numberFromDecimal(record.grandTotal),
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

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateOnly(value: Date | string) {
  return formatIso(value).slice(0, 10);
}

function formatIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function numberFromDecimal(value: unknown) {
  return Number(value ?? 0);
}

function readCurrency(value: string): ProgressPaymentRow["currency"] {
  void value;

  return getP0BaseCurrencyTransactionValue();
}

function readPaymentType(value: string): ProgressPaymentType {
  if (value === "Şantiye Geliri" || value === "Tedarikçi Hakedişi") {
    return value;
  }

  return "Taşeron Hakedişi";
}

function readStatus(value: string): ProgressPaymentStatus {
  if (value === "Kaydedildi" || value === "İptal") {
    return value;
  }

  return "Taslak";
}
