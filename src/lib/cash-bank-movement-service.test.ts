import { describe, expect, test } from "vitest";

import {
  createChequeCollectionMovement,
  createCashBankMovementService,
  summarizeCashBankAccounts,
  type CashBankMovementRepository,
  type CashBankMovementRow,
  type CashBankTransferValues,
} from "./cash-bank-movement-service";
import type { PayrollAccrualRow } from "./payroll-accrual-service";
import type { ProgressPaymentRow } from "./progress-payment-service";
import type { PurchaseInvoiceRow } from "./purchase-invoice-service";
import { defaultTenantScope } from "./tenant-scope";

const baseMovement: CashBankMovementRow = {
  id: "movement-1",
  tenantId: "tenant-noa-demo",
  companyId: "company-demo-insaat",
  periodId: "period-2026",
  accountCode: "KASA-0001",
  accountName: "MERKEZ KASA",
  movementDate: "2026-06-27",
  movementType: "Çek Tahsilatı",
  direction: "Giriş",
  documentNo: "CEK-0001",
  counterpartyName: "ABC Beton A.Ş.",
  amount: 125000,
  currency: "TL",
  description: "CEK-0001 / CK-0001 çek tahsilatı",
  sourceType: "cheque",
  sourceId: "cheque-1",
  sourceLabel: "CEK-0001 / CK-0001",
  createdBy: "user-main",
  updatedBy: "user-main",
  createdAt: "2026-06-27T09:00:00.000Z",
  updatedAt: "2026-06-27T09:00:00.000Z",
};

describe("summarizeCashBankAccounts", () => {
  test("calculates current account balances from opening balance and movements", () => {
    const summary = summarizeCashBankAccounts({
      accounts: [
        {
          code: "KASA-0001",
          currency: "TL",
          name: "MERKEZ KASA",
          openingBalance: "1.000,00 TL",
          type: "Kasa",
        },
        {
          code: "BANKA-0002",
          currency: "TL",
          name: "MERKEZ BANKA",
          openingBalance: "0,00 TL",
          type: "Banka",
        },
      ],
      movements: [
        baseMovement,
        {
          ...baseMovement,
          id: "movement-2",
          amount: 500,
          direction: "Çıkış",
          movementType: "Ödeme",
        },
        {
          ...baseMovement,
          id: "movement-3",
          accountCode: "BANKA-0002",
          accountName: "MERKEZ BANKA",
          amount: 2500,
        },
      ],
    });

    expect(summary).toEqual([
      {
        accountCode: "KASA-0001",
        accountName: "MERKEZ KASA",
        currency: "TL",
        currentBalance: 125500,
        incomingTotal: 125000,
        openingBalance: 1000,
        outgoingTotal: 500,
        type: "Kasa",
      },
      {
        accountCode: "BANKA-0002",
        accountName: "MERKEZ BANKA",
        currency: "TL",
        currentBalance: 2500,
        incomingTotal: 2500,
        openingBalance: 0,
        outgoingTotal: 0,
        type: "Banka",
      },
    ]);
  });
});

describe("createCashBankMovementService", () => {
  test("creates manual collection movement for accounting users", async () => {
    const rows: CashBankMovementRow[] = [];
    const service = createCashBankMovementService({
      now: () => "2026-06-27T10:30:00.000Z",
      repository: createMemoryRepository(rows),
    });

    const result = await service.createManual({
      scope: defaultTenantScope,
      values: {
        accountCode: "KASA-0001",
        accountName: "MERKEZ KASA",
        amount: 1500,
        counterpartyName: "ABC Beton A.Ş.",
        currency: "TL",
        description: "Nakit tahsilat",
        documentNo: "THS-0001",
        movementDate: "2026-06-27",
        movementType: "Tahsilat",
      },
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        accountCode: "KASA-0001",
        accountName: "MERKEZ KASA",
        amount: 1500,
        direction: "Giriş",
        documentNo: "THS-0001",
        movementType: "Tahsilat",
        sourceType: "manual",
      }),
    });
    expect(rows).toHaveLength(1);
  });

  test("normalizes manual movement currency to the P0 base transaction currency", async () => {
    const rows: CashBankMovementRow[] = [];
    const service = createCashBankMovementService({
      now: () => "2026-06-27T10:30:00.000Z",
      repository: createMemoryRepository(rows),
    });

    const result = await service.createManual({
      scope: defaultTenantScope,
      values: {
        accountCode: "KASA-0001",
        accountName: "MERKEZ KASA",
        amount: 1500,
        counterpartyName: "ABC Beton A.Ş.",
        currency: "USD",
        description: "Döviz seçimi P0 için TL yazılmalı",
        documentNo: "THS-P0-001",
        movementDate: "2026-06-27",
        movementType: "Tahsilat",
      },
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        currency: "TL",
        documentNo: "THS-P0-001",
      }),
    });
  });

  test("preserves counterparty source metadata and returns the same movement on retry", async () => {
    const rows: CashBankMovementRow[] = [];
    const service = createCashBankMovementService({
      now: () => "2026-06-27T10:30:00.000Z",
      repository: createMemoryRepository(rows),
    });
    const values = {
      accountCode: "KASA-0001",
      accountName: "MERKEZ KASA",
      amount: 1500,
      counterpartyName: "ABC Beton A.Ş.",
      currency: "TL" as const,
      documentNo: "CAR-THS-0001",
      movementDate: "2026-06-27",
      movementType: "Tahsilat" as const,
      sourceId: "musteriler-MUS-0001-CAR-THS-0001",
      sourceLabel: "musteriler:MUS-0001",
      sourceType: "counterparty-musteriler",
    };

    const result = await service.createManual({ scope: defaultTenantScope, values });
    const retry = await service.createManual({ scope: defaultTenantScope, values });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        sourceId: "musteriler-mus-0001-car-ths-0001",
        sourceLabel: "musteriler:MUS-0001",
        sourceType: "counterparty-musteriler",
      }),
    });
    expect(retry).toEqual({ ok: true, data: expect.objectContaining({ id: result.ok ? result.data.id : "" }) });
    expect(rows).toHaveLength(1);
  });

  test("rejects manual movement creation for read only users", async () => {
    const service = createCashBankMovementService({
      now: () => "2026-06-27T10:30:00.000Z",
      repository: createMemoryRepository([]),
    });

    await expect(
      service.createManual({
        scope: {
          ...defaultTenantScope,
          userRole: "viewer",
        },
        values: {
          accountCode: "KASA-0001",
          accountName: "MERKEZ KASA",
          amount: 1500,
          counterpartyName: "ABC Beton A.Ş.",
          currency: "TL",
          documentNo: "THS-0001",
          movementDate: "2026-06-27",
          movementType: "Tahsilat",
        },
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Kasa/banka hareketi için muhasebe yetkisi gereklidir."],
    });
  });

  test("creates paired transfer movements between cash bank accounts", async () => {
    const rows: CashBankMovementRow[] = [];
    const service = createCashBankMovementService({
      now: () => "2026-06-27T11:00:00.000Z",
      repository: createMemoryRepository(rows),
    });

    const values: CashBankTransferValues = {
      amount: 750,
      currency: "TL",
      description: "Kasa banka virmanı",
      documentNo: "VRM-0001",
      fromAccountCode: "KASA-0001",
      fromAccountName: "MERKEZ KASA",
      movementDate: "2026-06-27",
      toAccountCode: "BANKA-0002",
      toAccountName: "MERKEZ BANKA",
    };

    const result = await service.createTransfer({
      scope: defaultTenantScope,
      values,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        rows: [
          expect.objectContaining({
            accountCode: "KASA-0001",
            accountName: "MERKEZ KASA",
            amount: 750,
            counterpartyName: "MERKEZ BANKA",
            direction: "Çıkış",
            documentNo: "VRM-0001",
            movementType: "Virman",
            sourceId: "vrm-0001-cikis",
            sourceType: "transfer",
          }),
          expect.objectContaining({
            accountCode: "BANKA-0002",
            accountName: "MERKEZ BANKA",
            amount: 750,
            counterpartyName: "MERKEZ KASA",
            direction: "Giriş",
            documentNo: "VRM-0001",
            movementType: "Virman",
            sourceId: "vrm-0001-giris",
            sourceType: "transfer",
          }),
        ],
      },
    });
    expect(rows).toHaveLength(2);
  });

  test("returns the existing transfer pair idempotently on retry", async () => {
    const rows: CashBankMovementRow[] = [];
    const service = createCashBankMovementService({
      now: () => "2026-06-27T11:00:00.000Z",
      repository: createMemoryRepository(rows),
    });
    const values: CashBankTransferValues = {
      amount: 750,
      currency: "TL",
      description: "Kasa banka virmanı",
      documentNo: "VRM-RETRY-0001",
      fromAccountCode: "KASA-0001",
      fromAccountName: "MERKEZ KASA",
      movementDate: "2026-06-27",
      toAccountCode: "BANKA-0002",
      toAccountName: "MERKEZ BANKA",
    };

    await service.createTransfer({ scope: defaultTenantScope, values });
    const retry = await service.createTransfer({ scope: defaultTenantScope, values });

    expect(retry).toEqual({
      ok: true,
      data: {
        rows: [
          expect.objectContaining({ direction: "Çıkış", documentNo: "VRM-RETRY-0001" }),
          expect.objectContaining({ direction: "Giriş", documentNo: "VRM-RETRY-0001" }),
        ],
      },
    });
    expect(rows).toHaveLength(2);
  });

  test("normalizes transfer currency to the P0 base transaction currency", async () => {
    const rows: CashBankMovementRow[] = [];
    const service = createCashBankMovementService({
      now: () => "2026-06-27T11:00:00.000Z",
      repository: createMemoryRepository(rows),
    });

    const result = await service.createTransfer({
      scope: defaultTenantScope,
      values: {
        amount: 750,
        currency: "EUR",
        description: "Virman para birimi P0 için TL yazılmalı",
        documentNo: "VRM-P0-001",
        fromAccountCode: "KASA-0001",
        fromAccountName: "MERKEZ KASA",
        movementDate: "2026-06-27",
        toAccountCode: "BANKA-0002",
        toAccountName: "MERKEZ BANKA",
      },
    });

    expect(result).toEqual({
      ok: true,
      data: {
        rows: [
          expect.objectContaining({
            currency: "TL",
            documentNo: "VRM-P0-001",
            direction: "Çıkış",
          }),
          expect.objectContaining({
            currency: "TL",
            documentNo: "VRM-P0-001",
            direction: "Giriş",
          }),
        ],
      },
    });
  });

  test("creates payroll accrual payment movement once", async () => {
    const rows: CashBankMovementRow[] = [];
    const service = createCashBankMovementService({
      now: () => "2026-06-30T12:00:00.000Z",
      repository: createMemoryRepository(rows),
    });
    const payrollAccrual = createPayrollAccrual();

    const result = await service.createPayrollAccrualPayment({
      account: {
        code: "KASA-0001",
        name: "MERKEZ KASA",
      },
      movementDate: "2026-06-30",
      payrollAccrual,
      scope: defaultTenantScope,
    });
    const duplicate = await service.createPayrollAccrualPayment({
      payrollAccrual,
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        accountCode: "KASA-0001",
        accountName: "MERKEZ KASA",
        amount: 31500,
        counterpartyName: "ŞİRKETİN TAŞERONU",
        direction: "Çıkış",
        documentNo: "ODM-MAAS-PNT-2026-06-001",
        movementDate: "2026-06-30",
        movementType: "Maaş Ödemesi",
        sourceId: "payroll-accrual-1",
        sourceLabel: "MAAS-PNT-2026-06-001",
        sourceType: "payroll-accrual",
      }),
    });
    expect(duplicate).toEqual({ ok: true, data: expect.objectContaining({ id: rows[0]?.id, documentNo: "ODM-MAAS-PNT-2026-06-001" }) });
    expect(rows).toHaveLength(1);
  });

  test("rejects payroll accrual payment for non-posted accruals", async () => {
    const service = createCashBankMovementService({
      now: () => "2026-06-30T12:00:00.000Z",
      repository: createMemoryRepository([]),
    });

    const result = await service.createPayrollAccrualPayment({
      payrollAccrual: createPayrollAccrual({ status: "Taslak" }),
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Yalnız kesinleşmiş maaş tahakkuku ödenebilir."],
    });
  });

  test("creates purchase invoice payment movement once", async () => {
    const rows: CashBankMovementRow[] = [];
    const service = createCashBankMovementService({
      now: () => "2026-06-30T12:00:00.000Z",
      repository: createMemoryRepository(rows),
    });
    const purchaseInvoice = createPurchaseInvoice();

    const result = await service.createPurchaseInvoicePayment({
      account: {
        code: "BANKA-0001",
        name: "MERKEZ BANKA",
      },
      movementDate: "2026-06-30",
      purchaseInvoice,
      scope: defaultTenantScope,
    });
    const duplicate = await service.createPurchaseInvoicePayment({
      purchaseInvoice,
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        accountCode: "BANKA-0001",
        accountName: "MERKEZ BANKA",
        amount: 16200,
        counterpartyName: "ÖRNEK TEDARİKÇİ",
        direction: "Çıkış",
        documentNo: "ODM-FAT-0006",
        movementDate: "2026-06-30",
        movementType: "Fatura Ödemesi",
        sourceId: "invoice-1",
        sourceLabel: "FAT-0006",
        sourceType: "purchase-invoice",
      }),
    });
    expect(duplicate.ok).toBe(false);
    expect(duplicate.ok ? [] : duplicate.errors).toContain(
      "Bu alış faturası tamamen ödendi: FAT-0006",
    );
    expect(rows).toHaveLength(1);
  });

  test("normalizes purchase invoice payment movement currency to the P0 base transaction currency", async () => {
    const rows: CashBankMovementRow[] = [];
    const service = createCashBankMovementService({
      now: () => "2026-06-30T12:00:00.000Z",
      repository: createMemoryRepository(rows),
    });

    const result = await service.createPurchaseInvoicePayment({
      purchaseInvoice: createPurchaseInvoice({
        currency: "USD",
        documentNo: "FAT-P0-USD",
        id: "invoice-usd-1",
      }),
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        currency: "TL",
        documentNo: "ODM-FAT-P0-USD",
      }),
    });
  });

  test("creates partial purchase invoice payments and rejects over-payment", async () => {
    const rows: CashBankMovementRow[] = [];
    const service = createCashBankMovementService({
      now: () => "2026-06-30T12:00:00.000Z",
      repository: createMemoryRepository(rows),
    });
    const purchaseInvoice = createPurchaseInvoice();
    const first = await service.createPurchaseInvoicePayment({ amount: 5000, purchaseInvoice, scope: defaultTenantScope });
    const second = await service.createPurchaseInvoicePayment({ amount: 11200, purchaseInvoice, scope: defaultTenantScope });
    const over = await service.createPurchaseInvoicePayment({ amount: 1, purchaseInvoice, scope: defaultTenantScope });
    expect(first).toEqual({ ok: true, data: expect.objectContaining({ amount: 5000, documentNo: "ODM-FAT-0006" }) });
    expect(second).toEqual({ ok: true, data: expect.objectContaining({ amount: 11200, documentNo: "ODM-FAT-0006-2" }) });
    expect(over.ok ? [] : over.errors).toContain("Bu alış faturası tamamen ödendi: FAT-0006");
    expect(rows).toHaveLength(2);
  });

  test("rejects purchase invoice payment for non-posted invoices", async () => {
    const service = createCashBankMovementService({
      now: () => "2026-06-30T12:00:00.000Z",
      repository: createMemoryRepository([]),
    });

    const result = await service.createPurchaseInvoicePayment({
      purchaseInvoice: createPurchaseInvoice({ status: "Taslak" }),
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Yalnız kesinleşmiş alış faturası ödenebilir."],
    });
  });

  test("creates partial sales invoice collections and rejects over-collection", async () => {
    const rows: CashBankMovementRow[] = [];
    const service = createCashBankMovementService({
      now: () => "2026-06-30T12:00:00.000Z",
      repository: createMemoryRepository(rows),
    });
    const salesInvoice = createPurchaseInvoice({ movementGroup: "Satış" });
    const result = await service.createSalesInvoiceCollection({
      account: { code: "BANKA-0001", name: "MERKEZ BANKA" },
      amount: 5000,
      movementDate: "2026-06-30",
      salesInvoice,
      scope: defaultTenantScope,
    });
    const second = await service.createSalesInvoiceCollection({ amount: 11200, salesInvoice, scope: defaultTenantScope });
    const duplicate = await service.createSalesInvoiceCollection({ amount: 1, salesInvoice, scope: defaultTenantScope });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        accountCode: "BANKA-0001",
        amount: 5000,
        direction: "Giriş",
        documentNo: "THS-FAT-0006",
        movementType: "Tahsilat",
        sourceType: "sales-invoice",
        sourceId: "invoice-1",
      }),
    });
    expect(second).toEqual({ ok: true, data: expect.objectContaining({ amount: 11200, documentNo: "THS-FAT-0006-2" }) });
    expect(duplicate.ok ? [] : duplicate.errors).toContain("Bu satış faturası tamamen tahsil edildi: FAT-0006");
    expect(rows).toHaveLength(2);
  });

  test("rejects sales invoice collection for draft invoices", async () => {
    const service = createCashBankMovementService({
      now: () => "2026-06-30T12:00:00.000Z",
      repository: createMemoryRepository([]),
    });
    await expect(service.createSalesInvoiceCollection({
      salesInvoice: createPurchaseInvoice({ status: "Taslak", movementGroup: "Satış" }),
      scope: defaultTenantScope,
    })).resolves.toEqual({
      ok: false,
      errors: ["Yalnız kesinleşmiş satış faturası tahsil edilebilir."],
    });
  });

  test("creates progress payment payment movement once for subcontractor progress payments", async () => {
    const rows: CashBankMovementRow[] = [];
    const service = createCashBankMovementService({
      now: () => "2026-06-30T12:00:00.000Z",
      repository: createMemoryRepository(rows),
    });
    const progressPayment = createProgressPayment();

    const result = await service.createProgressPaymentPayment({
      account: {
        code: "BANKA-0001",
        name: "MERKEZ BANKA",
      },
      movementDate: "2026-06-30",
      progressPayment,
      scope: defaultTenantScope,
    });
    const duplicate = await service.createProgressPaymentPayment({
      progressPayment,
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        accountCode: "BANKA-0001",
        accountName: "MERKEZ BANKA",
        amount: 11400,
        counterpartyName: "ŞİRKETİN TAŞERONU",
        direction: "Çıkış",
        documentNo: "ODM-HAK-0001",
        movementDate: "2026-06-30",
        movementType: "Hakediş Ödemesi",
        sourceId: "progress-payment-1",
        sourceLabel: "HAK-0001",
        sourceType: "progress-payment",
      }),
    });
    expect(duplicate).toEqual({ ok: true, data: expect.objectContaining({ id: rows[0]?.id, documentNo: "ODM-HAK-0001" }) });
    expect(rows).toHaveLength(1);
  });

  test("normalizes progress payment payment movement currency to the P0 base transaction currency", async () => {
    const rows: CashBankMovementRow[] = [];
    const service = createCashBankMovementService({
      now: () => "2026-06-30T12:00:00.000Z",
      repository: createMemoryRepository(rows),
    });

    const result = await service.createProgressPaymentPayment({
      progressPayment: createProgressPayment({
        currency: "EUR",
        documentNo: "HAK-P0-EUR",
        id: "progress-payment-eur-1",
      }),
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        currency: "TL",
        documentNo: "ODM-HAK-P0-EUR",
      }),
    });
  });

  test("creates progress payment collection movement once for site income progress payments", async () => {
    const rows: CashBankMovementRow[] = [];
    const service = createCashBankMovementService({
      now: () => "2026-06-30T12:00:00.000Z",
      repository: createMemoryRepository(rows),
    });
    const progressPayment = createProgressPayment({
      counterpartyCode: "MUS-0001",
      counterpartyName: "NOA KONUT ALICISI",
      paymentType: "Şantiye Geliri",
    });

    const result = await service.createProgressPaymentCollection({
      account: {
        code: "BANKA-0001",
        name: "MERKEZ BANKA",
      },
      movementDate: "2026-06-30",
      progressPayment,
      scope: defaultTenantScope,
    });
    const duplicate = await service.createProgressPaymentCollection({
      progressPayment,
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        accountCode: "BANKA-0001",
        accountName: "MERKEZ BANKA",
        amount: 11400,
        counterpartyName: "NOA KONUT ALICISI",
        direction: "Giriş",
        documentNo: "THS-HAK-0001",
        movementDate: "2026-06-30",
        movementType: "Hakediş Tahsilatı",
        sourceId: "progress-payment-1",
        sourceLabel: "HAK-0001",
        sourceType: "progress-payment",
      }),
    });
    expect(duplicate).toEqual({ ok: true, data: expect.objectContaining({ id: rows[0]?.id, documentNo: "THS-HAK-0001" }) });
    expect(rows).toHaveLength(1);
  });

  test("normalizes progress payment collection movement currency to the P0 base transaction currency", async () => {
    const rows: CashBankMovementRow[] = [];
    const service = createCashBankMovementService({
      now: () => "2026-06-30T12:00:00.000Z",
      repository: createMemoryRepository(rows),
    });

    const result = await service.createProgressPaymentCollection({
      progressPayment: createProgressPayment({
        counterpartyCode: "MUS-0002",
        counterpartyName: "NOA DÖVİZLİ ALICI",
        currency: "USD",
        documentNo: "HAK-P0-USD",
        id: "progress-payment-usd-1",
        paymentType: "Şantiye Geliri",
      }),
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        currency: "TL",
        documentNo: "THS-HAK-P0-USD",
      }),
    });
  });

  test("rejects progress payment payment for site income progress payments", async () => {
    const service = createCashBankMovementService({
      now: () => "2026-06-30T12:00:00.000Z",
      repository: createMemoryRepository([]),
    });

    const result = await service.createProgressPaymentPayment({
      progressPayment: createProgressPayment({ paymentType: "Şantiye Geliri" }),
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Şantiye geliri hakedişi ödeme hareketi olarak kapatılamaz."],
    });
  });

  test("rejects progress payment payment for non-posted progress payments", async () => {
    const service = createCashBankMovementService({
      now: () => "2026-06-30T12:00:00.000Z",
      repository: createMemoryRepository([]),
    });

    const result = await service.createProgressPaymentPayment({
      progressPayment: createProgressPayment({ status: "Taslak" }),
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Yalnız kesinleşmiş hakediş ödenebilir."],
    });
  });

  test("rejects progress payment collection for subcontractor progress payments", async () => {
    const service = createCashBankMovementService({
      now: () => "2026-06-30T12:00:00.000Z",
      repository: createMemoryRepository([]),
    });

    const result = await service.createProgressPaymentCollection({
      progressPayment: createProgressPayment({ paymentType: "Taşeron Hakedişi" }),
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Yalnız şantiye geliri hakedişi tahsilat hareketi olarak kapatılabilir."],
    });
  });

  test("rejects progress payment collection for non-posted progress payments", async () => {
    const service = createCashBankMovementService({
      now: () => "2026-06-30T12:00:00.000Z",
      repository: createMemoryRepository([]),
    });

    const result = await service.createProgressPaymentCollection({
      progressPayment: createProgressPayment({
        paymentType: "Şantiye Geliri",
        status: "Taslak",
      }),
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Yalnız kesinleşmiş hakediş tahsil edilebilir."],
    });
  });});

describe("createChequeCollectionMovement", () => {
  test("normalizes cheque collection movement currency to the P0 base transaction currency", () => {
    const movement = createChequeCollectionMovement({
      amount: 125000,
      counterpartyName: "ABC Beton A.Ş.",
      currency: "USD",
      documentNo: "CEK-P0-USD",
      movementDate: "2026-06-27",
      nowIso: "2026-06-27T09:00:00.000Z",
      scope: defaultTenantScope,
      sourceId: "cheque-usd-1",
      sourceLabel: "CEK-P0-USD / CK-P0-USD",
    });

    expect(movement).toEqual(
      expect.objectContaining({
        currency: "TL",
        documentNo: "CEK-P0-USD",
      }),
    );
  });
});

function createMemoryRepository(
  entries: CashBankMovementRow[],
): CashBankMovementRepository {
  return {
    async create(input) {
      entries.push(input);

      return input;
    },
    async list({ scope }) {
      return entries.filter(
        (entry) =>
          entry.tenantId === scope.tenantId &&
          entry.companyId === scope.companyId &&
          entry.periodId === scope.periodId,
      );
    },
  };
}

function createPayrollAccrual(
  overrides: Partial<PayrollAccrualRow> = {},
): PayrollAccrualRow {
  return {
    id: "payroll-accrual-1",
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    contractorCode: "TAS-0001",
    contractorName: "ŞİRKETİN TAŞERONU",
    createdAt: "2026-06-30T09:00:00.000Z",
    createdBy: "user-main",
    deductionTotal: 500,
    documentNo: "MAAS-PNT-2026-06-001",
    grossTotal: 32000,
    lineCount: 2,
    lines: [],
    month: 6,
    netTotal: 31500,
    siteCode: "SANT-0001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    sourceTimesheetId: "timesheet-1",
    sourceTimesheetNo: "PNT-2026-06-001",
    status: "Kaydedildi",
    updatedAt: "2026-06-30T09:00:00.000Z",
    updatedBy: "user-main",
    year: 2026,
    ...overrides,
  };
}

function createPurchaseInvoice(
  overrides: Partial<PurchaseInvoiceRow> = {},
): PurchaseInvoiceRow {
  return {
    id: "invoice-1",
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    counterpartyCode: "TED-0001",
    counterpartyName: "ÖRNEK TEDARİKÇİ",
    createdAt: "2026-06-25T10:00:00.000Z",
    createdBy: "user-main",
    currency: "TL",
    description: "",
    discountTotal: 1500,
    documentNo: "FAT-0006",
    dueDate: "2026-07-23",
    exchangeRate: 1,
    grandTotal: 16200,
    invoiceDate: "2026-06-23",
    isOfficial: false,
    lineCount: 1,
    lines: [
      {
        description: "",
        discountRate1: 10,
        discountRate2: 0,
        quantity: 100,
        siteName: "",
        stockCode: "STK-0001",
        stockName: "Çimento Torba",
        unit: "Adet",
        unitPrice: 150,
        vatRate: 20,
        warehouse: "",
      },
    ],
    movementGroup: "",
    netTotal: 13500,
    siteCode: "SANT-0001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    status: "Kaydedildi",
    subtotal: 15000,
    updatedAt: "2026-06-25T10:00:00.000Z",
    updatedBy: "user-main",
    vatTotal: 2700,
    withholdingTotal: 0,
    ...overrides,
  };
}

function createProgressPayment(
  overrides: Partial<ProgressPaymentRow> = {},
): ProgressPaymentRow {
  return {
    id: "progress-payment-1",
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    counterpartyCode: "TAS-0001",
    counterpartyName: "ŞİRKETİN TAŞERONU",
    createdAt: "2026-06-27T10:00:00.000Z",
    createdBy: "user-main",
    currency: "TL",
    description: "Haziran hakedişi",
    documentNo: "HAK-0001",
    grandTotal: 11400,
    grossTotal: 10000,
    issueDate: "2026-06-27",
    lineCount: 1,
    lines: [
      {
        description: "Kaba inşaat imalatı",
        quantity: 10,
        unit: "m2",
        unitPrice: 1000,
        vatRate: 20,
      },
    ],
    netTotal: 9500,
    paymentType: "Taşeron Hakedişi",
    retentionRate: 5,
    retentionTotal: 500,
    siteCode: "SANT-0001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    status: "Kaydedildi",
    updatedAt: "2026-06-27T10:00:00.000Z",
    updatedBy: "user-main",
    vatTotal: 1900,
    ...overrides,
  };
}

