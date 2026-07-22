"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

import { createConstructionDeductionRuleApplicationPrismaAdapter } from "@/lib/construction-deduction-rule-application-prisma-adapter";
import {
  validateConstructionDeductionRule,
  type ConstructionDeductionBaseType,
  type ConstructionDeductionCalculationType,
  type ConstructionDeductionTaxMode,
} from "@/lib/construction-deduction-rule-service";
import { prisma } from "@/lib/prisma";
import { getSubscriptionFeatureActionContext } from "./subscription-feature-action-guard";

const adapter = createConstructionDeductionRuleApplicationPrismaAdapter(prisma);

export type ConstructionDeductionRuleRevisionInput = {
  projectId: string;
  supersedesRuleId?: string | null;
  code: string;
  name: string;
  category: string;
  description?: string | null;
  calculationType: ConstructionDeductionCalculationType;
  baseType?: ConstructionDeductionBaseType | null;
  rate?: number | null;
  fixedAmount?: number | null;
  minimumAmount?: number | null;
  maximumAmount?: number | null;
  taxMode: ConstructionDeductionTaxMode;
  taxRate?: number | null;
  priority: number;
  effectiveFrom: string;
};

export async function listConstructionDeductionRulesAction(projectId: string) {
  const context = await getSubscriptionFeatureActionContext("progress-payments");
  if (!context.ok) return context.result;
  const project = await prisma.constructionProject.findFirst({
    where: {
      id: projectId,
      tenantId: context.scope.tenantId,
      companyId: context.scope.companyId,
      periodId: context.scope.periodId,
    },
    select: { id: true },
  });
  if (!project) return { ok: false as const, errors: ["İnşaat projesi bulunamadı."] };
  const rows = await prisma.constructionDeductionRule.findMany({
    where: {
      projectId,
      tenantId: context.scope.tenantId,
      companyId: context.scope.companyId,
      periodId: context.scope.periodId,
    },
    orderBy: [{ code: "asc" }, { revisionNo: "desc" }],
  });
  return {
    ok: true as const,
    data: {
      canManage: context.scope.userRole === "admin",
      rows: rows.map(ruleDto),
    },
  };
}

export async function createConstructionDeductionRuleRevisionAction(
  input: ConstructionDeductionRuleRevisionInput,
) {
  const context = await getSubscriptionFeatureActionContext("progress-payments");
  if (!context.ok) return context.result;
  if (context.scope.userRole !== "admin") {
    return { ok: false as const, errors: ["Kesinti kuralı yönetimi için yönetici yetkisi gereklidir."] };
  }
  const project = await prisma.constructionProject.findFirst({
    where: {
      id: input.projectId,
      tenantId: context.scope.tenantId,
      companyId: context.scope.companyId,
      periodId: context.scope.periodId,
    },
    select: { id: true, status: true },
  });
  if (!project) return { ok: false as const, errors: ["İnşaat projesi bulunamadı."] };
  if (project.status !== "OPEN") return { ok: false as const, errors: ["Kapalı projede kesinti kuralı yönetilemez."] };
  if (!input.category.trim()) return { ok: false as const, errors: ["Kesinti kuralı kategorisi zorunludur."] };
  const period = await prisma.period.findFirst({
    where: {
      id: context.scope.periodId,
      tenantId: context.scope.tenantId,
      companyId: context.scope.companyId,
    },
    select: { isClosed: true },
  });
  if (!period) return { ok: false as const, errors: ["Aktif mali dönem bulunamadı."] };
  if (period.isClosed) return { ok: false as const, errors: ["Kapalı dönemde kesinti kuralı değiştirilemez."] };

  const superseded = input.supersedesRuleId
    ? await prisma.constructionDeductionRule.findFirst({
        where: {
          id: input.supersedesRuleId,
          projectId: input.projectId,
          tenantId: context.scope.tenantId,
          companyId: context.scope.companyId,
          periodId: context.scope.periodId,
          isActive: true,
        },
      })
    : null;
  if (input.supersedesRuleId && !superseded) {
    return { ok: false as const, errors: ["Revize edilecek aktif kesinti kuralı bulunamadı."] };
  }

  const effectiveFrom = new Date(input.effectiveFrom);
  if (Number.isNaN(effectiveFrom.getTime())) {
    return { ok: false as const, errors: ["Kural geçerlilik başlangıcı geçersizdir."] };
  }
  if (superseded && effectiveFrom <= superseded.effectiveFrom) {
    return { ok: false as const, errors: ["Yeni revizyon önceki revizyondan sonra başlamalıdır."] };
  }

  const definition = {
    ruleKey: superseded?.ruleKey ?? `deduction:${input.projectId}:${normalizeRuleCode(input.code)}`,
    code: superseded?.code ?? input.code.trim(),
    name: input.name.trim(),
    revisionNo: (superseded?.revisionNo ?? 0) + 1,
    calculationType: input.calculationType,
    baseType: input.calculationType === "RATE" ? input.baseType ?? null : null,
    rate: input.calculationType === "RATE" ? input.rate ?? null : null,
    fixedAmount: input.calculationType === "FIXED" ? input.fixedAmount ?? null : null,
    minimumAmount: input.minimumAmount ?? null,
    maximumAmount: input.maximumAmount ?? null,
    taxMode: input.taxMode,
    taxRate: input.taxMode === "VAT_ADD" ? input.taxRate ?? 0 : 0,
    priority: input.priority,
    effectiveFrom: effectiveFrom.toISOString(),
    effectiveTo: null,
    isActive: true,
  };
  const errors = validateConstructionDeductionRule(definition);
  if (errors.length) return { ok: false as const, errors };

  const createdAt = new Date();
  const created = await prisma.$transaction(async (transaction) => {
    const currentPeriod = await transaction.period.findFirst({
      where: {
        id: context.scope.periodId,
        tenantId: context.scope.tenantId,
        companyId: context.scope.companyId,
      },
      select: { isClosed: true },
    });
    if (!currentPeriod || currentPeriod.isClosed) throw new RuleMutationAbort("Kapalı dönemde kesinti kuralı değiştirilemez.");
    if (superseded) {
      const closed = await transaction.constructionDeductionRule.updateMany({
        where: {
          id: superseded.id,
          projectId: input.projectId,
          tenantId: context.scope.tenantId,
          companyId: context.scope.companyId,
          periodId: context.scope.periodId,
          isActive: true,
        },
        data: {
          effectiveTo: new Date(effectiveFrom.getTime() - 1),
          updatedBy: context.scope.userId,
        },
      });
      if (closed.count !== 1) throw new RuleMutationAbort("Kesinti kuralı başka bir işlemle değiştirildi; yenileyip tekrar deneyin.");
    }
    const row = await transaction.constructionDeductionRule.create({
      data: {
        id: randomUUID(),
        tenantId: context.scope.tenantId,
        companyId: context.scope.companyId,
        periodId: context.scope.periodId,
        projectId: input.projectId,
        ...definition,
        effectiveFrom,
        effectiveTo: null,
        category: input.category.trim(),
        description: input.description?.trim() || null,
        autoApply: false,
        supersedesRuleId: superseded?.id ?? null,
        createdBy: context.scope.userId,
        updatedBy: context.scope.userId,
        createdAt,
        updatedAt: createdAt,
      },
    });
    await transaction.auditLog.create({
      data: {
        tenantId: context.scope.tenantId,
        companyId: context.scope.companyId,
        periodId: context.scope.periodId,
        actorUserId: context.scope.userId,
        action: superseded ? "construction-deduction-rule.revised" : "construction-deduction-rule.created",
        entityType: "construction-deduction-rule",
        entityId: row.id,
        entityLabel: `${row.code} · REV-${row.revisionNo}`,
        occurredAt: createdAt,
        metadata: {
          projectId: input.projectId,
          ruleKey: row.ruleKey,
          revisionNo: row.revisionNo,
          supersedesRuleId: superseded?.id ?? null,
        },
      },
    });
    return row;
  }).catch((error: unknown) => error instanceof RuleMutationAbort ? error : null);
  if (!created || created instanceof RuleMutationAbort) {
    return { ok: false as const, errors: [created?.message ?? "Kesinti kuralı kaydedilemedi."] };
  }
  revalidatePath("/hakedis");
  return { ok: true as const, data: ruleDto(created) };
}

export async function deactivateConstructionDeductionRuleAction(input: {
  projectId: string;
  ruleId: string;
}) {
  const context = await getSubscriptionFeatureActionContext("progress-payments");
  if (!context.ok) return context.result;
  if (context.scope.userRole !== "admin") {
    return { ok: false as const, errors: ["Kesinti kuralı yönetimi için yönetici yetkisi gereklidir."] };
  }
  const result = await prisma.$transaction(async (transaction) => {
    const period = await transaction.period.findFirst({
      where: { id: context.scope.periodId, tenantId: context.scope.tenantId, companyId: context.scope.companyId },
      select: { isClosed: true },
    });
    if (!period || period.isClosed) throw new RuleMutationAbort("Kapalı dönemde kesinti kuralı değiştirilemez.");
    const updatedAt = new Date();
    const updated = await transaction.constructionDeductionRule.updateMany({
      where: {
        id: input.ruleId,
        projectId: input.projectId,
        tenantId: context.scope.tenantId,
        companyId: context.scope.companyId,
        periodId: context.scope.periodId,
        isActive: true,
      },
      data: { isActive: false, updatedBy: context.scope.userId, updatedAt },
    });
    if (updated.count !== 1) throw new RuleMutationAbort("Aktif kesinti kuralı bulunamadı.");
    await transaction.auditLog.create({
      data: {
        tenantId: context.scope.tenantId,
        companyId: context.scope.companyId,
        periodId: context.scope.periodId,
        actorUserId: context.scope.userId,
        action: "construction-deduction-rule.deactivated",
        entityType: "construction-deduction-rule",
        entityId: input.ruleId,
        entityLabel: input.ruleId,
        occurredAt: updatedAt,
        metadata: { projectId: input.projectId },
      },
    });
    return true;
  }).catch((error: unknown) => error instanceof RuleMutationAbort ? error : null);
  if (result !== true) return { ok: false as const, errors: [result instanceof RuleMutationAbort ? result.message : "Kesinti kuralı pasifleştirilemedi."] };
  revalidatePath("/hakedis");
  return { ok: true as const, data: { id: input.ruleId } };
}

export async function previewConstructionDeductionRulesAction(paymentId: string) {
  const context = await getSubscriptionFeatureActionContext("progress-payments");
  if (!context.ok) return context.result;
  return adapter.preview({ paymentId, scope: context.scope });
}

export async function applyConstructionDeductionRulesAction(paymentId: string) {
  const context = await getSubscriptionFeatureActionContext("progress-payments");
  if (!context.ok) return context.result;
  const result = await adapter.apply({ paymentId, scope: context.scope });
  if (result.ok) revalidatePath("/hakedis");
  return result;
}

class RuleMutationAbort extends Error {}

function normalizeRuleCode(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR").replaceAll("ı", "i").replaceAll("ş", "s").replaceAll("ğ", "g").replaceAll("ü", "u").replaceAll("ö", "o").replaceAll("ç", "c").replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

function ruleDto(row: {
  id: string;
  ruleKey: string;
  code: string;
  name: string;
  category: string;
  description: string | null;
  revisionNo: number;
  calculationType: string;
  baseType: string | null;
  rate: unknown;
  fixedAmount: unknown;
  minimumAmount: unknown;
  maximumAmount: unknown;
  taxMode: string;
  taxRate: unknown;
  priority: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isActive: boolean;
  autoApply: boolean;
}) {
  return {
    id: row.id,
    ruleKey: row.ruleKey,
    code: row.code,
    name: row.name,
    category: row.category,
    description: row.description,
    revisionNo: row.revisionNo,
    calculationType: row.calculationType as ConstructionDeductionCalculationType,
    baseType: row.baseType as ConstructionDeductionBaseType | null,
    rate: nullableNumber(row.rate),
    fixedAmount: nullableNumber(row.fixedAmount),
    minimumAmount: nullableNumber(row.minimumAmount),
    maximumAmount: nullableNumber(row.maximumAmount),
    taxMode: row.taxMode as ConstructionDeductionTaxMode,
    taxRate: Number(row.taxRate),
    priority: row.priority,
    effectiveFrom: row.effectiveFrom.toISOString(),
    effectiveTo: row.effectiveTo?.toISOString() ?? null,
    isActive: row.isActive,
    autoApply: row.autoApply,
  };
}

function nullableNumber(value: unknown) {
  return value === null || value === undefined ? null : Number(value);
}
