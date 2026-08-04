CREATE TABLE "SupplierCategory" (
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

    CONSTRAINT "SupplierCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierCategory_tenantId_companyId_normalizedName_key"
ON "SupplierCategory"("tenantId", "companyId", "normalizedName");

CREATE INDEX "SupplierCategory_tenantId_companyId_status_name_idx"
ON "SupplierCategory"("tenantId", "companyId", "status", "name");

ALTER TABLE "SupplierCategory"
ADD CONSTRAINT "SupplierCategory_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupplierCategory"
ADD CONSTRAINT "SupplierCategory_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
