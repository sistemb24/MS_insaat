CREATE TABLE "ConstructionDeductionRule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "ruleKey" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "revisionNo" INTEGER NOT NULL,
  "calculationType" TEXT NOT NULL,
  "baseType" TEXT,
  "rate" DECIMAL(9,4),
  "fixedAmount" DECIMAL(18,2),
  "minimumAmount" DECIMAL(18,2),
  "maximumAmount" DECIMAL(18,2),
  "taxMode" TEXT NOT NULL DEFAULT 'NONE',
  "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "autoApply" BOOLEAN NOT NULL DEFAULT false,
  "supersedesRuleId" TEXT,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConstructionDeductionRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionDeductionRuleApplication" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "progressPaymentId" TEXT NOT NULL,
  "deductionRuleId" TEXT NOT NULL,
  "deductionMovementId" TEXT NOT NULL,
  "ruleKey" TEXT NOT NULL,
  "ruleCode" TEXT NOT NULL,
  "ruleName" TEXT NOT NULL,
  "ruleRevisionNo" INTEGER NOT NULL,
  "calculationType" TEXT NOT NULL,
  "baseType" TEXT,
  "baseAmount" DECIMAL(18,2) NOT NULL,
  "rate" DECIMAL(9,4),
  "fixedAmount" DECIMAL(18,2),
  "minimumAmount" DECIMAL(18,2),
  "maximumAmount" DECIMAL(18,2),
  "taxMode" TEXT NOT NULL,
  "taxRate" DECIMAL(5,2) NOT NULL,
  "taxAmount" DECIMAL(18,2) NOT NULL,
  "netAmount" DECIMAL(18,2) NOT NULL,
  "totalAmount" DECIMAL(18,2) NOT NULL,
  "applicationKey" TEXT NOT NULL,
  "appliedBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConstructionDeductionRuleApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConstructionDeductionRule_project_key_revision_key" ON "ConstructionDeductionRule"("projectId", "ruleKey", "revisionNo");
CREATE UNIQUE INDEX "ConstructionDeductionRule_project_code_revision_key" ON "ConstructionDeductionRule"("projectId", "code", "revisionNo");
CREATE UNIQUE INDEX "ConstructionDeductionRule_supersedes_key" ON "ConstructionDeductionRule"("supersedesRuleId");
CREATE INDEX "ConstructionDeductionRule_scope_project_active_idx" ON "ConstructionDeductionRule"("tenantId", "companyId", "periodId", "projectId", "isActive");
CREATE INDEX "ConstructionDeductionRule_project_effective_idx" ON "ConstructionDeductionRule"("projectId", "effectiveFrom", "effectiveTo");

CREATE UNIQUE INDEX "ConstructionDeductionApplication_movement_key" ON "ConstructionDeductionRuleApplication"("deductionMovementId");
CREATE UNIQUE INDEX "ConstructionDeductionApplication_key_key" ON "ConstructionDeductionRuleApplication"("applicationKey");
CREATE UNIQUE INDEX "ConstructionDeductionApplication_payment_rule_key" ON "ConstructionDeductionRuleApplication"("progressPaymentId", "ruleKey");
CREATE INDEX "ConstructionDeductionApplication_scope_payment_idx" ON "ConstructionDeductionRuleApplication"("tenantId", "companyId", "periodId", "progressPaymentId");
CREATE INDEX "ConstructionDeductionApplication_rule_idx" ON "ConstructionDeductionRuleApplication"("deductionRuleId");

ALTER TABLE "ConstructionDeductionRule" ADD CONSTRAINT "ConstructionDeductionRule_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionDeductionRule" ADD CONSTRAINT "ConstructionDeductionRule_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionDeductionRule" ADD CONSTRAINT "ConstructionDeductionRule_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionDeductionRule" ADD CONSTRAINT "ConstructionDeductionRule_project_fkey" FOREIGN KEY ("projectId") REFERENCES "ConstructionProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionDeductionRule" ADD CONSTRAINT "ConstructionDeductionRule_supersedes_fkey" FOREIGN KEY ("supersedesRuleId") REFERENCES "ConstructionDeductionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ConstructionDeductionRuleApplication" ADD CONSTRAINT "ConstructionDeductionApplication_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionDeductionRuleApplication" ADD CONSTRAINT "ConstructionDeductionApplication_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionDeductionRuleApplication" ADD CONSTRAINT "ConstructionDeductionApplication_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionDeductionRuleApplication" ADD CONSTRAINT "ConstructionDeductionApplication_payment_fkey" FOREIGN KEY ("progressPaymentId") REFERENCES "ConstructionProgressPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionDeductionRuleApplication" ADD CONSTRAINT "ConstructionDeductionApplication_rule_fkey" FOREIGN KEY ("deductionRuleId") REFERENCES "ConstructionDeductionRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConstructionDeductionRuleApplication" ADD CONSTRAINT "ConstructionDeductionApplication_movement_fkey" FOREIGN KEY ("deductionMovementId") REFERENCES "ConstructionDeductionMovement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ConstructionDeductionRule" (
  "id", "tenantId", "companyId", "periodId", "projectId", "ruleKey", "code",
  "name", "category", "description", "revisionNo", "calculationType",
  "baseType", "rate", "fixedAmount", "minimumAmount", "maximumAmount",
  "taxMode", "taxRate", "priority", "effectiveFrom", "effectiveTo",
  "isActive", "autoApply", "supersedesRuleId", "createdBy", "updatedBy",
  "createdAt", "updatedAt"
)
SELECT
  'cdr_' || md5(concat_ws(':', project."tenantId", project."companyId", project."periodId", project."id", 'TEMINAT', '1')),
  project."tenantId",
  project."companyId",
  project."periodId",
  project."id",
  'retention:' || project."id",
  'TEMINAT',
  'Teminat Kesintisi',
  'Teminat',
  'ConstructionProject.retentionRate alanından taşınan teminat kuralı.',
  1,
  'RATE',
  'PERIOD_NET_PLUS_EXTRAS',
  project."retentionRate",
  NULL,
  NULL,
  NULL,
  'NONE',
  0,
  10,
  COALESCE(period."startsAt", project."createdAt"),
  NULL,
  true,
  false,
  NULL,
  project."createdBy",
  project."updatedBy",
  project."createdAt",
  project."updatedAt"
FROM "ConstructionProject" project
INNER JOIN "Period" period ON period."id" = project."periodId"
  AND period."tenantId" = project."tenantId"
  AND period."companyId" = project."companyId"
WHERE project."retentionRate" > 0
ON CONFLICT ("projectId", "ruleKey", "revisionNo") DO NOTHING;
