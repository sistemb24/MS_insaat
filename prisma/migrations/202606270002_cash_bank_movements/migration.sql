-- CreateTable
CREATE TABLE "CashBankMovement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "movementDate" TIMESTAMP(3) NOT NULL,
    "movementType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "documentNo" TEXT NOT NULL,
    "counterpartyName" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashBankMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashBankMovement_tenantId_companyId_periodId_sourceType_sourceId_movementType_key" ON "CashBankMovement"("tenantId", "companyId", "periodId", "sourceType", "sourceId", "movementType");

-- CreateIndex
CREATE INDEX "CashBankMovement_tenantId_companyId_periodId_movementDate_idx" ON "CashBankMovement"("tenantId", "companyId", "periodId", "movementDate");

-- CreateIndex
CREATE INDEX "CashBankMovement_tenantId_companyId_periodId_accountCode_idx" ON "CashBankMovement"("tenantId", "companyId", "periodId", "accountCode");

-- CreateIndex
CREATE INDEX "CashBankMovement_tenantId_sourceType_sourceId_idx" ON "CashBankMovement"("tenantId", "sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "CashBankMovement" ADD CONSTRAINT "CashBankMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashBankMovement" ADD CONSTRAINT "CashBankMovement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashBankMovement" ADD CONSTRAINT "CashBankMovement_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
