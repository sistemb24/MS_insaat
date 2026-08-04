-- CreateTable
CREATE TABLE "AccessProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "lastMutationKey" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccessProfile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AccessProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AccessProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AccessProfilePermission" (
    "profileId" TEXT NOT NULL,
    "permissionCode" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AccessProfilePermission_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AccessProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("profileId", "permissionCode")
);

CREATE TABLE "UserAccessProfileAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "lastMutationKey" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserAccessProfileAssignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserAccessProfileAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAccessProfileAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAccessProfileAssignment_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAccessProfileAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAccessProfileAssignment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AccessProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccessProfile_tenantId_companyId_normalizedName_key" ON "AccessProfile"("tenantId", "companyId", "normalizedName");
CREATE INDEX "AccessProfile_tenantId_companyId_status_idx" ON "AccessProfile"("tenantId", "companyId", "status");
CREATE INDEX "AccessProfilePermission_permissionCode_idx" ON "AccessProfilePermission"("permissionCode");
CREATE UNIQUE INDEX "UserAccessProfileAssignment_tenantId_companyId_periodId_userId_key" ON "UserAccessProfileAssignment"("tenantId", "companyId", "periodId", "userId");
CREATE INDEX "UserAccessProfileAssignment_tenantId_companyId_profileId_idx" ON "UserAccessProfileAssignment"("tenantId", "companyId", "profileId");
