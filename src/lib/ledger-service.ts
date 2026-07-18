import { hasRbacPermission } from "./rbac";
import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import type { TenantScope } from "./tenant-scope";

export type LedgerDirection = "debit" | "credit";

export type LedgerLineDraft = {
  accountCode: string;
  accountName: string;
  amount: number;
  direction: LedgerDirection;
  description?: string;
};

export type LedgerJournalDraft = {
  currency: "TL" | "USD" | "EUR";
  documentNo: string;
  entryDate: string;
  description: string;
  lines: LedgerLineDraft[];
  sourceType?: string;
  sourceId?: string;
};

export type LedgerValidationResult =
  | { ok: true; data: { creditTotal: number; debitTotal: number } }
  | { ok: false; errors: string[] };

export type LedgerJournalRow = LedgerJournalDraft & {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  sourceType?: string;
  sourceId?: string;
  status: "posted";
  debitTotal: number;
  creditTotal: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type LedgerRepository = {
  create(entry: LedgerJournalRow): Promise<LedgerJournalRow>;
  findByDocumentNo(input: { documentNo: string; scope: TenantScope }): Promise<LedgerJournalRow | undefined>;
  list(input: { scope: TenantScope }): Promise<LedgerJournalRow[]>;
};

export type LedgerTrialBalanceRow = {
  currency: LedgerJournalDraft["currency"];
  accountCode: string;
  accountName: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
};

export function buildLedgerTrialBalance(entries: LedgerJournalRow[]): LedgerTrialBalanceRow[] {
  const byAccount = new Map<string, LedgerTrialBalanceRow>();
  for (const entry of entries) {
    for (const line of entry.lines) {
      const key = `${entry.currency}::${line.accountCode.trim()}`;
      const current = byAccount.get(key) ?? { currency: entry.currency, accountCode: line.accountCode.trim(), accountName: line.accountName.trim(), debitTotal: 0, creditTotal: 0, balance: 0 };
      if (line.direction === "debit") current.debitTotal = roundMoney(current.debitTotal + line.amount);
      else current.creditTotal = roundMoney(current.creditTotal + line.amount);
      current.balance = roundMoney(current.debitTotal - current.creditTotal);
      byAccount.set(key, current);
    }
  }
  return [...byAccount.values()].sort((left, right) => left.accountCode.localeCompare(right.accountCode, "tr"));
}

export function createLedgerService({
  now = () => new Date().toISOString(),
  repository,
  auditLogRepository,
}: {
  now?: () => string;
  repository: LedgerRepository;
  auditLogRepository?: AuditLogRepository;
}) {
  return {
    async list({ scope }: { scope: TenantScope }) {
      return repository.list({ scope });
    },
    async post({ draft, scope }: { draft: LedgerJournalDraft; scope: TenantScope }) {
      const validation = validateLedgerJournalDraft(scope, draft);
      if (!validation.ok) return validation;
      const existing = await repository.findByDocumentNo({ documentNo: draft.documentNo.trim(), scope });
      if (existing) return { ok: false as const, errors: [`Fiş numarası bu dönem için zaten kullanılıyor: ${draft.documentNo.trim()}`] };
      const timestamp = now();
      const entry: LedgerJournalRow = {
        ...draft,
        documentNo: draft.documentNo.trim(),
        description: draft.description.trim(),
        lines: draft.lines.map((line) => ({ ...line, accountCode: line.accountCode.trim(), accountName: line.accountName.trim(), description: line.description?.trim() })),
        id: `${scope.tenantId}::${scope.companyId}::${scope.periodId}::ledger::${draft.documentNo.trim()}`,
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        periodId: scope.periodId,
        status: "posted",
        debitTotal: validation.data.debitTotal,
        creditTotal: validation.data.creditTotal,
        createdBy: scope.userId,
        updatedBy: scope.userId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const created = await repository.create(entry);
      await auditLogRepository?.record(createAuditLogEntry(scope, {
        action: "ledger.entry.post",
        entityType: "ledger-entry",
        entityId: created.id,
        entityLabel: created.documentNo,
        occurredAt: created.updatedAt,
        metadata: {
          status: created.status,
          currency: created.currency,
          debitTotal: created.debitTotal,
          creditTotal: created.creditTotal,
          lineCount: created.lines.length,
        },
      }));
      return { ok: true as const, data: created };
    },
  };
}

export function createSeededLedgerMemoryRepository(initialRows: LedgerJournalRow[] = []): LedgerRepository {
  const rows = [...initialRows];
  return {
    async create(entry) { rows.push(structuredClone(entry)); return structuredClone(entry); },
    async findByDocumentNo({ documentNo, scope }) { return rows.find((row) => row.tenantId === scope.tenantId && row.companyId === scope.companyId && row.periodId === scope.periodId && row.documentNo === documentNo); },
    async list({ scope }) { return rows.filter((row) => row.tenantId === scope.tenantId && row.companyId === scope.companyId && row.periodId === scope.periodId).map((row) => structuredClone(row)); },
  };
}

export function validateLedgerJournalDraft(
  scope: TenantScope,
  draft: LedgerJournalDraft,
): LedgerValidationResult {
  if (!hasRbacPermission(scope.userRole, "ledger.post")) {
    return { ok: false, errors: ["Muhasebe fişi oluşturma yetkisi yok."] };
  }
  if (scope.periodClosed) {
    return { ok: false, errors: ["Kapalı dönemde yeni muhasebe fişi post edilemez."] };
  }
  const errors: string[] = [];
  if (!draft.documentNo.trim()) errors.push("Fiş numarası zorunludur.");
  if (!isDateOnly(draft.entryDate)) errors.push("Geçerli bir fiş tarihi zorunludur.");
  if (draft.lines.length < 2) errors.push("Muhasebe fişi en az iki satır içermelidir.");
  let debitTotal = 0;
  let creditTotal = 0;
  for (const [index, line] of draft.lines.entries()) {
    const label = `Satır ${index + 1}`;
    if (!line.accountCode.trim() || !line.accountName.trim()) errors.push(`${label} hesap bilgisi zorunludur.`);
    if (!Number.isFinite(line.amount) || line.amount <= 0) errors.push(`${label} tutarı sıfırdan büyük olmalıdır.`);
    if (line.direction === "debit") debitTotal += line.amount;
    else creditTotal += line.amount;
  }
  debitTotal = roundMoney(debitTotal);
  creditTotal = roundMoney(creditTotal);
  if (debitTotal !== creditTotal) errors.push("Borç ve alacak toplamları eşit olmalıdır.");
  return errors.length > 0 ? { ok: false, errors } : { ok: true, data: { debitTotal, creditTotal } };
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(`${value}T00:00:00.000Z`).getTime());
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
