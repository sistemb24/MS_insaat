CREATE TABLE "ConstructionSimulationScenario" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sourceProgressPaymentId" TEXT NOT NULL,
  "scenarioNo" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "description" VARCHAR(500),
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "currentRevisionNo" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "archivedBy" TEXT,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "ConstructionSimulationScenario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionSimulationRevision" (
  "id" TEXT NOT NULL,
  "scenarioId" TEXT NOT NULL,
  "revisionNo" INTEGER NOT NULL,
  "revisionNote" VARCHAR(500),
  "sourceProgressPaymentUpdatedAt" TIMESTAMP(3) NOT NULL,
  "sourceSnapshotAt" TIMESTAMP(3) NOT NULL,
  "lineCount" INTEGER NOT NULL,
  "proposedQuantityTotal" DECIMAL(18,4) NOT NULL,
  "projectedAmountTotal" DECIMAL(18,2) NOT NULL,
  "overrunLineCount" INTEGER NOT NULL,
  "inputHash" VARCHAR(64) NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConstructionSimulationRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionSimulationLine" (
  "id" TEXT NOT NULL,
  "revisionId" TEXT NOT NULL,
  "lineNo" INTEGER NOT NULL,
  "contractItemId" TEXT NOT NULL,
  "itemCode" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "contractItemRevisionNo" INTEGER NOT NULL,
  "inputMode" TEXT NOT NULL,
  "currentCumulative" DECIMAL(18,4) NOT NULL,
  "contractQuantity" DECIMAL(18,4) NOT NULL,
  "unitPrice" DECIMAL(18,2) NOT NULL,
  "directQuantity" DECIMAL(18,4),
  "length" DECIMAL(18,4),
  "width" DECIMAL(18,4),
  "height" DECIMAL(18,4),
  "multiplier" DECIMAL(18,4),
  "proposedQuantity" DECIMAL(18,4) NOT NULL,
  "projectedCumulative" DECIMAL(18,4) NOT NULL,
  "projectedRemaining" DECIMAL(18,4) NOT NULL,
  "projectedAmount" DECIMAL(18,2) NOT NULL,
  "isOverrun" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "ConstructionSimulationLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConstructionSimulationScenario_project_scenario_key" ON "ConstructionSimulationScenario"("projectId", "scenarioNo");
CREATE INDEX "ConstructionSimulationScenario_scope_project_status_idx" ON "ConstructionSimulationScenario"("tenantId", "companyId", "periodId", "projectId", "status");
CREATE INDEX "ConstructionSimulationScenario_source_payment_idx" ON "ConstructionSimulationScenario"("sourceProgressPaymentId");

CREATE UNIQUE INDEX "ConstructionSimulationRevision_scenario_revision_key" ON "ConstructionSimulationRevision"("scenarioId", "revisionNo");
CREATE UNIQUE INDEX "ConstructionSimulationRevision_scenario_hash_key" ON "ConstructionSimulationRevision"("scenarioId", "inputHash");
CREATE INDEX "ConstructionSimulationRevision_scenario_created_idx" ON "ConstructionSimulationRevision"("scenarioId", "createdAt");

CREATE UNIQUE INDEX "ConstructionSimulationLine_revision_line_key" ON "ConstructionSimulationLine"("revisionId", "lineNo");
CREATE INDEX "ConstructionSimulationLine_revision_item_idx" ON "ConstructionSimulationLine"("revisionId", "contractItemId");
CREATE INDEX "ConstructionSimulationLine_contract_item_idx" ON "ConstructionSimulationLine"("contractItemId");

ALTER TABLE "ConstructionSimulationScenario" ADD CONSTRAINT "ConstructionSimulationScenario_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionSimulationScenario" ADD CONSTRAINT "ConstructionSimulationScenario_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionSimulationScenario" ADD CONSTRAINT "ConstructionSimulationScenario_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionSimulationScenario" ADD CONSTRAINT "ConstructionSimulationScenario_project_fkey" FOREIGN KEY ("projectId") REFERENCES "ConstructionProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConstructionSimulationScenario" ADD CONSTRAINT "ConstructionSimulationScenario_source_payment_fkey" FOREIGN KEY ("sourceProgressPaymentId") REFERENCES "ConstructionProgressPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConstructionSimulationRevision" ADD CONSTRAINT "ConstructionSimulationRevision_scenario_fkey" FOREIGN KEY ("scenarioId") REFERENCES "ConstructionSimulationScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionSimulationLine" ADD CONSTRAINT "ConstructionSimulationLine_revision_fkey" FOREIGN KEY ("revisionId") REFERENCES "ConstructionSimulationRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionSimulationLine" ADD CONSTRAINT "ConstructionSimulationLine_contract_item_fkey" FOREIGN KEY ("contractItemId") REFERENCES "ConstructionContractItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
