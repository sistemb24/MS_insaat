-- CreateTable
CREATE TABLE "FinanceSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "defaultVatRate" DECIMAL(5,2) NOT NULL,
    "showVatBreakdown" BOOLEAN NOT NULL DEFAULT true,
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "lastMutationKey" VARCHAR(500),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceSetting_tenantId_companyId_periodId_key" ON "FinanceSetting"("tenantId", "companyId", "periodId");

-- CreateIndex
CREATE INDEX "FinanceSetting_tenantId_companyId_periodId_updatedAt_idx" ON "FinanceSetting"("tenantId", "companyId", "periodId", "updatedAt");

-- AddForeignKey
ALTER TABLE "FinanceSetting" ADD CONSTRAINT "FinanceSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceSetting" ADD CONSTRAINT "FinanceSetting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceSetting" ADD CONSTRAINT "FinanceSetting_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
