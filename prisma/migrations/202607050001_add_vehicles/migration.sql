-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "brand" TEXT,
    "modelName" TEXT,
    "modelYear" INTEGER,
    "siteCode" TEXT,
    "siteName" TEXT NOT NULL,
    "driverName" TEXT,
    "arventoDeviceId" TEXT,
    "status" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_tenantId_companyId_periodId_plate_key"
    ON "Vehicle"("tenantId", "companyId", "periodId", "plate");

-- CreateIndex
CREATE INDEX "Vehicle_tenantId_companyId_periodId_status_idx"
    ON "Vehicle"("tenantId", "companyId", "periodId", "status");

-- CreateIndex
CREATE INDEX "Vehicle_tenantId_companyId_periodId_siteCode_idx"
    ON "Vehicle"("tenantId", "companyId", "periodId", "siteCode");

-- CreateIndex
CREATE INDEX "Vehicle_tenantId_arventoDeviceId_idx"
    ON "Vehicle"("tenantId", "arventoDeviceId");

-- AddForeignKey
ALTER TABLE "Vehicle"
    ADD CONSTRAINT "Vehicle_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle"
    ADD CONSTRAINT "Vehicle_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle"
    ADD CONSTRAINT "Vehicle_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
