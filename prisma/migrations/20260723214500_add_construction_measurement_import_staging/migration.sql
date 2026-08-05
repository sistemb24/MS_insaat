CREATE TABLE "ConstructionMeasurementImportBatch" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sourceProgressPaymentId" TEXT NOT NULL,
  "batchNo" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "originalFileName" VARCHAR(180) NOT NULL,
  "contentType" VARCHAR(100) NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileSha256" VARCHAR(64) NOT NULL,
  "mappingVersion" VARCHAR(50) NOT NULL,
  "delimiter" VARCHAR(1) NOT NULL,
  "totalRowCount" INTEGER NOT NULL,
  "validRowCount" INTEGER NOT NULL,
  "errorRowCount" INTEGER NOT NULL,
  "sourceProgressPaymentUpdatedAt" TIMESTAMP(3) NOT NULL,
  "sourceSnapshotAt" TIMESTAMP(3) NOT NULL,
  "targetSheetId" TEXT,
  "failureCode" VARCHAR(64),
  "createdBy" TEXT NOT NULL,
  "validatedBy" TEXT,
  "appliedBy" TEXT,
  "cancelledBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "validatedAt" TIMESTAMP(3),
  "appliedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "ConstructionMeasurementImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionMeasurementImportRow" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "rowNo" INTEGER NOT NULL,
  "sourceItemCode" TEXT NOT NULL,
  "contractItemId" TEXT,
  "description" VARCHAR(240) NOT NULL,
  "sourceUnit" TEXT NOT NULL,
  "resolvedUnit" TEXT NOT NULL,
  "quantity" DECIMAL(18,4),
  "status" TEXT NOT NULL,
  "errorCode" VARCHAR(64),
  "appliedMeasurementLineId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConstructionMeasurementImportRow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionMeasurementImportEvent" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConstructionMeasurementImportEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConstructionMeasurementImportBatch_target_sheet_key" ON "ConstructionMeasurementImportBatch"("targetSheetId");
CREATE UNIQUE INDEX "ConstructionMeasurementImportBatch_project_batch_key" ON "ConstructionMeasurementImportBatch"("projectId", "batchNo");
CREATE UNIQUE INDEX "ConstructionMeasurementImportBatch_scope_source_hash_key" ON "ConstructionMeasurementImportBatch"("tenantId", "companyId", "periodId", "projectId", "sourceProgressPaymentId", "fileSha256", "mappingVersion");
CREATE INDEX "ConstructionMeasurementImportBatch_scope_project_status_idx" ON "ConstructionMeasurementImportBatch"("tenantId", "companyId", "periodId", "projectId", "status", "createdAt");
CREATE INDEX "ConstructionMeasurementImportBatch_source_created_idx" ON "ConstructionMeasurementImportBatch"("sourceProgressPaymentId", "createdAt");

CREATE UNIQUE INDEX "ConstructionMeasurementImportRow_batch_row_key" ON "ConstructionMeasurementImportRow"("batchId", "rowNo");
CREATE UNIQUE INDEX "ConstructionMeasurementImportRow_applied_line_key" ON "ConstructionMeasurementImportRow"("appliedMeasurementLineId");
CREATE INDEX "ConstructionMeasurementImportRow_batch_status_row_idx" ON "ConstructionMeasurementImportRow"("batchId", "status", "rowNo");
CREATE INDEX "ConstructionMeasurementImportRow_contract_item_idx" ON "ConstructionMeasurementImportRow"("contractItemId");

CREATE INDEX "ConstructionMeasurementImportEvent_batch_created_idx" ON "ConstructionMeasurementImportEvent"("batchId", "createdAt");

ALTER TABLE "ConstructionMeasurementImportBatch" ADD CONSTRAINT "ConstructionMeasurementImportBatch_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionMeasurementImportBatch" ADD CONSTRAINT "ConstructionMeasurementImportBatch_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionMeasurementImportBatch" ADD CONSTRAINT "ConstructionMeasurementImportBatch_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionMeasurementImportBatch" ADD CONSTRAINT "ConstructionMeasurementImportBatch_project_fkey" FOREIGN KEY ("projectId") REFERENCES "ConstructionProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConstructionMeasurementImportBatch" ADD CONSTRAINT "ConstructionMeasurementImportBatch_source_payment_fkey" FOREIGN KEY ("sourceProgressPaymentId") REFERENCES "ConstructionProgressPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConstructionMeasurementImportBatch" ADD CONSTRAINT "ConstructionMeasurementImportBatch_target_sheet_fkey" FOREIGN KEY ("targetSheetId") REFERENCES "ConstructionMeasurementSheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConstructionMeasurementImportRow" ADD CONSTRAINT "ConstructionMeasurementImportRow_batch_fkey" FOREIGN KEY ("batchId") REFERENCES "ConstructionMeasurementImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionMeasurementImportRow" ADD CONSTRAINT "ConstructionMeasurementImportRow_contract_item_fkey" FOREIGN KEY ("contractItemId") REFERENCES "ConstructionContractItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConstructionMeasurementImportRow" ADD CONSTRAINT "ConstructionMeasurementImportRow_applied_line_fkey" FOREIGN KEY ("appliedMeasurementLineId") REFERENCES "ConstructionMeasurementLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConstructionMeasurementImportEvent" ADD CONSTRAINT "ConstructionMeasurementImportEvent_batch_fkey" FOREIGN KEY ("batchId") REFERENCES "ConstructionMeasurementImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
