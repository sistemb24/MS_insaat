import type { TenantScope } from "./tenant-scope";
import type {
  ConstructionDeductionBaseType,
  ConstructionDeductionCalculationType,
  ConstructionDeductionRuleDefinition,
  ConstructionDeductionTaxMode,
} from "./construction-deduction-rule-service";

type DecimalLike = number | { toNumber(): number };
type DateLike = Date | string;

type ConstructionDeductionRuleRecord = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  projectId: string;
  ruleKey: string;
  code: string;
  name: string;
  category: string;
  description: string | null;
  revisionNo: number;
  calculationType: string;
  baseType: string | null;
  rate: DecimalLike | null;
  fixedAmount: DecimalLike | null;
  minimumAmount: DecimalLike | null;
  maximumAmount: DecimalLike | null;
  taxMode: string;
  taxRate: DecimalLike;
  priority: number;
  effectiveFrom: DateLike;
  effectiveTo: DateLike | null;
  isActive: boolean;
  autoApply: boolean;
  supersedesRuleId: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: DateLike;
  updatedAt: DateLike;
};

type ConstructionDeductionRuleApplicationRecord = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  progressPaymentId: string;
  deductionRuleId: string;
  deductionMovementId: string;
  ruleKey: string;
  ruleCode: string;
  ruleName: string;
  ruleRevisionNo: number;
  calculationType: string;
  baseType: string | null;
  baseAmount: DecimalLike;
  rate: DecimalLike | null;
  fixedAmount: DecimalLike | null;
  minimumAmount: DecimalLike | null;
  maximumAmount: DecimalLike | null;
  taxMode: string;
  taxRate: DecimalLike;
  taxAmount: DecimalLike;
  netAmount: DecimalLike;
  totalAmount: DecimalLike;
  applicationKey: string;
  appliedBy: string;
  updatedBy: string;
  appliedAt: DateLike;
  updatedAt: DateLike;
};

type RuleCreateData = ReturnType<typeof ruleCreateData>;

type ConstructionDeductionRuleClient = {
  create(input: { data: RuleCreateData }): Promise<ConstructionDeductionRuleRecord>;
  findMany(input: {
    where: Record<string, unknown>;
    orderBy: Array<Record<string, "asc" | "desc">>;
  }): Promise<ConstructionDeductionRuleRecord[]>;
  updateMany(input: {
    where: Record<string, unknown>;
    data: { isActive: boolean; updatedBy: string; updatedAt: Date };
  }): Promise<{ count: number }>;
};

type ConstructionDeductionRuleApplicationClient = {
  findFirst(input: {
    where: Record<string, unknown>;
  }): Promise<ConstructionDeductionRuleApplicationRecord | null>;
  findMany(input: {
    where: Record<string, unknown>;
    orderBy: Array<Record<string, "asc" | "desc">>;
  }): Promise<ConstructionDeductionRuleApplicationRecord[]>;
};

export type ConstructionDeductionRulePrismaClientLike = {
  constructionDeductionRule: ConstructionDeductionRuleClient;
  constructionDeductionRuleApplication: ConstructionDeductionRuleApplicationClient;
};

export type ConstructionDeductionRuleRow = ConstructionDeductionRuleDefinition & {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  projectId: string;
  category: string;
  description: string | null;
  autoApply: boolean;
  supersedesRuleId: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ConstructionDeductionRuleApplicationRow = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  progressPaymentId: string;
  deductionRuleId: string;
  deductionMovementId: string;
  ruleKey: string;
  ruleCode: string;
  ruleName: string;
  ruleRevisionNo: number;
  calculationType: ConstructionDeductionCalculationType;
  baseType: ConstructionDeductionBaseType | null;
  baseAmount: number;
  rate: number | null;
  fixedAmount: number | null;
  minimumAmount: number | null;
  maximumAmount: number | null;
  taxMode: ConstructionDeductionTaxMode;
  taxRate: number;
  taxAmount: number;
  netAmount: number;
  totalAmount: number;
  applicationKey: string;
  appliedBy: string;
  updatedBy: string;
  appliedAt: string;
  updatedAt: string;
};

export type ConstructionDeductionRuleRevisionCreate = {
  id: string;
  projectId: string;
  category: string;
  description?: string | null;
  supersedesRuleId?: string | null;
  definition: ConstructionDeductionRuleDefinition;
  autoApply: boolean;
  createdAt: string;
};

export function createConstructionDeductionRulePrismaRepository(
  prisma: ConstructionDeductionRulePrismaClientLike,
) {
  return {
    async createRevision(input: {
      scope: TenantScope;
      revision: ConstructionDeductionRuleRevisionCreate;
    }) {
      const record = await prisma.constructionDeductionRule.create({
        data: ruleCreateData(input),
      });
      return ruleRecordToRow(record);
    },

    async deactivateRevision(input: {
      scope: TenantScope;
      projectId: string;
      ruleId: string;
      updatedAt: string;
    }) {
      const result = await prisma.constructionDeductionRule.updateMany({
        where: {
          id: input.ruleId,
          projectId: input.projectId,
          tenantId: input.scope.tenantId,
          companyId: input.scope.companyId,
          periodId: input.scope.periodId,
        },
        data: {
          isActive: false,
          updatedBy: input.scope.userId,
          updatedAt: new Date(input.updatedAt),
        },
      });
      return result.count === 1;
    },

    async findApplicationByKey(input: {
      scope: TenantScope;
      applicationKey: string;
    }) {
      const record = await prisma.constructionDeductionRuleApplication.findFirst({
        where: {
          applicationKey: input.applicationKey,
          tenantId: input.scope.tenantId,
          companyId: input.scope.companyId,
          periodId: input.scope.periodId,
        },
      });
      return record ? applicationRecordToRow(record) : null;
    },

    async listEffectiveProjectRules(input: {
      scope: TenantScope;
      projectId: string;
      paymentPeriodEnd: string;
    }) {
      const paymentPeriodEnd = new Date(input.paymentPeriodEnd);
      const records = await prisma.constructionDeductionRule.findMany({
        where: {
          projectId: input.projectId,
          tenantId: input.scope.tenantId,
          companyId: input.scope.companyId,
          periodId: input.scope.periodId,
          isActive: true,
          effectiveFrom: { lte: paymentPeriodEnd },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: paymentPeriodEnd } }],
        },
        orderBy: [{ priority: "asc" }, { code: "asc" }, { revisionNo: "desc" }],
      });
      return records.map(ruleRecordToRow);
    },

    async listPaymentApplications(input: {
      scope: TenantScope;
      progressPaymentId: string;
    }) {
      const records = await prisma.constructionDeductionRuleApplication.findMany({
        where: {
          progressPaymentId: input.progressPaymentId,
          tenantId: input.scope.tenantId,
          companyId: input.scope.companyId,
          periodId: input.scope.periodId,
        },
        orderBy: [{ appliedAt: "asc" }, { ruleCode: "asc" }],
      });
      return records.map(applicationRecordToRow);
    },

    async listProjectRules(input: { scope: TenantScope; projectId: string }) {
      const records = await prisma.constructionDeductionRule.findMany({
        where: {
          projectId: input.projectId,
          tenantId: input.scope.tenantId,
          companyId: input.scope.companyId,
          periodId: input.scope.periodId,
        },
        orderBy: [{ code: "asc" }, { revisionNo: "desc" }],
      });
      return records.map(ruleRecordToRow);
    },
  };
}

function ruleCreateData(input: {
  scope: TenantScope;
  revision: ConstructionDeductionRuleRevisionCreate;
}) {
  const { definition, ...revision } = input.revision;
  return {
    id: revision.id,
    tenantId: input.scope.tenantId,
    companyId: input.scope.companyId,
    periodId: input.scope.periodId,
    projectId: revision.projectId,
    ruleKey: definition.ruleKey,
    code: definition.code,
    name: definition.name,
    category: revision.category,
    description: revision.description ?? null,
    revisionNo: definition.revisionNo,
    calculationType: definition.calculationType,
    baseType: definition.baseType ?? null,
    rate: definition.rate ?? null,
    fixedAmount: definition.fixedAmount ?? null,
    minimumAmount: definition.minimumAmount ?? null,
    maximumAmount: definition.maximumAmount ?? null,
    taxMode: definition.taxMode,
    taxRate: definition.taxRate ?? 0,
    priority: definition.priority,
    effectiveFrom: new Date(definition.effectiveFrom),
    effectiveTo: definition.effectiveTo ? new Date(definition.effectiveTo) : null,
    isActive: definition.isActive,
    autoApply: revision.autoApply,
    supersedesRuleId: revision.supersedesRuleId ?? null,
    createdBy: input.scope.userId,
    updatedBy: input.scope.userId,
    createdAt: new Date(revision.createdAt),
    updatedAt: new Date(revision.createdAt),
  };
}

function ruleRecordToRow(record: ConstructionDeductionRuleRecord): ConstructionDeductionRuleRow {
  return {
    id: record.id,
    tenantId: record.tenantId,
    companyId: record.companyId,
    periodId: record.periodId,
    projectId: record.projectId,
    ruleKey: record.ruleKey,
    code: record.code,
    name: record.name,
    category: record.category,
    description: record.description,
    revisionNo: record.revisionNo,
    calculationType: record.calculationType as ConstructionDeductionCalculationType,
    baseType: record.baseType as ConstructionDeductionBaseType | null,
    rate: nullableNumber(record.rate),
    fixedAmount: nullableNumber(record.fixedAmount),
    minimumAmount: nullableNumber(record.minimumAmount),
    maximumAmount: nullableNumber(record.maximumAmount),
    taxMode: record.taxMode as ConstructionDeductionTaxMode,
    taxRate: numberValue(record.taxRate),
    priority: record.priority,
    effectiveFrom: iso(record.effectiveFrom),
    effectiveTo: record.effectiveTo ? iso(record.effectiveTo) : null,
    isActive: record.isActive,
    autoApply: record.autoApply,
    supersedesRuleId: record.supersedesRuleId,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
  };
}

function applicationRecordToRow(
  record: ConstructionDeductionRuleApplicationRecord,
): ConstructionDeductionRuleApplicationRow {
  return {
    ...record,
    calculationType: record.calculationType as ConstructionDeductionCalculationType,
    baseType: record.baseType as ConstructionDeductionBaseType | null,
    baseAmount: numberValue(record.baseAmount),
    rate: nullableNumber(record.rate),
    fixedAmount: nullableNumber(record.fixedAmount),
    minimumAmount: nullableNumber(record.minimumAmount),
    maximumAmount: nullableNumber(record.maximumAmount),
    taxMode: record.taxMode as ConstructionDeductionTaxMode,
    taxRate: numberValue(record.taxRate),
    taxAmount: numberValue(record.taxAmount),
    netAmount: numberValue(record.netAmount),
    totalAmount: numberValue(record.totalAmount),
    appliedAt: iso(record.appliedAt),
    updatedAt: iso(record.updatedAt),
  };
}

function nullableNumber(value: DecimalLike | null) {
  return value === null ? null : numberValue(value);
}

function numberValue(value: DecimalLike) {
  return typeof value === "number" ? value : value.toNumber();
}

function iso(value: DateLike) {
  return typeof value === "string" ? new Date(value).toISOString() : value.toISOString();
}
