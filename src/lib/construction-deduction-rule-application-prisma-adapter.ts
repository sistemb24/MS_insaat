/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma transaction payloads are narrowed at this persistence boundary. */
import type { PrismaClient } from "@prisma/client";

import {
  buildConstructionDeductionApplicationKey,
  evaluateConstructionDeductionRules,
  type ConstructionDeductionRuleDefinition,
  type ConstructionDeductionRuleEvaluationRow,
} from "./construction-deduction-rule-service";
import {
  calculateConstructionSupplementarySummary,
  roundMoney,
} from "./construction-progress-payment-service";
import type { TenantScope } from "./tenant-scope";

type RuleApplicationResult =
  | {
      ok: true;
      data: {
        paymentId: string;
        rows: ConstructionDeductionRuleEvaluationRow[];
        periodPayableBeforeRules: number;
        periodPayableTotal: number;
        totalRuleDeduction: number;
        createdCount: number;
        updatedCount: number;
      };
    }
  | { ok: false; errors: string[] };

class RuleApplicationAbort extends Error {
  constructor(readonly errors: string[]) {
    super(errors.join(" "));
  }
}

export function createConstructionDeductionRuleApplicationPrismaAdapter(
  prisma: PrismaClient,
) {
  return {
    async preview(input: {
      paymentId: string;
      scope: TenantScope;
    }): Promise<RuleApplicationResult> {
      try {
        assertAuthorized(input.scope);
        const payment = await loadPayment(prisma, input);
        if (!payment) abort("Kümülatif hakediş bulunamadı.");
        assertEditable(payment.status);
        const evaluated = await evaluatePayment(prisma, payment, input.scope);
        return successResult(payment.id, evaluated, 0, 0);
      } catch (error) {
        return failureResult(error, "Kesinti kuralları önizlenemedi.");
      }
    },

    async apply(input: {
      paymentId: string;
      scope: TenantScope;
    }): Promise<RuleApplicationResult> {
      try {
        assertAuthorized(input.scope);
        return await prisma.$transaction(async (transaction) => {
          const period = await transaction.period.findFirst({
            where: {
              id: input.scope.periodId,
              tenantId: input.scope.tenantId,
              companyId: input.scope.companyId,
            },
            select: { isClosed: true },
          });
          if (!period) abort("Aktif mali dönem bulunamadı.");
          if (period.isClosed) abort("Kapalı dönemde kesinti kuralı uygulanamaz.");

          const payment = await loadPayment(transaction, input);
          if (!payment) abort("Kümülatif hakediş bulunamadı.");
          assertEditable(payment.status);
          const evaluated = await evaluatePayment(transaction, payment, input.scope);
          const rules = await loadEffectiveRules(transaction, payment, input.scope);
          const ruleByKey = new Map(rules.map((rule: any) => [rule.ruleKey, rule]));
          const evaluatedKeys = new Set(evaluated.rows.map((row) => row.ruleKey));
          const staleApplications = payment.deductionRuleApplications.filter(
            (application: any) => !evaluatedKeys.has(application.ruleKey),
          );
          if (staleApplications.length) {
            abort(
              "Hakedişte artık geçerli olmayan kural uygulaması var. Silme veya mahsup işlemi için ayrı bir ters kayıt süreci kullanılmalıdır.",
            );
          }

          let createdCount = 0;
          let updatedCount = 0;
          const appliedAt = new Date();
          for (const row of evaluated.rows) {
            const rule = ruleByKey.get(row.ruleKey) as any;
            if (!rule) abort(`${row.code}: kural revizyonu bulunamadı.`);
            const existing = payment.deductionRuleApplications.find(
              (application: any) => application.ruleKey === row.ruleKey,
            );
            const applicationKey = buildConstructionDeductionApplicationKey({
              tenantId: input.scope.tenantId,
              companyId: input.scope.companyId,
              periodId: input.scope.periodId,
              progressPaymentId: payment.id,
              ruleKey: row.ruleKey,
            });
            if (existing && applicationMatches(existing, row, rule.id, applicationKey)) {
              continue;
            }

            if (existing) {
              await transaction.constructionDeductionMovement.update({
                where: { id: existing.deductionMovementId },
                data: movementUpdateData(row, rule, payment, input.scope),
              });
              await transaction.constructionDeductionRuleApplication.update({
                where: { id: existing.id },
                data: applicationUpdateData(row, rule, applicationKey, input.scope),
              });
              await writeAudit(transaction, {
                action: "construction-deduction-rule.recalculated",
                payment,
                row,
                scope: input.scope,
                occurredAt: appliedAt,
                beforeTotalAmount: Number(existing.totalAmount),
              });
              updatedCount += 1;
              continue;
            }

            const movement = await transaction.constructionDeductionMovement.create({
              data: movementCreateData(row, rule, payment, input.scope),
            });
            await transaction.constructionDeductionRuleApplication.create({
              data: {
                ...applicationUpdateData(row, rule, applicationKey, input.scope),
                tenantId: input.scope.tenantId,
                companyId: input.scope.companyId,
                periodId: input.scope.periodId,
                progressPaymentId: payment.id,
                deductionMovementId: movement.id,
                appliedBy: input.scope.userId,
                appliedAt,
              },
            });
            await writeAudit(transaction, {
              action: "construction-deduction-rule.applied",
              payment,
              row,
              scope: input.scope,
              occurredAt: appliedAt,
              beforeTotalAmount: null,
            });
            createdCount += 1;
          }

          const hasRetentionApplication = evaluated.rows.some(
            (row) => row.code.trim().toUpperCase() === "TEMINAT",
          );
          const supplementary = calculateConstructionSupplementarySummary({
            periodBaseTotal: Number(payment.periodNetTotal),
            automaticDeductionAmount: hasRetentionApplication
              ? 0
              : legacyRetentionAmount(payment),
            previous: previousSummary(payment.previousProgressPayment),
            extraWorks: payment.extraWorks.map((row: any) => ({
              amount: Number(row.periodAmount),
            })),
            deductions: [
              ...payment.deductionMovements
                .filter((row: any) => !row.ruleApplication)
                .map((row: any) => ({ amount: Number(row.totalAmount) })),
              ...evaluated.rows.map((row) => ({ amount: row.totalAmount })),
            ],
            financialMovements: payment.financialMovements.map((row: any) => ({
              amount: Number(row.amount),
              direction: row.direction,
            })),
          });
          if (!summaryMatches(payment, supplementary)) {
            await transaction.constructionProgressPayment.update({
              where: { id: payment.id },
              data: { ...supplementary, updatedBy: input.scope.userId },
            });
          }
          return successResult(payment.id, evaluated, createdCount, updatedCount);
        });
      } catch (error) {
        return failureResult(error, "Kesinti kuralları atomik olarak uygulanamadı.");
      }
    },
  };
}

async function loadPayment(client: any, input: { paymentId: string; scope: TenantScope }) {
  return client.constructionProgressPayment.findFirst({
    where: {
      id: input.paymentId,
      tenantId: input.scope.tenantId,
      companyId: input.scope.companyId,
      periodId: input.scope.periodId,
    },
    include: {
      project: true,
      previousProgressPayment: true,
      extraWorks: true,
      deductionMovements: { include: { ruleApplication: true } },
      deductionRuleApplications: true,
      financialMovements: true,
    },
  });
}

async function loadEffectiveRules(client: any, payment: any, scope: TenantScope) {
  return client.constructionDeductionRule.findMany({
    where: {
      tenantId: scope.tenantId,
      companyId: scope.companyId,
      periodId: scope.periodId,
      projectId: payment.projectId,
      isActive: true,
      effectiveFrom: { lte: payment.periodEnd },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: payment.periodEnd } }],
    },
    orderBy: [{ priority: "asc" }, { code: "asc" }, { revisionNo: "asc" }],
  });
}

async function evaluatePayment(client: any, payment: any, scope: TenantScope) {
  const rules = await loadEffectiveRules(client, payment, scope);
  const result = evaluateConstructionDeductionRules({
    rules: rules.map(ruleDefinition),
    paymentPeriodEnd: payment.periodEnd.toISOString(),
    periodNetTotal: Number(payment.periodNetTotal),
    extraWorkTotal: payment.extraWorks.reduce(
      (sum: number, row: any) => sum + Number(row.periodAmount),
      0,
    ),
    additionTotal: payment.financialMovements
      .filter((row: any) => row.direction === "ADDITION")
      .reduce((sum: number, row: any) => sum + Number(row.amount), 0),
    existingDeductionTotal:
      payment.deductionMovements
        .filter((row: any) => !row.ruleApplication)
        .reduce((sum: number, row: any) => sum + Number(row.totalAmount), 0) +
      payment.financialMovements
        .filter((row: any) => row.direction === "DEDUCTION")
        .reduce((sum: number, row: any) => sum + Number(row.amount), 0),
  });
  if (!result.ok) throw new RuleApplicationAbort(result.errors);
  return result.data;
}

function ruleDefinition(rule: any): ConstructionDeductionRuleDefinition {
  return {
    ruleKey: rule.ruleKey,
    code: rule.code,
    name: rule.name,
    revisionNo: rule.revisionNo,
    calculationType: rule.calculationType,
    baseType: rule.baseType,
    rate: nullableNumber(rule.rate),
    fixedAmount: nullableNumber(rule.fixedAmount),
    minimumAmount: nullableNumber(rule.minimumAmount),
    maximumAmount: nullableNumber(rule.maximumAmount),
    taxMode: rule.taxMode,
    taxRate: Number(rule.taxRate),
    priority: rule.priority,
    effectiveFrom: rule.effectiveFrom.toISOString(),
    effectiveTo: rule.effectiveTo?.toISOString() ?? null,
    isActive: rule.isActive,
  };
}

function movementCreateData(row: ConstructionDeductionRuleEvaluationRow, rule: any, payment: any, scope: TenantScope) {
  return {
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    progressPaymentId: payment.id,
    ...movementUpdateData(row, rule, payment, scope),
    createdBy: scope.userId,
  };
}

function movementUpdateData(row: ConstructionDeductionRuleEvaluationRow, rule: any, payment: any, scope: TenantScope) {
  return {
    category: rule.category,
    documentNo: null,
    movementDate: payment.periodEnd,
    description: `${row.name} · REV-${row.revisionNo}`,
    amount: row.netAmount,
    vatAmount: row.taxAmount,
    totalAmount: row.totalAmount,
    updatedBy: scope.userId,
  };
}

function applicationUpdateData(row: ConstructionDeductionRuleEvaluationRow, rule: any, applicationKey: string, scope: TenantScope) {
  return {
    deductionRuleId: rule.id,
    ruleKey: row.ruleKey,
    ruleCode: row.code,
    ruleName: row.name,
    ruleRevisionNo: row.revisionNo,
    calculationType: row.calculationType,
    baseType: row.baseType,
    baseAmount: row.baseAmount,
    rate: row.rate,
    fixedAmount: row.fixedAmount,
    minimumAmount: row.minimumAmount,
    maximumAmount: row.maximumAmount,
    taxMode: row.taxMode,
    taxRate: row.taxRate,
    taxAmount: row.taxAmount,
    netAmount: row.netAmount,
    totalAmount: row.totalAmount,
    applicationKey,
    updatedBy: scope.userId,
  };
}

function applicationMatches(existing: any, row: ConstructionDeductionRuleEvaluationRow, ruleId: string, applicationKey: string) {
  return existing.deductionRuleId === ruleId &&
    existing.applicationKey === applicationKey &&
    existing.ruleRevisionNo === row.revisionNo &&
    Number(existing.baseAmount) === row.baseAmount &&
    nullableNumber(existing.rate) === row.rate &&
    nullableNumber(existing.fixedAmount) === row.fixedAmount &&
    nullableNumber(existing.minimumAmount) === row.minimumAmount &&
    nullableNumber(existing.maximumAmount) === row.maximumAmount &&
    Number(existing.taxRate) === row.taxRate &&
    Number(existing.taxAmount) === row.taxAmount &&
    Number(existing.netAmount) === row.netAmount &&
    Number(existing.totalAmount) === row.totalAmount;
}

async function writeAudit(transaction: any, input: any) {
  await transaction.auditLog.create({
    data: {
      tenantId: input.scope.tenantId,
      companyId: input.scope.companyId,
      periodId: input.scope.periodId,
      actorUserId: input.scope.userId,
      action: input.action,
      entityType: "construction-deduction-rule-application",
      entityId: buildConstructionDeductionApplicationKey({
        tenantId: input.scope.tenantId,
        companyId: input.scope.companyId,
        periodId: input.scope.periodId,
        progressPaymentId: input.payment.id,
        ruleKey: input.row.ruleKey,
      }),
      entityLabel: `${input.payment.documentNo} · ${input.row.code}`,
      occurredAt: input.occurredAt,
      metadata: {
        progressPaymentId: input.payment.id,
        projectId: input.payment.projectId,
        ruleKey: input.row.ruleKey,
        ruleCode: input.row.code,
        ruleRevisionNo: input.row.revisionNo,
        beforeTotalAmount: input.beforeTotalAmount,
        afterTotalAmount: input.row.totalAmount,
      },
    },
  });
}

function legacyRetentionAmount(payment: any) {
  const extra = payment.extraWorks.reduce(
    (sum: number, row: any) => sum + Number(row.periodAmount),
    0,
  );
  const additions = payment.financialMovements
    .filter((row: any) => row.direction === "ADDITION")
    .reduce((sum: number, row: any) => sum + Number(row.amount), 0);
  return roundMoney(
    (Number(payment.periodNetTotal) + extra + additions) *
      Number(payment.project.retentionRate) /
      100,
  );
}

function previousSummary(previous: any) {
  return previous
    ? {
        cumulativeExtraWorkTotal: Number(previous.cumulativeExtraWorkTotal),
        cumulativeAdditionTotal: Number(previous.cumulativeAdditionTotal),
        cumulativeDeductionTotal: Number(previous.cumulativeDeductionTotal),
        cumulativePayableTotal: Number(previous.cumulativePayableTotal),
      }
    : undefined;
}

function summaryMatches(payment: any, summary: Record<string, number>) {
  return Object.entries(summary).every(
    ([field, value]) => Number(payment[field]) === value,
  );
}

function assertAuthorized(scope: TenantScope) {
  if (!["admin", "accounting"].includes(scope.userRole)) {
    abort("Kesinti kuralı işlemi için muhasebe yetkisi gereklidir.");
  }
}

function assertEditable(status: string) {
  if (!["DRAFT", "RETURNED"].includes(status)) {
    abort("Kesinti kuralları yalnız taslak veya iade edilmiş hakedişte uygulanabilir.");
  }
}

function nullableNumber(value: any): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function successResult(paymentId: string, evaluated: any, createdCount: number, updatedCount: number) {
  return {
    ok: true as const,
    data: { paymentId, ...evaluated, createdCount, updatedCount },
  };
}

function failureResult(error: unknown, fallback: string): RuleApplicationResult {
  return error instanceof RuleApplicationAbort
    ? { ok: false, errors: error.errors }
    : { ok: false, errors: [fallback] };
}

function abort(message: string): never {
  throw new RuleApplicationAbort([message]);
}
