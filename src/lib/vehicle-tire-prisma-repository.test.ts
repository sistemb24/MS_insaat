import { describe, expect, it, vi } from "vitest";

import {
  createVehicleTirePrismaRepository,
  type VehicleTirePrismaClientLike,
  type VehicleTireRecordRow,
} from "./vehicle-tire-prisma-repository";
import { defaultTenantScope } from "./tenant-scope";

const timestamp = "2026-07-29T10:00:00.000Z";

function setup() {
  const vehicleTireRecord = delegate({
    id: "tire-1", ...scope(), vehicleId: "vehicle-1", mountKey: "vehicle-1::sol ön::2026-07-29::model", tirePosition: "Sol Ön", season: "SUMMER", brandModel: "315/80 R22.5 X Multi", treadWearPercent: 12, mountedOn: day("2026-07-29"), mountedOdometerKm: 120500, status: "ACTIVE", removedOn: null, removedOdometerKm: null, createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: now(), updatedAt: now(),
  });
  const prisma = { vehicleTireRecord } as unknown as VehicleTirePrismaClientLike;
  return { repository: createVehicleTirePrismaRepository(prisma), vehicleTireRecord };
}

describe("vehicle tire Prisma repository", () => {
  it("reads tire records only in the active tenant, company and period scope", async () => {
    const { repository, vehicleTireRecord } = setup();
    await expect(repository.listTireRecords({ scope: defaultTenantScope })).resolves.toEqual([
      expect.objectContaining({ mountedOn: "2026-07-29", season: "SUMMER", status: "ACTIVE" }),
    ]);
    expect(vehicleTireRecord.findMany).toHaveBeenCalledWith({
      where: scope(),
      orderBy: [{ status: "asc" }, { mountedOn: "desc" }, { id: "asc" }],
    });
  });

  it("creates a tire record with scoped idempotency key and UTC date-only values", async () => {
    const { repository, vehicleTireRecord } = setup();
    const row: VehicleTireRecordRow = {
      id: "tire-1", ...scope(), vehicleId: "vehicle-1", mountKey: "vehicle-1::sol ön::2026-07-29::model", tirePosition: "Sol Ön", season: "SUMMER", brandModel: "315/80 R22.5 X Multi", treadWearPercent: 12, mountedOn: "2026-07-29", mountedOdometerKm: 120500, status: "ACTIVE", removedOn: null, removedOdometerKm: null, createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: timestamp, updatedAt: timestamp,
    };
    await expect(repository.createTireRecord(row)).resolves.toEqual(expect.objectContaining({ mountedOn: "2026-07-29", tirePosition: "Sol Ön" }));
    expect(vehicleTireRecord.create).toHaveBeenCalledWith({ data: expect.objectContaining({ mountKey: row.mountKey, mountedOn: new Date("2026-07-29T00:00:00.000Z"), tenantId: defaultTenantScope.tenantId, companyId: defaultTenantScope.companyId, periodId: defaultTenantScope.periodId }) });
  });

  it("maps unknown persisted season and status values to safe defaults", async () => {
    const { repository, vehicleTireRecord } = setup();
    vehicleTireRecord.findMany.mockResolvedValueOnce([{
      id: "tire-unknown", ...scope(), vehicleId: "vehicle-1", mountKey: "key", tirePosition: "Sol Ön", season: "UNKNOWN", brandModel: "Model", treadWearPercent: 0, mountedOn: day("2026-07-29"), mountedOdometerKm: 1, status: "UNKNOWN", removedOn: null, removedOdometerKm: null, createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: now(), updatedAt: now(),
    }]);
    await expect(repository.listTireRecords({ scope: defaultTenantScope })).resolves.toEqual([
      expect.objectContaining({ season: "SUMMER", status: "ACTIVE" }),
    ]);
  });
});

function delegate<T>(row: T) {
  return { create: vi.fn().mockResolvedValue(row), findMany: vi.fn().mockResolvedValue([row]), update: vi.fn().mockResolvedValue(row) };
}
function scope() { return { tenantId: defaultTenantScope.tenantId, companyId: defaultTenantScope.companyId, periodId: defaultTenantScope.periodId }; }
function day(value: string) { return new Date(`${value}T00:00:00.000Z`); }
function now() { return new Date(timestamp); }
