import { describe, expect, test } from "vitest";

import type { CashBankMovementRow } from "./cash-bank-movement-service";
import { createInvoiceCashBankLedgerPostingService } from "./invoice-cash-bank-ledger-posting-service";
import { createSeededLedgerMemoryRepository } from "./ledger-service";
import { defaultTenantScope } from "./tenant-scope";

const salesMovement: CashBankMovementRow = {
  id: "movement-sales-1", tenantId: defaultTenantScope.tenantId, companyId: defaultTenantScope.companyId, periodId: defaultTenantScope.periodId,
  accountCode: "KASA-0001", accountName: "MERKEZ KASA", movementDate: "2026-07-15", movementType: "Tahsilat", direction: "Giriş",
  documentNo: "THS-SF-001", counterpartyName: "MÜŞTERİ", amount: 5000, currency: "TL", description: "SF-001 satış faturası tahsilatı",
  sourceType: "sales-invoice", sourceId: "sales-invoice-1", sourceLabel: "SF-001", createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId,
  createdAt: "2026-07-15T10:00:00.000Z", updatedAt: "2026-07-15T10:00:00.000Z",
};

describe("invoice cash bank ledger posting service", () => {
  test("posts a source-linked 102/120 sales collection journal", async () => {
    const service = createInvoiceCashBankLedgerPostingService({
      now: () => "2026-07-15T10:01:00.000Z",
      repository: createSeededLedgerMemoryRepository(),
    });
    const result = await service.post({ movement: salesMovement, scope: defaultTenantScope });
    expect(result).toMatchObject({
      ok: true,
      data: { created: true, ledgerEntry: { documentNo: "YVM-THS-THS-SF-001", sourceType: "cash-bank-movement", sourceId: salesMovement.id, debitTotal: 5000, creditTotal: 5000 } },
    });
    if (!result.ok) throw new Error(result.errors.join(", "));
    expect(result.data.ledgerEntry.lines).toEqual([
      expect.objectContaining({ accountCode: "100", direction: "debit", amount: 5000 }),
      expect.objectContaining({ accountCode: "120", direction: "credit", amount: 5000 }),
    ]);
  });

  test("returns the existing source journal idempotently", async () => {
    const repository = createSeededLedgerMemoryRepository();
    const service = createInvoiceCashBankLedgerPostingService({ repository });
    await service.post({ movement: salesMovement, scope: defaultTenantScope });
    const retry = await service.post({ movement: salesMovement, scope: defaultTenantScope });
    expect(retry).toMatchObject({ ok: true, data: { created: false, ledgerEntry: { sourceId: salesMovement.id } } });
  });

  test("posts a 320/102 supplier payment journal for bank movements", async () => {
    const service = createInvoiceCashBankLedgerPostingService({ repository: createSeededLedgerMemoryRepository() });
    const result = await service.post({
      movement: {
        ...salesMovement,
        id: "movement-purchase-1",
        accountCode: "BANKA-0001",
        accountName: "MERKEZ BANKA",
        movementType: "Fatura Ödemesi",
        direction: "Çıkış",
        documentNo: "ODM-AF-001",
        sourceType: "purchase-invoice",
        sourceId: "purchase-invoice-1",
      },
      scope: defaultTenantScope,
    });
    expect(result).toMatchObject({ ok: true, data: { ledgerEntry: { documentNo: "YVM-ODM-ODM-AF-001" } } });
    if (!result.ok) throw new Error(result.errors.join(", "));
    expect(result.data.ledgerEntry.lines).toEqual([
      expect.objectContaining({ accountCode: "320", direction: "debit" }),
      expect.objectContaining({ accountCode: "102", direction: "credit" }),
    ]);
  });

  test("posts a 335/100 payroll payment journal", async () => {
    const service = createInvoiceCashBankLedgerPostingService({ repository: createSeededLedgerMemoryRepository() });
    const result = await service.post({
      movement: {
        ...salesMovement,
        id: "movement-payroll-1",
        movementType: "Maaş Ödemesi",
        direction: "Çıkış",
        documentNo: "ODM-MAAS-PNT-001",
        sourceType: "payroll-accrual",
        sourceId: "payroll-accrual-1",
      },
      scope: defaultTenantScope,
    });
    expect(result).toMatchObject({ ok: true, data: { ledgerEntry: { documentNo: "YVM-ODM-ODM-MAAS-PNT-001" } } });
    if (!result.ok) throw new Error(result.errors.join(", "));
    expect(result.data.ledgerEntry.lines).toEqual([
      expect.objectContaining({ accountCode: "335", direction: "debit", amount: 5000 }),
      expect.objectContaining({ accountCode: "100", direction: "credit", amount: 5000 }),
    ]);
  });

  test("posts a 320/100 progress payment journal", async () => {
    const service = createInvoiceCashBankLedgerPostingService({ repository: createSeededLedgerMemoryRepository() });
    const result = await service.post({
      movement: {
        ...salesMovement,
        id: "movement-progress-payment-1",
        movementType: "Hakediş Ödemesi",
        direction: "Çıkış",
        documentNo: "ODM-HAK-001",
        sourceType: "progress-payment",
        sourceId: "progress-payment-1",
      },
      scope: defaultTenantScope,
    });
    expect(result).toMatchObject({ ok: true, data: { ledgerEntry: { documentNo: "YVM-ODM-ODM-HAK-001" } } });
    if (!result.ok) throw new Error(result.errors.join(", "));
    expect(result.data.ledgerEntry.lines).toEqual([
      expect.objectContaining({ accountCode: "320", direction: "debit", amount: 5000 }),
      expect.objectContaining({ accountCode: "100", direction: "credit", amount: 5000 }),
    ]);
  });

  test("posts a 100/120 progress collection journal", async () => {
    const service = createInvoiceCashBankLedgerPostingService({ repository: createSeededLedgerMemoryRepository() });
    const result = await service.post({
      movement: {
        ...salesMovement,
        id: "movement-progress-collection-1",
        movementType: "Hakediş Tahsilatı",
        direction: "Giriş",
        documentNo: "THS-HAK-001",
        sourceType: "progress-payment",
        sourceId: "progress-payment-1",
      },
      scope: defaultTenantScope,
    });
    expect(result).toMatchObject({ ok: true, data: { ledgerEntry: { documentNo: "YVM-THS-THS-HAK-001" } } });
    if (!result.ok) throw new Error(result.errors.join(", "));
    expect(result.data.ledgerEntry.lines).toEqual([
      expect.objectContaining({ accountCode: "100", direction: "debit", amount: 5000 }),
      expect.objectContaining({ accountCode: "120", direction: "credit", amount: 5000 }),
    ]);
  });

  test("posts a 100/101 cheque collection journal", async () => {
    const service = createInvoiceCashBankLedgerPostingService({ repository: createSeededLedgerMemoryRepository() });
    const result = await service.post({
      movement: {
        ...salesMovement,
        id: "movement-cheque-1",
        movementType: "Çek Tahsilatı",
        documentNo: "CEK-0001",
        sourceType: "cheque",
        sourceId: "cheque-1",
      },
      scope: defaultTenantScope,
    });
    expect(result).toMatchObject({ ok: true, data: { ledgerEntry: { documentNo: "YVM-THS-CEK-0001" } } });
    if (!result.ok) throw new Error(result.errors.join(", "));
    expect(result.data.ledgerEntry.lines).toEqual([
      expect.objectContaining({ accountCode: "100", direction: "debit", amount: 5000 }),
      expect.objectContaining({ accountCode: "101", direction: "credit", amount: 5000 }),
    ]);
  });

  test("posts a 100/120 customer counterparty collection journal", async () => {
    const service = createInvoiceCashBankLedgerPostingService({ repository: createSeededLedgerMemoryRepository() });
    const result = await service.post({
      movement: {
        ...salesMovement,
        id: "movement-counterparty-customer-1",
        documentNo: "CAR-THS-001",
        sourceType: "counterparty-musteriler",
        sourceId: "musteriler-MUS-0001-CAR-THS-001",
      },
      scope: defaultTenantScope,
    });
    expect(result).toMatchObject({ ok: true, data: { ledgerEntry: { documentNo: "YVM-THS-CARI-CAR-THS-001" } } });
    if (!result.ok) throw new Error(result.errors.join(", "));
    expect(result.data.ledgerEntry.lines).toEqual([
      expect.objectContaining({ accountCode: "100", direction: "debit", amount: 5000 }),
      expect.objectContaining({ accountCode: "120", direction: "credit", amount: 5000 }),
    ]);
  });

  test("posts a 320/102 supplier counterparty payment journal", async () => {
    const service = createInvoiceCashBankLedgerPostingService({ repository: createSeededLedgerMemoryRepository() });
    const result = await service.post({
      movement: {
        ...salesMovement,
        id: "movement-counterparty-supplier-1",
        accountCode: "BANKA-0001",
        accountName: "MERKEZ BANKA",
        movementType: "Ödeme",
        direction: "Çıkış",
        documentNo: "CAR-ODM-001",
        sourceType: "counterparty-tedarikciler",
        sourceId: "tedarikciler-TED-0001-CAR-ODM-001",
      },
      scope: defaultTenantScope,
    });
    expect(result).toMatchObject({ ok: true, data: { ledgerEntry: { documentNo: "YVM-ODM-CARI-CAR-ODM-001" } } });
    if (!result.ok) throw new Error(result.errors.join(", "));
    expect(result.data.ledgerEntry.lines).toEqual([
      expect.objectContaining({ accountCode: "320", direction: "debit", amount: 5000 }),
      expect.objectContaining({ accountCode: "102", direction: "credit", amount: 5000 }),
    ]);
  });
});
