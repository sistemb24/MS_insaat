import {
  createAuditLogEntry,
  type AuditLogEntryInput,
} from "./audit-log";
import {
  type LedgerJournalRow,
  type LedgerLineDraft,
  validateLedgerJournalDraft,
} from "./ledger-service";
import { hasRbacPermission } from "./rbac";
import type { ProgressPaymentRow, ProgressPaymentType } from "./progress-payment-service";
import { validateTenantScope, type TenantScope } from "./tenant-scope";

export const PROGRESS_PAYMENT_LEDGER_SOURCE_TYPE = "progress-payment";

export type ProgressPaymentLedgerPostingReasonCode =
  | "invalid-ledger"
  | "invalid-status"
  | "invalid-total"
  | "period-closed"
  | "permission-denied"
  | "persistence-failed"
  | "scope-invalid"
  | "scope-mismatch";

export type ProgressPaymentLedgerPostingCommand = {
  scope: TenantScope;
  sourceId: string;
  originalUpdatedAt: string;
  progressPayment: ProgressPaymentRow;
  ledgerEntry: LedgerJournalRow;
  successAudits: readonly [AuditLogEntryInput, AuditLogEntryInput];
};

export type ProgressPaymentLedgerPostingResult =
  | {
      ok: true;
      data: {
        progressPayment: ProgressPaymentRow;
        ledgerEntry: LedgerJournalRow;
        created: boolean;
      };
    }
  | {
      ok: false;
      errors: string[];
      reasonCode: ProgressPaymentLedgerPostingReasonCode;
    };

export type ProgressPaymentLedgerPostingRepository = {
  commit(
    command: ProgressPaymentLedgerPostingCommand,
  ): Promise<ProgressPaymentLedgerPostingResult>;
};

export type ProgressPaymentLedgerPostingService = {
  post(input: {
    progressPayment: ProgressPaymentRow;
    scope: TenantScope;
  }): Promise<ProgressPaymentLedgerPostingResult>;
};

export function createProgressPaymentLedgerPostingService({
  now = () => new Date().toISOString(),
  repository,
}: {
  now?: () => string;
  repository: ProgressPaymentLedgerPostingRepository;
}): ProgressPaymentLedgerPostingService {
  return {
    async post({ progressPayment, scope }) {
      const commandResult = buildProgressPaymentLedgerPostingCommand({
        progressPayment,
        scope,
        timestamp: now(),
      });

      if (!commandResult.ok) {
        return commandResult;
      }

      try {
        return await repository.commit(commandResult.data);
      } catch {
        return failure(
          "persistence-failed",
          "Hakediş ve muhasebe fişi atomik olarak kalıcılaştırılamadı.",
        );
      }
    },
  };
}

export function buildProgressPaymentLedgerPostingCommand({
  progressPayment,
  scope,
  timestamp,
}: {
  progressPayment: ProgressPaymentRow;
  scope: TenantScope;
  timestamp: string;
}):
  | { ok: true; data: ProgressPaymentLedgerPostingCommand }
  | {
      ok: false;
      errors: string[];
      reasonCode: ProgressPaymentLedgerPostingReasonCode;
    } {
  const scopeErrors = validateTenantScope(scope);
  if (scopeErrors.length > 0) {
    return { ok: false, errors: scopeErrors, reasonCode: "scope-invalid" };
  }

  if (
    progressPayment.tenantId !== scope.tenantId ||
    progressPayment.companyId !== scope.companyId ||
    progressPayment.periodId !== scope.periodId
  ) {
    return failure(
      "scope-mismatch",
      "Hakediş aktif tenant, firma ve dönem kapsamına ait değil.",
    );
  }

  if (!hasRbacPermission(scope.userRole, "ledger.post")) {
    return failure(
      "permission-denied",
      "Hakedişi muhasebeleştirmek için muhasebe yetkisi gereklidir.",
    );
  }

  if (scope.periodClosed) {
    return failure(
      "period-closed",
      "Kapalı dönemde hakediş muhasebe fişi oluşturulamaz.",
    );
  }

  if (progressPayment.status !== "Taslak") {
    return failure(
      "invalid-status",
      "Yalnız taslak hakediş muhasebeleştirilebilir.",
    );
  }

  if (!progressPayment.id.trim() || !progressPayment.documentNo.trim()) {
    return failure(
      "invalid-total",
      "Hakediş kimliği ve evrak numarası zorunludur.",
    );
  }

  const netTotal = roundMoney(progressPayment.netTotal);
  const vatTotal = roundMoney(progressPayment.vatTotal);
  const grandTotal = roundMoney(progressPayment.grandTotal);
  if (
    ![netTotal, vatTotal, grandTotal].every(Number.isFinite) ||
    netTotal <= 0 ||
    vatTotal < 0 ||
    grandTotal <= 0 ||
    roundMoney(netTotal + vatTotal) !== grandTotal
  ) {
    return failure(
      "invalid-total",
      "Hakediş net, KDV ve genel toplamları birbiriyle uyumlu ve sıfırdan büyük olmalıdır.",
    );
  }

  const description = `Hakediş ${progressPayment.documentNo.trim()} - ${progressPayment.counterpartyName.trim()}`;
  const lines = buildLines(progressPayment.paymentType, {
    description,
    netTotal,
    vatTotal,
    grandTotal,
  });
  const ledgerEntry: LedgerJournalRow = {
    id: `${progressPayment.id}::ledger-entry`,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    sourceType: PROGRESS_PAYMENT_LEDGER_SOURCE_TYPE,
    sourceId: progressPayment.id,
    currency: progressPayment.currency,
    documentNo: `YVM-HAK-${progressPayment.documentNo.trim()}`,
    entryDate: progressPayment.issueDate,
    description,
    lines,
    status: "posted",
    debitTotal: grandTotal,
    creditTotal: grandTotal,
    createdBy: scope.userId,
    updatedBy: scope.userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const ledgerValidation = validateLedgerJournalDraft(scope, ledgerEntry);
  if (!ledgerValidation.ok) {
    return {
      ok: false,
      errors: ledgerValidation.errors,
      reasonCode: "invalid-ledger",
    };
  }

  const postedProgressPayment: ProgressPaymentRow = {
    ...progressPayment,
    status: "Kaydedildi",
    ledgerDocumentNo: ledgerEntry.documentNo,
    updatedBy: scope.userId,
    updatedAt: timestamp,
  };
  const progressPaymentAudit = createAuditLogEntry(scope, {
    action: "progress-payment.post",
    entityType: "progress-payment",
    entityId: progressPayment.id,
    entityLabel: progressPayment.documentNo,
    occurredAt: timestamp,
    metadata: {
      documentNo: progressPayment.documentNo,
      statusFrom: progressPayment.status,
      statusTo: postedProgressPayment.status,
      paymentType: progressPayment.paymentType,
      counterpartyCode: progressPayment.counterpartyCode,
      counterpartyName: progressPayment.counterpartyName,
      siteCode: progressPayment.siteCode,
      siteName: progressPayment.siteName,
      grandTotal,
      lineCount: progressPayment.lineCount,
      ledgerEntryId: ledgerEntry.id,
      ledgerDocumentNo: ledgerEntry.documentNo,
      sourceType: PROGRESS_PAYMENT_LEDGER_SOURCE_TYPE,
      sourceId: progressPayment.id,
    },
  });
  const ledgerAudit = createAuditLogEntry(scope, {
    action: "ledger.entry.post",
    entityType: "ledger-entry",
    entityId: ledgerEntry.id,
    entityLabel: ledgerEntry.documentNo,
    occurredAt: timestamp,
    metadata: {
      status: ledgerEntry.status,
      currency: ledgerEntry.currency,
      debitTotal: ledgerEntry.debitTotal,
      creditTotal: ledgerEntry.creditTotal,
      lineCount: ledgerEntry.lines.length,
      sourceType: PROGRESS_PAYMENT_LEDGER_SOURCE_TYPE,
      sourceId: progressPayment.id,
      sourceDocumentNo: progressPayment.documentNo,
    },
  });

  return {
    ok: true,
    data: {
      scope,
      sourceId: progressPayment.id,
      originalUpdatedAt: progressPayment.updatedAt,
      progressPayment: postedProgressPayment,
      ledgerEntry,
      successAudits: [progressPaymentAudit, ledgerAudit],
    },
  };
}

function buildLines(
  paymentType: ProgressPaymentType,
  totals: { description: string; netTotal: number; vatTotal: number; grandTotal: number },
): LedgerLineDraft[] {
  if (paymentType === "Şantiye Geliri") {
    return [
      { accountCode: "120", accountName: "Alıcılar", amount: totals.grandTotal, direction: "debit", description: totals.description },
      { accountCode: "600", accountName: "Yurtiçi Satışlar", amount: totals.netTotal, direction: "credit", description: totals.description },
      ...(totals.vatTotal > 0 ? [{ accountCode: "391", accountName: "Hesaplanan KDV", amount: totals.vatTotal, direction: "credit" as const, description: totals.description }] : []),
    ];
  }

  const costAccount = paymentType === "Tedarikçi Hakedişi"
    ? { code: "153", name: "Ticari Mallar" }
    : { code: "740", name: "Hizmet Üretim Maliyetleri" };
  return [
    { accountCode: costAccount.code, accountName: costAccount.name, amount: totals.netTotal, direction: "debit", description: totals.description },
    ...(totals.vatTotal > 0 ? [{ accountCode: "191", accountName: "İndirilecek KDV", amount: totals.vatTotal, direction: "debit" as const, description: totals.description }] : []),
    { accountCode: "320", accountName: "Satıcılar", amount: totals.grandTotal, direction: "credit", description: totals.description },
  ];
}

function failure(
  reasonCode: ProgressPaymentLedgerPostingReasonCode,
  error: string,
) {
  return { ok: false as const, errors: [error], reasonCode };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
