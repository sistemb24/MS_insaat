CREATE TABLE "CompanyBrandAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "mimeType" VARCHAR(50),
    "originalFileName" VARCHAR(180) NOT NULL DEFAULT '',
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "sha256" VARCHAR(64) NOT NULL DEFAULT '',
    "content" BYTEA,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "lastMutationKey" VARCHAR(500),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CompanyBrandAsset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CompanyBrandAsset_tenantId_companyId_key"
ON "CompanyBrandAsset"("tenantId", "companyId");
CREATE INDEX "CompanyBrandAsset_tenantId_companyId_status_updatedAt_idx"
ON "CompanyBrandAsset"("tenantId", "companyId", "status", "updatedAt");
ALTER TABLE "CompanyBrandAsset" ADD CONSTRAINT "CompanyBrandAsset_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyBrandAsset" ADD CONSTRAINT "CompanyBrandAsset_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
