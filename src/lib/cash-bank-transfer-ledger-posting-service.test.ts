import { describe, expect, test } from "vitest";

import type { CashBankMovementRow } from "./cash-bank-movement-service";
import { createCashBankTransferLedgerPostingService } from "./cash-bank-transfer-ledger-posting-service";
import { createSeededLedgerMemoryRepository } from "./ledger-service";
import { defaultTenantScope } from "./tenant-scope";

const transferMovements: CashBankMovementRow[] = [
  {
    id: "movement-transfer-out",
    tenantId: defaultTenantScope.tenantId,
    companyId: defaultTenantScope.companyId,
    periodId: defaultTenantScope.periodId,
    accountCode: "BANKA-0001",
    accountName: "MERKEZ BANKA",
    movementDate: "2026-07-15",
    movementType: "Virman",
    direction: "Çıkış",
    documentNo: "VRM-0001",
    counterpartyName: "MERKEZ KASA",
    amount: 25000,
    currency: "TL",
    description: "Banka -> kasa virmanı",
    sourceType: "transfer",
    sourceId: "VRM-0001-cikis",
    sourceLabel: "VRM-0001",
    createdBy: defaultTenantScope.userId,
    updatedBy: defaultTenantScope.userId,
    createdAt: "2026-07-15T10:00:00.000Z",
    updatedAt: "2026-07-15T10:00:00.000Z",
  },
  {
    id: "movement-transfer-in",
    tenantId: defaultTenantScope.tenantId,
    companyId: defaultTenantScope.companyId,
    periodId: defaultTenantScope.periodId,
    accountCode: "KASA-0001",
    accountName: "MERKEZ KASA",
    movementDate: "2026-07-15",
    movementType: "Virman",
    direction: "Giriş",
    documentNo: "VRM-0001",
    counterpartyName: "MERKEZ BANKA",
    amount: 25000,
    currency: "TL",
    description: "Banka -> kasa virmanı",
    sourceType: "transfer",
    sourceId: "VRM-0001-giris",
    sourceLabel: "VRM-0001",
    createdBy: defaultTenantScope.userId,
    updatedBy: defaultTenantScope.userId,
    createdAt: "2026-07-15T10:00:00.000Z",
    updatedAt: "2026-07-15T10:00:00.000Z",
  },
];

describe("cash bank transfer ledger posting service", () => {
  test("posts one balanced 100/102 transfer journal", async () => {
    const service = createCashBankTransferLedgerPostingService({ repository: createSeededLedgerMemoryRepository() });
    const result = await service.post({ movements: transferMovements, scope: defaultTenantScope });

    expect(result).toMatchObject({ ok: true, data: { created: true, ledgerEntry: { documentNo: "YVM-VRM-VRM-0001", sourceType: "cash-bank-transfer", sourceId: "VRM-0001", debitTotal: 25000, creditTotal: 25000 } } });
    if (!result.ok) throw new Error(result.errors.join(", "));
    expect(result.data.ledgerEntry.lines).toEqual([
      expect.objectContaining({ accountCode: "100", direction: "debit", amount: 25000 }),
      expect.objectContaining({ accountCode: "102", direction: "credit", amount: 25000 }),
    ]);
  });

  test("returns existing transfer journal idempotently", async () => {
    const repository = createSeededLedgerMemoryRepository();
    const service = createCashBankTransferLedgerPostingService({ repository });
    await service.post({ movements: transferMovements, scope: defaultTenantScope });
    const retry = await service.post({ movements: transferMovements, scope: defaultTenantScope });

    expect(retry).toMatchObject({ ok: true, data: { created: false, ledgerEntry: { sourceId: "VRM-0001" } } });
  });
});
