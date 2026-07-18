import type { LedgerJournalRow, LedgerRepository } from "./ledger-service";
import type { TenantScope } from "./tenant-scope";

type LedgerEntryRecord = {
  id: string; tenantId: string; companyId: string; periodId: string; sourceType: string | null; sourceId: string | null; entryDate: Date | string; documentNo: string; description: string; currency: string; status: string; debitTotal: { toString(): string } | number; creditTotal: { toString(): string } | number; createdBy: string; updatedBy: string; createdAt: Date | string; updatedAt: Date | string;
  lines: Array<{ accountCode: string; accountName: string; debit: { toString(): string } | number; credit: { toString(): string } | number; description: string | null; lineNo: number }>;
};

export type LedgerPrismaClientLike = {
  ledgerEntry: {
    create(input: { data: unknown; include: { lines: true } }): Promise<LedgerEntryRecord>;
    findFirst(input: { where: Record<string, string>; include: { lines: true } }): Promise<LedgerEntryRecord | null>;
    findMany(input: { where: Record<string, string>; include: { lines: true }; orderBy: Array<{ entryDate: "asc" | "desc" } | { createdAt: "asc" | "desc" }> }): Promise<LedgerEntryRecord[]>;
  };
};

export function createLedgerPrismaRepository(prisma: LedgerPrismaClientLike): LedgerRepository {
  return {
    async create(entry) {
      return toRow(await prisma.ledgerEntry.create({
        data: {
          ...scopeData(entry), id: entry.id, sourceType: entry.sourceType ?? null, sourceId: entry.sourceId ?? null, entryDate: new Date(`${entry.entryDate}T00:00:00.000Z`), documentNo: entry.documentNo, description: entry.description, currency: entry.currency, status: entry.status, debitTotal: entry.debitTotal, creditTotal: entry.creditTotal, createdBy: entry.createdBy, updatedBy: entry.updatedBy,
          lines: { create: entry.lines.map((line, index) => ({ ...scopeData(entry), id: `${entry.id}::line-${index + 1}`, lineNo: index + 1, accountCode: line.accountCode, accountName: line.accountName, debit: line.direction === "debit" ? line.amount : 0, credit: line.direction === "credit" ? line.amount : 0, description: line.description || null })) },
        }, include: { lines: true },
      }));
    },
    async findByDocumentNo({ documentNo, scope }) {
      const row = await prisma.ledgerEntry.findFirst({ where: { ...scopeWhere(scope), documentNo }, include: { lines: true } });
      return row ? toRow(row) : undefined;
    },
    async list({ scope }) {
      const rows = await prisma.ledgerEntry.findMany({ where: scopeWhere(scope), include: { lines: true }, orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }] });
      return rows.map(toRow);
    },
  };
}

function scopeWhere(scope: TenantScope) { return { tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId }; }
function scopeData(entry: LedgerJournalRow) { return { tenantId: entry.tenantId, companyId: entry.companyId, periodId: entry.periodId }; }
function toNumber(value: { toString(): string } | number) { return typeof value === "number" ? value : Number(value.toString()); }
function toIsoDate(value: Date | string) { return new Date(value).toISOString().slice(0, 10); }
function toIso(value: Date | string) { return new Date(value).toISOString(); }
function toRow(row: LedgerEntryRecord): LedgerJournalRow {
  return { id: row.id, tenantId: row.tenantId, companyId: row.companyId, periodId: row.periodId, ...(row.sourceType && row.sourceId ? { sourceType: row.sourceType, sourceId: row.sourceId } : {}), entryDate: toIsoDate(row.entryDate), documentNo: row.documentNo, description: row.description, currency: row.currency as LedgerJournalRow["currency"], status: "posted", debitTotal: toNumber(row.debitTotal), creditTotal: toNumber(row.creditTotal), createdBy: row.createdBy, updatedBy: row.updatedBy, createdAt: toIso(row.createdAt), updatedAt: toIso(row.updatedAt), lines: [...row.lines].sort((a,b) => a.lineNo-b.lineNo).map((line) => ({ accountCode: line.accountCode, accountName: line.accountName, amount: toNumber(line.debit) || toNumber(line.credit), direction: toNumber(line.debit) > 0 ? "debit" : "credit", description: line.description ?? undefined })) };
}
