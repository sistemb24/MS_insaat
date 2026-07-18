-- CreateTable
CREATE TABLE "Timesheet" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "documentNo" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "contractorCode" TEXT,
    "contractorName" TEXT,
    "siteCode" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "totalWorkedDays" DECIMAL(18,2) NOT NULL,
    "totalOvertimeHours" DECIMAL(18,2) NOT NULL,
    "grossTotal" DECIMAL(18,2) NOT NULL,
    "deductionTotal" DECIMAL(18,2) NOT NULL,
    "netTotal" DECIMAL(18,2) NOT NULL,
    "lineCount" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetLine" (
    "id" TEXT NOT NULL,
    "timesheetId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "personCode" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "workedDays" DECIMAL(18,2) NOT NULL,
    "overtimeHours" DECIMAL(18,2) NOT NULL,
    "dailyWage" DECIMAL(18,2) NOT NULL,
    "overtimeHourlyRate" DECIMAL(18,2) NOT NULL,
    "advanceDeduction" DECIMAL(18,2) NOT NULL,
    "debtDeduction" DECIMAL(18,2) NOT NULL,
    "regularTotal" DECIMAL(18,2) NOT NULL,
    "overtimeTotal" DECIMAL(18,2) NOT NULL,
    "grossTotal" DECIMAL(18,2) NOT NULL,
    "deductionTotal" DECIMAL(18,2) NOT NULL,
    "netTotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "TimesheetLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Timesheet_tenantId_companyId_periodId_documentNo_key" ON "Timesheet"("tenantId", "companyId", "periodId", "documentNo");

-- CreateIndex
CREATE INDEX "Timesheet_tenantId_companyId_periodId_year_month_idx" ON "Timesheet"("tenantId", "companyId", "periodId", "year", "month");

-- CreateIndex
CREATE INDEX "Timesheet_tenantId_companyId_periodId_status_idx" ON "Timesheet"("tenantId", "companyId", "periodId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetLine_timesheetId_lineNo_key" ON "TimesheetLine"("timesheetId", "lineNo");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetLine_timesheetId_personCode_key" ON "TimesheetLine"("timesheetId", "personCode");

-- CreateIndex
CREATE INDEX "TimesheetLine_timesheetId_idx" ON "TimesheetLine"("timesheetId");

-- CreateIndex
CREATE INDEX "TimesheetLine_personCode_idx" ON "TimesheetLine"("personCode");

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetLine" ADD CONSTRAINT "TimesheetLine_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
