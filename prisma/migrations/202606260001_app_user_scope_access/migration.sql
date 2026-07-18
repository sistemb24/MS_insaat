-- CreateTable
CREATE TABLE "AppUserScopeAccess" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "licenseLabel" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUserScopeAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUserScopeAccess_userId_companyId_periodId_key" ON "AppUserScopeAccess"("userId", "companyId", "periodId");

-- CreateIndex
CREATE INDEX "AppUserScopeAccess_tenantId_userId_isActive_idx" ON "AppUserScopeAccess"("tenantId", "userId", "isActive");

-- CreateIndex
CREATE INDEX "AppUserScopeAccess_tenantId_companyId_periodId_idx" ON "AppUserScopeAccess"("tenantId", "companyId", "periodId");

-- AddForeignKey
ALTER TABLE "AppUserScopeAccess" ADD CONSTRAINT "AppUserScopeAccess_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppUserScopeAccess" ADD CONSTRAINT "AppUserScopeAccess_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppUserScopeAccess" ADD CONSTRAINT "AppUserScopeAccess_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppUserScopeAccess" ADD CONSTRAINT "AppUserScopeAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
