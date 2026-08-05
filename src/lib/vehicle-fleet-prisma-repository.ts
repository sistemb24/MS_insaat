import type {
  VehicleAssignmentStatus,
  VehicleFuelRecordStatus,
  VehicleMaintenancePlanStatus,
  VehicleMaintenanceRecordStatus,
} from "./vehicle-fleet-operations";
import type { TenantScope } from "./tenant-scope";

type DateLike = Date | string;
type DecimalLike = number | string | { toString(): string };
type ScopeFields = { companyId: string; periodId: string; tenantId: string };
type Delegate<T> = {
  create(input: { data: unknown }): Promise<T>;
  findMany(input: { orderBy: unknown; where: ScopeFields }): Promise<T[]>;
  update(input: { data: unknown; where: { id: string } }): Promise<T>;
};

export type VehicleAssignmentRow = ScopeFields & {
  assignedOn: string;
  assignmentKey: string;
  assignmentNote: string | null;
  createdAt: string;
  createdBy: string;
  driverPersonnelId: string | null;
  endedOn: string | null;
  id: string;
  projectId: string | null;
  status: VehicleAssignmentStatus;
  updatedAt: string;
  updatedBy: string;
  vehicleId: string;
};

export type VehicleFuelRecordRow = ScopeFields & {
  cancelledOn: string | null;
  createdAt: string;
  createdBy: string;
  fuelKey: string;
  fueledOn: string;
  id: string;
  liters: number;
  odometerKm: number;
  stationName: string | null;
  status: VehicleFuelRecordStatus;
  totalAmount: number;
  unitPrice: number;
  updatedAt: string;
  updatedBy: string;
  vehicleId: string;
};

export type VehicleMaintenancePlanRow = ScopeFields & {
  createdAt: string;
  createdBy: string;
  id: string;
  intervalDays: number | null;
  intervalKm: number | null;
  lastCompletedOn: string | null;
  maintenanceType: string;
  nextDueKm: number | null;
  nextDueOn: string | null;
  status: VehicleMaintenancePlanStatus;
  updatedAt: string;
  updatedBy: string;
  vehicleId: string;
};

export type VehicleMaintenanceRecordRow = ScopeFields & {
  completedOn: string | null;
  completionKey: string | null;
  costAmount: number;
  createdAt: string;
  createdBy: string;
  id: string;
  maintenanceOn: string;
  maintenanceType: string;
  note: string | null;
  odometerKm: number;
  planId: string | null;
  providerName: string | null;
  status: VehicleMaintenanceRecordStatus;
  updatedAt: string;
  updatedBy: string;
  vehicleId: string;
};

type AssignmentRecord = Omit<VehicleAssignmentRow, "assignedOn" | "createdAt" | "endedOn" | "updatedAt"> & {
  assignedOn: DateLike;
  createdAt: DateLike;
  endedOn: DateLike | null;
  status: string;
  updatedAt: DateLike;
};
type FuelRecord = Omit<VehicleFuelRecordRow, "cancelledOn" | "createdAt" | "fueledOn" | "liters" | "totalAmount" | "unitPrice" | "updatedAt"> & {
  cancelledOn: DateLike | null;
  createdAt: DateLike;
  fueledOn: DateLike;
  liters: DecimalLike;
  status: string;
  totalAmount: DecimalLike;
  unitPrice: DecimalLike;
  updatedAt: DateLike;
};
type MaintenancePlanRecord = Omit<VehicleMaintenancePlanRow, "createdAt" | "lastCompletedOn" | "nextDueOn" | "updatedAt"> & {
  createdAt: DateLike;
  lastCompletedOn: DateLike | null;
  nextDueOn: DateLike | null;
  status: string;
  updatedAt: DateLike;
};
type MaintenanceRecord = Omit<VehicleMaintenanceRecordRow, "completedOn" | "costAmount" | "createdAt" | "maintenanceOn" | "updatedAt"> & {
  completedOn: DateLike | null;
  costAmount: DecimalLike;
  createdAt: DateLike;
  maintenanceOn: DateLike;
  status: string;
  updatedAt: DateLike;
};

export type VehicleFleetPrismaClientLike = {
  vehicleAssignment: Delegate<AssignmentRecord>;
  vehicleFuelRecord: Delegate<FuelRecord>;
  vehicleMaintenancePlan: Delegate<MaintenancePlanRecord>;
  vehicleMaintenanceRecord: Delegate<MaintenanceRecord>;
};

export type VehicleFleetRepository = {
  createAssignment(row: VehicleAssignmentRow): Promise<VehicleAssignmentRow>;
  createFuelRecord(row: VehicleFuelRecordRow): Promise<VehicleFuelRecordRow>;
  createMaintenancePlan(row: VehicleMaintenancePlanRow): Promise<VehicleMaintenancePlanRow>;
  createMaintenanceRecord(row: VehicleMaintenanceRecordRow): Promise<VehicleMaintenanceRecordRow>;
  listOverview(input: { scope: TenantScope }): Promise<VehicleFleetOverview>;
  updateAssignment(row: VehicleAssignmentRow): Promise<VehicleAssignmentRow>;
  updateFuelRecord(row: VehicleFuelRecordRow): Promise<VehicleFuelRecordRow>;
  updateMaintenancePlan(row: VehicleMaintenancePlanRow): Promise<VehicleMaintenancePlanRow>;
  updateMaintenanceRecord(row: VehicleMaintenanceRecordRow): Promise<VehicleMaintenanceRecordRow>;
};

export type VehicleFleetOverview = {
  assignments: VehicleAssignmentRow[];
  fuelRecords: VehicleFuelRecordRow[];
  maintenancePlans: VehicleMaintenancePlanRow[];
  maintenanceRecords: VehicleMaintenanceRecordRow[];
};

export function createVehicleFleetPrismaRepository(
  prisma: VehicleFleetPrismaClientLike,
): VehicleFleetRepository {
  return {
    async createAssignment(row) { return assignmentFromRecord(await prisma.vehicleAssignment.create({ data: assignmentData(row) })); },
    async createFuelRecord(row) { return fuelFromRecord(await prisma.vehicleFuelRecord.create({ data: fuelData(row) })); },
    async createMaintenancePlan(row) { return maintenancePlanFromRecord(await prisma.vehicleMaintenancePlan.create({ data: maintenancePlanData(row) })); },
    async createMaintenanceRecord(row) { return maintenanceRecordFromRecord(await prisma.vehicleMaintenanceRecord.create({ data: maintenanceRecordData(row) })); },
    async listOverview({ scope }) {
      const where = scopedWhere(scope);
      const [assignments, fuelRecords, maintenancePlans, maintenanceRecords] = await Promise.all([
        prisma.vehicleAssignment.findMany({ where, orderBy: [{ assignedOn: "desc" }, { id: "asc" }] }),
        prisma.vehicleFuelRecord.findMany({ where, orderBy: [{ fueledOn: "desc" }, { id: "asc" }] }),
        prisma.vehicleMaintenancePlan.findMany({ where, orderBy: [{ nextDueOn: "asc" }, { nextDueKm: "asc" }] }),
        prisma.vehicleMaintenanceRecord.findMany({ where, orderBy: [{ maintenanceOn: "desc" }, { id: "asc" }] }),
      ]);
      return {
        assignments: assignments.map(assignmentFromRecord),
        fuelRecords: fuelRecords.map(fuelFromRecord),
        maintenancePlans: maintenancePlans.map(maintenancePlanFromRecord),
        maintenanceRecords: maintenanceRecords.map(maintenanceRecordFromRecord),
      };
    },
    async updateAssignment(row) { return assignmentFromRecord(await prisma.vehicleAssignment.update({ data: assignmentData(row), where: { id: row.id } })); },
    async updateFuelRecord(row) { return fuelFromRecord(await prisma.vehicleFuelRecord.update({ data: fuelData(row), where: { id: row.id } })); },
    async updateMaintenancePlan(row) { return maintenancePlanFromRecord(await prisma.vehicleMaintenancePlan.update({ data: maintenancePlanData(row), where: { id: row.id } })); },
    async updateMaintenanceRecord(row) { return maintenanceRecordFromRecord(await prisma.vehicleMaintenanceRecord.update({ data: maintenanceRecordData(row), where: { id: row.id } })); },
  };
}

function scopedWhere(scope: TenantScope): ScopeFields {
  return { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId };
}

function assignmentData(row: VehicleAssignmentRow) {
  return { ...scopeFields(row), assignedOn: dayDate(row.assignedOn), assignmentKey: row.assignmentKey, assignmentNote: row.assignmentNote, createdAt: dateTime(row.createdAt), createdBy: row.createdBy, driverPersonnelId: row.driverPersonnelId, endedOn: nullableDayDate(row.endedOn), id: row.id, projectId: row.projectId, status: row.status, updatedAt: dateTime(row.updatedAt), updatedBy: row.updatedBy, vehicleId: row.vehicleId };
}
function fuelData(row: VehicleFuelRecordRow) {
  return { ...scopeFields(row), cancelledOn: nullableDayDate(row.cancelledOn), createdAt: dateTime(row.createdAt), createdBy: row.createdBy, fuelKey: row.fuelKey, fueledOn: dayDate(row.fueledOn), id: row.id, liters: row.liters, odometerKm: row.odometerKm, stationName: row.stationName, status: row.status, totalAmount: row.totalAmount, unitPrice: row.unitPrice, updatedAt: dateTime(row.updatedAt), updatedBy: row.updatedBy, vehicleId: row.vehicleId };
}
function maintenancePlanData(row: VehicleMaintenancePlanRow) {
  return { ...scopeFields(row), createdAt: dateTime(row.createdAt), createdBy: row.createdBy, id: row.id, intervalDays: row.intervalDays, intervalKm: row.intervalKm, lastCompletedOn: nullableDayDate(row.lastCompletedOn), maintenanceType: row.maintenanceType, nextDueKm: row.nextDueKm, nextDueOn: nullableDayDate(row.nextDueOn), status: row.status, updatedAt: dateTime(row.updatedAt), updatedBy: row.updatedBy, vehicleId: row.vehicleId };
}
function maintenanceRecordData(row: VehicleMaintenanceRecordRow) {
  return { ...scopeFields(row), completedOn: nullableDayDate(row.completedOn), completionKey: row.completionKey, costAmount: row.costAmount, createdAt: dateTime(row.createdAt), createdBy: row.createdBy, id: row.id, maintenanceOn: dayDate(row.maintenanceOn), maintenanceType: row.maintenanceType, note: row.note, odometerKm: row.odometerKm, planId: row.planId, providerName: row.providerName, status: row.status, updatedAt: dateTime(row.updatedAt), updatedBy: row.updatedBy, vehicleId: row.vehicleId };
}

function assignmentFromRecord(row: AssignmentRecord): VehicleAssignmentRow {
  return { ...row, assignedOn: day(row.assignedOn)!, createdAt: iso(row.createdAt), endedOn: day(row.endedOn), status: assignmentStatus(row.status), updatedAt: iso(row.updatedAt) };
}
function fuelFromRecord(row: FuelRecord): VehicleFuelRecordRow {
  return { ...row, cancelledOn: day(row.cancelledOn), createdAt: iso(row.createdAt), fueledOn: day(row.fueledOn)!, liters: decimal(row.liters), status: fuelStatus(row.status), totalAmount: decimal(row.totalAmount), unitPrice: decimal(row.unitPrice), updatedAt: iso(row.updatedAt) };
}
function maintenancePlanFromRecord(row: MaintenancePlanRecord): VehicleMaintenancePlanRow {
  return { ...row, createdAt: iso(row.createdAt), lastCompletedOn: day(row.lastCompletedOn), nextDueOn: day(row.nextDueOn), status: maintenancePlanStatus(row.status), updatedAt: iso(row.updatedAt) };
}
function maintenanceRecordFromRecord(row: MaintenanceRecord): VehicleMaintenanceRecordRow {
  return { ...row, completedOn: day(row.completedOn), costAmount: decimal(row.costAmount), createdAt: iso(row.createdAt), maintenanceOn: day(row.maintenanceOn)!, status: maintenanceRecordStatus(row.status), updatedAt: iso(row.updatedAt) };
}

function scopeFields(row: ScopeFields) { return { companyId: row.companyId, periodId: row.periodId, tenantId: row.tenantId }; }
function dateTime(value: string) { return new Date(value); }
function dayDate(value: string) { return new Date(`${value}T00:00:00.000Z`); }
function nullableDayDate(value: string | null) { return value ? dayDate(value) : null; }
function iso(value: DateLike) { return (typeof value === "string" ? new Date(value) : value).toISOString(); }
function day(value: DateLike | null) { return value ? iso(value).slice(0, 10) : null; }
function decimal(value: DecimalLike) { return Number(typeof value === "object" ? value.toString() : value); }
function assignmentStatus(value: string): VehicleAssignmentStatus { return value === "COMPLETED" || value === "TRANSFERRED" ? value : "ACTIVE"; }
function fuelStatus(value: string): VehicleFuelRecordStatus { return value === "CANCELLED" ? value : "RECORDED"; }
function maintenancePlanStatus(value: string): VehicleMaintenancePlanStatus { return value === "COMPLETED" || value === "CANCELLED" ? value : "ACTIVE"; }
function maintenanceRecordStatus(value: string): VehicleMaintenanceRecordStatus { return value === "COMPLETED" ? value : "DRAFT"; }
