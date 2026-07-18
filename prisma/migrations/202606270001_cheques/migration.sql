-- CreateTable
CREATE TABLE "Cheque" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "documentNo" TEXT NOT NULL,
    "checkNo" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branchName" TEXT,
    "drawerName" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cheque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cheque_tenantId_companyId_periodId_documentNo_key" ON "Cheque"("tenantId", "companyId", "periodId", "documentNo");

-- CreateIndex
CREATE UNIQUE INDEX "Cheque_tenantId_companyId_periodId_checkNo_key" ON "Cheque"("tenantId", "companyId", "periodId", "checkNo");

-- CreateIndex
CREATE INDEX "Cheque_tenantId_companyId_periodId_dueDate_idx" ON "Cheque"("tenantId", "companyId", "periodId", "dueDate");

-- CreateIndex
CREATE INDEX "Cheque_tenantId_companyId_periodId_status_idx" ON "Cheque"("tenantId", "companyId", "periodId", "status");

-- AddForeignKey
ALTER TABLE "Cheque" ADD CONSTRAINT "Cheque_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cheque" ADD CONSTRAINT "Cheque_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cheque" ADD CONSTRAINT "Cheque_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
