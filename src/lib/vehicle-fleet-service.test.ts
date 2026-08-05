import { describe, expect, it, vi } from "vitest";

import { createVehicleFleetService } from "./vehicle-fleet-service";
import type { VehicleFleetOverview, VehicleFleetRepository } from "./vehicle-fleet-prisma-repository";
import { defaultTenantScope } from "./tenant-scope";

const now = "2026-07-29T09:00:00.000Z";

function setup(overview: VehicleFleetOverview = emptyOverview()) {
  const repository: VehicleFleetRepository = {
    createAssignment: vi.fn(async (row) => row), createFuelRecord: vi.fn(async (row) => row), createMaintenancePlan: vi.fn(async (row) => row), createMaintenanceRecord: vi.fn(async (row) => row),
    listOverview: vi.fn(async () => overview), updateAssignment: vi.fn(async (row) => row), updateFuelRecord: vi.fn(async (row) => row), updateMaintenancePlan: vi.fn(async (row) => row), updateMaintenanceRecord: vi.fn(async (row) => row),
  };
  const audit = { record: vi.fn(async () => undefined) };
  const service = createVehicleFleetService({ auditLogRepository: audit, createId: ({ kind, stableKey }) => `${kind}::${stableKey ?? "new"}`, now: () => now, repository });
  return { audit, repository, service };
}

describe("vehicle fleet service", () => {
  it("creates an assignment with metadata-only audit and no financial side effect", async () => {
    const { audit, repository, service } = setup();
    const result = await service.createAssignment({ scope: defaultTenantScope, values: { assignedOn: "2026-07-29", assignmentNote: "Gizli saha notu", driverPersonnelId: "PER-1", projectId: "project-1", vehicleId: "vehicle-1" } });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(repository.createAssignment).toHaveBeenCalledOnce();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: "vehicle-fleet.assignment.create", metadata: { projectId: "project-1", statusTo: "ACTIVE", vehicleId: "vehicle-1" } }));
    expect(JSON.stringify((audit.record.mock.calls as unknown as Array<[unknown]>)[0][0])).not.toContain("Gizli saha notu");
  });

  it("keeps assignment retries idempotent and rejects a different active assignment", async () => {
    const assignment = assignmentRow({ assignmentKey: "vehicle-1::2026-07-29" });
    const { repository, service } = setup({ ...emptyOverview(), assignments: [assignment] });
    const retry = await service.createAssignment({ scope: defaultTenantScope, values: { assignedOn: "2026-07-29", projectId: "project-1", vehicleId: "vehicle-1" } });
    expect(retry).toEqual({ data: { idempotent: true, row: assignment }, ok: true });
    expect(repository.createAssignment).not.toHaveBeenCalled();
    const conflict = await service.createAssignment({ scope: defaultTenantScope, values: { assignedOn: "2026-07-30", projectId: "project-1", vehicleId: "vehicle-1" } });
    expect(conflict).toEqual({ errors: ["Araç için açık bir atama zaten bulunmaktadır."], ok: false });
  });

  it("transfers an active assignment by closing it and creating the next scoped assignment", async () => {
    const current = assignmentRow({ assignedOn: "2026-07-28" });
    const { audit, repository, service } = setup({ ...emptyOverview(), assignments: [current] });
    const result = await service.transferAssignment({ id: current.id, scope: defaultTenantScope, values: { assignedOn: "2026-07-29", driverPersonnelId: "PER-2", projectId: "project-2", vehicleId: "vehicle-1" } });
    expect(result).toEqual(expect.objectContaining({ data: expect.objectContaining({ previous: expect.objectContaining({ status: "TRANSFERRED" }), row: expect.objectContaining({ status: "ACTIVE" }) }), ok: true }));
    expect(repository.updateAssignment).toHaveBeenCalledWith(expect.objectContaining({ id: current.id, status: "TRANSFERRED" }));
    expect(repository.createAssignment).toHaveBeenCalledWith(expect.objectContaining({ assignmentKey: "vehicle-1::2026-07-29", status: "ACTIVE" }));
    expect(audit.record).toHaveBeenCalledTimes(2);
  });

  it("denies closed-period and viewer mutations before repository writes", async () => {
    const { repository, service } = setup();
    const result = await service.createMaintenancePlan({ scope: { ...defaultTenantScope, userRole: "viewer" }, values: { maintenanceType: "Periyodik", nextDueKm: 100, vehicleId: "vehicle-1" } });
    expect(result).toEqual(expect.objectContaining({ ok: false }));
    expect(repository.createMaintenancePlan).not.toHaveBeenCalled();
  });

  it("creates idempotent fuel records and prevents odometer regression", async () => {
    const fuel = fuelRow({ fuelKey: "vehicle-1::2026-07-28::100::manual", odometerKm: 100 });
    const { repository, service } = setup({ ...emptyOverview(), fuelRecords: [fuel] });
    const retry = await service.createFuelRecord({ scope: defaultTenantScope, values: { fueledOn: "2026-07-28", liters: 1, odometerKm: 100, unitPrice: 1, vehicleId: "vehicle-1" } });
    expect(retry).toEqual({ data: { idempotent: true, row: fuel }, ok: true });
    const regression = await service.createFuelRecord({ scope: defaultTenantScope, values: { fueledOn: "2026-07-29", liters: 1, odometerKm: 99, unitPrice: 1, vehicleId: "vehicle-1" } });
    expect(regression).toEqual(expect.objectContaining({ ok: false }));
    expect(repository.createFuelRecord).not.toHaveBeenCalled();
  });

  it("completes a maintenance record and advances only its active plan", async () => {
    const plan = planRow(); const record = maintenanceRow({ planId: plan.id });
    const { audit, repository, service } = setup({ ...emptyOverview(), maintenancePlans: [plan], maintenanceRecords: [record] });
    const result = await service.completeMaintenanceRecord({ id: record.id, scope: defaultTenantScope });
    expect(result).toEqual(expect.objectContaining({ data: expect.objectContaining({ completedOn: "2026-07-29", status: "COMPLETED" }), ok: true }));
    expect(repository.updateMaintenancePlan).toHaveBeenCalledWith(expect.objectContaining({ id: plan.id, lastCompletedOn: "2026-07-29", status: "ACTIVE" }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: "vehicle-fleet.maintenance-record.complete", metadata: expect.not.objectContaining({ note: expect.anything() }) }));
  });
});

function emptyOverview(): VehicleFleetOverview { return { assignments: [], fuelRecords: [], maintenancePlans: [], maintenanceRecords: [] }; }
function scope() { return { tenantId: defaultTenantScope.tenantId, companyId: defaultTenantScope.companyId, periodId: defaultTenantScope.periodId }; }
function assignmentRow(values: Partial<VehicleFleetOverview["assignments"][number]> = {}) { return { id: "assignment-1", ...scope(), vehicleId: "vehicle-1", projectId: "project-1", driverPersonnelId: null, assignmentKey: "vehicle-1::2026-07-28", assignedOn: "2026-07-28", endedOn: null, status: "ACTIVE" as const, assignmentNote: null, createdAt: now, createdBy: defaultTenantScope.userId, updatedAt: now, updatedBy: defaultTenantScope.userId, ...values }; }
function fuelRow(values: Partial<VehicleFleetOverview["fuelRecords"][number]> = {}) { return { id: "fuel-1", ...scope(), vehicleId: "vehicle-1", fuelKey: "fuel", fueledOn: "2026-07-28", liters: 1, unitPrice: 1, totalAmount: 1, odometerKm: 1, stationName: null, status: "RECORDED" as const, cancelledOn: null, createdAt: now, createdBy: defaultTenantScope.userId, updatedAt: now, updatedBy: defaultTenantScope.userId, ...values }; }
function planRow() { return { id: "plan-1", ...scope(), vehicleId: "vehicle-1", maintenanceType: "Periyodik", intervalKm: null, intervalDays: null, nextDueKm: 100, nextDueOn: null, lastCompletedOn: null, status: "ACTIVE" as const, createdAt: now, createdBy: defaultTenantScope.userId, updatedAt: now, updatedBy: defaultTenantScope.userId }; }
function maintenanceRow(values: Partial<VehicleFleetOverview["maintenanceRecords"][number]> = {}) { return { id: "maintenance-1", ...scope(), vehicleId: "vehicle-1", planId: null, completionKey: null, maintenanceType: "Periyodik", maintenanceOn: "2026-07-28", odometerKm: 100, costAmount: 1, providerName: null, note: "Gizli bakım notu", status: "DRAFT" as const, completedOn: null, createdAt: now, createdBy: defaultTenantScope.userId, updatedAt: now, updatedBy: defaultTenantScope.userId, ...values }; }
