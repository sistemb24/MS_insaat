CREATE TABLE "EmployeeLeaveRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "createRequestKey" TEXT NOT NULL,
    "personnelCode" TEXT NOT NULL,
    "personnelName" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "chargeableDays" DECIMAL(5,2) NOT NULL,
    "note" TEXT NOT NULL,
    "documentFileId" TEXT,
    "status" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "lastUpdateKey" TEXT,
    "submitRequestKey" TEXT,
    "approveRequestKey" TEXT,
    "rejectRequestKey" TEXT,
    "cancelRequestKey" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeeLeaveRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmployeeLeaveBalance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "personnelCode" TEXT NOT NULL,
    "personnelName" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "openingDays" DECIMAL(5,2) NOT NULL,
    "adjustmentDays" DECIMAL(5,2) NOT NULL,
    "usedDays" DECIMAL(5,2) NOT NULL,
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "lastMutationKey" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeeLeaveBalance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmployeeLeaveRequest_tenantId_companyId_periodId_createRequestKey_key"
ON "EmployeeLeaveRequest"("tenantId", "companyId", "periodId", "createRequestKey");
CREATE INDEX "EmployeeLeaveRequest_tenantId_companyId_periodId_status_startDate_idx"
ON "EmployeeLeaveRequest"("tenantId", "companyId", "periodId", "status", "startDate");
CREATE INDEX "EmployeeLeaveRequest_tenantId_companyId_periodId_personnelCode_startDate_endDate_idx"
ON "EmployeeLeaveRequest"("tenantId", "companyId", "periodId", "personnelCode", "startDate", "endDate");

CREATE UNIQUE INDEX "EmployeeLeaveBalance_tenantId_companyId_periodId_personnelCode_year_key"
ON "EmployeeLeaveBalance"("tenantId", "companyId", "periodId", "personnelCode", "year");
CREATE INDEX "EmployeeLeaveBalance_tenantId_companyId_periodId_year_idx"
ON "EmployeeLeaveBalance"("tenantId", "companyId", "periodId", "year");

ALTER TABLE "EmployeeLeaveRequest"
ADD CONSTRAINT "EmployeeLeaveRequest_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeLeaveRequest"
ADD CONSTRAINT "EmployeeLeaveRequest_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeLeaveRequest"
ADD CONSTRAINT "EmployeeLeaveRequest_periodId_fkey"
FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmployeeLeaveBalance"
ADD CONSTRAINT "EmployeeLeaveBalance_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeLeaveBalance"
ADD CONSTRAINT "EmployeeLeaveBalance_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeLeaveBalance"
ADD CONSTRAINT "EmployeeLeaveBalance_periodId_fkey"
FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
