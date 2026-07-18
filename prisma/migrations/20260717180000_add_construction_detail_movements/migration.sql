ALTER TABLE "ConstructionProgressPayment"
  ADD COLUMN "periodExtraWorkTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "periodAdditionTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "periodDeductionTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "periodPayableTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "cumulativeExtraWorkTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "cumulativeAdditionTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "cumulativeDeductionTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "cumulativePayableTotal" DECIMAL(18,2) NOT NULL DEFAULT 0;

ALTER TABLE "ConstructionMeasurementLine" ADD COLUMN "measurementSheetId" TEXT;

CREATE TABLE "ConstructionMeasurementSheet" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "progressPaymentId" TEXT NOT NULL,
  "sheetNo" TEXT NOT NULL,
  "sheetType" TEXT NOT NULL DEFAULT 'GENERAL',
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConstructionMeasurementSheet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionExtraWork" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "progressPaymentId" TEXT NOT NULL,
  "documentNo" TEXT NOT NULL,
  "workDate" TIMESTAMP(3) NOT NULL,
  "description" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL,
  "unitPrice" DECIMAL(18,4) NOT NULL,
  "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "periodAmount" DECIMAL(18,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConstructionExtraWork_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionDeductionMovement" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "progressPaymentId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "documentNo" TEXT,
  "movementDate" TIMESTAMP(3) NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "vatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(18,2) NOT NULL,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConstructionDeductionMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionFinancialMovement" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "progressPaymentId" TEXT NOT NULL,
  "movementType" TEXT NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'DEDUCTION',
  "movementDate" TIMESTAMP(3) NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConstructionFinancialMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionContractItemPriceRevision" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "contractItemId" TEXT NOT NULL,
  "revisionNo" INTEGER NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "unitPrice" DECIMAL(18,4) NOT NULL,
  "reason" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConstructionContractItemPriceRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConstructionMeasurementSheet_payment_sheet_key" ON "ConstructionMeasurementSheet"("progressPaymentId", "sheetNo");
CREATE INDEX "ConstructionMeasurementSheet_scope_payment_type_idx" ON "ConstructionMeasurementSheet"("tenantId", "companyId", "periodId", "progressPaymentId", "sheetType");
CREATE INDEX "ConstructionMeasurementLine_sheet_idx" ON "ConstructionMeasurementLine"("measurementSheetId");
CREATE UNIQUE INDEX "ConstructionExtraWork_payment_document_key" ON "ConstructionExtraWork"("progressPaymentId", "documentNo");
CREATE INDEX "ConstructionExtraWork_scope_payment_status_idx" ON "ConstructionExtraWork"("tenantId", "companyId", "periodId", "progressPaymentId", "status");
CREATE INDEX "ConstructionDeduction_scope_payment_category_idx" ON "ConstructionDeductionMovement"("tenantId", "companyId", "periodId", "progressPaymentId", "category");
CREATE INDEX "ConstructionFinancial_scope_payment_type_idx" ON "ConstructionFinancialMovement"("tenantId", "companyId", "periodId", "progressPaymentId", "movementType");
CREATE UNIQUE INDEX "ConstructionPriceRevision_item_revision_key" ON "ConstructionContractItemPriceRevision"("contractItemId", "revisionNo");
CREATE INDEX "ConstructionPriceRevision_scope_item_effective_idx" ON "ConstructionContractItemPriceRevision"("tenantId", "companyId", "periodId", "contractItemId", "effectiveFrom");

ALTER TABLE "ConstructionMeasurementSheet" ADD CONSTRAINT "ConstructionMeasurementSheet_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionMeasurementSheet" ADD CONSTRAINT "ConstructionMeasurementSheet_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionMeasurementSheet" ADD CONSTRAINT "ConstructionMeasurementSheet_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionMeasurementSheet" ADD CONSTRAINT "ConstructionMeasurementSheet_payment_fkey" FOREIGN KEY ("progressPaymentId") REFERENCES "ConstructionProgressPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionMeasurementLine" ADD CONSTRAINT "ConstructionMeasurementLine_sheet_fkey" FOREIGN KEY ("measurementSheetId") REFERENCES "ConstructionMeasurementSheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConstructionExtraWork" ADD CONSTRAINT "ConstructionExtraWork_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionExtraWork" ADD CONSTRAINT "ConstructionExtraWork_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionExtraWork" ADD CONSTRAINT "ConstructionExtraWork_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionExtraWork" ADD CONSTRAINT "ConstructionExtraWork_payment_fkey" FOREIGN KEY ("progressPaymentId") REFERENCES "ConstructionProgressPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionDeductionMovement" ADD CONSTRAINT "ConstructionDeduction_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionDeductionMovement" ADD CONSTRAINT "ConstructionDeduction_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionDeductionMovement" ADD CONSTRAINT "ConstructionDeduction_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionDeductionMovement" ADD CONSTRAINT "ConstructionDeduction_payment_fkey" FOREIGN KEY ("progressPaymentId") REFERENCES "ConstructionProgressPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionFinancialMovement" ADD CONSTRAINT "ConstructionFinancial_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionFinancialMovement" ADD CONSTRAINT "ConstructionFinancial_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionFinancialMovement" ADD CONSTRAINT "ConstructionFinancial_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionFinancialMovement" ADD CONSTRAINT "ConstructionFinancial_payment_fkey" FOREIGN KEY ("progressPaymentId") REFERENCES "ConstructionProgressPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionContractItemPriceRevision" ADD CONSTRAINT "ConstructionPriceRevision_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionContractItemPriceRevision" ADD CONSTRAINT "ConstructionPriceRevision_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionContractItemPriceRevision" ADD CONSTRAINT "ConstructionPriceRevision_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionContractItemPriceRevision" ADD CONSTRAINT "ConstructionPriceRevision_item_fkey" FOREIGN KEY ("contractItemId") REFERENCES "ConstructionContractItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "ConstructionProgressPayment"
SET "periodPayableTotal" = "periodNetTotal",
    "cumulativePayableTotal" = "cumulativeNetTotal";
