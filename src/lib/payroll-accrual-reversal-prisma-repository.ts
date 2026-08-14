import type { AuditLogEntryInput } from "./audit-log";
import type { CashBankMovementRow } from "./cash-bank-movement-service";
import type { LedgerJournalRow } from "./ledger-service";
import {
  buildPayrollAccrualReversalCommand,
  PAYROLL_ACCRUAL_REVERSAL_SOURCE_TYPE,
  PAYROLL_PAYMENT_REVERSAL_SOURCE_TYPE,
  type PayrollAccrualReversalCommand,
  type PayrollAccrualReversalRepository,
  type PayrollAccrualReversalResult,
} from "./payroll-accrual-reversal-service";
import type { PayrollAccrualRow } from "./payroll-accrual-service";
import type { TenantScope } from "./tenant-scope";

type DecimalValue = number | { toString(): string };
type PayrollRecord = {
  companyId: string;
  contractorCode: string | null;
  contractorName: string | null;
  createdAt: Date | string;
  createdBy: string;
  deductionTotal: DecimalValue;
  documentNo: string;
  grossTotal: DecimalValue;
  id: string;
  lineCount: number;
  lines: Array<{
    advanceDeduction: DecimalValue;
    debtDeduction: DecimalValue;
    deductionTotal: DecimalValue;
    grossTotal: DecimalValue;
    netTotal: DecimalValue;
    overtimeHours: DecimalValue;
    personCode: string;
    personName: string;
    regularWorkedDays: DecimalValue;
  }>;
  month: number;
  netTotal: DecimalValue;
  periodId: string;
  siteCode: string;
  siteName: string;
  sourceTimesheetId: string;
  sourceTimesheetNo: string;
  status: string;
  tenantId: string;
  updatedAt: Date | string;
  updatedBy: string;
  year: number;
};
type MovementRecord = {
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
    create(input: { data: ReturnType<typeof movementCreateData> }): Promise<MovementRecord>;
    findFirst(input: { where: Record<string, unknown> }): Promise<MovementRecord | null>;
    findMany(input: { where: Record<string, unknown> }): Promise<MovementRecord[]>;
  };
  ledgerEntry: {
    create(input: { data: ReturnType<typeof ledgerCreateData>; include: { lines: true } }): Promise<LedgerRecord>;
    findFirst(input: { where: Record<string, unknown>; include: { lines: true } }): Promise<LedgerRecord | null>;
  };
  payrollAccrual: {
    findFirst(input: { where: Record<string, unknown>; include: { lines: true } }): Promise<PayrollRecord | null>;
    updateMany(input: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
  };
  period: {
    findFirst(input: { where: Record<string, unknown>; select: { isClosed: true } }): Promise<{ isClosed: boolean } | null>;
  };
};

export type PayrollAccrualReversalPrismaClientLike = TransactionLike & {
  $transaction<T>(callback: (transaction: TransactionLike) => Promise<T>): Promise<T>;
};

class PayrollAccrualReversalAbort extends Error {
  constructor(readonly result: PayrollAccrualReversalResult) {
    super(result.ok ? "" : result.errors.join(" "));
  }
}

export function createPayrollAccrualReversalPrismaRepository(
  prisma: PayrollAccrualReversalPrismaClientLike,
): PayrollAccrualReversalRepository {
  return {
    async commit(input) {
      try {
        return await prisma.$transaction((transaction) =>
          commitInTransaction(transaction, input),
        );
      } catch (error) {
        if (error instanceof PayrollAccrualReversalAbort) {
          return error.result;
        }

        if (isUniqueConstraint(error)) {
          try {
            return await prisma.$transaction((transaction) =>
              commitInTransaction(transaction, input),
            );
          } catch (retryError) {
            if (retryError instanceof PayrollAccrualReversalAbort) {
              return retryError.result;
            }
          }
        }

        return failure(
          "Maaş tahakkuku ve bağlı ödeme ters kayıtları atomik olarak kalıcılaştırılamadı.",
        );
      }
    },
  };
}

async function commitInTransaction(
  transaction: TransactionLike,
  input: { payrollAccrualId: string; scope: TenantScope; timestamp: string },
): Promise<PayrollAccrualReversalResult> {
  const scopeWhere = {
    tenantId: input.scope.tenantId,
    companyId: input.scope.companyId,
    periodId: input.scope.periodId,
  };
  const [period, payrollRecord, originalAccrualLedger, originalPayments] =
    await Promise.all([
      transaction.period.findFirst({
        where: {
          id: input.scope.periodId,
          tenantId: input.scope.tenantId,
          companyId: input.scope.companyId,
        },
        select: { isClosed: true },
      }),
      transaction.payrollAccrual.findFirst({
        where: { id: input.payrollAccrualId, ...scopeWhere },
        include: { lines: true },
      }),
      findLedger(transaction, {
        ...scopeWhere,
        sourceType: "payroll-accrual",
        sourceId: input.payrollAccrualId,
      }),
      transaction.cashBankMovement.findMany({
        where: {
          ...scopeWhere,
          sourceType: "payroll-accrual",
          sourceId: input.payrollAccrualId,
          movementType: "Maaş Ödemesi",
        },
      }),
    ]);

  if (!period || period.isClosed) {
    abort("Kapalı veya bulunamayan dönemde maaş tahakkuku ters kaydı oluşturulamaz.");
  }
  if (!payrollRecord) {
    abort("Aktif kapsamda ters kayda alınacak maaş tahakkuku bulunamadı.");
  }
  if (!originalAccrualLedger) {
    abort("Maaş tahakkukunun kaynak muhasebe fişi bulunamadı.");
  }
  if (originalPayments.length > 1) {
    abort("Maaş tahakkukuna bağlı birden fazla ödeme hareketi bulundu; otomatik ters kayıt güvenle oluşturulamaz.");
  }

  const originalPaymentRecord = originalPayments[0];
  const originalPaymentLedger = originalPaymentRecord
    ? await findLedger(transaction, {
        ...scopeWhere,
        sourceType: "cash-bank-movement",
        sourceId: originalPaymentRecord.id,
      })
    : null;
  const payrollAccrual = payrollToRow(payrollRecord, originalAccrualLedger.documentNo);

  if (payrollAccrual.status !== "Kaydedildi" && payrollAccrual.status !== "İptal") {
    abort("Yalnız kesinleşmiş maaş tahakkuku kontrollü ters kayda alınabilir.");
  }
  if (originalPaymentRecord && !originalPaymentLedger) {
    abort("Maaş ödemesinin kaynak muhasebe fişi bulunamadı.");
  }

  const commandResult = buildPayrollAccrualReversalCommand({
    payrollAccrual: { ...payrollAccrual, status: "Kaydedildi" },
    originalAccrualLedger: ledgerToRow(originalAccrualLedger),
    ...(originalPaymentRecord
      ? { originalPayment: movementToRow(originalPaymentRecord) }
      : {}),
    ...(originalPaymentLedger
      ? { originalPaymentLedger: ledgerToRow(originalPaymentLedger) }
      : {}),
    scope: input.scope,
    timestamp: input.timestamp,
  });

  if (!commandResult.ok) {
    throw new PayrollAccrualReversalAbort(commandResult);
  }
  const command = commandResult.data;
  const existing = await findExistingReversals(transaction, command);

  if (existing.hasAny) {
    if (
      payrollRecord.status === "İptal" &&
      existing.complete &&
      existingCompatible(command, existing)
    ) {
      return success(
        { ...payrollAccrual, status: "İptal" },
        existing.accrualLedger as LedgerRecord,
        existing.paymentMovement,
        existing.paymentLedger,
        false,
      );
    }

    abort("Maaş tahakkuku ters kayıt zinciri eksik veya kaynak kayıtlarla uyumsuz; işlem güvenli biçimde durduruldu.");
  }
  if (payrollRecord.status === "İptal") {
    abort("İptal edilmiş maaş tahakkukunun ters kayıt zinciri bulunamadı.");
  }

  const createdAccrualLedger = await transaction.ledgerEntry.create({
    data: ledgerCreateData(command.reversal.accrualLedger),
    include: { lines: true },
  });
  let createdPaymentMovement: MovementRecord | null = null;
  let createdPaymentLedger: LedgerRecord | null = null;

  if (command.reversal.payment) {
    createdPaymentMovement = await transaction.cashBankMovement.create({
      data: movementCreateData(command.reversal.payment.movement),
    });
    createdPaymentLedger = await transaction.ledgerEntry.create({
      data: ledgerCreateData(command.reversal.payment.ledger),
      include: { lines: true },
    });
  }

  const updated = await transaction.payrollAccrual.updateMany({
    where: {
      id: command.cancelledPayrollAccrual.id,
      ...scopeWhere,
      status: "Kaydedildi",
      updatedAt: new Date(command.originalUpdatedAt),
    },
    data: {
      status: "İptal",
      updatedBy: input.scope.userId,
      updatedAt: new Date(input.timestamp),
    },
  });

  if (updated.count !== 1) {
    abort("Maaş tahakkuku ters kayıt öncesinde değişti; güncel kayıtla yeniden deneyin.");
  }

  for (const audit of command.auditEntries) {
    await transaction.auditLog.create({ data: auditCreateData(audit) });
  }

  return success(
    command.cancelledPayrollAccrual,
    createdAccrualLedger,
    createdPaymentMovement,
    createdPaymentLedger,
    true,
  );
}

async function findExistingReversals(
  transaction: TransactionLike,
  command: PayrollAccrualReversalCommand,
) {
  const scopeWhere = {
    tenantId: command.scope.tenantId,
    companyId: command.scope.companyId,
    periodId: command.scope.periodId,
  };
  const [accrualLedger, paymentMovement, paymentLedger] = await Promise.all([
    findLedger(transaction, {
      ...scopeWhere,
      sourceType: PAYROLL_ACCRUAL_REVERSAL_SOURCE_TYPE,
      sourceId: command.cancelledPayrollAccrual.id,
    }),
    command.reversal.payment
      ? transaction.cashBankMovement.findFirst({
          where: {
            ...scopeWhere,
            sourceType: PAYROLL_PAYMENT_REVERSAL_SOURCE_TYPE,
            sourceId: command.reversal.payment.movement.sourceId,
          },
        })
      : Promise.resolve(null),
    command.reversal.payment
      ? findLedger(transaction, {
          ...scopeWhere,
          sourceType: PAYROLL_PAYMENT_REVERSAL_SOURCE_TYPE,
          sourceId: command.reversal.payment.movement.sourceId,
        })
      : Promise.resolve(null),
  ]);
  const hasAny = Boolean(accrualLedger || paymentMovement || paymentLedger);
  const complete = command.reversal.payment
    ? Boolean(accrualLedger && paymentMovement && paymentLedger)
    : Boolean(accrualLedger);

  return { accrualLedger, complete, hasAny, paymentLedger, paymentMovement };
}

function existingCompatible(
  command: PayrollAccrualReversalCommand,
  existing: Awaited<ReturnType<typeof findExistingReversals>>,
) {
  if (!existing.accrualLedger) return false;
  if (!ledgerCompatible(command.reversal.accrualLedger, existing.accrualLedger)) {
    return false;
  }
  if (!command.reversal.payment) return true;
  return Boolean(
    existing.paymentMovement &&
      existing.paymentLedger &&
      movementCompatible(
        command.reversal.payment.movement,
        existing.paymentMovement,
      ) &&
      ledgerCompatible(command.reversal.payment.ledger, existing.paymentLedger),
  );
}

function ledgerCompatible(expected: LedgerJournalRow, existing: LedgerRecord) {
  return (
    existing.id === expected.id &&
    existing.documentNo === expected.documentNo &&
    existing.sourceType === expected.sourceType &&
    existing.sourceId === expected.sourceId &&
    toNumber(existing.debitTotal) === expected.debitTotal &&
    toNumber(existing.creditTotal) === expected.creditTotal
  );
}

function movementCompatible(expected: CashBankMovementRow, existing: MovementRecord) {
  return (
    existing.id === expected.id &&
    existing.documentNo === expected.documentNo &&
    existing.sourceType === expected.sourceType &&
    existing.sourceId === expected.sourceId &&
    existing.direction === expected.direction &&
    existing.accountCode === expected.accountCode &&
    toNumber(existing.amount) === expected.amount
  );
}

function findLedger(
  transaction: TransactionLike,
  where: Record<string, unknown>,
) {
  return transaction.ledgerEntry.findFirst({ where, include: { lines: true } });
}

function success(
  payrollAccrual: PayrollAccrualRow,
  accrualLedger: LedgerRecord,
  paymentMovement: MovementRecord | null,
  paymentLedger: LedgerRecord | null,
  created: boolean,
): PayrollAccrualReversalResult {
  return {
    ok: true,
    data: {
      created,
      payrollAccrual: { ...payrollAccrual, status: "İptal" },
      reversal: {
        accrualLedger: ledgerToRow(accrualLedger),
        ...(paymentMovement && paymentLedger
          ? {
              payment: {
                movement: movementToRow(paymentMovement),
                ledger: ledgerToRow(paymentLedger),
              },
            }
          : {}),
      },
    },
  };
}

function payrollToRow(record: PayrollRecord, ledgerDocumentNo: string): PayrollAccrualRow {
  return {
    ...record,
    contractorCode: record.contractorCode ?? "",
    contractorName: record.contractorName ?? "",
    status: record.status as PayrollAccrualRow["status"],
    grossTotal: toNumber(record.grossTotal),
    deductionTotal: toNumber(record.deductionTotal),
    netTotal: toNumber(record.netTotal),
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
    ledgerDocumentNo,
    lines: record.lines.map((line) => ({
      ...line,
      advanceDeduction: toNumber(line.advanceDeduction),
      debtDeduction: toNumber(line.debtDeduction),
      deductionTotal: toNumber(line.deductionTotal),
      grossTotal: toNumber(line.grossTotal),
      netTotal: toNumber(line.netTotal),
      overtimeHours: toNumber(line.overtimeHours),
      regularWorkedDays: toNumber(line.regularWorkedDays),
    })),
  };
}

function movementToRow(record: MovementRecord): CashBankMovementRow {
  return {
    ...record,
    amount: toNumber(record.amount),
    currency: record.currency as CashBankMovementRow["currency"],
    direction: record.direction as CashBankMovementRow["direction"],
    movementType: record.movementType as CashBankMovementRow["movementType"],
    description: record.description ?? "",
    movementDate: toIsoDate(record.movementDate),
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
    documentNo: record.documentNo,
    description: record.description,
    currency: record.currency as LedgerJournalRow["currency"],
    entryDate: toIsoDate(record.entryDate),
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

function abort(error: string): never {
  throw new PayrollAccrualReversalAbort(failure(error));
}

function failure(error: string): PayrollAccrualReversalResult {
  return { ok: false, errors: [error], reasonCode: "persistence-failed" };
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
