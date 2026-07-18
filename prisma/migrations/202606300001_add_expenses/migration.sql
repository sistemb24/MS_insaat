-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "documentNo" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "siteCode" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "movementGroup" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "counterpartyName" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL,
    "vatTotal" DECIMAL(18,2) NOT NULL,
    "grandTotal" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Expense_tenantId_companyId_periodId_documentNo_key" ON "Expense"("tenantId", "companyId", "periodId", "documentNo");

-- CreateIndex
CREATE INDEX "Expense_tenantId_companyId_periodId_expenseDate_idx" ON "Expense"("tenantId", "companyId", "periodId", "expenseDate");

-- CreateIndex
CREATE INDEX "Expense_tenantId_companyId_periodId_movementGroup_idx" ON "Expense"("tenantId", "companyId", "periodId", "movementGroup");

-- CreateIndex
CREATE INDEX "Expense_tenantId_companyId_periodId_siteCode_idx" ON "Expense"("tenantId", "companyId", "periodId", "siteCode");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
