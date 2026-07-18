ALTER TABLE "Vehicle"
ADD COLUMN "chassisNumber" TEXT;

CREATE UNIQUE INDEX "Vehicle_tenantId_companyId_periodId_chassisNumber_key"
ON "Vehicle"("tenantId", "companyId", "periodId", "chassisNumber");
