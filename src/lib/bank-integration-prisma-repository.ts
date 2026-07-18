import type {
  BankIntegrationConnectionRow,
  BankIntegrationRepository,
  BankLedgerEntryRepository,
  BankLedgerEntryRow,
  BankTransactionRow,
} from "./bank-integration-service";

type BankIntegrationConnectionRecord = {
  bankCode: string;
  bankName: string;
  companyId: string;
  consentId: string;
  createdAt: Date | string;
  createdBy: string;
  environment: string;
  id: string;
  lastTestedAt: Date | string;
  lastTestMessage: string;
  lastTestStatus: string;
  periodId: string;
  status: string;
  tenantId: string;
  updatedAt: Date | string;
  updatedBy: string;
};

type BankIntegrationConnectionClient = {
  findMany(input: {
    orderBy: Array<{ bankName: "asc" | "desc" }>;
    where: {
      companyId: string;
      periodId: string;
      tenantId: string;
    };
  }): Promise<BankIntegrationConnectionRecord[]>;
  upsert(input: {
    create: ReturnType<typeof connectionRowToCreateData>;
    update: ReturnType<typeof connectionRowToUpdateData>;
    where: {
      id: string;
    };
  }): Promise<BankIntegrationConnectionRecord>;
};

type BankTransactionRecord = {
  amount: unknown;
  bankConnectionId: string;
  bankName: string;
  companyId: string;
  currency: string;
  description: string;
  direction: string;
  externalId: string;
  id: string;
  occurredAt: Date | string;
  periodId: string;
  status: string;
  tenantId: string;
  updatedAt: Date | string;
};

type BankTransactionClient = {
  findMany(input: {
    orderBy: Array<{ occurredAt: "asc" | "desc" }>;
    take: number;
    where: {
      companyId: string;
      periodId: string;
      tenantId: string;
    };
  }): Promise<BankTransactionRecord[]>;
  upsert(input: {
    create: ReturnType<typeof transactionRowToCreateData>;
    update: ReturnType<typeof transactionRowToUpdateData>;
    where: {
      id: string;
    };
  }): Promise<BankTransactionRecord>;
};

type BankLedgerEntryRecord = {
  amount: unknown;
  bankTransactionId: string;
  cashBankAccountCode: string;
  cashBankAccountName: string;
  cashBankMovementId: string;
  companyId: string;
  createdAt: Date | string;
  createdBy: string;
  currency: string;
  description: string;
  documentNo: string;
  entryDate: Date | string;
  id: string;
  ledgerDirection: string;
  periodId: string;
  status: string;
  tenantId: string;
  updatedAt: Date | string;
  updatedBy: string;
};

type BankLedgerEntryClient = {
  findMany?(input: {
    orderBy: Array<
      | { createdAt: "asc" | "desc" }
      | { entryDate: "asc" | "desc" }
    >;
    take?: number;
    where: {
      bankTransactionId?: { in: string[] };
      companyId: string;
      periodId: string;
      tenantId: string;
    };
  }): Promise<BankLedgerEntryRecord[]>;
  findFirst(input: {
    where: {
      cashBankMovementId: string;
      companyId: string;
      periodId: string;
      status: "active";
      tenantId: string;
    };
  }): Promise<BankLedgerEntryRecord | null>;
  updateMany(input: {
    data: {
      status: "voided";
      updatedAt: Date;
      updatedBy: string;
    };
    where: {
      bankTransactionId: string;
      companyId: string;
      periodId: string;
      status: "active";
      tenantId: string;
    };
  }): Promise<{ count: number }>;
  upsert(input: {
    create: ReturnType<typeof ledgerEntryRowToCreateData>;
    update: ReturnType<typeof ledgerEntryRowToUpdateData>;
    where: {
      id: string;
    };
  }): Promise<BankLedgerEntryRecord>;
};

export type BankIntegrationPrismaClientLike = {
  bankIntegrationConnection: BankIntegrationConnectionClient;
  bankTransaction: BankTransactionClient;
};

export type BankLedgerPrismaClientLike = {
  bankLedgerEntry: BankLedgerEntryClient;
};

export function createBankIntegrationPrismaRepository(
  prisma: BankIntegrationPrismaClientLike,
): BankIntegrationRepository {
  return {
    async listConnections({ scope }) {
      const rows = await prisma.bankIntegrationConnection.findMany({
        orderBy: [{ bankName: "asc" }],
        where: {
          companyId: scope.companyId,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
        },
      });

      return rows.map(connectionRecordToRow);
    },

    async listTransactions({ scope }) {
      const rows = await prisma.bankTransaction.findMany({
        orderBy: [{ occurredAt: "desc" }],
        take: 20,
        where: {
          companyId: scope.companyId,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
        },
      });

      return rows.map(transactionRecordToRow);
    },

    async upsertConnection({ connection }) {
      const row = await prisma.bankIntegrationConnection.upsert({
        create: connectionRowToCreateData(connection),
        update: connectionRowToUpdateData(connection),
        where: {
          id: connection.id,
        },
      });

      return connectionRecordToRow(row);
    },

    async upsertTransactions({ preserveExistingStatus = false, transactions }) {
      const rows = await Promise.all(
        transactions.map((transaction) =>
          prisma.bankTransaction.upsert({
            create: transactionRowToCreateData(transaction),
            update: transactionRowToUpdateData(transaction, {
              preserveExistingStatus,
            }),
            where: {
              id: transaction.id,
            },
          }),
        ),
      );

      return rows.map(transactionRecordToRow);
    },
  };
}

export function createBankLedgerPrismaRepository(
  prisma: BankLedgerPrismaClientLike,
): BankLedgerEntryRepository {
  return {
    async listEntries({ bankTransactionIds, scope }) {
      const scopedTransactionIds = bankTransactionIds
        ? [...new Set(bankTransactionIds)]
        : undefined;
      const rows = await prisma.bankLedgerEntry.findMany!({
        orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
        ...(scopedTransactionIds ? {} : { take: 20 }),
        where: {
          ...(scopedTransactionIds
            ? { bankTransactionId: { in: scopedTransactionIds } }
            : {}),
          companyId: scope.companyId,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
        },
      });

      return rows.map(ledgerEntryRecordToRow);
    },
    async findActiveByCashBankMovementId({ cashBankMovementId, scope }) {
      const row = await prisma.bankLedgerEntry.findFirst({
        where: {
          cashBankMovementId,
          companyId: scope.companyId,
          periodId: scope.periodId,
          status: "active",
          tenantId: scope.tenantId,
        },
      });

      return row ? ledgerEntryRecordToRow(row) : null;
    },

    async upsertEntry({ entry }) {
      const row = await prisma.bankLedgerEntry.upsert({
        create: ledgerEntryRowToCreateData(entry),
        update: ledgerEntryRowToUpdateData(entry),
        where: {
          id: entry.id,
        },
      });

      return ledgerEntryRecordToRow(row);
    },

    async voidByBankTransactionId({
      bankTransactionId,
      scope,
      updatedAt,
      updatedBy,
    }) {
      await prisma.bankLedgerEntry.updateMany({
        data: {
          status: "voided",
          updatedAt: new Date(updatedAt),
          updatedBy,
        },
        where: {
          bankTransactionId,
          companyId: scope.companyId,
          periodId: scope.periodId,
          status: "active",
          tenantId: scope.tenantId,
        },
      });
    },
  };
}

function connectionRowToCreateData(row: BankIntegrationConnectionRow) {
  return {
    bankCode: row.bankCode,
    bankName: row.bankName,
    companyId: row.companyId,
    consentId: row.consentId,
    createdAt: new Date(row.createdAt),
    createdBy: row.createdBy,
    environment: row.environment,
    id: row.id,
    lastTestedAt: new Date(row.lastTestedAt),
    lastTestMessage: row.lastTestMessage,
    lastTestStatus: row.lastTestStatus,
    periodId: row.periodId,
    status: row.status,
    tenantId: row.tenantId,
    updatedAt: new Date(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}

function connectionRowToUpdateData(row: BankIntegrationConnectionRow) {
  return {
    bankName: row.bankName,
    consentId: row.consentId,
    lastTestedAt: new Date(row.lastTestedAt),
    lastTestMessage: row.lastTestMessage,
    lastTestStatus: row.lastTestStatus,
    status: row.status,
    updatedAt: new Date(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}

function connectionRecordToRow(
  row: BankIntegrationConnectionRecord,
): BankIntegrationConnectionRow {
  return {
    bankCode: row.bankCode,
    bankName: row.bankName,
    companyId: row.companyId,
    consentId: row.consentId,
    createdAt: toIsoString(row.createdAt),
    createdBy: row.createdBy,
    environment: row.environment === "sandbox" ? "sandbox" : "sandbox",
    id: row.id,
    lastTestedAt: toIsoString(row.lastTestedAt),
    lastTestMessage: row.lastTestMessage,
    lastTestStatus: row.lastTestStatus === "success" ? "success" : "failed",
    periodId: row.periodId,
    status: row.status === "connected" ? "connected" : "failed",
    tenantId: row.tenantId,
    updatedAt: toIsoString(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}

function transactionRowToCreateData(row: BankTransactionRow) {
  return {
    amount: row.amount,
    bankConnectionId: row.bankConnectionId,
    bankName: row.bankName,
    companyId: row.companyId,
    currency: row.currency,
    description: row.description,
    direction: row.direction,
    externalId: row.externalId,
    id: row.id,
    occurredAt: new Date(row.occurredAt),
    periodId: row.periodId,
    status: row.status,
    tenantId: row.tenantId,
    updatedAt: new Date(row.updatedAt),
  };
}

function transactionRowToUpdateData(
  row: BankTransactionRow,
  {
    preserveExistingStatus = false,
  }: {
    preserveExistingStatus?: boolean;
  } = {},
) {
  const updateData = {
    amount: row.amount,
    bankName: row.bankName,
    currency: row.currency,
    description: row.description,
    direction: row.direction,
    occurredAt: new Date(row.occurredAt),
    updatedAt: new Date(row.updatedAt),
  };

  if (preserveExistingStatus) {
    return updateData;
  }

  return {
    ...updateData,
    status: row.status,
  };
}

function transactionRecordToRow(row: BankTransactionRecord): BankTransactionRow {
  return {
    amount: Number(row.amount ?? 0),
    bankConnectionId: row.bankConnectionId,
    bankName: row.bankName,
    companyId: row.companyId,
    currency: row.currency === "TRY" ? "TRY" : "TRY",
    description: row.description,
    direction: row.direction === "outflow" ? "outflow" : "inflow",
    externalId: row.externalId,
    id: row.id,
    occurredAt: toIsoString(row.occurredAt),
    periodId: row.periodId,
    status:
      row.status === "matched"
        ? "matched"
        : row.status === "ignored"
          ? "ignored"
          : "pending",
    tenantId: row.tenantId,
    updatedAt: toIsoString(row.updatedAt),
  };
}

function ledgerEntryRowToCreateData(row: BankLedgerEntryRow) {
  return {
    amount: row.amount,
    bankTransactionId: row.bankTransactionId,
    cashBankAccountCode: row.cashBankAccountCode,
    cashBankAccountName: row.cashBankAccountName,
    cashBankMovementId: row.cashBankMovementId,
    companyId: row.companyId,
    createdAt: new Date(row.createdAt),
    createdBy: row.createdBy,
    currency: row.currency,
    description: row.description,
    documentNo: row.documentNo,
    entryDate: new Date(row.entryDate),
    id: row.id,
    ledgerDirection: row.ledgerDirection,
    periodId: row.periodId,
    status: row.status,
    tenantId: row.tenantId,
    updatedAt: new Date(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}

function ledgerEntryRowToUpdateData(row: BankLedgerEntryRow) {
  return {
    amount: row.amount,
    cashBankAccountCode: row.cashBankAccountCode,
    cashBankAccountName: row.cashBankAccountName,
    cashBankMovementId: row.cashBankMovementId,
    currency: row.currency,
    description: row.description,
    documentNo: row.documentNo,
    entryDate: new Date(row.entryDate),
    ledgerDirection: row.ledgerDirection,
    status: row.status,
    updatedAt: new Date(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}

function ledgerEntryRecordToRow(row: BankLedgerEntryRecord): BankLedgerEntryRow {
  return {
    amount: Number(row.amount ?? 0),
    bankTransactionId: row.bankTransactionId,
    cashBankAccountCode: row.cashBankAccountCode,
    cashBankAccountName: row.cashBankAccountName,
    cashBankMovementId: row.cashBankMovementId,
    companyId: row.companyId,
    createdAt: toIsoString(row.createdAt),
    createdBy: row.createdBy,
    currency: row.currency === "TRY" ? "TRY" : "TRY",
    description: row.description,
    documentNo: row.documentNo,
    entryDate: toDateOnly(row.entryDate),
    id: row.id,
    ledgerDirection: row.ledgerDirection === "credit" ? "credit" : "debit",
    periodId: row.periodId,
    status: row.status === "voided" ? "voided" : "active",
    tenantId: row.tenantId,
    updatedAt: toIsoString(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateOnly(value: Date | string) {
  return toIsoString(value).slice(0, 10);
}
