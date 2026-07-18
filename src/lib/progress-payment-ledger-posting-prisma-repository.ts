import type { AuditLogEntryInput } from "./audit-log";
import type { LedgerJournalRow } from "./ledger-service";
import {
  PROGRESS_PAYMENT_LEDGER_SOURCE_TYPE,
  type ProgressPaymentLedgerPostingReasonCode,
  type ProgressPaymentLedgerPostingCommand,
  type ProgressPaymentLedgerPostingRepository,
  type ProgressPaymentLedgerPostingResult,
} from "./progress-payment-ledger-posting-service";

type DecimalValue = number | { toString(): string };

type ProgressPaymentRecord = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  documentNo: string;
  issueDate: Date | string;
  status: string;
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

type ProgressPaymentDelegate = {
  findFirst(input: {
    where: Record<string, unknown>;
    select: Record<string, boolean>;
  }): Promise<ProgressPaymentRecord | null>;
  updateMany(input: {
    where: Record<string, unknown>;
    data: { status: "Kaydedildi"; updatedBy: string; updatedAt: Date };
  }): Promise<{ count: number }>;
};

type LedgerEntryDelegate = {
  create(input: { data: unknown; include: { lines: true } }): Promise<LedgerEntryRecord>;
  findFirst(input: { where: Record<string, unknown>; include: { lines: true } }): Promise<LedgerEntryRecord | null>;
};

type AuditLogDelegate = {
  create(input: { data: { tenantId: string; companyId: string; periodId: string; actorUserId: string; action: string; entityType: string; entityId: string; entityLabel: string; occurredAt: Date; metadata: Record<string, unknown> } }): Promise<unknown>;
};

type PeriodDelegate = {
  findFirst(input: { where: { id: string; tenantId: string; companyId: string }; select: { isClosed: true } }): Promise<{ isClosed: boolean } | null>;
};

export type ProgressPaymentLedgerPostingTransactionLike = {
  progressPayment: ProgressPaymentDelegate;
  ledgerEntry: LedgerEntryDelegate;
  auditLog: AuditLogDelegate;
  period: PeriodDelegate;
};

export type ProgressPaymentLedgerPostingPrismaClientLike = ProgressPaymentLedgerPostingTransactionLike & {
  $transaction<T>(callback: (transaction: ProgressPaymentLedgerPostingTransactionLike) => Promise<T>): Promise<T>;
};

export function createProgressPaymentLedgerPostingPrismaRepository(
  prisma: ProgressPaymentLedgerPostingPrismaClientLike,
): ProgressPaymentLedgerPostingRepository {
  return {
    async commit(command) {
      try {
        return await prisma.$transaction((transaction) =>
          commitProgressPaymentLedgerPostingInTransaction(transaction, command),
        );
      } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
          return recoverSourceRetry(prisma, command);
        }
        return failure(
          "persistence-failed",
          "Hakediş ve muhasebe fişi atomik olarak kalıcılaştırılamadı.",
        );
      }
    },
  };
}

export async function commitProgressPaymentLedgerPostingInTransaction(
  transaction: ProgressPaymentLedgerPostingTransactionLike,
  command: ProgressPaymentLedgerPostingCommand,
): Promise<ProgressPaymentLedgerPostingResult> {
  const [progressPaymentRecord, existingLedgerRecord] = await Promise.all([
    transaction.progressPayment.findFirst({
      where: {
        id: command.sourceId,
        tenantId: command.scope.tenantId,
        companyId: command.scope.companyId,
        periodId: command.scope.periodId,
      },
      select: { id: true, tenantId: true, companyId: true, periodId: true, documentNo: true, issueDate: true, status: true, updatedBy: true, updatedAt: true },
    }),
    findScopedSourceLedger(transaction.ledgerEntry, command),
  ]);

  if (!progressPaymentRecord) {
    return failure("scope-mismatch", "Aktif kapsamda muhasebeleştirilecek hakediş bulunamadı.");
  }

  if (existingLedgerRecord) {
    return resolveExistingSource(command, existingLedgerRecord);
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
    return failure("period-closed", "Aktif muhasebe dönemi bulunamadı veya dönem kapanmış durumda.");
  }

  if (progressPaymentRecord.status !== "Taslak") {
    return failure("invalid-status", "Yalnız taslak hakediş muhasebeleştirilebilir.");
  }

  if (new Date(progressPaymentRecord.updatedAt).getTime() !== new Date(command.originalUpdatedAt).getTime()) {
    return failure("scope-mismatch", "Hakediş kesinleştirme öncesinde değişti; güncel kayıtla yeniden deneyin.");
  }

  const updated = await transaction.progressPayment.updateMany({
    where: {
      id: command.sourceId,
      tenantId: command.scope.tenantId,
      companyId: command.scope.companyId,
      periodId: command.scope.periodId,
      status: "Taslak",
      updatedAt: new Date(command.originalUpdatedAt),
    },
    data: {
      status: "Kaydedildi",
      updatedBy: command.progressPayment.updatedBy,
      updatedAt: new Date(command.progressPayment.updatedAt),
    },
  });
  if (updated.count !== 1) {
    return failure("scope-mismatch", "Hakediş kesinleştirme öncesinde değişti; güncel kayıtla yeniden deneyin.");
  }

  const createdLedger = await transaction.ledgerEntry.create({
    data: ledgerEntryCreateData(command.ledgerEntry),
    include: { lines: true },
  });
  for (const audit of command.successAudits) {
    await transaction.auditLog.create({ data: auditCreateData(audit) });
  }

  return {
    ok: true,
    data: {
      progressPayment: command.progressPayment,
      ledgerEntry: ledgerRecordToRow(createdLedger),
      created: true,
    },
  };
}

async function recoverSourceRetry(
  prisma: ProgressPaymentLedgerPostingPrismaClientLike,
  command: ProgressPaymentLedgerPostingCommand,
): Promise<ProgressPaymentLedgerPostingResult> {
  const existing = await findScopedSourceLedger(prisma.ledgerEntry, command);
  return existing ? resolveExistingSource(command, existing) : failure("persistence-failed", "Hakediş muhasebe fişi kalıcılaştırılamadı.");
}

async function findScopedSourceLedger(
  ledgerEntry: LedgerEntryDelegate,
  command: ProgressPaymentLedgerPostingCommand,
) {
  return ledgerEntry.findFirst({
    where: {
      tenantId: command.scope.tenantId,
      companyId: command.scope.companyId,
      periodId: command.scope.periodId,
      sourceType: PROGRESS_PAYMENT_LEDGER_SOURCE_TYPE,
      sourceId: command.sourceId,
    },
    include: { lines: true },
  });
}

function resolveExistingSource(
  command: ProgressPaymentLedgerPostingCommand,
  existing: LedgerEntryRecord,
): ProgressPaymentLedgerPostingResult {
  return {
    ok: true,
    data: {
      progressPayment: {
        ...command.progressPayment,
        status: "Kaydedildi",
        ledgerDocumentNo: existing.documentNo,
      },
      ledgerEntry: ledgerRecordToRow(existing),
      created: false,
    },
  };
}

function ledgerEntryCreateData(entry: LedgerJournalRow) {
  return {
    id: entry.id,
    tenantId: entry.tenantId,
    companyId: entry.companyId,
    periodId: entry.periodId,
    sourceType: entry.sourceType ?? null,
    sourceId: entry.sourceId ?? null,
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
      .sort((a, b) => a.lineNo - b.lineNo)
      .map((line) => ({
        accountCode: line.accountCode,
        accountName: line.accountName,
        amount: toNumber(line.debit) || toNumber(line.credit),
        direction: toNumber(line.debit) > 0 ? "debit" as const : "credit" as const,
        description: line.description ?? undefined,
      })),
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
    metadata: audit.metadata ?? {},
  };
}

function failure(reasonCode: ProgressPaymentLedgerPostingReasonCode, error: string) {
  return { ok: false as const, errors: [error], reasonCode };
}

function isPrismaUniqueConstraintError(error: unknown) {
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

function toDateOnly(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

function toIso(value: Date | string) {
  return new Date(value).toISOString();
}
