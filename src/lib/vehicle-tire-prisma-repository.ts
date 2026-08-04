import type { VehicleTireSeason, VehicleTireStatus } from "./vehicle-tire-operations";
import type { TenantScope } from "./tenant-scope";

type DateLike = Date | string;
type ScopeFields = { companyId: string; periodId: string; tenantId: string };
type Delegate<T> = {
  create(input: { data: unknown }): Promise<T>;
  findMany(input: { orderBy: unknown; where: ScopeFields }): Promise<T[]>;
  update(input: { data: unknown; where: { id: string } }): Promise<T>;
};

export type VehicleTireRecordRow = ScopeFields & {
  brandModel: string;
  createdAt: string;
  createdBy: string;
  id: string;
  mountKey: string;
  mountedOdometerKm: number;
  mountedOn: string;
  removedOdometerKm: number | null;
  removedOn: string | null;
  season: VehicleTireSeason;
  status: VehicleTireStatus;
  tirePosition: string;
  treadWearPercent: number;
  updatedAt: string;
  updatedBy: string;
  vehicleId: string;
};

type TireRecord = Omit<VehicleTireRecordRow, "createdAt" | "mountedOn" | "removedOn" | "season" | "status" | "updatedAt"> & {
  createdAt: DateLike;
  mountedOn: DateLike;
  removedOn: DateLike | null;
  season: string;
  status: string;
  updatedAt: DateLike;
};

export type VehicleTirePrismaClientLike = {
  vehicleTireRecord: Delegate<TireRecord>;
};

export type VehicleTireRepository = {
  createTireRecord(row: VehicleTireRecordRow): Promise<VehicleTireRecordRow>;
  listTireRecords(input: { scope: TenantScope }): Promise<VehicleTireRecordRow[]>;
  updateTireRecord(row: VehicleTireRecordRow): Promise<VehicleTireRecordRow>;
};

export function createVehicleTirePrismaRepository(
  prisma: VehicleTirePrismaClientLike,
): VehicleTireRepository {
  return {
    async createTireRecord(row) {
      return tireFromRecord(await prisma.vehicleTireRecord.create({ data: tireData(row) }));
    },
    async listTireRecords({ scope }) {
      const records = await prisma.vehicleTireRecord.findMany({
        where: scopedWhere(scope),
        orderBy: [{ status: "asc" }, { mountedOn: "desc" }, { id: "asc" }],
      });
      return records.map(tireFromRecord);
    },
    async updateTireRecord(row) {
      return tireFromRecord(await prisma.vehicleTireRecord.update({ data: tireData(row), where: { id: row.id } }));
    },
  };
}

function scopedWhere(scope: TenantScope): ScopeFields {
  return { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId };
}

function tireData(row: VehicleTireRecordRow) {
  return {
    ...scopeFields(row),
    brandModel: row.brandModel,
    createdAt: dateTime(row.createdAt),
    createdBy: row.createdBy,
    id: row.id,
    mountKey: row.mountKey,
    mountedOdometerKm: row.mountedOdometerKm,
    mountedOn: dayDate(row.mountedOn),
    removedOdometerKm: row.removedOdometerKm,
    removedOn: nullableDayDate(row.removedOn),
    season: row.season,
    status: row.status,
    tirePosition: row.tirePosition,
    treadWearPercent: row.treadWearPercent,
    updatedAt: dateTime(row.updatedAt),
    updatedBy: row.updatedBy,
    vehicleId: row.vehicleId,
  };
}

function tireFromRecord(row: TireRecord): VehicleTireRecordRow {
  return {
    ...row,
    createdAt: iso(row.createdAt),
    mountedOn: day(row.mountedOn)!,
    removedOn: day(row.removedOn),
    season: tireSeason(row.season),
    status: tireStatus(row.status),
    updatedAt: iso(row.updatedAt),
  };
}

function scopeFields(row: ScopeFields) { return { companyId: row.companyId, periodId: row.periodId, tenantId: row.tenantId }; }
function dateTime(value: string) { return new Date(value); }
function dayDate(value: string) { return new Date(`${value}T00:00:00.000Z`); }
function nullableDayDate(value: string | null) { return value ? dayDate(value) : null; }
function iso(value: DateLike) { return (typeof value === "string" ? new Date(value) : value).toISOString(); }
function day(value: DateLike | null) { return value ? iso(value).slice(0, 10) : null; }
function tireSeason(value: string): VehicleTireSeason { return value === "WINTER" || value === "ALL_SEASON" ? value : "SUMMER"; }
function tireStatus(value: string): VehicleTireStatus { return value === "REMOVED" ? value : "ACTIVE"; }
