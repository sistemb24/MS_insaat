import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const scope = vi.fn(); const ensureScope = vi.fn(); const vehicleFindFirst = vi.fn(); const vehicleFindMany = vi.fn(); const projectFindFirst = vi.fn(); const projectFindMany = vi.fn(); const entityList = vi.fn(); const auditRecord = vi.fn(); const auditList = vi.fn();
  const repository = {
    createAssignment: vi.fn(async (row) => row), createFuelRecord: vi.fn(async (row) => row), createMaintenancePlan: vi.fn(async (row) => row), createMaintenanceRecord: vi.fn(async (row) => row),
    listOverview: vi.fn(async () => ({ assignments: [], fuelRecords: [], maintenancePlans: [], maintenanceRecords: [] })), updateAssignment: vi.fn(), updateFuelRecord: vi.fn(), updateMaintenancePlan: vi.fn(), updateMaintenanceRecord: vi.fn(),
  };
  return { auditList, auditRecord, ensureScope, entityList, projectFindFirst, projectFindMany, repository, scope, vehicleFindFirst, vehicleFindMany, prisma: { constructionProject: { findFirst: projectFindFirst, findMany: projectFindMany }, vehicle: { findFirst: vehicleFindFirst, findMany: vehicleFindMany } } };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server-active-scope", () => ({ getActiveTenantScope: mocks.scope }));
vi.mock("@/lib/prisma-scope-bootstrap", () => ({ ensureTenantScope: mocks.ensureScope }));
vi.mock("@/lib/entity-prisma-repository", () => ({ createEntityPrismaRepository: () => ({}) }));
vi.mock("@/lib/entity-crud-service", () => ({ createEntityCrudService: () => ({ list: mocks.entityList }) }));
vi.mock("@/lib/audit-log-prisma-repository", () => ({ createAuditLogPrismaRepository: () => ({ listByEntityType: mocks.auditList, record: mocks.auditRecord }) }));
vi.mock("@/lib/vehicle-fleet-prisma-repository", async () => {
  const actual = await vi.importActual<typeof import("@/lib/vehicle-fleet-prisma-repository")>("@/lib/vehicle-fleet-prisma-repository");
  return { ...actual, createVehicleFleetPrismaRepository: () => mocks.repository };
});

import { createVehicleAssignmentAction, createVehicleFuelRecordAction, listVehicleFleetAuditLogsAction, listVehicleFleetLookupsAction } from "./vehicle-fleet-actions";

const activeScope = { tenantId: "tenant-fleet", tenantName: "Tenant", companyId: "company-fleet", companyName: "Şirket", periodId: "period-2026", periodLabel: "2026", userId: "accounting-user", userName: "Muhasebe", userRole: "accounting" as const, licenseLabel: "Kurumsal", periodClosed: false };

describe("vehicle fleet actions", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.scope.mockResolvedValue(activeScope); mocks.ensureScope.mockResolvedValue(undefined); mocks.vehicleFindFirst.mockResolvedValue({ id: "vehicle-1", entryOdometerKm: 100 }); mocks.vehicleFindMany.mockResolvedValue([{ id: "vehicle-1", plate: "34 NOA 101", entryOdometerKm: 100 }]); mocks.projectFindFirst.mockResolvedValue({ id: "project-1" }); mocks.projectFindMany.mockResolvedValue([{ id: "project-1", code: "PRJ-001", name: "A Blok" }]); mocks.entityList.mockResolvedValue({ ok: true, data: { rows: [{ code: "PER-001", name: "Ayşe", status: "Aktif" }] } }); mocks.auditRecord.mockResolvedValue(undefined); mocks.auditList.mockResolvedValue([]); });

  it("re-resolves scope, validates references and audits an assignment without its free note", async () => {
    const result = await createVehicleAssignmentAction({ assignedOn: "2026-07-29", assignmentNote: "Gizli saha notu", driverPersonnelId: "PER-001", projectId: "project-1", vehicleId: "vehicle-1" });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(mocks.ensureScope).toHaveBeenCalledWith(mocks.prisma, activeScope);
    expect(mocks.vehicleFindFirst).toHaveBeenCalledWith({ where: { id: "vehicle-1", tenantId: activeScope.tenantId, companyId: activeScope.companyId, periodId: activeScope.periodId, status: "Aktif" }, select: { entryOdometerKm: true, id: true } });
    expect(mocks.projectFindFirst).toHaveBeenCalledOnce(); expect(mocks.entityList).toHaveBeenCalledWith({ scope: activeScope, slug: "personel" });
    expect(mocks.auditRecord).toHaveBeenCalledWith(expect.objectContaining({ action: "vehicle-fleet.assignment.create" }));
    expect(JSON.stringify(mocks.auditRecord.mock.calls[0][0])).not.toContain("Gizli saha notu");
  });

  it("denies a viewer before scoped reference reads or writes", async () => {
    mocks.scope.mockResolvedValue({ ...activeScope, userRole: "viewer" as const });
    const result = await createVehicleFuelRecordAction({ fueledOn: "2026-07-29", liters: 1, odometerKm: 101, unitPrice: 1, vehicleId: "vehicle-1" });
    expect(result).toEqual(expect.objectContaining({ ok: false }));
    expect(mocks.vehicleFindFirst).not.toHaveBeenCalled(); expect(mocks.repository.createFuelRecord).not.toHaveBeenCalled(); expect(mocks.auditRecord).not.toHaveBeenCalled();
  });

  it("does not mutate or audit when a vehicle is outside the active scope", async () => {
    mocks.vehicleFindFirst.mockResolvedValue(null);
    const result = await createVehicleFuelRecordAction({ fueledOn: "2026-07-29", liters: 1, odometerKm: 101, unitPrice: 1, vehicleId: "foreign-vehicle" });
    expect(result).toEqual({ errors: ["Aktif araç kaydı aktif kapsamda bulunamadı."], ok: false });
    expect(mocks.repository.createFuelRecord).not.toHaveBeenCalled(); expect(mocks.auditRecord).not.toHaveBeenCalled();
  });

  it("lists audit entries only through the active tenant scope", async () => {
    await expect(listVehicleFleetAuditLogsAction()).resolves.toEqual({ data: { rows: [] }, ok: true });
    expect(mocks.auditList).toHaveBeenCalledTimes(4); expect(mocks.auditList).toHaveBeenCalledWith(expect.objectContaining({ limit: 100, scope: activeScope }));
  });

  it("returns only active scoped vehicles, open projects and active personnel for fleet forms", async () => {
    await expect(listVehicleFleetLookupsAction()).resolves.toEqual({ data: { vehicles: [{ id: "vehicle-1", plate: "34 NOA 101", entryOdometerKm: 100 }], projects: [{ id: "project-1", code: "PRJ-001", name: "A Blok" }], personnel: [{ code: "PER-001", name: "Ayşe" }] }, ok: true });
    expect(mocks.vehicleFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: activeScope.tenantId, status: "Aktif" }) }));
    expect(mocks.projectFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ periodId: activeScope.periodId, status: "OPEN" }) }));
  });
});
