-- CreateTable
CREATE TABLE "ProgressPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "documentNo" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "paymentType" TEXT NOT NULL,
    "counterpartyCode" TEXT NOT NULL,
    "counterpartyName" TEXT NOT NULL,
    "siteCode" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT,
    "retentionRate" DECIMAL(5,2) NOT NULL,
    "status" TEXT NOT NULL,
    "grossTotal" DECIMAL(18,2) NOT NULL,
    "retentionTotal" DECIMAL(18,2) NOT NULL,
    "netTotal" DECIMAL(18,2) NOT NULL,
    "vatTotal" DECIMAL(18,2) NOT NULL,
    "grandTotal" DECIMAL(18,2) NOT NULL,
    "lineCount" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressPaymentLine" (
    "id" TEXT NOT NULL,
    "progressPaymentId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitPrice" DECIMAL(18,4) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL,
    "grossTotal" DECIMAL(18,2) NOT NULL,
    "vatTotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "ProgressPaymentLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgressPayment_tenantId_companyId_periodId_issueDate_idx" ON "ProgressPayment"("tenantId", "companyId", "periodId", "issueDate");

-- CreateIndex
CREATE INDEX "ProgressPayment_tenantId_companyId_periodId_status_idx" ON "ProgressPayment"("tenantId", "companyId", "periodId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressPayment_tenantId_companyId_periodId_documentNo_key" ON "ProgressPayment"("tenantId", "companyId", "periodId", "documentNo");

-- CreateIndex
CREATE INDEX "ProgressPaymentLine_progressPaymentId_idx" ON "ProgressPaymentLine"("progressPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressPaymentLine_progressPaymentId_lineNo_key" ON "ProgressPaymentLine"("progressPaymentId", "lineNo");

-- AddForeignKey
ALTER TABLE "ProgressPayment" ADD CONSTRAINT "ProgressPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressPayment" ADD CONSTRAINT "ProgressPayment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressPayment" ADD CONSTRAINT "ProgressPayment_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressPaymentLine" ADD CONSTRAINT "ProgressPaymentLine_progressPaymentId_fkey" FOREIGN KEY ("progressPaymentId") REFERENCES "ProgressPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "CashBankMovement_tenantId_companyId_periodId_sourceType_sourceI" RENAME TO "CashBankMovement_tenantId_companyId_periodId_sourceType_sou_key";
