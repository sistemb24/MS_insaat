import { describe, expect, test } from "vitest";

import { defaultTenantScope, type TenantScope } from "./tenant-scope";
import { createExpenseLedgerPostingService } from "./expense-ledger-posting-service";
import type { LedgerJournalRow } from "./ledger-service";
import type { ExpenseRow } from "./expense-service";

const expense: ExpenseRow = {
  id: "expense-1", tenantId: defaultTenantScope.tenantId, companyId: defaultTenantScope.companyId, periodId: defaultTenantScope.periodId,
  documentNo: "GDR-0001", expenseDate: "2026-07-15", siteCode: "SANT-001", siteName: "Örnek Şantiye", movementGroup: "Nakliye",
  accountCode: "KASA-0001", accountName: "MERKEZ KASA", counterpartyName: "ABC Beton", amount: 10000, vatRate: 20, vatTotal: 2000, grandTotal: 12000, currency: "TL", status: "Kaydedildi", description: "", createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: "2026-07-15T10:00:00.000Z", updatedAt: "2026-07-15T10:00:00.000Z",
};

describe("expense ledger posting", () => {
  test("creates a balanced expense and cash journal", async () => {
    const rows: LedgerJournalRow[] = [];
    const result = await createExpenseLedgerPostingService({
      now: () => "2026-07-15T12:00:00.000Z",
      repository: createLedgerRepository(rows),
    }).post({ expense, scope: defaultTenantScope });

    expect(result).toMatchObject({ ok: true, data: { created: true, expense: { ledgerDocumentNo: "YVM-GDR-GDR-0001" } } });
    if (!result.ok) return;
    expect(result.data.ledgerEntry.lines).toEqual([
      expect.objectContaining({ accountCode: "770", direction: "debit", amount: 10000 }),
      expect.objectContaining({ accountCode: "191", direction: "debit", amount: 2000 }),
      expect.objectContaining({ accountCode: "100", direction: "credit", amount: 12000 }),
    ]);
  });

  test("is idempotent and maps bank accounts to 102", async () => {
    const rows: LedgerJournalRow[] = [];
    const repository = createLedgerRepository(rows);
    const service = createExpenseLedgerPostingService({ repository, now: () => "2026-07-15T12:00:00.000Z" });
    const first = await service.post({ expense: { ...expense, accountCode: "BANKA-0001", accountName: "MERKEZ BANKA" }, scope: defaultTenantScope });
    const second = await service.post({ expense: { ...expense, accountCode: "BANKA-0001", accountName: "MERKEZ BANKA" }, scope: defaultTenantScope });
    expect(first).toMatchObject({ ok: true, data: { created: true } });
    expect(second).toMatchObject({ ok: true, data: { created: false, ledgerEntry: { documentNo: "YVM-GDR-GDR-0001" } } });
    if (first.ok) expect(first.data.ledgerEntry.lines.at(-1)).toMatchObject({ accountCode: "102", direction: "credit" });
  });

  test("rejects viewer, closed periods and inconsistent totals", async () => {
    const service = createExpenseLedgerPostingService({ repository: createLedgerRepository([]) });
    await expect(service.post({ expense, scope: { ...defaultTenantScope, userRole: "viewer" } })).resolves.toMatchObject({ ok: false, reasonCode: "permission-denied" });
    await expect(service.post({ expense, scope: { ...defaultTenantScope, periodClosed: true } })).resolves.toMatchObject({ ok: false, reasonCode: "period-closed" });
    await expect(service.post({ expense: { ...expense, grandTotal: 11000 }, scope: defaultTenantScope })).resolves.toMatchObject({ ok: false, reasonCode: "invalid-total" });
  });
});

function createLedgerRepository(rows: LedgerJournalRow[]) {
  return {
    async create(row: LedgerJournalRow) { rows.push(row); return row; },
    async findByDocumentNo({ documentNo, scope }: { documentNo: string; scope: TenantScope }) { return rows.find((row) => row.documentNo === documentNo && row.tenantId === scope.tenantId); },
    async list({ scope }: { scope: TenantScope }) { return rows.filter((row) => row.tenantId === scope.tenantId && row.companyId === scope.companyId && row.periodId === scope.periodId); },
  };
}
