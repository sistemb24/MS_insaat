CREATE TABLE "EmployeeTransfer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "createRequestKey" TEXT NOT NULL,
    "personnelCode" TEXT NOT NULL,
    "personnelName" TEXT NOT NULL,
    "sourceSiteCode" TEXT NOT NULL,
    "sourceSiteName" TEXT NOT NULL,
    "targetSiteCode" TEXT NOT NULL,
    "targetSiteName" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "note" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "lastUpdateKey" TEXT,
    "submitRequestKey" TEXT,
    "approveRequestKey" TEXT,
    "rejectRequestKey" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeeTransfer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmployeeTransfer_tenantId_companyId_periodId_createRequestKey_key"
ON "EmployeeTransfer"("tenantId", "companyId", "periodId", "createRequestKey");
CREATE INDEX "EmployeeTransfer_tenantId_companyId_periodId_status_effectiveDate_idx"
ON "EmployeeTransfer"("tenantId", "companyId", "periodId", "status", "effectiveDate");
CREATE INDEX "EmployeeTransfer_tenantId_companyId_periodId_personnelCode_effectiveDate_idx"
ON "EmployeeTransfer"("tenantId", "companyId", "periodId", "personnelCode", "effectiveDate");
CREATE INDEX "EmployeeTransfer_tenantId_companyId_periodId_sourceSiteCode_targetSiteCode_idx"
ON "EmployeeTransfer"("tenantId", "companyId", "periodId", "sourceSiteCode", "targetSiteCode");

ALTER TABLE "EmployeeTransfer"
ADD CONSTRAINT "EmployeeTransfer_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeTransfer"
ADD CONSTRAINT "EmployeeTransfer_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeTransfer"
ADD CONSTRAINT "EmployeeTransfer_periodId_fkey"
FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
