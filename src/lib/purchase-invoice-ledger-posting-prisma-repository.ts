import type { AuditLogEntryInput } from "./audit-log";
import type { LedgerJournalRow } from "./ledger-service";
import type { PurchaseInvoiceRow } from "./purchase-invoice-service";
import {
  type PurchaseInvoiceLedgerPostingCommand,
  type PurchaseInvoiceLedgerPostingFailure,
  type PurchaseInvoiceLedgerPostingRepository,
  type PurchaseInvoiceLedgerPostingResult,
} from "./purchase-invoice-ledger-posting-service";
import type { TenantScope } from "./tenant-scope";

type DecimalValue = number | { toString(): string };

type PurchaseInvoiceStateRecord = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  documentNo: string;
  invoiceDate: Date | string;
  currency: string;
  status: string;
  netTotal: DecimalValue;
  vatTotal: DecimalValue;
  withholdingTotal: DecimalValue;
  grandTotal: DecimalValue;
  updatedBy: string;
  updatedAt: Date | string;
};

type LedgerEntryRecord = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  sourceType: string | null;
  sourceId: string | null;
  entryDate: Date | string;
  documentNo: string;
  description: string;
  currency: string;
  status: string;
  debitTotal: DecimalValue;
  creditTotal: DecimalValue;
  createdBy: string;
  updatedBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  lines: Array<{
    lineNo: number;
    accountCode: string;
    accountName: string;
    debit: DecimalValue;
    credit: DecimalValue;
    description: string | null;
  }>;
};

type PurchaseInvoiceDelegate = {
  findFirst(input: {
    where: Record<string, unknown>;
    select: Record<string, boolean>;
  }): Promise<PurchaseInvoiceStateRecord | null>;
  updateMany(input: {
    where: Record<string, unknown>;
    data: {
      status: "Kaydedildi";
      updatedBy: string;
      updatedAt: Date;
    };
  }): Promise<{ count: number }>;
};

type LedgerEntryDelegate = {
  create(input: {
    data: unknown;
    include: { lines: true };
  }): Promise<LedgerEntryRecord>;
  findFirst(input: {
    where: Record<string, unknown>;
    include: { lines: true };
  }): Promise<LedgerEntryRecord | null>;
};

type AuditLogDelegate = {
  create(input: {
    data: {
      tenantId: string;
      companyId: string;
      periodId: string;
      actorUserId: string;
      action: string;
      entityType: string;
      entityId: string;
      entityLabel: string;
      occurredAt: Date;
      metadata: Record<string, unknown>;
    };
  }): Promise<unknown>;
};

type PeriodDelegate = {
  findFirst(input: {
    where: {
      id: string;
      tenantId: string;
      companyId: string;
    };
    select: { isClosed: true };
  }): Promise<{ isClosed: boolean } | null>;
};

export type PurchaseInvoiceLedgerPostingTransactionLike = {
  purchaseInvoice: PurchaseInvoiceDelegate;
  ledgerEntry: LedgerEntryDelegate;
  auditLog: AuditLogDelegate;
  period: PeriodDelegate;
};

export type PurchaseInvoiceLedgerPostingPrismaClientLike =
  PurchaseInvoiceLedgerPostingTransactionLike & {
    $transaction<T>(
      callback: (
        transaction: PurchaseInvoiceLedgerPostingTransactionLike,
      ) => Promise<T>,
    ): Promise<T>;
  };

export function createPurchaseInvoiceLedgerPostingPrismaRepository(
  prisma: PurchaseInvoiceLedgerPostingPrismaClientLike,
): PurchaseInvoiceLedgerPostingRepository {
  return {
    async commit(command) {
      try {
        return await prisma.$transaction(async (transaction) =>
          commitInTransaction(transaction, command),
        );
      } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
          return recoverSourceRetry(prisma, command);
        }

        return failure(
          "persistence-failed",
          `${invoiceTitle(command)} faturası ve muhasebe fişi atomik olarak kaydedilemedi.`,
        );
      }
    },
  };
}

async function commitInTransaction(
  transaction: PurchaseInvoiceLedgerPostingTransactionLike,
  command: PurchaseInvoiceLedgerPostingCommand,
): Promise<PurchaseInvoiceLedgerPostingResult> {
  const title = invoiceTitle(command);
  const noun = invoiceNoun(command);
  const [invoiceRecord, existingLedgerRecord] = await Promise.all([
    findScopedInvoice(transaction.purchaseInvoice, command.scope, command.sourceId),
    findScopedSourceLedger(transaction.ledgerEntry, command),
  ]);

  if (!invoiceRecord) {
    return failure(
      "invoice-not-found",
      `Aktif kapsamda muhasebeleştirilecek ${noun} faturası bulunamadı.`,
    );
  }

  if (existingLedgerRecord) {
    return resolveExistingSource(command, invoiceRecord, existingLedgerRecord);
  }

  const periodRecord = await transaction.period.findFirst({
    where: {
      id: command.scope.periodId,
      tenantId: command.scope.tenantId,
      companyId: command.scope.companyId,
    },
    select: { isClosed: true },
  });

  if (!periodRecord || periodRecord.isClosed) {
    return failure(
      "period-closed",
      "Aktif muhasebe dönemi bulunamadı veya dönem kapanmış durumda.",
    );
  }

  if (invoiceRecord.status === "Kaydedildi") {
    return failure(
      "legacy-posted-without-ledger",
      `Kesinleşmiş eski ${noun} faturası için otomatik geriye dönük muhasebe fişi oluşturulmadı.`,
    );
  }

  if (invoiceRecord.status !== "Taslak") {
    return failure(
      "invalid-status",
      `Yalnız taslak ${noun} faturası muhasebeleştirilebilir.`,
    );
  }

  if (!invoiceSnapshotMatchesCommand(invoiceRecord, command)) {
    return failure(
      "concurrent-modification",
      `${title} faturası kesinleştirme öncesinde değişti; güncel kayıtla yeniden deneyin.`,
    );
  }

  const updateResult = await transaction.purchaseInvoice.updateMany({
    where: {
      id: command.sourceId,
      tenantId: command.scope.tenantId,
      companyId: command.scope.companyId,
      periodId: command.scope.periodId,
      status: "Taslak",
      updatedAt: new Date(command.originalInvoiceUpdatedAt),
    },
    data: {
      status: "Kaydedildi",
      updatedBy: command.invoice.updatedBy,
      updatedAt: new Date(command.invoice.updatedAt),
    },
  });

  if (updateResult.count !== 1) {
    return resolveConcurrentCommit(transaction, command);
  }

  const createdLedgerRecord = await transaction.ledgerEntry.create({
    data: ledgerEntryCreateData(command.ledgerEntry),
    include: { lines: true },
  });

  for (const audit of command.successAudits) {
    await transaction.auditLog.create({ data: auditCreateData(audit) });
  }

  return {
    ok: true,
    data: {
      invoice: command.invoice,
      ledgerEntry: ledgerRecordToRow(createdLedgerRecord),
      created: true,
    },
  };
}

async function resolveConcurrentCommit(
  transaction: PurchaseInvoiceLedgerPostingTransactionLike,
  command: PurchaseInvoiceLedgerPostingCommand,
): Promise<PurchaseInvoiceLedgerPostingResult> {
  const [invoiceRecord, ledgerRecord] = await Promise.all([
    findScopedInvoice(transaction.purchaseInvoice, command.scope, command.sourceId),
    findScopedSourceLedger(transaction.ledgerEntry, command),
  ]);

  if (invoiceRecord && ledgerRecord) {
    return resolveExistingSource(command, invoiceRecord, ledgerRecord);
  }

  return failure(
    "concurrent-modification",
    `${invoiceTitle(command)} faturası aynı anda başka bir işlem tarafından değiştirildi.`,
  );
}

async function recoverSourceRetry(
  prisma: PurchaseInvoiceLedgerPostingPrismaClientLike,
  command: PurchaseInvoiceLedgerPostingCommand,
): Promise<PurchaseInvoiceLedgerPostingResult> {
  const [invoiceRecord, ledgerRecord] = await Promise.all([
    findScopedInvoice(prisma.purchaseInvoice, command.scope, command.sourceId),
    findScopedSourceLedger(prisma.ledgerEntry, command),
  ]);

  if (invoiceRecord && ledgerRecord) {
    return resolveExistingSource(command, invoiceRecord, ledgerRecord);
  }

  return failure(
    "persistence-failed",
    `${invoiceTitle(command)} faturası muhasebe fişi belge numarası başka bir kayıtla çakıştı.`,
  );
}

function resolveExistingSource(
  command: PurchaseInvoiceLedgerPostingCommand,
  invoiceRecord: PurchaseInvoiceStateRecord,
  ledgerRecord: LedgerEntryRecord,
): PurchaseInvoiceLedgerPostingResult {
  if (
    invoiceRecord.status !== "Kaydedildi" ||
    !ledgerRecordMatchesCommand(ledgerRecord, command)
  ) {
    return failure(
      "source-conflict",
      `${invoiceTitle(command)} faturası kaynağı farklı bir muhasebe fişi veya durumla çakışıyor.`,
    );
  }

  return {
    ok: true,
    data: {
      invoice: mergePersistedInvoiceState(command.invoice, invoiceRecord),
      ledgerEntry: ledgerRecordToRow(ledgerRecord),
      created: false,
    },
  };
}

function findScopedInvoice(
  delegate: PurchaseInvoiceDelegate,
  scope: TenantScope,
  invoiceId: string,
) {
  return delegate.findFirst({
    where: {
      id: invoiceId,
      tenantId: scope.tenantId,
      companyId: scope.companyId,
      periodId: scope.periodId,
    },
    select: {
      id: true,
      tenantId: true,
      companyId: true,
      periodId: true,
      documentNo: true,
      invoiceDate: true,
      currency: true,
      status: true,
      netTotal: true,
      vatTotal: true,
      withholdingTotal: true,
      grandTotal: true,
      updatedBy: true,
      updatedAt: true,
    },
  });
}

function findScopedSourceLedger(
  delegate: LedgerEntryDelegate,
  command: PurchaseInvoiceLedgerPostingCommand,
) {
  return delegate.findFirst({
    where: {
      tenantId: command.scope.tenantId,
      companyId: command.scope.companyId,
      periodId: command.scope.periodId,
      sourceType: command.sourceType,
      sourceId: command.sourceId,
    },
    include: { lines: true },
  });
}

function invoiceSnapshotMatchesCommand(
  record: PurchaseInvoiceStateRecord,
  command: PurchaseInvoiceLedgerPostingCommand,
) {
  const invoice = command.invoice;

  return (
    record.documentNo === invoice.documentNo &&
    toDateOnly(record.invoiceDate) === invoice.invoiceDate &&
    record.currency === invoice.currency &&
    toNumber(record.netTotal) === roundMoney(invoice.netTotal) &&
    toNumber(record.vatTotal) === roundMoney(invoice.vatTotal) &&
    toNumber(record.withholdingTotal) === roundMoney(invoice.withholdingTotal) &&
    toNumber(record.grandTotal) === roundMoney(invoice.grandTotal) &&
    toIso(record.updatedAt) === toIso(command.originalInvoiceUpdatedAt)
  );
}

function ledgerRecordMatchesCommand(
  record: LedgerEntryRecord,
  command: PurchaseInvoiceLedgerPostingCommand,
) {
  const expected = command.ledgerEntry;

  if (
    record.sourceType !== command.sourceType ||
    record.sourceId !== command.sourceId ||
    record.status !== "posted" ||
    record.documentNo !== expected.documentNo ||
    toDateOnly(record.entryDate) !== expected.entryDate ||
    record.currency !== expected.currency ||
    toNumber(record.debitTotal) !== expected.debitTotal ||
    toNumber(record.creditTotal) !== expected.creditTotal
  ) {
    return false;
  }

  const actualLines = [...record.lines]
    .sort((left, right) => left.lineNo - right.lineNo)
    .map((line) => ({
      accountCode: line.accountCode,
      accountName: line.accountName,
      debit: toNumber(line.debit),
      credit: toNumber(line.credit),
    }));
  const expectedLines = expected.lines.map((line) => ({
    accountCode: line.accountCode,
    accountName: line.accountName,
    debit: line.direction === "debit" ? line.amount : 0,
    credit: line.direction === "credit" ? line.amount : 0,
  }));

  return JSON.stringify(actualLines) === JSON.stringify(expectedLines);
}

function ledgerEntryCreateData(entry: LedgerJournalRow) {
  return {
    id: entry.id,
    tenantId: entry.tenantId,
    companyId: entry.companyId,
    periodId: entry.periodId,
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    entryDate: new Date(`${entry.entryDate}T00:00:00.000Z`),
    documentNo: entry.documentNo,
    description: entry.description,
    currency: entry.currency,
    status: entry.status,
    debitTotal: entry.debitTotal,
    creditTotal: entry.creditTotal,
    createdBy: entry.createdBy,
    updatedBy: entry.updatedBy,
    createdAt: new Date(entry.createdAt),
    updatedAt: new Date(entry.updatedAt),
    lines: {
      create: entry.lines.map((line, index) => ({
        id: `${entry.id}::line-${index + 1}`,
        tenantId: entry.tenantId,
        companyId: entry.companyId,
        periodId: entry.periodId,
        lineNo: index + 1,
        accountCode: line.accountCode,
        accountName: line.accountName,
        debit: line.direction === "debit" ? line.amount : 0,
        credit: line.direction === "credit" ? line.amount : 0,
        description: line.description || null,
      })),
    },
  };
}

function auditCreateData(entry: AuditLogEntryInput) {
  return {
    tenantId: entry.tenantId,
    companyId: entry.companyId,
    periodId: entry.periodId,
    actorUserId: entry.actorUserId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    entityLabel: entry.entityLabel,
    occurredAt: new Date(entry.occurredAt),
    metadata: entry.metadata,
  };
}

function ledgerRecordToRow(record: LedgerEntryRecord): LedgerJournalRow {
  return {
    id: record.id,
    tenantId: record.tenantId,
    companyId: record.companyId,
    periodId: record.periodId,
    ...(record.sourceType && record.sourceId
      ? { sourceType: record.sourceType, sourceId: record.sourceId }
      : {}),
    entryDate: toDateOnly(record.entryDate),
    documentNo: record.documentNo,
    description: record.description,
    currency: record.currency as LedgerJournalRow["currency"],
    status: "posted",
    debitTotal: toNumber(record.debitTotal),
    creditTotal: toNumber(record.creditTotal),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
    lines: [...record.lines]
      .sort((left, right) => left.lineNo - right.lineNo)
      .map((line) => ({
        accountCode: line.accountCode,
        accountName: line.accountName,
        amount: toNumber(line.debit) || toNumber(line.credit),
        direction: toNumber(line.debit) > 0 ? "debit" : "credit",
        description: line.description ?? undefined,
      })),
  };
}

function mergePersistedInvoiceState(
  invoice: PurchaseInvoiceRow,
  record: PurchaseInvoiceStateRecord,
): PurchaseInvoiceRow {
  return {
    ...invoice,
    status: "Kaydedildi",
    updatedBy: record.updatedBy,
    updatedAt: toIso(record.updatedAt),
  };
}

function failure(
  reasonCode: PurchaseInvoiceLedgerPostingFailure["reasonCode"],
  error: string,
): PurchaseInvoiceLedgerPostingFailure {
  return { ok: false, errors: [error], reasonCode };
}

function invoiceTitle(command: PurchaseInvoiceLedgerPostingCommand) {
  return command.invoiceKind === "sales" ? "Satış" : "Alış";
}

function invoiceNoun(command: PurchaseInvoiceLedgerPostingCommand) {
  return command.invoiceKind === "sales" ? "satış" : "alış";
}

function isPrismaUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function toNumber(value: DecimalValue) {
  return roundMoney(typeof value === "number" ? value : Number(value.toString()));
}

function toDateOnly(value: Date | string) {
  return toIso(value).slice(0, 10);
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
