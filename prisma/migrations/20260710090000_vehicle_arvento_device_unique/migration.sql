-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_tenantId_companyId_periodId_arventoDeviceId_key"
    ON "Vehicle"("tenantId", "companyId", "periodId", "arventoDeviceId");
