CREATE TABLE "ConstructionProject" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "siteCode" TEXT NOT NULL,
  "siteName" TEXT NOT NULL,
  "contractNo" TEXT,
    "contractAmount" DECIMAL(18,2) NOT NULL,
    "paymentType" TEXT NOT NULL DEFAULT 'Taşeron Hakedişi',
    "counterpartyCode" TEXT,
    "counterpartyName" TEXT,
    "retentionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConstructionProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionContractItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "itemCode" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "contractQuantity" DECIMAL(18,4) NOT NULL,
  "unitPrice" DECIMAL(18,4) NOT NULL,
  "vatRate" DECIMAL(5,2) NOT NULL,
  "revisionNo" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConstructionContractItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionProgressPayment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "previousProgressPaymentId" TEXT,
  "sequenceNo" INTEGER NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'INTERIM',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "paymentDate" TIMESTAMP(3),
  "documentNo" TEXT NOT NULL,
  "description" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'TL',
  "periodGrossTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "periodVatTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "periodNetTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "cumulativeGrossTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "cumulativeVatTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "cumulativeNetTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "submittedBy" TEXT,
  "approvedBy" TEXT,
  "finalizedBy" TEXT,
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "finalizedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConstructionProgressPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionMeasurementLine" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "progressPaymentId" TEXT NOT NULL,
  "contractItemId" TEXT NOT NULL,
  "lineNo" INTEGER NOT NULL,
  "measurementType" TEXT NOT NULL DEFAULT 'GENERAL',
  "description" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL,
  "length" DECIMAL(18,4),
  "width" DECIMAL(18,4),
  "height" DECIMAL(18,4),
  "multiplier" DECIMAL(18,4) NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConstructionMeasurementLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionPaymentItemSnapshot" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "progressPaymentId" TEXT NOT NULL,
  "contractItemId" TEXT NOT NULL,
  "previousQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "periodQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "cumulativeQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "unitPrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "previousAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "periodAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "cumulativeAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "contractQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "exceededContract" BOOLEAN NOT NULL DEFAULT false,
  "calculationVersion" TEXT NOT NULL DEFAULT 'construction-v1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConstructionPaymentItemSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionApprovalEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "progressPaymentId" TEXT NOT NULL,
  "statusFrom" TEXT,
  "statusTo" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConstructionApprovalEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionAccountingLink" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "constructionPaymentId" TEXT NOT NULL,
  "progressPaymentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConstructionAccountingLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConstructionProject_scope_code_key" ON "ConstructionProject"("tenantId", "companyId", "periodId", "code");
CREATE INDEX "ConstructionProject_scope_status_idx" ON "ConstructionProject"("tenantId", "companyId", "periodId", "status");
CREATE UNIQUE INDEX "ConstructionContractItem_project_item_revision_key" ON "ConstructionContractItem"("projectId", "itemCode", "revisionNo");
CREATE INDEX "ConstructionContractItem_scope_project_idx" ON "ConstructionContractItem"("tenantId", "companyId", "periodId", "projectId");
CREATE UNIQUE INDEX "ConstructionProgressPayment_project_sequence_key" ON "ConstructionProgressPayment"("projectId", "sequenceNo");
CREATE UNIQUE INDEX "ConstructionProgressPayment_scope_document_key" ON "ConstructionProgressPayment"("tenantId", "companyId", "periodId", "documentNo");
CREATE INDEX "ConstructionProgressPayment_scope_project_status_idx" ON "ConstructionProgressPayment"("tenantId", "companyId", "periodId", "projectId", "status");
CREATE INDEX "ConstructionProgressPayment_previous_idx" ON "ConstructionProgressPayment"("previousProgressPaymentId");
CREATE UNIQUE INDEX "ConstructionProgressPayment_active_draft_key" ON "ConstructionProgressPayment"("projectId") WHERE "status" IN ('DRAFT', 'SUBMITTED', 'RETURNED');
CREATE UNIQUE INDEX "ConstructionMeasurementLine_payment_line_key" ON "ConstructionMeasurementLine"("progressPaymentId", "lineNo");
CREATE INDEX "ConstructionMeasurementLine_scope_payment_idx" ON "ConstructionMeasurementLine"("tenantId", "companyId", "periodId", "progressPaymentId");
CREATE INDEX "ConstructionMeasurementLine_item_idx" ON "ConstructionMeasurementLine"("contractItemId");
CREATE UNIQUE INDEX "ConstructionSnapshot_payment_item_key" ON "ConstructionPaymentItemSnapshot"("progressPaymentId", "contractItemId");
CREATE INDEX "ConstructionSnapshot_scope_payment_idx" ON "ConstructionPaymentItemSnapshot"("tenantId", "companyId", "periodId", "progressPaymentId");
CREATE INDEX "ConstructionApproval_scope_payment_created_idx" ON "ConstructionApprovalEvent"("tenantId", "companyId", "periodId", "progressPaymentId", "createdAt");
CREATE UNIQUE INDEX "ConstructionAccountingLink_construction_key" ON "ConstructionAccountingLink"("constructionPaymentId");
CREATE UNIQUE INDEX "ConstructionAccountingLink_progress_key" ON "ConstructionAccountingLink"("progressPaymentId");
CREATE INDEX "ConstructionAccountingLink_scope_idx" ON "ConstructionAccountingLink"("tenantId", "companyId", "periodId");

ALTER TABLE "ConstructionProject" ADD CONSTRAINT "ConstructionProject_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionProject" ADD CONSTRAINT "ConstructionProject_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionProject" ADD CONSTRAINT "ConstructionProject_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionContractItem" ADD CONSTRAINT "ConstructionContractItem_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionContractItem" ADD CONSTRAINT "ConstructionContractItem_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionContractItem" ADD CONSTRAINT "ConstructionContractItem_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionContractItem" ADD CONSTRAINT "ConstructionContractItem_project_fkey" FOREIGN KEY ("projectId") REFERENCES "ConstructionProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionProgressPayment" ADD CONSTRAINT "ConstructionProgressPayment_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionProgressPayment" ADD CONSTRAINT "ConstructionProgressPayment_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionProgressPayment" ADD CONSTRAINT "ConstructionProgressPayment_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionProgressPayment" ADD CONSTRAINT "ConstructionProgressPayment_project_fkey" FOREIGN KEY ("projectId") REFERENCES "ConstructionProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionProgressPayment" ADD CONSTRAINT "ConstructionProgressPayment_previous_fkey" FOREIGN KEY ("previousProgressPaymentId") REFERENCES "ConstructionProgressPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConstructionMeasurementLine" ADD CONSTRAINT "ConstructionMeasurementLine_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionMeasurementLine" ADD CONSTRAINT "ConstructionMeasurementLine_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionMeasurementLine" ADD CONSTRAINT "ConstructionMeasurementLine_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionMeasurementLine" ADD CONSTRAINT "ConstructionMeasurementLine_payment_fkey" FOREIGN KEY ("progressPaymentId") REFERENCES "ConstructionProgressPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionMeasurementLine" ADD CONSTRAINT "ConstructionMeasurementLine_item_fkey" FOREIGN KEY ("contractItemId") REFERENCES "ConstructionContractItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionPaymentItemSnapshot" ADD CONSTRAINT "ConstructionSnapshot_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionPaymentItemSnapshot" ADD CONSTRAINT "ConstructionSnapshot_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionPaymentItemSnapshot" ADD CONSTRAINT "ConstructionSnapshot_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionPaymentItemSnapshot" ADD CONSTRAINT "ConstructionSnapshot_payment_fkey" FOREIGN KEY ("progressPaymentId") REFERENCES "ConstructionProgressPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionPaymentItemSnapshot" ADD CONSTRAINT "ConstructionSnapshot_item_fkey" FOREIGN KEY ("contractItemId") REFERENCES "ConstructionContractItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionApprovalEvent" ADD CONSTRAINT "ConstructionApproval_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionApprovalEvent" ADD CONSTRAINT "ConstructionApproval_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionApprovalEvent" ADD CONSTRAINT "ConstructionApproval_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionApprovalEvent" ADD CONSTRAINT "ConstructionApproval_payment_fkey" FOREIGN KEY ("progressPaymentId") REFERENCES "ConstructionProgressPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionAccountingLink" ADD CONSTRAINT "ConstructionAccountingLink_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionAccountingLink" ADD CONSTRAINT "ConstructionAccountingLink_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionAccountingLink" ADD CONSTRAINT "ConstructionAccountingLink_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionAccountingLink" ADD CONSTRAINT "ConstructionAccountingLink_construction_fkey" FOREIGN KEY ("constructionPaymentId") REFERENCES "ConstructionProgressPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionAccountingLink" ADD CONSTRAINT "ConstructionAccountingLink_progress_fkey" FOREIGN KEY ("progressPaymentId") REFERENCES "ProgressPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
