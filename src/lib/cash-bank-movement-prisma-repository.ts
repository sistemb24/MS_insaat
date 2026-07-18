import type {
  CashBankMovementDirection,
  CashBankMovementRepository,
  CashBankMovementRepositoryListInput,
  CashBankMovementRow,
  CashBankMovementType,
} from "./cash-bank-movement-service";
import { getP0BaseCurrencyTransactionValue } from "./settings-contract";

type CashBankMovementRecord = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  accountCode: string;
  accountName: string;
  movementDate: Date | string;
  movementType: string;
  direction: string;
  documentNo: string;
  counterpartyName: string;
  amount: unknown;
  currency: string;
  description?: string | null;
  sourceType: string;
  sourceId: string;
  sourceLabel: string;
  createdBy: string;
  updatedBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type CashBankMovementClient = {
  findMany(input: {
    where: {
      tenantId: string;
      companyId: string;
      periodId: string;
    };
    orderBy: Array<
      { movementDate: "asc" | "desc" } | { createdAt: "asc" | "desc" }
    >;
  }): Promise<CashBankMovementRecord[]>;
  create(input: {
    data: ReturnType<typeof rowToCreateData>;
  }): Promise<CashBankMovementRecord>;
};

export type CashBankMovementPrismaClientLike = {
  cashBankMovement: CashBankMovementClient;
  ledgerEntry?: {
    findMany(input: {
      where: { tenantId: string; companyId: string; periodId: string; sourceType: string };
      select: { id: true; sourceId: true; documentNo: true; sourceType: true };
    }): Promise<Array<{ id: string; sourceId: string | null; documentNo: string; sourceType: string | null }>>;
  };
};

export function createCashBankMovementPrismaRepository(
  prisma: CashBankMovementPrismaClientLike,
): CashBankMovementRepository {
  return {
    async list({ scope }: CashBankMovementRepositoryListInput) {
      const [rows, ledgerRows, reversalLedgerRows, expenseLedgerRows, transferLedgerRows] = await Promise.all([
        prisma.cashBankMovement.findMany({
        where: {
          tenantId: scope.tenantId,
          companyId: scope.companyId,
          periodId: scope.periodId,
        },
        orderBy: [{ movementDate: "desc" }, { createdAt: "desc" }],
        }),
        prisma.ledgerEntry?.findMany({
          where: {
            tenantId: scope.tenantId,
            companyId: scope.companyId,
            periodId: scope.periodId,
            sourceType: "cash-bank-movement",
          },
          select: { id: true, sourceId: true, documentNo: true, sourceType: true },
        }) ?? Promise.resolve([]),
        prisma.ledgerEntry?.findMany({
          where: {
            tenantId: scope.tenantId,
            companyId: scope.companyId,
            periodId: scope.periodId,
            sourceType: "cash-bank-movement-reversal",
          },
          select: { id: true, sourceId: true, documentNo: true, sourceType: true },
        }) ?? Promise.resolve([]),
        prisma.ledgerEntry?.findMany({
          where: {
            tenantId: scope.tenantId,
            companyId: scope.companyId,
            periodId: scope.periodId,
            sourceType: "expense",
          },
          select: { id: true, sourceId: true, documentNo: true, sourceType: true },
        }) ?? Promise.resolve([]),
        prisma.ledgerEntry?.findMany({
          where: {
            tenantId: scope.tenantId,
            companyId: scope.companyId,
            periodId: scope.periodId,
            sourceType: "cash-bank-transfer",
          },
          select: { id: true, sourceId: true, documentNo: true, sourceType: true },
        }) ?? Promise.resolve([]),
      ]);
      const ledgerBySourceId = new Map(
        [...ledgerRows, ...reversalLedgerRows, ...expenseLedgerRows]
          .filter((row) => row.sourceId && row.sourceType)
          .map((row) => [`${row.sourceType!}::${row.sourceId!}`, row]),
      );
      const transferLedgerByDocumentNo = new Map(
        transferLedgerRows
          .filter((row) => row.sourceId && row.sourceType)
          .map((row) => [row.sourceId!, row]),
      );
      return rows.map((row) => {
        if (row.sourceType === "transfer") {
          return recordToRow(row, transferLedgerByDocumentNo.get(row.documentNo));
        }
        const ledgerSourceType = row.sourceType === "cash-bank-movement-reversal"
          ? "cash-bank-movement-reversal"
          : row.sourceType === "expense"
            ? "expense"
            : "cash-bank-movement";
        const ledgerSourceId = row.sourceType === "cash-bank-movement-reversal" || row.sourceType === "expense"
          ? row.sourceId
          : row.id;
        return recordToRow(row, ledgerBySourceId.get(`${ledgerSourceType}::${ledgerSourceId}`));
      });
    },

    async create(row) {
      const created = await prisma.cashBankMovement.create({
        data: rowToCreateData(row),
      });

      return recordToRow(created);
    },
  };
}

function rowToCreateData(row: CashBankMovementRow) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    companyId: row.companyId,
    periodId: row.periodId,
    accountCode: row.accountCode,
    accountName: row.accountName,
    movementDate: parseDate(row.movementDate),
    movementType: row.movementType,
    direction: row.direction,
    documentNo: row.documentNo,
    counterpartyName: row.counterpartyName,
    amount: row.amount,
    currency: getP0BaseCurrencyTransactionValue(),
    description: row.description || null,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    sourceLabel: row.sourceLabel,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function recordToRow(record: CashBankMovementRecord, ledger?: { id: string; documentNo: string }): CashBankMovementRow {
  return {
    id: record.id,
    tenantId: record.tenantId,
    companyId: record.companyId,
    periodId: record.periodId,
    accountCode: record.accountCode,
    accountName: record.accountName,
    movementDate: formatDateOnly(record.movementDate),
    movementType: readMovementType(record.movementType),
    direction: readDirection(record.direction),
    documentNo: record.documentNo,
    counterpartyName: record.counterpartyName,
    amount: numberFromDecimal(record.amount),
    currency: readCurrency(record.currency),
    description: record.description ?? "",
    sourceType: record.sourceType,
    sourceId: record.sourceId,
    sourceLabel: record.sourceLabel,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdAt: formatIso(record.createdAt),
    updatedAt: formatIso(record.updatedAt),
    ...(ledger ? { ledgerEntryId: ledger.id, ledgerDocumentNo: ledger.documentNo } : {}),
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

function readCurrency(value: string): CashBankMovementRow["currency"] {
  void value;

  return getP0BaseCurrencyTransactionValue();
}

function readDirection(value: string): CashBankMovementDirection {
  return value === "Çıkış" ? "Çıkış" : "Giriş";
}

function readMovementType(value: string): CashBankMovementType {
  if (
    value === "Fatura Ödemesi" ||
    value === "Gider Ödemesi" ||
    value === "Hakediş Ödemesi" ||
    value === "Hakediş Tahsilatı" ||
    value === "Maaş Ödemesi" ||
    value === "Tahsilat" ||
    value === "Ödeme" ||
    value === "Virman"
  ) {
    return value;
  }

  return "Çek Tahsilatı";
}



