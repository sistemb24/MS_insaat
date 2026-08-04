-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "legalName" VARCHAR(200) NOT NULL,
    "taxOffice" VARCHAR(100) NOT NULL DEFAULT '',
    "taxNumber" VARCHAR(11) NOT NULL DEFAULT '',
    "mersisNumber" VARCHAR(16) NOT NULL DEFAULT '',
    "phone" VARCHAR(30) NOT NULL DEFAULT '',
    "email" VARCHAR(254) NOT NULL DEFAULT '',
    "addressLine" VARCHAR(300) NOT NULL DEFAULT '',
    "district" VARCHAR(100) NOT NULL DEFAULT '',
    "city" VARCHAR(100) NOT NULL DEFAULT '',
    "postalCode" VARCHAR(10) NOT NULL DEFAULT '',
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "lastMutationKey" VARCHAR(500),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_tenantId_companyId_key" ON "CompanyProfile"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "CompanyProfile_tenantId_companyId_updatedAt_idx" ON "CompanyProfile"("tenantId", "companyId", "updatedAt");

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
