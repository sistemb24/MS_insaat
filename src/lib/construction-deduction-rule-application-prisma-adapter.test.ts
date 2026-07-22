/* eslint-disable @typescript-eslint/no-explicit-any -- mutable Prisma doubles model transaction state in this boundary test. */
import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createConstructionDeductionRuleApplicationPrismaAdapter } from "./construction-deduction-rule-application-prisma-adapter";
import type { TenantScope } from "./tenant-scope";

const scope: TenantScope = {
  tenantId: "tenant-1",
  tenantName: "NOA",
  companyId: "company-1",
  companyName: "NOA İnşaat",
  periodId: "period-1",
  periodLabel: "2026",
  userId: "accounting-1",
  userName: "Muhasebe",
  userRole: "accounting",
  licenseLabel: "Kurumsal",
};

describe("construction deduction rule application prisma adapter", () => {
  let payment: any;
  let applications: any[];
  let movements: any[];
  let transaction: any;
  let prisma: any;

  beforeEach(() => {
    applications = [];
    movements = [{ id: "manual-1", totalAmount: 100, ruleApplication: null }];
    payment = {
      id: "payment-1",
      projectId: "project-1",
      documentNo: "HAK-001",
      status: "DRAFT",
      periodEnd: new Date("2026-07-31T00:00:00.000Z"),
      periodNetTotal: 10_000,
      project: { retentionRate: 5 },
      previousProgressPayment: null,
      extraWorks: [{ periodAmount: 1_000 }],
      deductionMovements: movements,
      deductionRuleApplications: applications,
      financialMovements: [{ direction: "ADDITION", amount: 500 }],
    };
    const rule = {
      id: "rule-1",
      ruleKey: "retention:project-1",
      code: "TEMINAT",
      name: "Teminat Kesintisi",
      category: "TEMINAT",
      revisionNo: 1,
      calculationType: "RATE",
      baseType: "PERIOD_NET_PLUS_EXTRAS",
      rate: 5,
      fixedAmount: null,
      minimumAmount: null,
      maximumAmount: null,
      taxMode: "NONE",
      taxRate: 0,
      priority: 10,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      effectiveTo: null,
      isActive: true,
    };
    transaction = {
      period: { findFirst: vi.fn().mockResolvedValue({ isClosed: false }) },
      constructionProgressPayment: {
        findFirst: vi.fn(async () => payment),
        update: vi.fn(async ({ data }) => {
          Object.assign(payment, data);
          return payment;
        }),
      },
      constructionDeductionRule: { findMany: vi.fn().mockResolvedValue([rule]) },
      constructionDeductionMovement: {
        create: vi.fn(async ({ data }) => {
          const movement = { id: "generated-1", ...data, ruleApplication: {} };
          movements.push(movement);
          return movement;
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      constructionDeductionRuleApplication: {
        create: vi.fn(async ({ data }) => {
          const application = { id: "application-1", ...data };
          applications.push(application);
          return application;
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    prisma = {
      ...transaction,
      $transaction: vi.fn(async (callback) => callback(transaction)),
    };
  });

  it("previews without writing and applies the effective rule once on retries", async () => {
    const adapter = createConstructionDeductionRuleApplicationPrismaAdapter(
      prisma as unknown as PrismaClient,
    );

    const preview = await adapter.preview({ paymentId: payment.id, scope });
    expect(preview).toMatchObject({
      ok: true,
      data: { totalRuleDeduction: 575, periodPayableTotal: 10_825, createdCount: 0 },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(transaction.constructionDeductionMovement.create).not.toHaveBeenCalled();

    const first = await adapter.apply({ paymentId: payment.id, scope });
    const retry = await adapter.apply({ paymentId: payment.id, scope });

    expect(first).toMatchObject({ ok: true, data: { createdCount: 1, updatedCount: 0 } });
    expect(retry).toMatchObject({ ok: true, data: { createdCount: 0, updatedCount: 0 } });
    expect(transaction.constructionDeductionMovement.create).toHaveBeenCalledOnce();
    expect(transaction.constructionDeductionRuleApplication.create).toHaveBeenCalledOnce();
    expect(transaction.auditLog.create).toHaveBeenCalledOnce();
    expect(transaction.constructionProgressPayment.update).toHaveBeenCalledOnce();
    expect(transaction.constructionProgressPayment.update).toHaveBeenLastCalledWith({
      where: { id: payment.id },
      data: expect.objectContaining({ periodDeductionTotal: 675, periodPayableTotal: 10_825 }),
    });
  });

  it("rejects closed periods before creating an application", async () => {
    transaction.period.findFirst.mockResolvedValue({ isClosed: true });
    const adapter = createConstructionDeductionRuleApplicationPrismaAdapter(
      prisma as unknown as PrismaClient,
    );

    await expect(adapter.apply({ paymentId: payment.id, scope })).resolves.toEqual({
      ok: false,
      errors: ["Kapalı dönemde kesinti kuralı uygulanamaz."],
    });
    expect(transaction.constructionProgressPayment.findFirst).not.toHaveBeenCalled();
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects viewer access before reading payment data", async () => {
    const adapter = createConstructionDeductionRuleApplicationPrismaAdapter(
      prisma as unknown as PrismaClient,
    );
    await expect(
      adapter.preview({ paymentId: payment.id, scope: { ...scope, userRole: "viewer" } }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Kesinti kuralı işlemi için muhasebe yetkisi gereklidir."],
    });
    expect(prisma.constructionProgressPayment.findFirst).not.toHaveBeenCalled();
  });

  it("does not write summary or audit when application persistence fails", async () => {
    transaction.constructionDeductionRuleApplication.create.mockRejectedValue(
      new Error("database unavailable"),
    );
    const adapter = createConstructionDeductionRuleApplicationPrismaAdapter(
      prisma as unknown as PrismaClient,
    );

    await expect(adapter.apply({ paymentId: payment.id, scope })).resolves.toEqual({
      ok: false,
      errors: ["Kesinti kuralları atomik olarak uygulanamadı."],
    });
    expect(transaction.constructionProgressPayment.update).not.toHaveBeenCalled();
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects locked payments before evaluating rules", async () => {
    payment.status = "APPROVED";
    const adapter = createConstructionDeductionRuleApplicationPrismaAdapter(
      prisma as unknown as PrismaClient,
    );

    await expect(adapter.apply({ paymentId: payment.id, scope })).resolves.toEqual({
      ok: false,
      errors: ["Kesinti kuralları yalnız taslak veya iade edilmiş hakedişte uygulanabilir."],
    });
    expect(transaction.constructionDeductionRule.findMany).not.toHaveBeenCalled();
  });
});
