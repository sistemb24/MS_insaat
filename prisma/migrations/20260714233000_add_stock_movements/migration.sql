CREATE TABLE "StockMovement" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "documentNo" TEXT NOT NULL,
  "movementDate" TIMESTAMP(3) NOT NULL,
  "movementType" TEXT NOT NULL,
  "stockCode" TEXT NOT NULL,
  "stockName" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL,
  "unitCost" DECIMAL(18,4) NOT NULL,
  "sourceWarehouse" TEXT NOT NULL,
  "targetWarehouse" TEXT,
  "siteCode" TEXT,
  "siteName" TEXT,
  "description" TEXT,
  "status" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StockMovement_tenantId_companyId_periodId_documentNo_key" ON "StockMovement"("tenantId", "companyId", "periodId", "documentNo");
CREATE INDEX "StockMovement_tenantId_companyId_periodId_movementDate_idx" ON "StockMovement"("tenantId", "companyId", "periodId", "movementDate");
CREATE INDEX "StockMovement_tenantId_companyId_periodId_stockCode_sourceWarehouse_idx" ON "StockMovement"("tenantId", "companyId", "periodId", "stockCode", "sourceWarehouse");
CREATE INDEX "StockMovement_tenantId_companyId_periodId_status_idx" ON "StockMovement"("tenantId", "companyId", "periodId", "status");

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
