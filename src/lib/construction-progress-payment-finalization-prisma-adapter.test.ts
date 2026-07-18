/* eslint-disable @typescript-eslint/no-explicit-any -- focused Prisma transaction test doubles */
import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { createConstructionProgressPaymentFinalizationPrismaAdapter } from "./construction-progress-payment-finalization-prisma-adapter";
import { defaultTenantScope } from "./tenant-scope";

function constructionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "construction-1", tenantId: defaultTenantScope.tenantId, companyId: defaultTenantScope.companyId, periodId: defaultTenantScope.periodId,
    projectId: "project-1", status: "APPROVED", kind: "INTERIM", documentNo: "HAK-ATOMIC-1", description: "Atomik hakediş", periodEnd: new Date("2026-07-17T00:00:00.000Z"), periodDeductionTotal: 0, accountingLink: null,
    project: { paymentType: "Taşeron Hakedişi", counterpartyCode: "TAS-001", counterpartyName: "Atomik Taşeron", name: "Atomik Proje", siteCode: "SITE-1", siteName: "Atomik Şantiye", retentionRate: 0 },
    snapshots: [{ periodQuantity: 10, unitPrice: 100, vatRate: 20, contractItem: { description: "Beton", unit: "m3", vatRate: 20 } }],
    extraWorks: [], deductionMovements: [], financialMovements: [],
    ...overrides,
  };
}

function ledgerRecord(data: any) {
  return {
    ...data,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    lines: data.lines.create.map((line: any) => ({ ...line })),
  };
}

function transactionDouble(options: { closed?: boolean; construction?: ReturnType<typeof constructionRow>; ledger?: any } = {}) {
  const construction = options.construction ?? constructionRow();
  let persistedFinancial: any = null;
  const transaction: any = {
    constructionProgressPayment: { findFirst: vi.fn().mockResolvedValue(construction), update: vi.fn().mockResolvedValue({}) },
    constructionAccountingLink: { upsert: vi.fn().mockResolvedValue({}) },
    constructionProject: { update: vi.fn().mockResolvedValue({}) },
    constructionApprovalEvent: { create: vi.fn().mockResolvedValue({}) },
    progressPayment: {
      findFirst: vi.fn().mockImplementation(async () => persistedFinancial),
      create: vi.fn().mockImplementation(async ({ data }: any) => {
        persistedFinancial = { ...data, lines: data.lines.createMany.data };
        return persistedFinancial;
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    ledgerEntry: {
      findFirst: vi.fn().mockResolvedValue(options.ledger ?? null),
      create: vi.fn().mockImplementation(async ({ data }: any) => ledgerRecord(data)),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    period: { findFirst: vi.fn().mockResolvedValue({ isClosed: options.closed ?? false }) },
  };
  const prisma = { $transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) => callback(transaction)) } as unknown as PrismaClient;
  return { prisma, transaction };
}

describe("construction progress payment atomic finalization", () => {
  it("creates projection, ledger, link and construction finalization in one transaction callback", async () => {
    const { prisma, transaction } = transactionDouble();
    const result = await createConstructionProgressPaymentFinalizationPrismaAdapter(prisma).finalize({ id: "construction-1", scope: defaultTenantScope });

    expect(result).toMatchObject({ ok: true, data: { constructionPaymentId: "construction-1", ledgerDocumentNo: "YVM-HAK-HAK-ATOMIC-1", created: true } });
    expect(transaction.progressPayment.create).toHaveBeenCalledOnce();
    expect(transaction.progressPayment.updateMany).toHaveBeenCalledOnce();
    expect(transaction.ledgerEntry.create).toHaveBeenCalledOnce();
    expect(transaction.constructionAccountingLink.upsert).toHaveBeenCalledOnce();
    expect(transaction.constructionProgressPayment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "FINALIZED" }) }));
    expect(transaction.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "construction-progress-payment.finalized", entityType: "construction-progress-payment", entityId: "construction-1", metadata: expect.objectContaining({ statusFrom: "APPROVED", statusTo: "FINALIZED" }) }) });
    expect(transaction.constructionProject.update).not.toHaveBeenCalled();
  });

  it("aborts before construction link and status writes when the accounting period is closed", async () => {
    const { prisma, transaction } = transactionDouble({ closed: true });
    const result = await createConstructionProgressPaymentFinalizationPrismaAdapter(prisma).finalize({ id: "construction-1", scope: defaultTenantScope });

    expect(result).toMatchObject({ ok: false, errors: ["Aktif muhasebe dönemi bulunamadı veya dönem kapanmış durumda."] });
    expect(transaction.constructionAccountingLink.upsert).not.toHaveBeenCalled();
    expect(transaction.constructionProgressPayment.update).not.toHaveBeenCalled();
    expect(transaction.ledgerEntry.create).not.toHaveBeenCalled();
  });

  it("returns the existing link and ledger on a finalized retry without creating duplicates", async () => {
    const existingLedger = { id: "ledger-1", documentNo: "YVM-HAK-HAK-ATOMIC-1" };
    const { prisma, transaction } = transactionDouble({ construction: constructionRow({ status: "FINALIZED", accountingLink: { progressPaymentId: "financial-1" } }), ledger: existingLedger });
    const result = await createConstructionProgressPaymentFinalizationPrismaAdapter(prisma).finalize({ id: "construction-1", scope: defaultTenantScope });

    expect(result).toEqual({ ok: true, data: { constructionPaymentId: "construction-1", progressPaymentId: "financial-1", ledgerDocumentNo: "YVM-HAK-HAK-ATOMIC-1", created: false } });
    expect(transaction.progressPayment.create).not.toHaveBeenCalled();
    expect(transaction.ledgerEntry.create).not.toHaveBeenCalled();
    expect(transaction.constructionAccountingLink.upsert).not.toHaveBeenCalled();
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it("closes the project inside the same transaction only for a FINAL payment", async () => {
    const { prisma, transaction } = transactionDouble({ construction: constructionRow({ kind: "FINAL" }) });
    const result = await createConstructionProgressPaymentFinalizationPrismaAdapter(prisma).finalize({ id: "construction-1", scope: defaultTenantScope });

    expect(result.ok).toBe(true);
    expect(transaction.constructionProject.update).toHaveBeenCalledWith({ where: { id: "project-1" }, data: { status: "CLOSED", updatedBy: defaultTenantScope.userId } });
  });

  it("projects extra work, additions and detailed deductions into the current-period financial document", async () => {
    const source = constructionRow({
      periodDeductionTotal: 125,
      extraWorks: [{ documentNo: "TUT-1", description: "İlave imalat", quantity: 2, unit: "adet", unitPrice: 100, vatRate: 20 }],
      financialMovements: [{ movementType: "PRICE_DIFFERENCE", direction: "ADDITION", description: "Fiyat farkı", amount: 50 }],
    });
    const { prisma, transaction } = transactionDouble({ construction: source });
    const result = await createConstructionProgressPaymentFinalizationPrismaAdapter(prisma).finalize({ id: "construction-1", scope: defaultTenantScope });

    expect(result.ok).toBe(true);
    expect(transaction.progressPayment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ grossTotal: 1250, retentionTotal: 125, netTotal: 1125, lineCount: 3 }) }));
  });
});
