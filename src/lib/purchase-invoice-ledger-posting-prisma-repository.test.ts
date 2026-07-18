import { describe, expect, test, vi } from "vitest";

import type { PurchaseInvoiceRow } from "./purchase-invoice-service";
import {
  createPurchaseInvoiceLedgerPostingPrismaRepository,
  type PurchaseInvoiceLedgerPostingPrismaClientLike,
  type PurchaseInvoiceLedgerPostingTransactionLike,
} from "./purchase-invoice-ledger-posting-prisma-repository";
import { buildPurchaseInvoiceLedgerPostingCommand } from "./purchase-invoice-ledger-posting-service";
import { defaultTenantScope } from "./tenant-scope";

const timestamp = "2026-07-15T00:30:00.000Z";

const invoice: PurchaseInvoiceRow = {
  id: `${defaultTenantScope.tenantId}::${defaultTenantScope.companyId}::${defaultTenantScope.periodId}::purchase-invoice::af-repo-001`,
  tenantId: defaultTenantScope.tenantId,
  companyId: defaultTenantScope.companyId,
  periodId: defaultTenantScope.periodId,
  documentNo: "AF-REPO-001",
  invoiceDate: "2026-07-15",
  dueDate: "2026-08-15",
  counterpartyCode: "TED-REPO-001",
  counterpartyName: "REPOSITORY TEDARİKÇİ",
  siteCode: "SANT-REPO-001",
  siteName: "REPOSITORY ŞANTİYESİ",
  currency: "TL",
  exchangeRate: 1,
  movementGroup: "Alış",
  isOfficial: false,
  description: "Repository test faturası",
  lines: [
    {
      stockCode: "STK-REPO-001",
      stockName: "Repository Malzeme",
      siteName: "REPOSITORY ŞANTİYESİ",
      unit: "Adet",
      description: "Repository test satırı",
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

function createCommand() {
  const result = buildPurchaseInvoiceLedgerPostingCommand({
    invoice,
    scope: defaultTenantScope,
    timestamp,
  });

  if (!result.ok) {
    throw new Error(result.errors.join(", "));
  }

  return result.data;
}

function invoiceState(
  command = createCommand(),
  overrides: Partial<ReturnType<typeof baseInvoiceState>> = {},
) {
  return { ...baseInvoiceState(command), ...overrides };
}

function baseInvoiceState(command = createCommand()) {
  return {
    id: command.sourceId,
    tenantId: command.scope.tenantId,
    companyId: command.scope.companyId,
    periodId: command.scope.periodId,
    documentNo: invoice.documentNo,
    invoiceDate: new Date(`${invoice.invoiceDate}T00:00:00.000Z`),
    currency: invoice.currency,
    status: "Taslak",
    netTotal: invoice.netTotal,
    vatTotal: invoice.vatTotal,
    withholdingTotal: invoice.withholdingTotal,
    grandTotal: invoice.grandTotal,
    updatedBy: invoice.updatedBy,
    updatedAt: new Date(invoice.updatedAt),
  };
}

function ledgerState(command = createCommand()) {
  const entry = command.ledgerEntry;

  return {
    id: entry.id,
    tenantId: entry.tenantId,
    companyId: entry.companyId,
    periodId: entry.periodId,
    sourceType: command.sourceType,
    sourceId: command.sourceId,
    entryDate: new Date(`${entry.entryDate}T00:00:00.000Z`),
    documentNo: entry.documentNo,
    description: entry.description,
    currency: entry.currency,
    status: entry.status,
    debitTotal: entry.debitTotal,
    creditTotal: entry.creditTotal,
    createdBy: entry.createdBy,
    updatedBy: entry.updatedBy,
    createdAt: new Date(entry.createdAt),
    updatedAt: new Date(entry.updatedAt),
    lines: entry.lines.map((line, index) => ({
      lineNo: index + 1,
      accountCode: line.accountCode,
      accountName: line.accountName,
      debit: line.direction === "debit" ? line.amount : 0,
      credit: line.direction === "credit" ? line.amount : 0,
      description: line.description ?? null,
    })),
  };
}

function createPrismaHarness(command = createCommand()) {
  const transaction = {
    purchaseInvoice: {
      findFirst: vi.fn().mockResolvedValue(invoiceState(command)),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    ledgerEntry: {
      create: vi.fn().mockResolvedValue(ledgerState(command)),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    period: {
      findFirst: vi.fn().mockResolvedValue({ isClosed: false }),
    },
  };
  const prisma = {
    ...transaction,
    $transaction: vi.fn(
      async (
        callback: (
          client: PurchaseInvoiceLedgerPostingTransactionLike,
        ) => Promise<unknown>,
      ) => callback(transaction as PurchaseInvoiceLedgerPostingTransactionLike),
    ),
  };

  return {
    prisma: prisma as unknown as PurchaseInvoiceLedgerPostingPrismaClientLike,
    transaction,
  };
}

describe("purchase invoice ledger posting prisma repository", () => {
  test("atomically scopes the invoice update, creates source lines and records two audits", async () => {
    const command = createCommand();
    const { prisma, transaction } = createPrismaHarness(command);
    const repository = createPurchaseInvoiceLedgerPostingPrismaRepository(prisma);

    await expect(repository.commit(command)).resolves.toMatchObject({
      ok: true,
      data: {
        created: true,
        invoice: { status: "Kaydedildi" },
        ledgerEntry: {
          sourceType: "purchase-invoice",
          sourceId: command.sourceId,
          debitTotal: 1200,
          creditTotal: 1200,
        },
      },
    });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(transaction.period.findFirst).toHaveBeenCalledWith({
      where: {
        id: command.scope.periodId,
        tenantId: command.scope.tenantId,
        companyId: command.scope.companyId,
      },
      select: { isClosed: true },
    });
    expect(transaction.purchaseInvoice.updateMany).toHaveBeenCalledWith({
      where: {
        id: command.sourceId,
        tenantId: command.scope.tenantId,
        companyId: command.scope.companyId,
        periodId: command.scope.periodId,
        status: "Taslak",
        updatedAt: new Date(command.originalInvoiceUpdatedAt),
      },
      data: {
        status: "Kaydedildi",
        updatedBy: command.scope.userId,
        updatedAt: new Date(timestamp),
      },
    });
    expect(transaction.ledgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceType: "purchase-invoice",
        sourceId: command.sourceId,
        lines: {
          create: [
            expect.objectContaining({ accountCode: "153", debit: 1000, credit: 0 }),
            expect.objectContaining({ accountCode: "191", debit: 200, credit: 0 }),
            expect.objectContaining({ accountCode: "320", debit: 0, credit: 1200 }),
          ],
        },
      }),
      include: { lines: true },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledTimes(2);
    expect(
      transaction.auditLog.create.mock.calls.map(([input]) => input.data.action),
    ).toEqual(["purchase-invoice.post", "ledger.entry.post"]);
  });

  test("returns the scoped existing source idempotently without writes or duplicate audits", async () => {
    const command = createCommand();
    const { prisma, transaction } = createPrismaHarness(command);
    transaction.purchaseInvoice.findFirst.mockResolvedValue(
      invoiceState(command, {
        status: "Kaydedildi",
        updatedBy: command.invoice.updatedBy,
        updatedAt: new Date(command.invoice.updatedAt),
      }),
    );
    transaction.ledgerEntry.findFirst.mockResolvedValue(ledgerState(command));
    const repository = createPurchaseInvoiceLedgerPostingPrismaRepository(prisma);

    await expect(repository.commit(command)).resolves.toMatchObject({
      ok: true,
      data: { created: false, ledgerEntry: { id: command.ledgerEntry.id } },
    });
    expect(transaction.period.findFirst).not.toHaveBeenCalled();
    expect(transaction.purchaseInvoice.updateMany).not.toHaveBeenCalled();
    expect(transaction.ledgerEntry.create).not.toHaveBeenCalled();
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });

  test("does not backfill a legacy posted invoice without a source ledger", async () => {
    const command = createCommand();
    const { prisma, transaction } = createPrismaHarness(command);
    transaction.purchaseInvoice.findFirst.mockResolvedValue(
      invoiceState(command, { status: "Kaydedildi" }),
    );
    const repository = createPurchaseInvoiceLedgerPostingPrismaRepository(prisma);

    await expect(repository.commit(command)).resolves.toMatchObject({
      ok: false,
      reasonCode: "legacy-posted-without-ledger",
    });
    expect(transaction.purchaseInvoice.updateMany).not.toHaveBeenCalled();
    expect(transaction.ledgerEntry.create).not.toHaveBeenCalled();
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });

  test.each([
    { period: null, name: "missing" },
    { period: { isClosed: true }, name: "closed" },
  ])("rejects a $name scoped period inside the transaction", async ({ period }) => {
    const command = createCommand();
    const { prisma, transaction } = createPrismaHarness(command);
    transaction.period.findFirst.mockResolvedValue(period);
    const repository = createPurchaseInvoiceLedgerPostingPrismaRepository(prisma);

    await expect(repository.commit(command)).resolves.toMatchObject({
      ok: false,
      reasonCode: "period-closed",
    });
    expect(transaction.purchaseInvoice.updateMany).not.toHaveBeenCalled();
    expect(transaction.ledgerEntry.create).not.toHaveBeenCalled();
  });

  test("rejects a stale invoice snapshot even when the financial totals are unchanged", async () => {
    const command = createCommand();
    const { prisma, transaction } = createPrismaHarness(command);
    transaction.purchaseInvoice.findFirst.mockResolvedValue(
      invoiceState(command, { updatedAt: new Date("2026-07-15T00:10:00.000Z") }),
    );
    const repository = createPurchaseInvoiceLedgerPostingPrismaRepository(prisma);

    await expect(repository.commit(command)).resolves.toMatchObject({
      ok: false,
      reasonCode: "concurrent-modification",
    });
    expect(transaction.purchaseInvoice.updateMany).not.toHaveBeenCalled();
    expect(transaction.ledgerEntry.create).not.toHaveBeenCalled();
  });

  test("recovers a concurrent P2002 only when the same scoped source was committed", async () => {
    const command = createCommand();
    const { prisma, transaction } = createPrismaHarness(command);
    transaction.purchaseInvoice.findFirst
      .mockResolvedValueOnce(invoiceState(command))
      .mockResolvedValueOnce(
        invoiceState(command, {
          status: "Kaydedildi",
          updatedBy: command.invoice.updatedBy,
          updatedAt: new Date(command.invoice.updatedAt),
        }),
      );
    transaction.ledgerEntry.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(ledgerState(command));
    transaction.ledgerEntry.create.mockRejectedValue(
      Object.assign(new Error("unique constraint"), { code: "P2002" }),
    );
    const repository = createPurchaseInvoiceLedgerPostingPrismaRepository(prisma);

    await expect(repository.commit(command)).resolves.toMatchObject({
      ok: true,
      data: { created: false, ledgerEntry: { id: command.ledgerEntry.id } },
    });
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });

  test("does not mistake an unrelated P2002 document collision for source idempotency", async () => {
    const command = createCommand();
    const { prisma, transaction } = createPrismaHarness(command);
    transaction.purchaseInvoice.findFirst
      .mockResolvedValueOnce(invoiceState(command))
      .mockResolvedValueOnce(
        invoiceState(command, { status: "Kaydedildi" }),
      );
    transaction.ledgerEntry.findFirst.mockResolvedValue(null);
    transaction.ledgerEntry.create.mockRejectedValue(
      Object.assign(new Error("unique constraint"), { code: "P2002" }),
    );
    const repository = createPurchaseInvoiceLedgerPostingPrismaRepository(prisma);

    await expect(repository.commit(command)).resolves.toMatchObject({
      ok: false,
      reasonCode: "persistence-failed",
    });
  });

  test("returns persistence failure when either success audit aborts the transaction", async () => {
    const command = createCommand();
    const { prisma, transaction } = createPrismaHarness(command);
    transaction.auditLog.create
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("audit unavailable"));
    const repository = createPurchaseInvoiceLedgerPostingPrismaRepository(prisma);

    await expect(repository.commit(command)).resolves.toMatchObject({
      ok: false,
      reasonCode: "persistence-failed",
    });
    expect(transaction.auditLog.create).toHaveBeenCalledTimes(2);
  });
});
