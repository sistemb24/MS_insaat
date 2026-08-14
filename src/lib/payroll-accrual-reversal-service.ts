import { createAuditLogEntry, type AuditLogEntryInput } from "./audit-log";
import type { CashBankMovementRow } from "./cash-bank-movement-service";
import {
  validateLedgerJournalDraft,
  type LedgerJournalRow,
} from "./ledger-service";
import type { PayrollAccrualRow } from "./payroll-accrual-service";
import { validateTenantScope, type TenantScope } from "./tenant-scope";

export const PAYROLL_ACCRUAL_REVERSAL_SOURCE_TYPE =
  "payroll-accrual-reversal";
export const PAYROLL_PAYMENT_REVERSAL_SOURCE_TYPE =
  "cash-bank-movement-reversal";

export type PayrollAccrualReversalReasonCode =
  | "invalid-source"
  | "period-closed"
  | "permission-denied"
  | "persistence-failed"
  | "scope-invalid";

export type PayrollAccrualReversalBundle = {
  accrualLedger: LedgerJournalRow;
  payment?: {
    ledger: LedgerJournalRow;
    movement: CashBankMovementRow;
  };
};

export type PayrollAccrualReversalCommand = {
  auditEntries: AuditLogEntryInput[];
  cancelledPayrollAccrual: PayrollAccrualRow;
  originalUpdatedAt: string;
  reversal: PayrollAccrualReversalBundle;
  scope: TenantScope;
};

export type PayrollAccrualReversalResult =
  | {
      ok: true;
      data: {
        created: boolean;
        payrollAccrual: PayrollAccrualRow;
        reversal: PayrollAccrualReversalBundle;
      };
    }
  | {
      ok: false;
      errors: string[];
      reasonCode: PayrollAccrualReversalReasonCode;
    };

export type PayrollAccrualReversalRepository = {
  commit(input: {
    payrollAccrualId: string;
    scope: TenantScope;
    timestamp: string;
  }): Promise<PayrollAccrualReversalResult>;
};

export function createPayrollAccrualReversalService({
  now = () => new Date().toISOString(),
  repository,
}: {
  now?: () => string;
  repository: PayrollAccrualReversalRepository;
}) {
  return {
    async reverse(input: {
      payrollAccrualId: string;
      scope: TenantScope;
    }): Promise<PayrollAccrualReversalResult> {
      const errors = validateTenantScope(input.scope);

      if (!input.payrollAccrualId.trim()) {
        errors.push("Maaş tahakkuku kimliği zorunludur.");
      }

      if (errors.length > 0) {
        return failure("scope-invalid", errors);
      }

      if (input.scope.userRole !== "admin") {
        return failure("permission-denied", [
          "Maaş tahakkuku ters kaydı yalnız yönetici tarafından oluşturulabilir.",
        ]);
      }

      if (input.scope.periodClosed) {
        return failure("period-closed", [
          "Kapalı dönemde maaş tahakkuku ters kaydı oluşturulamaz.",
        ]);
      }

      return repository.commit({
        ...input,
        payrollAccrualId: input.payrollAccrualId.trim(),
        timestamp: now(),
      });
    },
  };
}

export function buildPayrollAccrualReversalCommand({
  originalAccrualLedger,
  originalPayment,
  originalPaymentLedger,
  payrollAccrual,
  scope,
  timestamp,
}: {
  originalAccrualLedger: LedgerJournalRow;
  originalPayment?: CashBankMovementRow;
  originalPaymentLedger?: LedgerJournalRow;
  payrollAccrual: PayrollAccrualRow;
  scope: TenantScope;
  timestamp: string;
}):
  | { ok: true; data: PayrollAccrualReversalCommand }
  | {
      ok: false;
      errors: string[];
      reasonCode: PayrollAccrualReversalReasonCode;
    } {
  if (scope.userRole !== "admin") {
    return failure("permission-denied", [
      "Maaş tahakkuku ters kaydı yalnız yönetici tarafından oluşturulabilir.",
    ]);
  }

  if (scope.periodClosed) {
    return failure("period-closed", [
      "Kapalı dönemde maaş tahakkuku ters kaydı oluşturulamaz.",
    ]);
  }

  if (
    payrollAccrual.tenantId !== scope.tenantId ||
    payrollAccrual.companyId !== scope.companyId ||
    payrollAccrual.periodId !== scope.periodId ||
    originalAccrualLedger.tenantId !== scope.tenantId ||
    originalAccrualLedger.companyId !== scope.companyId ||
    originalAccrualLedger.periodId !== scope.periodId
  ) {
    return failure("invalid-source", [
      "Maaş tahakkuku veya kaynak muhasebe fişi aktif kapsama ait değil.",
    ]);
  }

  if (
    payrollAccrual.status !== "Kaydedildi" ||
    originalAccrualLedger.sourceType !== "payroll-accrual" ||
    originalAccrualLedger.sourceId !== payrollAccrual.id
  ) {
    return failure("invalid-source", [
      "Yalnız kaynak muhasebe fişi bulunan kesinleşmiş maaş tahakkuku ters kayda alınabilir.",
    ]);
  }

  if (Boolean(originalPayment) !== Boolean(originalPaymentLedger)) {
    return failure("invalid-source", [
      "Maaş ödemesi ve kaynak muhasebe fişi birlikte bulunmalıdır.",
    ]);
  }

  if (
    originalPayment &&
    originalPaymentLedger &&
    (originalPayment.tenantId !== scope.tenantId ||
      originalPayment.companyId !== scope.companyId ||
      originalPayment.periodId !== scope.periodId ||
      originalPayment.sourceType !== "payroll-accrual" ||
      originalPayment.sourceId !== payrollAccrual.id ||
      originalPayment.movementType !== "Maaş Ödemesi" ||
      originalPaymentLedger.sourceType !== "cash-bank-movement" ||
      originalPaymentLedger.sourceId !== originalPayment.id)
  ) {
    return failure("invalid-source", [
      "Maaş ödemesi veya kaynak muhasebe fişi tahakkukla uyumlu değil.",
    ]);
  }

  const accrualLedger = reverseLedger({
    actorUserId: scope.userId,
    original: originalAccrualLedger,
    sourceId: payrollAccrual.id,
    sourceType: PAYROLL_ACCRUAL_REVERSAL_SOURCE_TYPE,
    timestamp,
  });
  const accrualLedgerValidation = validateLedgerJournalDraft(
    scope,
    accrualLedger,
  );

  if (!accrualLedgerValidation.ok) {
    return failure("invalid-source", accrualLedgerValidation.errors);
  }

  const payment =
    originalPayment && originalPaymentLedger
      ? {
          ledger: reverseLedger({
            actorUserId: scope.userId,
            original: originalPaymentLedger,
            sourceId: originalPayment.id,
            sourceType: PAYROLL_PAYMENT_REVERSAL_SOURCE_TYPE,
            timestamp,
          }),
          movement: reverseMovement(originalPayment, scope, timestamp),
        }
      : undefined;

  if (payment) {
    const paymentLedgerValidation = validateLedgerJournalDraft(
      scope,
      payment.ledger,
    );

    if (!paymentLedgerValidation.ok) {
      return failure("invalid-source", paymentLedgerValidation.errors);
    }
  }

  const cancelledPayrollAccrual: PayrollAccrualRow = {
    ...payrollAccrual,
    status: "İptal",
    updatedBy: scope.userId,
    updatedAt: timestamp,
  };
  const reversal: PayrollAccrualReversalBundle = {
    accrualLedger,
    ...(payment ? { payment } : {}),
  };
  const auditEntries = buildAudits({
    cancelledPayrollAccrual,
    originalPayment,
    payrollAccrual,
    reversal,
    scope,
    timestamp,
  });

  return {
    ok: true,
    data: {
      auditEntries,
      cancelledPayrollAccrual,
      originalUpdatedAt: payrollAccrual.updatedAt,
      reversal,
      scope,
    },
  };
}

function reverseLedger({
  actorUserId,
  original,
  sourceId,
  sourceType,
  timestamp,
}: {
  actorUserId: string;
  original: LedgerJournalRow;
  sourceId: string;
  sourceType: string;
  timestamp: string;
}): LedgerJournalRow {
  return {
    ...original,
    id: `${original.id}::reversal`,
    sourceType,
    sourceId,
    documentNo: `YVM-IA-${original.documentNo}`,
    description: `${original.documentNo} ters kayıt fişi`,
    lines: original.lines.map((line) => ({
      ...line,
      direction: line.direction === "debit" ? "credit" : "debit",
      description: `${original.documentNo} ters kayıt`,
    })),
    createdBy: actorUserId,
    updatedBy: actorUserId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function reverseMovement(
  original: CashBankMovementRow,
  scope: TenantScope,
  timestamp: string,
): CashBankMovementRow {
  return {
    ...original,
    id: `${original.id}::reversal`,
    direction: original.direction === "Giriş" ? "Çıkış" : "Giriş",
    movementType: "Maaş Ödemesi",
    documentNo: `YVM-IA-${original.documentNo}`,
    description: `${original.documentNo} maaş ödemesi ters hareketi`,
    sourceType: PAYROLL_PAYMENT_REVERSAL_SOURCE_TYPE,
    sourceId: original.id,
    sourceLabel: `${original.sourceLabel} ters kayıt`,
    createdBy: scope.userId,
    updatedBy: scope.userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function buildAudits({
  cancelledPayrollAccrual,
  originalPayment,
  payrollAccrual,
  reversal,
  scope,
  timestamp,
}: {
  cancelledPayrollAccrual: PayrollAccrualRow;
  originalPayment?: CashBankMovementRow;
  payrollAccrual: PayrollAccrualRow;
  reversal: PayrollAccrualReversalBundle;
  scope: TenantScope;
  timestamp: string;
}) {
  const audits: AuditLogEntryInput[] = [
    createAuditLogEntry(scope, {
      action: "payroll-accrual.reverse",
      entityType: "payroll-accrual",
      entityId: payrollAccrual.id,
      entityLabel: payrollAccrual.documentNo,
      occurredAt: timestamp,
      metadata: {
        statusFrom: payrollAccrual.status,
        statusTo: cancelledPayrollAccrual.status,
        reversalLedgerEntryId: reversal.accrualLedger.id,
        reversalLedgerDocumentNo: reversal.accrualLedger.documentNo,
        paymentReversed: Boolean(reversal.payment),
      },
    }),
    ledgerAudit(scope, reversal.accrualLedger, timestamp),
  ];

  if (reversal.payment && originalPayment) {
    audits.push(
      createAuditLogEntry(scope, {
        action: "cash-bank-movement.reverse",
        entityType: "cash-bank-movement",
        entityId: reversal.payment.movement.id,
        entityLabel: reversal.payment.movement.documentNo,
        occurredAt: timestamp,
        metadata: {
          amount: reversal.payment.movement.amount,
          originalMovementId: originalPayment.id,
          sourceId: originalPayment.id,
          sourceType: PAYROLL_PAYMENT_REVERSAL_SOURCE_TYPE,
        },
      }),
      ledgerAudit(scope, reversal.payment.ledger, timestamp),
    );
  }

  return audits;
}

function ledgerAudit(
  scope: TenantScope,
  ledger: LedgerJournalRow,
  timestamp: string,
) {
  return createAuditLogEntry(scope, {
    action: "ledger.entry.post",
    entityType: "ledger-entry",
    entityId: ledger.id,
    entityLabel: ledger.documentNo,
    occurredAt: timestamp,
    metadata: {
      creditTotal: ledger.creditTotal,
      debitTotal: ledger.debitTotal,
      lineCount: ledger.lines.length,
      sourceId: ledger.sourceId,
      sourceType: ledger.sourceType,
      status: ledger.status,
    },
  });
}

function failure(
  reasonCode: PayrollAccrualReversalReasonCode,
  errors: string[],
): {
  ok: false;
  errors: string[];
  reasonCode: PayrollAccrualReversalReasonCode;
} {
  return { ok: false, errors, reasonCode };
}
