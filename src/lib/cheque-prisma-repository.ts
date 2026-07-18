import type {
  ChequeDirection,
  ChequeRepository,
  ChequeRepositoryListInput,
  ChequeRow,
  ChequeStatus,
} from "./cheque-service";
import { getP0BaseCurrencyTransactionValue } from "./settings-contract";

type ChequeRecord = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  direction: string;
  documentNo: string;
  checkNo: string;
  bankName: string;
  branchName?: string | null;
  drawerName: string;
  issueDate: Date | string;
  dueDate: Date | string;
  amount: unknown;
  currency: string;
  status: string;
  description?: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type ChequeClient = {
  findMany(input: {
    where: {
      tenantId: string;
      companyId: string;
      periodId: string;
    };
    orderBy: Array<{ dueDate: "asc" | "desc" } | { documentNo: "asc" | "desc" }>;
  }): Promise<ChequeRecord[]>;
  create(input: {
    data: ReturnType<typeof rowToCreateData>;
  }): Promise<ChequeRecord>;
  update(input: {
    where: {
      id: string;
    };
    data: ReturnType<typeof rowToUpdateData>;
  }): Promise<ChequeRecord>;
};

export type ChequePrismaClientLike = {
  cheque: ChequeClient;
};

export function createChequePrismaRepository(
  prisma: ChequePrismaClientLike,
): ChequeRepository {
  return {
    async list({ scope }: ChequeRepositoryListInput) {
      const rows = await prisma.cheque.findMany({
        where: {
          tenantId: scope.tenantId,
          companyId: scope.companyId,
          periodId: scope.periodId,
        },
        orderBy: [{ dueDate: "asc" }, { documentNo: "asc" }],
      });

      return rows.map(recordToRow);
    },

    async create(row) {
      const created = await prisma.cheque.create({
        data: rowToCreateData(row),
      });

      return recordToRow(created);
    },

    async update(row) {
      const updated = await prisma.cheque.update({
        where: {
          id: row.id,
        },
        data: rowToUpdateData(row),
      });

      return recordToRow(updated);
    },
  };
}

function rowToCreateData(row: ChequeRow) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    companyId: row.companyId,
    periodId: row.periodId,
    ...rowToPersistedFields(row),
    createdBy: row.createdBy,
    createdAt: new Date(row.createdAt),
  };
}

function rowToUpdateData(row: ChequeRow) {
  return rowToPersistedFields(row);
}

function rowToPersistedFields(row: ChequeRow) {
  return {
    amount: row.amount,
    bankName: row.bankName,
    branchName: row.branchName || null,
    checkNo: row.checkNo,
    currency: getP0BaseCurrencyTransactionValue(),
    description: row.description || null,
    direction: row.direction,
    documentNo: row.documentNo,
    drawerName: row.drawerName,
    dueDate: parseDate(row.dueDate),
    issueDate: parseDate(row.issueDate),
    status: row.status,
    updatedBy: row.updatedBy,
    updatedAt: new Date(row.updatedAt),
  };
}

function recordToRow(record: ChequeRecord): ChequeRow {
  return {
    id: record.id,
    tenantId: record.tenantId,
    companyId: record.companyId,
    periodId: record.periodId,
    direction: readDirection(record.direction),
    documentNo: record.documentNo,
    checkNo: record.checkNo,
    bankName: record.bankName,
    branchName: record.branchName ?? "",
    drawerName: record.drawerName,
    issueDate: formatDateOnly(record.issueDate),
    dueDate: formatDateOnly(record.dueDate),
    amount: numberFromDecimal(record.amount),
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

function readCurrency(value: string): ChequeRow["currency"] {
  void value;

  return getP0BaseCurrencyTransactionValue();
}

function readDirection(value: string): ChequeDirection {
  return value === "Firma" ? "Firma" : "Gelen";
}

function readStatus(value: string): ChequeStatus {
  if (value === "Tahsil Edildi" || value === "İptal") {
    return value;
  }

  return "Portföyde";
}
