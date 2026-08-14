import type { AuditLogEntryInput } from "./audit-log";
import type { CashBankMovementRow } from "./cash-bank-movement-service";
import type { LedgerJournalRow } from "./ledger-service";
import type {
  PayrollPaymentPostingCommand,
  PayrollPaymentPostingRepository,
  PayrollPaymentPostingResult,
} from "./payroll-payment-posting-service";

type DecimalValue = number | { toString(): string };

type PayrollRecord = {
  companyId: string;
  id: string;
  netTotal: DecimalValue;
  periodId: string;
  status: string;
  tenantId: string;
};

type CashBankMovementRecord = {
  accountCode: string;
  accountName: string;
  amount: DecimalValue;
  companyId: string;
  counterpartyName: string;
  createdAt: Date | string;
  createdBy: string;
  currency: string;
  description: string | null;
  direction: string;
  documentNo: string;
  id: string;
  movementDate: Date | string;
  movementType: string;
  periodId: string;
  sourceId: string;
  sourceLabel: string;
  sourceType: string;
  tenantId: string;
  updatedAt: Date | string;
  updatedBy: string;
};

type LedgerRecord = {
  companyId: string;
  createdAt: Date | string;
  createdBy: string;
  creditTotal: DecimalValue;
  currency: string;
  debitTotal: DecimalValue;
  description: string;
  documentNo: string;
  entryDate: Date | string;
  id: string;
  lines: Array<{
    accountCode: string;
    accountName: string;
    credit: DecimalValue;
    debit: DecimalValue;
    description: string | null;
    lineNo: number;
  }>;
  periodId: string;
  sourceId: string | null;
  sourceType: string | null;
  status: string;
  tenantId: string;
  updatedAt: Date | string;
  updatedBy: string;
};

type TransactionLike = {
  auditLog: {
    create(input: { data: ReturnType<typeof auditCreateData> }): Promise<unknown>;
  };
  cashBankMovement: {
    create(input: { data: ReturnType<typeof movementCreateData> }): Promise<CashBankMovementRecord>;
    findFirst(input: { where: Record<string, unknown> }): Promise<CashBankMovementRecord | null>;
  };
  ledgerEntry: {
    create(input: { data: ReturnType<typeof ledgerCreateData>; include: { lines: true } }): Promise<LedgerRecord>;
    findFirst(input: { where: Record<string, unknown>; include: { lines: true } }): Promise<LedgerRecord | null>;
  };
  payrollAccrual: {
    findFirst(input: { where: Record<string, unknown>; select: Record<string, boolean> }): Promise<PayrollRecord | null>;
  };
  period: {
    findFirst(input: { where: Record<string, unknown>; select: { isClosed: true } }): Promise<{ isClosed: boolean } | null>;
  };
};

export type PayrollPaymentPostingPrismaClientLike = TransactionLike & {
  $transaction<T>(callback: (transaction: TransactionLike) => Promise<T>): Promise<T>;
};

class PayrollPaymentAbort extends Error {
  constructor(readonly result: PayrollPaymentPostingResult) {
    super(result.ok ? "" : result.errors.join(" "));
  }
}

export function createPayrollPaymentPostingPrismaRepository(
  prisma: PayrollPaymentPostingPrismaClientLike,
): PayrollPaymentPostingRepository {
  return {
    async commit(command) {
      try {
        return await prisma.$transaction((transaction) =>
          commitInTransaction(transaction, command),
        );
      } catch (error) {
        if (error instanceof PayrollPaymentAbort) {
          return error.result;
        }

        if (isUniqueConstraint(error)) {
          try {
            const existing = await findExisting(prisma, command);

            if (existing) {
              return existing;
            }
          } catch (recoveryError) {
            if (recoveryError instanceof PayrollPaymentAbort) {
              return recoveryError.result;
            }
          }
        }

        return failure(
          "Maaş ödeme hareketi ve muhasebe fişi atomik olarak kalıcılaştırılamadı.",
        );
      }
    },
  };
}

async function commitInTransaction(
  transaction: TransactionLike,
  command: PayrollPaymentPostingCommand,
): Promise<PayrollPaymentPostingResult> {
  const existing = await findExisting(transaction, command);

  if (existing) {
    return existing;
  }

  const [period, payrollAccrual] = await Promise.all([
    transaction.period.findFirst({
      where: {
        id: command.scope.periodId,
        tenantId: command.scope.tenantId,
        companyId: command.scope.companyId,
      },
      select: { isClosed: true },
    }),
    transaction.payrollAccrual.findFirst({
      where: {
        id: command.payrollAccrualId,
        tenantId: command.scope.tenantId,
        companyId: command.scope.companyId,
        periodId: command.scope.periodId,
      },
      select: {
        id: true,
        tenantId: true,
        companyId: true,
        periodId: true,
        status: true,
        netTotal: true,
      },
    }),
  ]);

  if (!period || period.isClosed) {
    abort("Kapalı veya bulunamayan dönemde maaş ödemesi oluşturulamaz.");
  }

  if (!payrollAccrual) {
    abort("Aktif kapsamda ödenecek maaş tahakkuku bulunamadı.");
  }

  if (payrollAccrual.status !== "Kaydedildi") {
    abort("Yalnız kesinleşmiş maaş tahakkuku ödenebilir.");
  }

  if (toNumber(payrollAccrual.netTotal) !== command.movement.amount) {
    abort("Maaş tahakkuku tutarı ödeme öncesinde değişti; güncel kayıtla yeniden deneyin.");
  }

  const movement = await transaction.cashBankMovement.create({
    data: movementCreateData(command.movement),
  });
  const ledger = await transaction.ledgerEntry.create({
    data: ledgerCreateData(command.ledgerEntry),
    include: { lines: true },
  });

  for (const audit of command.auditEntries) {
    await transaction.auditLog.create({ data: auditCreateData(audit) });
  }

  return success(movementToRow(movement), ledgerToRow(ledger), true);
}

async function findExisting(
  transaction: TransactionLike,
  command: PayrollPaymentPostingCommand,
): Promise<PayrollPaymentPostingResult | null> {
  const [movement, ledger] = await Promise.all([
    transaction.cashBankMovement.findFirst({
      where: {
        id: command.movement.id,
        tenantId: command.scope.tenantId,
        companyId: command.scope.companyId,
        periodId: command.scope.periodId,
      },
    }),
    transaction.ledgerEntry.findFirst({
      where: {
        tenantId: command.scope.tenantId,
        companyId: command.scope.companyId,
        periodId: command.scope.periodId,
        sourceType: "cash-bank-movement",
        sourceId: command.movement.id,
      },
      include: { lines: true },
    }),
  ]);

  if (!movement && !ledger) {
    return null;
  }

  if (!movement || !ledger) {
    abort("Maaş ödemesi için hareket ve muhasebe fişi birlikte bulunmalıdır.");
  }

  const movementRow = movementToRow(movement);
  const ledgerRow = ledgerToRow(ledger);

  if (!isCompatible(command, movementRow, ledgerRow)) {
    abort("Mevcut maaş ödeme kaydı beklenen kaynak, hesap veya tutarla eşleşmiyor.");
  }

  return success(movementRow, ledgerRow, false);
}

function isCompatible(
  command: PayrollPaymentPostingCommand,
  movement: CashBankMovementRow,
  ledger: LedgerJournalRow,
) {
  return (
    movement.sourceType === "payroll-accrual" &&
    movement.sourceId === command.payrollAccrualId &&
    movement.accountCode === command.movement.accountCode &&
    movement.amount === command.movement.amount &&
    ledger.sourceType === "cash-bank-movement" &&
    ledger.sourceId === movement.id &&
    ledger.debitTotal === command.ledgerEntry.debitTotal &&
    ledger.creditTotal === command.ledgerEntry.creditTotal
  );
}

function success(
  movement: CashBankMovementRow,
  ledgerEntry: LedgerJournalRow,
  created: boolean,
): PayrollPaymentPostingResult {
  return {
    ok: true,
    data: {
      created,
      ledgerEntry,
      movement: {
        ...movement,
        ledgerEntryId: ledgerEntry.id,
        ledgerDocumentNo: ledgerEntry.documentNo,
      },
    },
  };
}

function failure(error: string): PayrollPaymentPostingResult {
  return { ok: false, errors: [error], reasonCode: "persistence-failed" };
}

function abort(error: string): never {
  throw new PayrollPaymentAbort(failure(error));
}

function movementCreateData(row: CashBankMovementRow) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    companyId: row.companyId,
    periodId: row.periodId,
    accountCode: row.accountCode,
    accountName: row.accountName,
    movementDate: new Date(`${row.movementDate}T00:00:00.000Z`),
    movementType: row.movementType,
    direction: row.direction,
    documentNo: row.documentNo,
    counterpartyName: row.counterpartyName,
    amount: row.amount,
    currency: row.currency,
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

function ledgerCreateData(row: LedgerJournalRow) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    companyId: row.companyId,
    periodId: row.periodId,
    sourceType: row.sourceType ?? null,
    sourceId: row.sourceId ?? null,
    entryDate: new Date(`${row.entryDate}T00:00:00.000Z`),
    documentNo: row.documentNo,
    description: row.description,
    currency: row.currency,
    status: row.status,
    debitTotal: row.debitTotal,
    creditTotal: row.creditTotal,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    lines: {
      create: row.lines.map((line, index) => ({
        id: `${row.id}::line-${index + 1}`,
        tenantId: row.tenantId,
        companyId: row.companyId,
        periodId: row.periodId,
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

function auditCreateData(audit: AuditLogEntryInput) {
  return {
    tenantId: audit.tenantId,
    companyId: audit.companyId,
    periodId: audit.periodId,
    actorUserId: audit.actorUserId,
    action: audit.action,
    entityType: audit.entityType,
    entityId: audit.entityId,
    entityLabel: audit.entityLabel,
    occurredAt: new Date(audit.occurredAt),
    metadata: audit.metadata,
  };
}

function movementToRow(record: CashBankMovementRecord): CashBankMovementRow {
  return {
    ...record,
    amount: toNumber(record.amount),
    currency: "TL",
    description: record.description ?? "",
    movementDate: toIsoDate(record.movementDate),
    movementType: "Maaş Ödemesi",
    direction: "Çıkış",
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
  };
}

function ledgerToRow(record: LedgerRecord): LedgerJournalRow {
  return {
    id: record.id,
    tenantId: record.tenantId,
    companyId: record.companyId,
    periodId: record.periodId,
    ...(record.sourceType && record.sourceId
      ? { sourceType: record.sourceType, sourceId: record.sourceId }
      : {}),
    entryDate: toIsoDate(record.entryDate),
    documentNo: record.documentNo,
    description: record.description,
    currency: "TL",
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

function isUniqueConstraint(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002",
  );
}

function toNumber(value: DecimalValue) {
  return typeof value === "number" ? value : Number(value.toString());
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toIsoDate(value: Date | string) {
  return toIso(value).slice(0, 10);
}
