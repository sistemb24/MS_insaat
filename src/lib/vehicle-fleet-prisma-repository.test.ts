import { describe, expect, it, vi } from "vitest";

import {
  createVehicleFleetPrismaRepository,
  type VehicleFleetPrismaClientLike,
  type VehicleFuelRecordRow,
} from "./vehicle-fleet-prisma-repository";
import { defaultTenantScope } from "./tenant-scope";

const timestamp = "2026-07-28T10:00:00.000Z";

function setup() {
  const vehicleAssignment = delegate({
    id: "assignment-1", ...scope(), vehicleId: "vehicle-1", projectId: "project-1", driverPersonnelId: "person-1", assignmentKey: "vehicle-1::2026-07-28", assignedOn: day("2026-07-28"), endedOn: null, status: "ACTIVE", assignmentNote: null, createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: now(), updatedAt: now(),
  });
  const vehicleFuelRecord = delegate({
    id: "fuel-1", ...scope(), vehicleId: "vehicle-1", fuelKey: "vehicle-1::2026-07-28::100::manual", fueledOn: day("2026-07-28"), liters: decimal("42.500"), unitPrice: decimal("42.3700"), totalAmount: decimal("1800.73"), odometerKm: 100, stationName: null, status: "RECORDED", cancelledOn: null, createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: now(), updatedAt: now(),
  });
  const vehicleMaintenancePlan = delegate({
    id: "plan-1", ...scope(), vehicleId: "vehicle-1", maintenanceType: "Periyodik", intervalKm: 10000, intervalDays: null, nextDueKm: 120000, nextDueOn: day("2027-01-28"), lastCompletedOn: null, status: "ACTIVE", createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: now(), updatedAt: now(),
  });
  const vehicleMaintenanceRecord = delegate({
    id: "maintenance-1", ...scope(), vehicleId: "vehicle-1", planId: "plan-1", completionKey: null, maintenanceType: "Periyodik", maintenanceOn: day("2026-07-28"), odometerKm: 110000, costAmount: decimal("1250.00"), providerName: "Servis A", note: null, status: "DRAFT", completedOn: null, createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: now(), updatedAt: now(),
  });
  const prisma = { vehicleAssignment, vehicleFuelRecord, vehicleMaintenancePlan, vehicleMaintenanceRecord } as unknown as VehicleFleetPrismaClientLike;
  return { repository: createVehicleFleetPrismaRepository(prisma), vehicleAssignment, vehicleFuelRecord, vehicleMaintenancePlan, vehicleMaintenanceRecord };
}

describe("vehicle fleet Prisma repository", () => {
  it("reads every fleet surface in the active tenant, company and period scope", async () => {
    const { repository, vehicleAssignment, vehicleFuelRecord, vehicleMaintenancePlan, vehicleMaintenanceRecord } = setup();
    const result = await repository.listOverview({ scope: defaultTenantScope });
    expect(vehicleAssignment.findMany).toHaveBeenCalledWith({ where: scope(), orderBy: [{ assignedOn: "desc" }, { id: "asc" }] });
    expect(vehicleFuelRecord.findMany).toHaveBeenCalledWith({ where: scope(), orderBy: [{ fueledOn: "desc" }, { id: "asc" }] });
    expect(vehicleMaintenancePlan.findMany).toHaveBeenCalledWith({ where: scope(), orderBy: [{ nextDueOn: "asc" }, { nextDueKm: "asc" }] });
    expect(vehicleMaintenanceRecord.findMany).toHaveBeenCalledWith({ where: scope(), orderBy: [{ maintenanceOn: "desc" }, { id: "asc" }] });
    expect(result).toEqual(expect.objectContaining({
      assignments: [expect.objectContaining({ status: "ACTIVE", assignedOn: "2026-07-28" })],
      fuelRecords: [expect.objectContaining({ liters: 42.5, totalAmount: 1800.73 })],
      maintenancePlans: [expect.objectContaining({ nextDueOn: "2027-01-28" })],
      maintenanceRecords: [expect.objectContaining({ costAmount: 1250, status: "DRAFT" })],
    }));
  });

  it("creates a fuel record with scoped idempotency key and date-only UTC fields", async () => {
    const { repository, vehicleFuelRecord } = setup();
    const row: VehicleFuelRecordRow = {
      id: "fuel-1", ...scope(), vehicleId: "vehicle-1", fuelKey: "vehicle-1::2026-07-28::100::manual", fueledOn: "2026-07-28", liters: 42.5, unitPrice: 42.37, totalAmount: 1800.73, odometerKm: 100, stationName: null, status: "RECORDED", cancelledOn: null, createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: timestamp, updatedAt: timestamp,
    };
    await expect(repository.createFuelRecord(row)).resolves.toEqual(expect.objectContaining({ fueledOn: "2026-07-28", totalAmount: 1800.73 }));
    expect(vehicleFuelRecord.create).toHaveBeenCalledWith({ data: expect.objectContaining({ fuelKey: row.fuelKey, fueledOn: new Date("2026-07-28T00:00:00.000Z"), tenantId: defaultTenantScope.tenantId, companyId: defaultTenantScope.companyId, periodId: defaultTenantScope.periodId }) });
  });

  it("maps unknown persisted states to safe defaults", async () => {
    const { repository, vehicleMaintenancePlan } = setup();
    vehicleMaintenancePlan.findMany.mockResolvedValueOnce([{
      id: "plan-unknown", ...scope(), vehicleId: "vehicle-1", maintenanceType: "Periyodik", intervalKm: null, intervalDays: null, nextDueKm: null, nextDueOn: null, lastCompletedOn: null, status: "UNKNOWN", createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: now(), updatedAt: now(),
    }]);
    const result = await repository.listOverview({ scope: defaultTenantScope });
    expect(result.maintenancePlans[0]).toEqual(expect.objectContaining({ status: "ACTIVE" }));
  });
});

function delegate<T>(row: T) {
  return { create: vi.fn().mockResolvedValue(row), findMany: vi.fn().mockResolvedValue([row]), update: vi.fn().mockResolvedValue(row) };
}
function scope() { return { tenantId: defaultTenantScope.tenantId, companyId: defaultTenantScope.companyId, periodId: defaultTenantScope.periodId }; }
function day(value: string) { return new Date(`${value}T00:00:00.000Z`); }
function now() { return new Date(timestamp); }
function decimal(value: string) { return { toString: () => value }; }
