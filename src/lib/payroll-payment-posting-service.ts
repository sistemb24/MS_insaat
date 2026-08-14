import { createAuditLogEntry, type AuditLogEntryInput } from "./audit-log";
import {
  createPayrollAccrualPaymentMovement,
  type CashBankAccountOption,
  type CashBankMovementRow,
  validatePayrollAccrualPayment,
} from "./cash-bank-movement-service";
import { buildCashBankMovementLedgerDraft } from "./invoice-cash-bank-ledger-posting-service";
import {
  validateLedgerJournalDraft,
  type LedgerJournalRow,
} from "./ledger-service";
import type { PayrollAccrualRow } from "./payroll-accrual-service";
import { validateTenantScope, type TenantScope } from "./tenant-scope";

export type PayrollPaymentPostingReasonCode =
  | "invalid-payment"
  | "invalid-ledger"
  | "persistence-failed";

export type PayrollPaymentPostingCommand = {
  auditEntries: AuditLogEntryInput[];
  ledgerEntry: LedgerJournalRow;
  movement: CashBankMovementRow;
  payrollAccrualId: string;
  scope: TenantScope;
};

export type PayrollPaymentPostingResult =
  | {
      ok: true;
      data: {
        created: boolean;
        ledgerEntry: LedgerJournalRow;
        movement: CashBankMovementRow;
      };
    }
  | {
      ok: false;
      errors: string[];
      reasonCode: PayrollPaymentPostingReasonCode;
    };

export type PayrollPaymentPostingRepository = {
  commit(command: PayrollPaymentPostingCommand): Promise<PayrollPaymentPostingResult>;
};

export function createPayrollPaymentPostingService({
  now = () => new Date().toISOString(),
  repository,
}: {
  now?: () => string;
  repository: PayrollPaymentPostingRepository;
}) {
  return {
    async post(input: {
      account: CashBankAccountOption;
      movementDate?: string;
      payrollAccrual: PayrollAccrualRow;
      scope: TenantScope;
    }): Promise<PayrollPaymentPostingResult> {
      const command = buildPayrollPaymentPostingCommand({
        ...input,
        nowIso: now(),
      });

      if (!command.ok) {
        return command;
      }

      return repository.commit(command.data);
    },
  };
}

export function buildPayrollPaymentPostingCommand({
  account,
  movementDate,
  nowIso,
  payrollAccrual,
  scope,
}: {
  account: CashBankAccountOption;
  movementDate?: string;
  nowIso: string;
  payrollAccrual: PayrollAccrualRow;
  scope: TenantScope;
}):
  | { ok: true; data: PayrollPaymentPostingCommand }
  | {
      ok: false;
      errors: string[];
      reasonCode: PayrollPaymentPostingReasonCode;
    } {
  const errors = [
    ...validateTenantScope(scope),
    ...validatePayrollAccrualPayment(payrollAccrual),
  ];

  if (
    payrollAccrual.tenantId !== scope.tenantId ||
    payrollAccrual.companyId !== scope.companyId ||
    payrollAccrual.periodId !== scope.periodId
  ) {
    errors.push("Maaş tahakkuku aktif tenant, firma ve dönem kapsamına ait değil.");
  }

  if (!account.code.trim() || !account.name.trim()) {
    errors.push("Maaş ödemesi için geçerli kasa/banka hesabı zorunludur.");
  }

  if (errors.length > 0) {
    return { ok: false, errors, reasonCode: "invalid-payment" };
  }

  const movement = createPayrollAccrualPaymentMovement({
    account: { code: account.code.trim(), name: account.name.trim() },
    movementDate: movementDate ?? nowIso.slice(0, 10),
    nowIso,
    payrollAccrual,
    scope,
  });
  const ledgerDraft = buildCashBankMovementLedgerDraft(movement);

  if (!ledgerDraft) {
    return {
      ok: false,
      errors: ["Maaş ödeme hareketi için muhasebe eşlemesi oluşturulamadı."],
      reasonCode: "invalid-ledger",
    };
  }

  const ledgerValidation = validateLedgerJournalDraft(scope, ledgerDraft);

  if (!ledgerValidation.ok) {
    return {
      ok: false,
      errors: ledgerValidation.errors,
      reasonCode: "invalid-ledger",
    };
  }

  const ledgerEntry: LedgerJournalRow = {
    ...ledgerDraft,
    id: `${scope.tenantId}::${scope.companyId}::${scope.periodId}::ledger::${ledgerDraft.documentNo}`,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    status: "posted",
    debitTotal: ledgerValidation.data.debitTotal,
    creditTotal: ledgerValidation.data.creditTotal,
    createdBy: scope.userId,
    updatedBy: scope.userId,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return {
    ok: true,
    data: {
      auditEntries: [
        createAuditLogEntry(scope, {
          action: "cash-bank-movement.create",
          entityType: "cash-bank-movement",
          entityId: movement.id,
          entityLabel: movement.documentNo,
          occurredAt: nowIso,
          metadata: {
            amount: movement.amount,
            movementType: movement.movementType,
            sourceId: payrollAccrual.id,
            sourceType: "payroll-accrual",
          },
        }),
        createAuditLogEntry(scope, {
          action: "ledger.entry.post",
          entityType: "ledger-entry",
          entityId: ledgerEntry.id,
          entityLabel: ledgerEntry.documentNo,
          occurredAt: nowIso,
          metadata: {
            creditTotal: ledgerEntry.creditTotal,
            debitTotal: ledgerEntry.debitTotal,
            lineCount: ledgerEntry.lines.length,
            sourceId: movement.id,
            sourceType: "cash-bank-movement",
            status: ledgerEntry.status,
          },
        }),
      ],
      ledgerEntry,
      movement,
      payrollAccrualId: payrollAccrual.id,
      scope,
    },
  };
}
