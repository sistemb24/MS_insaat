CREATE TABLE "VehicleAssignment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "projectId" TEXT,
  "driverPersonnelId" TEXT,
  "assignmentKey" VARCHAR(1000) NOT NULL,
  "assignedOn" TIMESTAMP(3) NOT NULL,
  "endedOn" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "assignmentNote" TEXT,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleFuelRecord" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "fuelKey" VARCHAR(1000) NOT NULL,
  "fueledOn" TIMESTAMP(3) NOT NULL,
  "liters" DECIMAL(18,3) NOT NULL,
  "unitPrice" DECIMAL(18,4) NOT NULL,
  "totalAmount" DECIMAL(18,2) NOT NULL,
  "odometerKm" INTEGER NOT NULL,
  "stationName" VARCHAR(500),
  "status" TEXT NOT NULL DEFAULT 'RECORDED',
  "cancelledOn" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleFuelRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleMaintenancePlan" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "maintenanceType" VARCHAR(500) NOT NULL,
  "intervalKm" INTEGER,
  "intervalDays" INTEGER,
  "nextDueKm" INTEGER,
  "nextDueOn" TIMESTAMP(3),
  "lastCompletedOn" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleMaintenancePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleMaintenanceRecord" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "planId" TEXT,
  "completionKey" VARCHAR(1000),
  "maintenanceType" VARCHAR(500) NOT NULL,
  "maintenanceOn" TIMESTAMP(3) NOT NULL,
  "odometerKm" INTEGER NOT NULL,
  "costAmount" DECIMAL(18,2) NOT NULL,
  "providerName" VARCHAR(500),
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "completedOn" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleMaintenanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VehicleAssignment_scope_assignment_key" ON "VehicleAssignment"("tenantId", "companyId", "periodId", "assignmentKey");
CREATE INDEX "VehicleAssignment_scope_vehicle_status_idx" ON "VehicleAssignment"("tenantId", "companyId", "periodId", "vehicleId", "status");
CREATE INDEX "VehicleAssignment_scope_project_idx" ON "VehicleAssignment"("tenantId", "companyId", "periodId", "projectId");
CREATE INDEX "VehicleAssignment_scope_driver_idx" ON "VehicleAssignment"("tenantId", "companyId", "periodId", "driverPersonnelId");
CREATE UNIQUE INDEX "VehicleFuelRecord_scope_fuel_key" ON "VehicleFuelRecord"("tenantId", "companyId", "periodId", "fuelKey");
CREATE INDEX "VehicleFuelRecord_scope_vehicle_fueledOn_idx" ON "VehicleFuelRecord"("tenantId", "companyId", "periodId", "vehicleId", "fueledOn");
CREATE INDEX "VehicleFuelRecord_scope_status_fueledOn_idx" ON "VehicleFuelRecord"("tenantId", "companyId", "periodId", "status", "fueledOn");
CREATE INDEX "VehicleMaintenancePlan_scope_vehicle_status_idx" ON "VehicleMaintenancePlan"("tenantId", "companyId", "periodId", "vehicleId", "status");
CREATE INDEX "VehicleMaintenancePlan_scope_nextDueOn_idx" ON "VehicleMaintenancePlan"("tenantId", "companyId", "periodId", "nextDueOn");
CREATE INDEX "VehicleMaintenancePlan_scope_nextDueKm_idx" ON "VehicleMaintenancePlan"("tenantId", "companyId", "periodId", "nextDueKm");
CREATE UNIQUE INDEX "VehicleMaintenanceRecord_scope_completion_key" ON "VehicleMaintenanceRecord"("tenantId", "companyId", "periodId", "completionKey");
CREATE INDEX "VehicleMaintenanceRecord_scope_vehicle_status_maintenanceOn_idx" ON "VehicleMaintenanceRecord"("tenantId", "companyId", "periodId", "vehicleId", "status", "maintenanceOn");
CREATE INDEX "VehicleMaintenanceRecord_scope_plan_idx" ON "VehicleMaintenanceRecord"("tenantId", "companyId", "periodId", "planId");

ALTER TABLE "VehicleAssignment" ADD CONSTRAINT "VehicleAssignment_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleAssignment" ADD CONSTRAINT "VehicleAssignment_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleAssignment" ADD CONSTRAINT "VehicleAssignment_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleAssignment" ADD CONSTRAINT "VehicleAssignment_vehicle_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleFuelRecord" ADD CONSTRAINT "VehicleFuelRecord_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleFuelRecord" ADD CONSTRAINT "VehicleFuelRecord_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleFuelRecord" ADD CONSTRAINT "VehicleFuelRecord_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleFuelRecord" ADD CONSTRAINT "VehicleFuelRecord_vehicle_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenancePlan" ADD CONSTRAINT "VehicleMaintenancePlan_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenancePlan" ADD CONSTRAINT "VehicleMaintenancePlan_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenancePlan" ADD CONSTRAINT "VehicleMaintenancePlan_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenancePlan" ADD CONSTRAINT "VehicleMaintenancePlan_vehicle_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenanceRecord" ADD CONSTRAINT "VehicleMaintenanceRecord_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenanceRecord" ADD CONSTRAINT "VehicleMaintenanceRecord_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenanceRecord" ADD CONSTRAINT "VehicleMaintenanceRecord_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenanceRecord" ADD CONSTRAINT "VehicleMaintenanceRecord_vehicle_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenanceRecord" ADD CONSTRAINT "VehicleMaintenanceRecord_plan_fkey" FOREIGN KEY ("planId") REFERENCES "VehicleMaintenancePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
