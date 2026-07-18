import type {
  ExpenseRepository,
  ExpenseRepositoryListInput,
  ExpenseRow,
  ExpenseStatus,
} from "./expense-service";
import { getP0BaseCurrencyTransactionValue } from "./settings-contract";

type ExpenseRecord = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  documentNo: string;
  expenseDate: Date | string;
  siteCode: string;
  siteName: string;
  movementGroup: string;
  accountCode: string;
  accountName: string;
  counterpartyName: string;
  amount: unknown;
  vatRate: unknown;
  vatTotal: unknown;
  grandTotal: unknown;
  currency: string;
  status: string;
  description?: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type ExpenseClient = {
  create(input: { data: ReturnType<typeof rowToCreateData> }): Promise<ExpenseRecord>;
  findMany(input: {
    where: {
      tenantId: string;
      companyId: string;
      periodId: string;
    };
    orderBy: Array<{ expenseDate: "asc" | "desc" } | { createdAt: "asc" | "desc" }>;
  }): Promise<ExpenseRecord[]>;
};

export type ExpensePrismaClientLike = {
  expense: ExpenseClient;
};

export function createExpensePrismaRepository(
  prisma: ExpensePrismaClientLike,
): ExpenseRepository {
  return {
    async create(row) {
      const created = await prisma.expense.create({
        data: rowToCreateData(row),
      });

      return recordToRow(created);
    },

    async list({ scope }: ExpenseRepositoryListInput) {
      const rows = await prisma.expense.findMany({
        where: {
          tenantId: scope.tenantId,
          companyId: scope.companyId,
          periodId: scope.periodId,
        },
        orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      });

      return rows.map(recordToRow);
    },
  };
}

function rowToCreateData(row: ExpenseRow) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    companyId: row.companyId,
    periodId: row.periodId,
    documentNo: row.documentNo,
    expenseDate: parseDate(row.expenseDate),
    siteCode: row.siteCode,
    siteName: row.siteName,
    movementGroup: row.movementGroup,
    accountCode: row.accountCode,
    accountName: row.accountName,
    counterpartyName: row.counterpartyName,
    amount: row.amount,
    vatRate: row.vatRate ?? 0,
    vatTotal: row.vatTotal,
    grandTotal: row.grandTotal,
    currency: getP0BaseCurrencyTransactionValue(),
    status: row.status,
    description: row.description || null,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function recordToRow(record: ExpenseRecord): ExpenseRow {
  return {
    id: record.id,
    tenantId: record.tenantId,
    companyId: record.companyId,
    periodId: record.periodId,
    documentNo: record.documentNo,
    expenseDate: formatDateOnly(record.expenseDate),
    siteCode: record.siteCode,
    siteName: record.siteName,
    movementGroup: record.movementGroup,
    accountCode: record.accountCode,
    accountName: record.accountName,
    counterpartyName: record.counterpartyName,
    amount: numberFromDecimal(record.amount),
    vatRate: numberFromDecimal(record.vatRate),
    vatTotal: numberFromDecimal(record.vatTotal),
    grandTotal: numberFromDecimal(record.grandTotal),
    currency: readCurrency(record.currency),
    status: readStatus(record.status),
    description: record.description ?? "",
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdAt: formatIso(record.createdAt),
    updatedAt: formatIso(record.updatedAt),
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

function readCurrency(value: string): ExpenseRow["currency"] {
  void value;

  return getP0BaseCurrencyTransactionValue();
}

function readStatus(value: string): ExpenseStatus {
  return value === "İptal" ? "İptal" : "Kaydedildi";
}
