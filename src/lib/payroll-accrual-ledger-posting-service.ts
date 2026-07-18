import { createAuditLogEntry, type AuditLogEntryInput } from "./audit-log";
import { type LedgerJournalRow, type LedgerLineDraft, validateLedgerJournalDraft } from "./ledger-service";
import { hasRbacPermission } from "./rbac";
import type { PayrollAccrualRow } from "./payroll-accrual-service";
import { validateTenantScope, type TenantScope } from "./tenant-scope";

export const PAYROLL_ACCRUAL_LEDGER_SOURCE_TYPE = "payroll-accrual";

export type PayrollAccrualLedgerPostingReasonCode =
  | "invalid-ledger"
  | "invalid-status"
  | "invalid-total"
  | "period-closed"
  | "permission-denied"
  | "persistence-failed"
  | "scope-invalid"
  | "scope-mismatch";

export type PayrollAccrualLedgerPostingCommand = {
  scope: TenantScope;
  sourceId: string;
  originalUpdatedAt: string;
  payrollAccrual: PayrollAccrualRow;
  ledgerEntry: LedgerJournalRow;
  successAudits: readonly [AuditLogEntryInput, AuditLogEntryInput];
};

export type PayrollAccrualLedgerPostingResult =
  | { ok: true; data: { payrollAccrual: PayrollAccrualRow; ledgerEntry: LedgerJournalRow; created: boolean } }
  | { ok: false; errors: string[]; reasonCode: PayrollAccrualLedgerPostingReasonCode };

export type PayrollAccrualLedgerPostingRepository = {
  commit(command: PayrollAccrualLedgerPostingCommand): Promise<PayrollAccrualLedgerPostingResult>;
};

export type PayrollAccrualLedgerPostingService = {
  post(input: { payrollAccrual: PayrollAccrualRow; scope: TenantScope }): Promise<PayrollAccrualLedgerPostingResult>;
};

export function createPayrollAccrualLedgerPostingService({
  now = () => new Date().toISOString(),
  repository,
}: {
  now?: () => string;
  repository: PayrollAccrualLedgerPostingRepository;
}): PayrollAccrualLedgerPostingService {
  return {
    async post({ payrollAccrual, scope }) {
      const commandResult = buildPayrollAccrualLedgerPostingCommand({ payrollAccrual, scope, timestamp: now() });
      if (!commandResult.ok) return commandResult;
      try {
        return await repository.commit(commandResult.data);
      } catch {
        return failure("persistence-failed", "Maaş tahakkuku ve muhasebe fişi atomik olarak kalıcılaştırılamadı.");
      }
    },
  };
}

export function buildPayrollAccrualLedgerPostingCommand({
  payrollAccrual,
  scope,
  timestamp,
}: {
  payrollAccrual: PayrollAccrualRow;
  scope: TenantScope;
  timestamp: string;
}): { ok: true; data: PayrollAccrualLedgerPostingCommand } | { ok: false; errors: string[]; reasonCode: PayrollAccrualLedgerPostingReasonCode } {
  const scopeErrors = validateTenantScope(scope);
  if (scopeErrors.length > 0) return { ok: false, errors: scopeErrors, reasonCode: "scope-invalid" };
  if (payrollAccrual.tenantId !== scope.tenantId || payrollAccrual.companyId !== scope.companyId || payrollAccrual.periodId !== scope.periodId) {
    return failure("scope-mismatch", "Maaş tahakkuku aktif tenant, firma ve dönem kapsamına ait değil.");
  }
  if (!hasRbacPermission(scope.userRole, "ledger.post")) {
    return failure("permission-denied", "Maaş tahakkukunu muhasebeleştirmek için muhasebe yetkisi gereklidir.");
  }
  if (scope.periodClosed) return failure("period-closed", "Kapalı dönemde maaş tahakkuku muhasebe fişi oluşturulamaz.");
  if (payrollAccrual.status !== "Taslak") return failure("invalid-status", "Yalnız taslak maaş tahakkuku muhasebeleştirilebilir.");
  if (!payrollAccrual.id.trim() || !payrollAccrual.documentNo.trim()) return failure("invalid-total", "Maaş tahakkuku kimliği ve evrak numarası zorunludur.");

  const grossTotal = roundMoney(payrollAccrual.grossTotal);
  const deductionTotal = roundMoney(payrollAccrual.deductionTotal);
  const netTotal = roundMoney(payrollAccrual.netTotal);
  if (![grossTotal, deductionTotal, netTotal].every(Number.isFinite) || grossTotal <= 0 || deductionTotal < 0 || netTotal < 0 || roundMoney(netTotal + deductionTotal) !== grossTotal) {
    return failure("invalid-total", "Maaş tahakkuku brüt, kesinti ve net toplamları birbiriyle uyumlu olmalıdır.");
  }

  const advanceDeduction = roundMoney(payrollAccrual.lines.reduce((sum, line) => sum + line.advanceDeduction, 0));
  const debtDeduction = roundMoney(payrollAccrual.lines.reduce((sum, line) => sum + line.debtDeduction, 0));
  if (roundMoney(advanceDeduction + debtDeduction) !== deductionTotal) {
    return failure("invalid-total", "Maaş tahakkuku kesinti toplamı satır kesintileriyle uyumlu değil.");
  }

  const description = `Maaş tahakkuku ${payrollAccrual.documentNo.trim()} - ${payrollAccrual.siteName.trim()}`;
  const lines: LedgerLineDraft[] = [
    { accountCode: "730", accountName: "Genel Üretim Giderleri", amount: grossTotal, direction: "debit", description },
    { accountCode: "335", accountName: "Personele Borçlar", amount: netTotal, direction: "credit", description },
    ...(advanceDeduction > 0 ? [{ accountCode: "135", accountName: "Personel Avansları", amount: advanceDeduction, direction: "credit" as const, description }] : []),
    ...(debtDeduction > 0 ? [{ accountCode: "136", accountName: "Personelden Alacaklar", amount: debtDeduction, direction: "credit" as const, description }] : []),
  ];
  const ledgerEntry: LedgerJournalRow = {
    id: `${payrollAccrual.id}::ledger-entry`,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    sourceType: PAYROLL_ACCRUAL_LEDGER_SOURCE_TYPE,
    sourceId: payrollAccrual.id,
    entryDate: `${payrollAccrual.year}-${String(payrollAccrual.month).padStart(2, "0")}-01`,
    documentNo: `YVM-MAAS-${payrollAccrual.documentNo.trim()}`,
    description,
    currency: "TL",
    lines,
    status: "posted",
    debitTotal: grossTotal,
    creditTotal: grossTotal,
    createdBy: scope.userId,
    updatedBy: scope.userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const validation = validateLedgerJournalDraft(scope, ledgerEntry);
  if (!validation.ok) return { ok: false, errors: validation.errors, reasonCode: "invalid-ledger" };

  const postedPayrollAccrual: PayrollAccrualRow = {
    ...payrollAccrual,
    status: "Kaydedildi",
    ledgerDocumentNo: ledgerEntry.documentNo,
    updatedBy: scope.userId,
    updatedAt: timestamp,
  };
  const payrollAudit = createAuditLogEntry(scope, {
    action: "payroll-accrual.post",
    entityType: "payroll-accrual",
    entityId: payrollAccrual.id,
    entityLabel: payrollAccrual.documentNo,
    occurredAt: timestamp,
    metadata: { documentNo: payrollAccrual.documentNo, statusFrom: payrollAccrual.status, statusTo: postedPayrollAccrual.status, grossTotal, deductionTotal, netTotal, sourceTimesheetId: payrollAccrual.sourceTimesheetId, sourceTimesheetNo: payrollAccrual.sourceTimesheetNo, ledgerEntryId: ledgerEntry.id, ledgerDocumentNo: ledgerEntry.documentNo, sourceType: PAYROLL_ACCRUAL_LEDGER_SOURCE_TYPE, sourceId: payrollAccrual.id },
  });
  const ledgerAudit = createAuditLogEntry(scope, {
    action: "ledger.entry.post",
    entityType: "ledger-entry",
    entityId: ledgerEntry.id,
    entityLabel: ledgerEntry.documentNo,
    occurredAt: timestamp,
    metadata: { status: ledgerEntry.status, currency: ledgerEntry.currency, debitTotal: ledgerEntry.debitTotal, creditTotal: ledgerEntry.creditTotal, lineCount: ledgerEntry.lines.length, sourceType: PAYROLL_ACCRUAL_LEDGER_SOURCE_TYPE, sourceId: payrollAccrual.id, sourceDocumentNo: payrollAccrual.documentNo },
  });

  return { ok: true, data: { scope, sourceId: payrollAccrual.id, originalUpdatedAt: payrollAccrual.updatedAt, payrollAccrual: postedPayrollAccrual, ledgerEntry, successAudits: [payrollAudit, ledgerAudit] } };
}

function failure(reasonCode: PayrollAccrualLedgerPostingReasonCode, error: string) {
  return { ok: false as const, errors: [error], reasonCode };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
