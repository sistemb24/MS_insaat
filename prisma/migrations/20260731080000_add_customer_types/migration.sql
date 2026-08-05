CREATE TABLE "CustomerType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "normalizedName" VARCHAR(80) NOT NULL,
    "description" VARCHAR(240) NOT NULL DEFAULT '',
    "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "lastMutationKey" VARCHAR(500),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerType_tenantId_companyId_normalizedName_key"
ON "CustomerType"("tenantId", "companyId", "normalizedName");

CREATE INDEX "CustomerType_tenantId_companyId_status_name_idx"
ON "CustomerType"("tenantId", "companyId", "status", "name");

ALTER TABLE "CustomerType"
ADD CONSTRAINT "CustomerType_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerType"
ADD CONSTRAINT "CustomerType_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
