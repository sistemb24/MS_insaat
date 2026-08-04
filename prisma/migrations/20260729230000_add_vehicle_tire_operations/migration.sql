CREATE TABLE "VehicleTireRecord" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "mountKey" VARCHAR(1000) NOT NULL,
  "tirePosition" VARCHAR(100) NOT NULL,
  "season" VARCHAR(32) NOT NULL,
  "brandModel" VARCHAR(200) NOT NULL,
  "treadWearPercent" INTEGER NOT NULL,
  "mountedOn" DATE NOT NULL,
  "mountedOdometerKm" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "removedOn" DATE,
  "removedOdometerKm" INTEGER,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleTireRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VehicleTireRecord_scope_mount_key" ON "VehicleTireRecord"("tenantId", "companyId", "periodId", "mountKey");
CREATE UNIQUE INDEX "VehicleTireRecord_scope_active_position" ON "VehicleTireRecord"("tenantId", "companyId", "periodId", "vehicleId", "tirePosition") WHERE "status" = 'ACTIVE';
CREATE INDEX "VehicleTireRecord_scope_vehicle_status_position_idx" ON "VehicleTireRecord"("tenantId", "companyId", "periodId", "vehicleId", "status", "tirePosition");
CREATE INDEX "VehicleTireRecord_scope_status_mountedOn_idx" ON "VehicleTireRecord"("tenantId", "companyId", "periodId", "status", "mountedOn");

ALTER TABLE "VehicleTireRecord" ADD CONSTRAINT "VehicleTireRecord_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleTireRecord" ADD CONSTRAINT "VehicleTireRecord_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleTireRecord" ADD CONSTRAINT "VehicleTireRecord_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleTireRecord" ADD CONSTRAINT "VehicleTireRecord_vehicle_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
