CREATE TABLE "CompanyLocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "responsiblePerson" VARCHAR(160) NOT NULL DEFAULT '',
    "phone" VARCHAR(30) NOT NULL DEFAULT '',
    "email" VARCHAR(254) NOT NULL DEFAULT '',
    "addressLine" VARCHAR(300) NOT NULL DEFAULT '',
    "district" VARCHAR(100) NOT NULL DEFAULT '',
    "city" VARCHAR(100) NOT NULL DEFAULT '',
    "postalCode" VARCHAR(10) NOT NULL DEFAULT '',
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "lastMutationKey" VARCHAR(500),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyLocation_tenantId_companyId_code_key"
ON "CompanyLocation"("tenantId", "companyId", "code");

CREATE INDEX "CompanyLocation_tenantId_companyId_type_status_idx"
ON "CompanyLocation"("tenantId", "companyId", "type", "status");

CREATE INDEX "CompanyLocation_tenantId_companyId_updatedAt_idx"
ON "CompanyLocation"("tenantId", "companyId", "updatedAt");

ALTER TABLE "CompanyLocation"
ADD CONSTRAINT "CompanyLocation_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyLocation"
ADD CONSTRAINT "CompanyLocation_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
