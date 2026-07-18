import { describe, expect, test } from "vitest";

import type { CashBankMovementRow } from "./cash-bank-movement-service";
import { createSeededLedgerMemoryRepository } from "./ledger-service";
import { createManualCashBankLedgerPostingService } from "./manual-cash-bank-ledger-posting-service";
import { defaultTenantScope } from "./tenant-scope";

const movement: CashBankMovementRow = {
  id: "manual-movement-1",
  tenantId: defaultTenantScope.tenantId,
  companyId: defaultTenantScope.companyId,
  periodId: defaultTenantScope.periodId,
  accountCode: "KASA-0001",
  accountName: "MERKEZ KASA",
  movementDate: "2026-07-16",
  movementType: "Tahsilat",
  direction: "Giriş",
  documentNo: "MAN-0001",
  counterpartyName: "Test Cari",
  amount: 2500,
  currency: "TL",
  description: "Manuel tahsilat",
  sourceType: "manual",
  sourceId: "man-0001",
  sourceLabel: "MAN-0001",
  createdBy: defaultTenantScope.userId,
  updatedBy: defaultTenantScope.userId,
  createdAt: "2026-07-16T10:00:00.000Z",
  updatedAt: "2026-07-16T10:00:00.000Z",
};

describe("manual cash bank ledger posting service", () => {
  test("posts a balanced 100/649 manual collection journal", async () => {
    const service = createManualCashBankLedgerPostingService({
      repository: createSeededLedgerMemoryRepository(),
    });

    const result = await service.post({
      counterAccount: { code: "649", name: "Diğer Olağan Gelir ve Kârlar" },
      movement,
      scope: defaultTenantScope,
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        created: true,
        ledgerEntry: {
          documentNo: "YVM-THS-MAN-MAN-0001",
          debitTotal: 2500,
          creditTotal: 2500,
          sourceId: movement.id,
        },
      },
    });
    if (!result.ok) throw new Error(result.errors.join(", "));
    expect(result.data.ledgerEntry.lines).toEqual([
      expect.objectContaining({ accountCode: "100", direction: "debit" }),
      expect.objectContaining({ accountCode: "649", direction: "credit" }),
    ]);
  });

  test("posts a balanced 770/102 manual payment journal", async () => {
    const service = createManualCashBankLedgerPostingService({
      repository: createSeededLedgerMemoryRepository(),
    });
    const result = await service.post({
      counterAccount: { code: "770", name: "Genel Yönetim Giderleri" },
      movement: {
        ...movement,
        accountCode: "BANKA-0001",
        direction: "Çıkış",
        documentNo: "MAN-0002",
        movementType: "Ödeme",
      },
      scope: defaultTenantScope,
    });

    expect(result).toMatchObject({
      ok: true,
      data: { ledgerEntry: { documentNo: "YVM-ODM-MAN-MAN-0002" } },
    });
    if (!result.ok) throw new Error(result.errors.join(", "));
    expect(result.data.ledgerEntry.lines).toEqual([
      expect.objectContaining({ accountCode: "770", direction: "debit" }),
      expect.objectContaining({ accountCode: "102", direction: "credit" }),
    ]);
  });

  test("returns the existing source journal on retry", async () => {
    const repository = createSeededLedgerMemoryRepository();
    const service = createManualCashBankLedgerPostingService({ repository });
    const input = {
      counterAccount: { code: "120", name: "Alıcılar" },
      movement,
      scope: defaultTenantScope,
    };

    await service.post(input);
    const retry = await service.post(input);

    expect(retry).toMatchObject({
      ok: true,
      data: { created: false, ledgerEntry: { sourceId: movement.id } },
    });
  });
});
