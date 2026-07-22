import { describe, expect, it, vi } from "vitest";

import {
  createConstructionDeductionRulePrismaRepository,
  type ConstructionDeductionRulePrismaClientLike,
} from "./construction-deduction-rule-prisma-repository";
import { defaultTenantScope } from "./tenant-scope";

const timestamp = new Date("2026-07-22T08:30:00.000Z");

function ruleRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "rule-1",
    tenantId: defaultTenantScope.tenantId,
    companyId: defaultTenantScope.companyId,
    periodId: defaultTenantScope.periodId,
    projectId: "project-1",
    ruleKey: "retention:project-1",
    code: "TEMINAT",
    name: "Teminat Kesintisi",
    category: "Teminat",
    description: "Mevcut teminat",
    revisionNo: 1,
    calculationType: "RATE",
    baseType: "PERIOD_NET_PLUS_EXTRAS",
    rate: { toNumber: () => 5 },
    fixedAmount: null,
    minimumAmount: null,
    maximumAmount: null,
    taxMode: "NONE",
    taxRate: { toNumber: () => 0 },
    priority: 10,
    effectiveFrom: timestamp,
    effectiveTo: null,
    isActive: true,
    autoApply: false,
    supersedesRuleId: null,
    createdBy: defaultTenantScope.userId,
    updatedBy: defaultTenantScope.userId,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function applicationRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "application-1",
    tenantId: defaultTenantScope.tenantId,
    companyId: defaultTenantScope.companyId,
    periodId: defaultTenantScope.periodId,
    progressPaymentId: "payment-1",
    deductionRuleId: "rule-1",
    deductionMovementId: "movement-1",
    ruleKey: "retention:project-1",
    ruleCode: "TEMINAT",
    ruleName: "Teminat Kesintisi",
    ruleRevisionNo: 1,
    calculationType: "RATE",
    baseType: "PERIOD_NET_PLUS_EXTRAS",
    baseAmount: { toNumber: () => 100_000 },
    rate: { toNumber: () => 5 },
    fixedAmount: null,
    minimumAmount: null,
    maximumAmount: null,
    taxMode: "NONE",
    taxRate: { toNumber: () => 0 },
    taxAmount: { toNumber: () => 0 },
    netAmount: { toNumber: () => 5_000 },
    totalAmount: { toNumber: () => 5_000 },
    applicationKey: "tenant::company::period::payment-1::retention",
    appliedBy: defaultTenantScope.userId,
    updatedBy: defaultTenantScope.userId,
    appliedAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function setup() {
  const constructionDeductionRule = {
    create: vi.fn().mockResolvedValue(ruleRecord()),
    findMany: vi.fn().mockResolvedValue([ruleRecord()]),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const constructionDeductionRuleApplication = {
    findFirst: vi.fn().mockResolvedValue(applicationRecord()),
    findMany: vi.fn().mockResolvedValue([applicationRecord()]),
  };
  const repository = createConstructionDeductionRulePrismaRepository({
    constructionDeductionRule,
    constructionDeductionRuleApplication,
  } as unknown as ConstructionDeductionRulePrismaClientLike);
  return { repository, constructionDeductionRule, constructionDeductionRuleApplication };
}

describe("construction deduction rule Prisma repository", () => {
  it("lists project rules only inside tenant, company and period scope", async () => {
    const { repository, constructionDeductionRule } = setup();
    const rows = await repository.listProjectRules({
      scope: defaultTenantScope,
      projectId: "project-1",
    });

    expect(constructionDeductionRule.findMany).toHaveBeenCalledWith({
      where: {
        projectId: "project-1",
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      },
      orderBy: [{ code: "asc" }, { revisionNo: "desc" }],
    });
    expect(rows[0]).toEqual(expect.objectContaining({ rate: 5, taxRate: 0 }));
  });

  it("lists only active rules effective on the payment period end", async () => {
    const { repository, constructionDeductionRule } = setup();
    await repository.listEffectiveProjectRules({
      scope: defaultTenantScope,
      projectId: "project-1",
      paymentPeriodEnd: "2026-07-31T00:00:00.000Z",
    });

    const date = new Date("2026-07-31T00:00:00.000Z");
    expect(constructionDeductionRule.findMany).toHaveBeenCalledWith({
      where: {
        projectId: "project-1",
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
        isActive: true,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      orderBy: [{ priority: "asc" }, { code: "asc" }, { revisionNo: "desc" }],
    });
  });

  it("creates a revision with scope and actor fields supplied by the session", async () => {
    const { repository, constructionDeductionRule } = setup();
    await repository.createRevision({
      scope: defaultTenantScope,
      revision: {
        id: "rule-2",
        projectId: "project-1",
        category: "Teminat",
        description: "Revize teminat",
        supersedesRuleId: "rule-1",
        autoApply: false,
        createdAt: timestamp.toISOString(),
        definition: {
          ruleKey: "retention:project-1",
          code: "TEMINAT",
          name: "Teminat Kesintisi",
          revisionNo: 2,
          calculationType: "RATE",
          baseType: "PERIOD_NET_PLUS_EXTRAS",
          rate: 6,
          fixedAmount: null,
          minimumAmount: null,
          maximumAmount: null,
          taxMode: "NONE",
          taxRate: 0,
          priority: 10,
          effectiveFrom: "2026-08-01T00:00:00.000Z",
          effectiveTo: null,
          isActive: true,
        },
      },
    });

    expect(constructionDeductionRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "rule-2",
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
        projectId: "project-1",
        revisionNo: 2,
        rate: 6,
        supersedesRuleId: "rule-1",
        createdBy: defaultTenantScope.userId,
        updatedBy: defaultTenantScope.userId,
      }),
    });
  });

  it("deactivates a revision only through a fully scoped update", async () => {
    const { repository, constructionDeductionRule } = setup();
    await expect(
      repository.deactivateRevision({
        scope: defaultTenantScope,
        projectId: "project-1",
        ruleId: "rule-1",
        updatedAt: timestamp.toISOString(),
      }),
    ).resolves.toBe(true);

    expect(constructionDeductionRule.updateMany).toHaveBeenCalledWith({
      where: {
        id: "rule-1",
        projectId: "project-1",
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      },
      data: {
        isActive: false,
        updatedBy: defaultTenantScope.userId,
        updatedAt: timestamp,
      },
    });
  });

  it("reads applications only inside the active accounting scope", async () => {
    const { repository, constructionDeductionRuleApplication } = setup();
    const rows = await repository.listPaymentApplications({
      scope: defaultTenantScope,
      progressPaymentId: "payment-1",
    });
    const existing = await repository.findApplicationByKey({
      scope: defaultTenantScope,
      applicationKey: "tenant::company::period::payment-1::retention",
    });

    expect(constructionDeductionRuleApplication.findMany).toHaveBeenCalledWith({
      where: {
        progressPaymentId: "payment-1",
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      },
      orderBy: [{ appliedAt: "asc" }, { ruleCode: "asc" }],
    });
    expect(constructionDeductionRuleApplication.findFirst).toHaveBeenCalledWith({
      where: {
        applicationKey: "tenant::company::period::payment-1::retention",
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      },
    });
    expect(rows[0]).toEqual(expect.objectContaining({ totalAmount: 5_000 }));
    expect(existing).toEqual(expect.objectContaining({ applicationKey: expect.any(String) }));
  });
});
