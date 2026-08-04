-- CreateTable
CREATE TABLE "EmployeeAdvanceRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "createRequestKey" TEXT NOT NULL,
    "personnelCode" TEXT NOT NULL,
    "personnelName" TEXT NOT NULL,
    "requestDate" DATE NOT NULL,
    "requestedAmount" DECIMAL(18,2) NOT NULL,
    "approvedAmount" DECIMAL(18,2),
    "settledAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "lastUpdateKey" TEXT,
    "submitRequestKey" TEXT,
    "managerApproveRequestKey" TEXT,
    "managerRejectRequestKey" TEXT,
    "financeApproveRequestKey" TEXT,
    "financeRejectRequestKey" TEXT,
    "cancelRequestKey" TEXT,
    "paymentRequestKey" TEXT,
    "submittedAt" TIMESTAMP(3),
    "managerApprovedAt" TIMESTAMP(3),
    "managerRejectedAt" TIMESTAMP(3),
    "financeApprovedAt" TIMESTAMP(3),
    "financeRejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentDate" DATE,
    "paymentAccountCode" TEXT,
    "paymentAccountName" TEXT,
    "paymentMovementId" TEXT,
    "paymentLedgerEntryId" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeAdvanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAdvanceSettlement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "advanceId" TEXT NOT NULL,
    "payrollAccrualId" TEXT NOT NULL,
    "payrollLinePersonCode" TEXT NOT NULL,
    "settlementDate" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "mutationRequestKey" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeAdvanceSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeAdvanceRequest_tenantId_companyId_periodId_createRequestKey_key" ON "EmployeeAdvanceRequest"("tenantId", "companyId", "periodId", "createRequestKey");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeAdvanceRequest_tenantId_companyId_periodId_paymentRequestKey_key" ON "EmployeeAdvanceRequest"("tenantId", "companyId", "periodId", "paymentRequestKey");

-- CreateIndex
CREATE INDEX "EmployeeAdvanceRequest_tenantId_companyId_periodId_status_requestDate_idx" ON "EmployeeAdvanceRequest"("tenantId", "companyId", "periodId", "status", "requestDate");

-- CreateIndex
CREATE INDEX "EmployeeAdvanceRequest_tenantId_companyId_periodId_personnelCode_requestDate_idx" ON "EmployeeAdvanceRequest"("tenantId", "companyId", "periodId", "personnelCode", "requestDate");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeAdvanceSettlement_tenantId_companyId_periodId_mutationRequestKey_key" ON "EmployeeAdvanceSettlement"("tenantId", "companyId", "periodId", "mutationRequestKey");

-- CreateIndex
CREATE INDEX "EmployeeAdvanceSettlement_tenantId_companyId_periodId_advanceId_settlementDate_idx" ON "EmployeeAdvanceSettlement"("tenantId", "companyId", "periodId", "advanceId", "settlementDate");

-- CreateIndex
CREATE INDEX "EmployeeAdvanceSettlement_tenantId_companyId_periodId_payrollAccrualId_payrollLinePersonCode_idx" ON "EmployeeAdvanceSettlement"("tenantId", "companyId", "periodId", "payrollAccrualId", "payrollLinePersonCode");

-- AddForeignKey
ALTER TABLE "EmployeeAdvanceRequest" ADD CONSTRAINT "EmployeeAdvanceRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAdvanceRequest" ADD CONSTRAINT "EmployeeAdvanceRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAdvanceRequest" ADD CONSTRAINT "EmployeeAdvanceRequest_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAdvanceSettlement" ADD CONSTRAINT "EmployeeAdvanceSettlement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAdvanceSettlement" ADD CONSTRAINT "EmployeeAdvanceSettlement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAdvanceSettlement" ADD CONSTRAINT "EmployeeAdvanceSettlement_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAdvanceSettlement" ADD CONSTRAINT "EmployeeAdvanceSettlement_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "EmployeeAdvanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
