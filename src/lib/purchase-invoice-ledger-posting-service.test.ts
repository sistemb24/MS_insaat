import { describe, expect, test, vi } from "vitest";

import type { PurchaseInvoiceRow } from "./purchase-invoice-service";
import {
  buildPurchaseInvoiceLedgerPostingCommand,
  createPurchaseInvoiceLedgerPostingService,
  createSalesInvoiceLedgerPostingService,
  type PurchaseInvoiceLedgerPostingCommand,
  type PurchaseInvoiceLedgerPostingRepository,
} from "./purchase-invoice-ledger-posting-service";
import { defaultTenantScope, type TenantScope } from "./tenant-scope";

const timestamp = "2026-07-15T00:30:00.000Z";

const invoice: PurchaseInvoiceRow = {
  id: `${defaultTenantScope.tenantId}::${defaultTenantScope.companyId}::${defaultTenantScope.periodId}::purchase-invoice::af-test-001`,
  tenantId: defaultTenantScope.tenantId,
  companyId: defaultTenantScope.companyId,
  periodId: defaultTenantScope.periodId,
  documentNo: "AF-TEST-001",
  invoiceDate: "2026-07-15",
  dueDate: "2026-08-15",
  counterpartyCode: "TED-TEST-001",
  counterpartyName: "TEST TEDARİKÇİ",
  siteCode: "SANT-TEST-001",
  siteName: "TEST ŞANTİYESİ",
  currency: "TL",
  exchangeRate: 1,
  movementGroup: "Alış",
  isOfficial: false,
  description: "Test alış faturası",
  lines: [
    {
      stockCode: "STK-001",
      stockName: "Test Malzeme",
      siteName: "TEST ŞANTİYESİ",
      unit: "Adet",
      description: "Test satırı",
      warehouse: "Ana Depo",
      quantity: 10,
      unitPrice: 100,
      discountRate1: 0,
      discountRate2: 0,
      vatRate: 20,
    },
  ],
  status: "Taslak",
  subtotal: 1000,
  discountTotal: 0,
  netTotal: 1000,
  vatTotal: 200,
  withholdingTotal: 0,
  grandTotal: 1200,
  lineCount: 1,
  createdBy: defaultTenantScope.userId,
  updatedBy: defaultTenantScope.userId,
  createdAt: "2026-07-15T00:00:00.000Z",
  updatedAt: "2026-07-15T00:00:00.000Z",
};

describe("purchase invoice ledger posting service", () => {
  test("builds the sales 120/600/391 source-linked journal", async () => {
    let capturedCommand: PurchaseInvoiceLedgerPostingCommand | undefined;
    const service = createSalesInvoiceLedgerPostingService({
      now: () => timestamp,
      repository: {
        async commit(command) {
          capturedCommand = command;
          return { ok: true, data: { invoice: command.invoice, ledgerEntry: command.ledgerEntry, created: true } };
        },
      },
    });

    await expect(service.post({ invoice, scope: defaultTenantScope })).resolves.toMatchObject({
      ok: true,
      data: { ledgerEntry: { documentNo: "YVM-SF-AF-TEST-001", sourceType: "sales-invoice", debitTotal: 1200, creditTotal: 1200 } },
    });
    expect(capturedCommand?.invoiceKind).toBe("sales");
    expect(capturedCommand?.ledgerEntry.lines).toEqual([
      expect.objectContaining({ accountCode: "120", accountName: "Alıcılar", amount: 1200, direction: "debit" }),
      expect.objectContaining({ accountCode: "600", accountName: "Yurtiçi Satışlar", amount: 1000, direction: "credit" }),
      expect.objectContaining({ accountCode: "391", accountName: "Hesaplanan KDV", amount: 200, direction: "credit" }),
    ]);
    expect(capturedCommand?.successAudits[0]).toMatchObject({ action: "sales-invoice.post", entityType: "sales-invoice" });
  });

  test("builds and commits a balanced source-linked 153/191/320 journal", async () => {
    let capturedCommand: PurchaseInvoiceLedgerPostingCommand | undefined;
    const repository: PurchaseInvoiceLedgerPostingRepository = {
      async commit(command) {
        capturedCommand = command;
        return {
          ok: true,
          data: {
            invoice: command.invoice,
            ledgerEntry: command.ledgerEntry,
            created: true,
          },
        };
      },
    };
    const service = createPurchaseInvoiceLedgerPostingService({
      now: () => timestamp,
      repository,
    });

    await expect(
      service.post({ invoice, scope: defaultTenantScope }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        created: true,
        invoice: { status: "Kaydedildi", updatedAt: timestamp },
        ledgerEntry: {
          documentNo: "YVM-AF-AF-TEST-001",
          sourceType: "purchase-invoice",
          sourceId: invoice.id,
          debitTotal: 1200,
          creditTotal: 1200,
        },
      },
    });

    expect(capturedCommand).toBeDefined();
    expect(capturedCommand?.originalInvoiceUpdatedAt).toBe(invoice.updatedAt);
    expect(capturedCommand?.ledgerEntry.lines).toEqual([
      expect.objectContaining({
        accountCode: "153",
        accountName: "Ticari Mallar",
        amount: 1000,
        direction: "debit",
      }),
      expect.objectContaining({
        accountCode: "191",
        accountName: "İndirilecek KDV",
        amount: 200,
        direction: "debit",
      }),
      expect.objectContaining({
        accountCode: "320",
        accountName: "Satıcılar",
        amount: 1200,
        direction: "credit",
      }),
    ]);
    expect(capturedCommand?.successAudits.map((entry) => entry.action)).toEqual([
      "purchase-invoice.post",
      "ledger.entry.post",
    ]);
    expect(capturedCommand?.successAudits[0]).toMatchObject({
      entityId: invoice.id,
      metadata: {
        ledgerEntryId: `${invoice.id}::ledger-entry`,
        sourceType: "purchase-invoice",
        sourceId: invoice.id,
      },
    });
  });

  test("omits the 191 line for a zero VAT invoice and keeps the journal balanced", () => {
    const result = buildPurchaseInvoiceLedgerPostingCommand({
      invoice: {
        ...invoice,
        vatTotal: 0,
        grandTotal: 1000,
        lines: [{ ...invoice.lines[0]!, vatRate: 0 }],
      },
      scope: defaultTenantScope,
      timestamp,
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        ledgerEntry: { debitTotal: 1000, creditTotal: 1000 },
      },
    });
    expect(result.ok ? result.data.ledgerEntry.lines.map((line) => line.accountCode) : []).toEqual([
      "153",
      "320",
    ]);
  });

  test.each<{
    name: string;
    invoice: PurchaseInvoiceRow;
    scope: TenantScope;
    reasonCode: string;
  }>([
    {
      name: "viewer role",
      invoice,
      scope: { ...defaultTenantScope, userRole: "viewer" },
      reasonCode: "permission-denied",
    },
    {
      name: "closed period",
      invoice,
      scope: { ...defaultTenantScope, periodClosed: true },
      reasonCode: "period-closed",
    },
    {
      name: "foreign company scope",
      invoice,
      scope: { ...defaultTenantScope, companyId: "company-other" },
      reasonCode: "scope-mismatch",
    },
    {
      name: "already posted status",
      invoice: { ...invoice, status: "Kaydedildi" },
      scope: defaultTenantScope,
      reasonCode: "invalid-status",
    },
    {
      name: "cancelled status",
      invoice: { ...invoice, status: "İptal" },
      scope: defaultTenantScope,
      reasonCode: "invalid-status",
    },
    {
      name: "withholding amount",
      invoice: { ...invoice, withholdingTotal: 100, grandTotal: 1100 },
      scope: defaultTenantScope,
      reasonCode: "unsupported-withholding",
    },
    {
      name: "zero value invoice",
      invoice: { ...invoice, netTotal: 0, vatTotal: 0, grandTotal: 0 },
      scope: defaultTenantScope,
      reasonCode: "invalid-total",
    },
  ])("rejects $name before persistence", async ({ invoice: candidate, scope, reasonCode }) => {
    const commit = vi.fn<PurchaseInvoiceLedgerPostingRepository["commit"]>();
    const service = createPurchaseInvoiceLedgerPostingService({
      repository: { commit },
      now: () => timestamp,
    });

    const result = await service.post({ invoice: candidate, scope });

    expect(result).toMatchObject({ ok: false, reasonCode });
    expect(commit).not.toHaveBeenCalled();
  });

  test("normalizes unexpected repository errors to a stable persistence failure", async () => {
    const service = createPurchaseInvoiceLedgerPostingService({
      repository: {
        async commit() {
          throw new Error("database unavailable");
        },
      },
      now: () => timestamp,
    });

    await expect(
      service.post({ invoice, scope: defaultTenantScope }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Alış faturası muhasebe fişi kalıcı olarak oluşturulamadı."],
      reasonCode: "persistence-failed",
    });
  });
});
