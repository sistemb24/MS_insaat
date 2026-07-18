-- CreateTable
CREATE TABLE "PayrollAccrual" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "documentNo" TEXT NOT NULL,
    "sourceTimesheetId" TEXT NOT NULL,
    "sourceTimesheetNo" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "siteCode" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "contractorCode" TEXT,
    "contractorName" TEXT,
    "status" TEXT NOT NULL,
    "grossTotal" DECIMAL(18,2) NOT NULL,
    "deductionTotal" DECIMAL(18,2) NOT NULL,
    "netTotal" DECIMAL(18,2) NOT NULL,
    "lineCount" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollAccrual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollAccrualLine" (
    "id" TEXT NOT NULL,
    "payrollAccrualId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "personCode" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "regularWorkedDays" DECIMAL(18,2) NOT NULL,
    "overtimeHours" DECIMAL(18,2) NOT NULL,
    "grossTotal" DECIMAL(18,2) NOT NULL,
    "advanceDeduction" DECIMAL(18,2) NOT NULL,
    "debtDeduction" DECIMAL(18,2) NOT NULL,
    "deductionTotal" DECIMAL(18,2) NOT NULL,
    "netTotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "PayrollAccrualLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayrollAccrual_tenantId_companyId_periodId_documentNo_key" ON "PayrollAccrual"("tenantId", "companyId", "periodId", "documentNo");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollAccrual_tenantId_companyId_periodId_sourceTimesheetId_key" ON "PayrollAccrual"("tenantId", "companyId", "periodId", "sourceTimesheetId");

-- CreateIndex
CREATE INDEX "PayrollAccrual_tenantId_companyId_periodId_year_month_idx" ON "PayrollAccrual"("tenantId", "companyId", "periodId", "year", "month");

-- CreateIndex
CREATE INDEX "PayrollAccrual_tenantId_companyId_periodId_status_idx" ON "PayrollAccrual"("tenantId", "companyId", "periodId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollAccrualLine_payrollAccrualId_lineNo_key" ON "PayrollAccrualLine"("payrollAccrualId", "lineNo");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollAccrualLine_payrollAccrualId_personCode_key" ON "PayrollAccrualLine"("payrollAccrualId", "personCode");

-- CreateIndex
CREATE INDEX "PayrollAccrualLine_payrollAccrualId_idx" ON "PayrollAccrualLine"("payrollAccrualId");

-- CreateIndex
CREATE INDEX "PayrollAccrualLine_personCode_idx" ON "PayrollAccrualLine"("personCode");

-- AddForeignKey
ALTER TABLE "PayrollAccrual" ADD CONSTRAINT "PayrollAccrual_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAccrual" ADD CONSTRAINT "PayrollAccrual_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAccrual" ADD CONSTRAINT "PayrollAccrual_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAccrualLine" ADD CONSTRAINT "PayrollAccrualLine_payrollAccrualId_fkey" FOREIGN KEY ("payrollAccrualId") REFERENCES "PayrollAccrual"("id") ON DELETE CASCADE ON UPDATE CASCADE;
