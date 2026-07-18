import { describe, expect, test } from "vitest";

import { buildLedgerTrialBalance, createLedgerService, createSeededLedgerMemoryRepository, validateLedgerJournalDraft } from "./ledger-service";
import { defaultTenantScope } from "./tenant-scope";

const balancedDraft = {
  currency: "TL" as const,
  documentNo: "YVM-2026-001",
  entryDate: "2026-07-14",
  description: "Manuel yevmiye fişi",
  lines: [
    { accountCode: "100", accountName: "Kasa", amount: 1000, direction: "debit" as const },
    { accountCode: "320", accountName: "Satıcılar", amount: 1000, direction: "credit" as const },
  ],
};

describe("ledger service", () => {
  test("accepts balanced accounting journals for accounting users", () => {
    expect(validateLedgerJournalDraft(defaultTenantScope, balancedDraft)).toEqual({ ok: true, data: { debitTotal: 1000, creditTotal: 1000 } });
  });

  test("builds account trial balance from posted journal lines", () => {
    const row = { ...balancedDraft, id: "1", tenantId: "t", companyId: "c", periodId: "p", status: "posted" as const, debitTotal: 1000, creditTotal: 1000, createdBy: "u", updatedBy: "u", createdAt: "2026-07-14", updatedAt: "2026-07-14" };
    expect(buildLedgerTrialBalance([row])).toEqual([
      { currency: "TL", accountCode: "100", accountName: "Kasa", debitTotal: 1000, creditTotal: 0, balance: 1000 },
      { currency: "TL", accountCode: "320", accountName: "Satıcılar", debitTotal: 0, creditTotal: 1000, balance: -1000 },
    ]);
  });

  test("rejects unbalanced journals and viewers", () => {
    expect(validateLedgerJournalDraft(defaultTenantScope, { ...balancedDraft, lines: [...balancedDraft.lines.slice(0, 1), { ...balancedDraft.lines[1]!, amount: 900 }] })).toEqual({ ok: false, errors: ["Borç ve alacak toplamları eşit olmalıdır."] });
    expect(validateLedgerJournalDraft({ ...defaultTenantScope, userRole: "viewer" }, balancedDraft)).toEqual({ ok: false, errors: ["Muhasebe fişi oluşturma yetkisi yok."] });
  });

  test("rejects posting into a closed period before persistence", async () => {
    const repository = createSeededLedgerMemoryRepository();
    const service = createLedgerService({ repository });
    await expect(service.post({ draft: balancedDraft, scope: { ...defaultTenantScope, periodClosed: true } })).resolves.toEqual({
      ok: false,
      errors: ["Kapalı dönemde yeni muhasebe fişi post edilemez."],
    });
    await expect(repository.list({ scope: defaultTenantScope })).resolves.toEqual([]);
  });

  test("persists balanced journals once per scoped document number", async () => {
    const auditEntries: Array<Record<string, unknown>> = [];
    const service = createLedgerService({
      now: () => "2026-07-14T10:00:00.000Z",
      repository: createSeededLedgerMemoryRepository(),
      auditLogRepository: {
        async record(entry) { auditEntries.push(entry); },
      },
    });
    await expect(service.post({ draft: balancedDraft, scope: defaultTenantScope })).resolves.toMatchObject({
      ok: true,
      data: { documentNo: "YVM-2026-001", status: "posted", debitTotal: 1000, creditTotal: 1000 },
    });
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]).toMatchObject({
      action: "ledger.entry.post",
      entityType: "ledger-entry",
      entityLabel: "YVM-2026-001",
      metadata: { debitTotal: 1000, creditTotal: 1000, lineCount: 2, status: "posted" },
    });
    await expect(service.post({ draft: balancedDraft, scope: defaultTenantScope })).resolves.toEqual({
      ok: false,
      errors: ["Fiş numarası bu dönem için zaten kullanılıyor: YVM-2026-001"],
    });
  });
});
