import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import { type LedgerJournalRow, type LedgerRepository, validateLedgerJournalDraft } from "./ledger-service";
import { hasRbacPermission } from "./rbac";
import type { ExpenseRow } from "./expense-service";
import { validateTenantScope, type TenantScope } from "./tenant-scope";

export const EXPENSE_LEDGER_SOURCE_TYPE = "expense";

export type ExpenseLedgerPostingReasonCode = "invalid-ledger" | "invalid-status" | "invalid-total" | "period-closed" | "permission-denied" | "persistence-failed" | "scope-invalid" | "scope-mismatch";
export type ExpenseLedgerPostingResult =
  | { ok: true; data: { expense: ExpenseRow; ledgerEntry: LedgerJournalRow; created: boolean } }
  | { ok: false; errors: string[]; reasonCode: ExpenseLedgerPostingReasonCode };

export type ExpenseLedgerPostingService = {
  post(input: { expense: ExpenseRow; scope: TenantScope }): Promise<ExpenseLedgerPostingResult>;
};

export function createExpenseLedgerPostingService({
  auditLogRepository,
  now = () => new Date().toISOString(),
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  now?: () => string;
  repository: LedgerRepository;
}): ExpenseLedgerPostingService {
  return {
    async post({ expense, scope }) {
      const scopeErrors = validateTenantScope(scope);
      if (scopeErrors.length > 0) return { ok: false, errors: scopeErrors, reasonCode: "scope-invalid" };
      if (expense.tenantId !== scope.tenantId || expense.companyId !== scope.companyId || expense.periodId !== scope.periodId) return failure("scope-mismatch", "Gider aktif tenant, firma ve dönem kapsamına ait değil.");
      if (!hasRbacPermission(scope.userRole, "ledger.post")) return failure("permission-denied", "Gideri muhasebeleştirmek için muhasebe yetkisi gereklidir.");
      if (scope.periodClosed) return failure("period-closed", "Kapalı dönemde gider muhasebe fişi oluşturulamaz.");
      if (expense.status !== "Kaydedildi") return failure("invalid-status", "Yalnız kaydedilmiş gider muhasebeleştirilebilir.");

      const amount = roundMoney(expense.amount);
      const vatTotal = roundMoney(expense.vatTotal);
      const grandTotal = roundMoney(expense.grandTotal);
      if (![amount, vatTotal, grandTotal].every(Number.isFinite) || amount <= 0 || vatTotal < 0 || grandTotal <= 0 || roundMoney(amount + vatTotal) !== grandTotal) return failure("invalid-total", "Gider net, KDV ve genel toplamları birbiriyle uyumlu olmalıdır.");

      const cashAccount = resolveCashLedgerAccount(expense.accountCode, expense.accountName);
      const description = `${expense.documentNo.trim()} gideri - ${expense.siteName.trim()}`;
      const ledgerEntry: LedgerJournalRow = {
        id: `${expense.id}::ledger-entry`, tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId,
        sourceType: EXPENSE_LEDGER_SOURCE_TYPE, sourceId: expense.id, currency: expense.currency,
        documentNo: `YVM-GDR-${expense.documentNo.trim()}`, entryDate: expense.expenseDate, description,
        lines: [
          { accountCode: "770", accountName: "Genel Yönetim Giderleri", amount, direction: "debit", description },
          ...(vatTotal > 0 ? [{ accountCode: "191", accountName: "İndirilecek KDV", amount: vatTotal, direction: "debit" as const, description }] : []),
          { accountCode: cashAccount.code, accountName: cashAccount.name, amount: grandTotal, direction: "credit", description },
        ],
        status: "posted", debitTotal: grandTotal, creditTotal: grandTotal, createdBy: scope.userId, updatedBy: scope.userId, createdAt: now(), updatedAt: now(),
      };
      const validation = validateLedgerJournalDraft(scope, ledgerEntry);
      if (!validation.ok) return { ok: false, errors: validation.errors, reasonCode: "invalid-ledger" };

      const existing = (await repository.list({ scope })).find((entry) => entry.sourceType === EXPENSE_LEDGER_SOURCE_TYPE && entry.sourceId === expense.id);
      if (existing) return { ok: true, data: { expense: { ...expense, ledgerDocumentNo: existing.documentNo }, ledgerEntry: existing, created: false } };

      try {
        const created = await repository.create(ledgerEntry);
        if (auditLogRepository) {
          await auditLogRepository.record(createAuditLogEntry(scope, { action: "ledger.entry.post", entityType: "ledger-entry", entityId: created.id, entityLabel: created.documentNo, occurredAt: created.updatedAt, metadata: { status: created.status, currency: created.currency, debitTotal: created.debitTotal, creditTotal: created.creditTotal, lineCount: created.lines.length, sourceType: EXPENSE_LEDGER_SOURCE_TYPE, sourceId: expense.id, sourceDocumentNo: expense.documentNo } }));
        }
        return { ok: true, data: { expense: { ...expense, ledgerDocumentNo: created.documentNo }, ledgerEntry: created, created: true } };
      } catch {
        const recovered = (await repository.list({ scope })).find((entry) => entry.sourceType === EXPENSE_LEDGER_SOURCE_TYPE && entry.sourceId === expense.id);
        return recovered ? { ok: true, data: { expense: { ...expense, ledgerDocumentNo: recovered.documentNo }, ledgerEntry: recovered, created: false } } : failure("persistence-failed", "Gider muhasebe fişi kalıcılaştırılamadı.");
      }
    },
  };
}

function resolveCashLedgerAccount(accountCode: string, accountName: string) {
  const bank = /(^|[^0-9])102([^0-9]|$)|banka/i.test(`${accountCode} ${accountName}`);
  return bank ? { code: "102", name: "Bankalar" } : { code: "100", name: "Kasa" };
}

function failure(reasonCode: ExpenseLedgerPostingReasonCode, error: string) {
  return { ok: false as const, errors: [error], reasonCode };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
