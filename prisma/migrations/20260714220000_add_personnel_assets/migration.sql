CREATE TABLE "PersonnelAssetAssignment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "personnelCode" TEXT NOT NULL,
  "personnelName" TEXT NOT NULL,
  "siteCode" TEXT,
  "siteName" TEXT,
  "assetCategory" TEXT NOT NULL,
  "assetCode" TEXT NOT NULL,
  "assetName" TEXT NOT NULL,
  "serialNo" TEXT,
  "quantity" DECIMAL(18,4) NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL,
  "dueAt" TIMESTAMP(3),
  "returnedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL,
  "notes" TEXT,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PersonnelAssetAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PersonnelAssetAssignment_tenantId_companyId_periodId_personnelCode_idx" ON "PersonnelAssetAssignment"("tenantId", "companyId", "periodId", "personnelCode");
CREATE INDEX "PersonnelAssetAssignment_tenantId_companyId_periodId_status_idx" ON "PersonnelAssetAssignment"("tenantId", "companyId", "periodId", "status");
CREATE INDEX "PersonnelAssetAssignment_tenantId_companyId_periodId_assetCode_serialNo_idx" ON "PersonnelAssetAssignment"("tenantId", "companyId", "periodId", "assetCode", "serialNo");

ALTER TABLE "PersonnelAssetAssignment" ADD CONSTRAINT "PersonnelAssetAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonnelAssetAssignment" ADD CONSTRAINT "PersonnelAssetAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonnelAssetAssignment" ADD CONSTRAINT "PersonnelAssetAssignment_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
