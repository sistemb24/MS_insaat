"use server";

import { revalidatePath } from "next/cache";

import { createAuditLogPrismaRepository, type AuditLogPrismaClientLike } from "@/lib/audit-log-prisma-repository";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";
import {
  createVehicleFleetPrismaRepository,
  type VehicleFleetPrismaClientLike,
} from "@/lib/vehicle-fleet-prisma-repository";
import { createVehicleFleetService } from "@/lib/vehicle-fleet-service";
import {
  getVehicleFleetOperationPermission,
  type VehicleAssignmentDraftInput,
  type VehicleFuelRecordDraftInput,
  type VehicleMaintenancePlanDraftInput,
  type VehicleMaintenanceRecordDraftInput,
} from "@/lib/vehicle-fleet-operations";
import type { TenantScope } from "@/lib/tenant-scope";

const auditLogRepository = createAuditLogPrismaRepository(prisma as unknown as AuditLogPrismaClientLike);
const entityService = createEntityCrudService({ now: () => new Date().toISOString(), repository: createEntityPrismaRepository(prisma) });
const vehicleFleetService = createVehicleFleetService({
  auditLogRepository,
  now: () => new Date().toISOString(),
  repository: createVehicleFleetPrismaRepository(prisma as unknown as VehicleFleetPrismaClientLike),
});

export async function listVehicleFleetOverviewAction() {
  const context = await getFleetContext();
  return context.ok ? vehicleFleetService.list({ scope: context.scope }) : context;
}

export async function listVehicleFleetAuditLogsAction() {
  const context = await getFleetContext();
  if (!context.ok) return context;
  if (!auditLogRepository.listByEntityType) return failure("Araç operasyon audit kaydı bağlantısı hazır değil.");
  const entityTypes = ["vehicle-fleet-assignment", "vehicle-fleet-fuel", "vehicle-fleet-maintenance-plan", "vehicle-fleet-maintenance-record"];
  const rows = (await Promise.all(entityTypes.map((entityType) => auditLogRepository.listByEntityType!({ entityType, limit: 100, scope: context.scope })))).flat().sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  return { data: { rows }, ok: true as const };
}

export async function listVehicleFleetLookupsAction() {
  const context = await getFleetContext();
  if (!context.ok) return context;
  const [vehicles, projects, personnel] = await Promise.all([
    prisma.vehicle.findMany({
      where: { tenantId: context.scope.tenantId, companyId: context.scope.companyId, periodId: context.scope.periodId, status: "Aktif" },
      orderBy: [{ plate: "asc" }], select: { entryOdometerKm: true, id: true, plate: true },
    }),
    prisma.constructionProject.findMany({
      where: { tenantId: context.scope.tenantId, companyId: context.scope.companyId, periodId: context.scope.periodId, status: "OPEN" },
      orderBy: [{ code: "asc" }], select: { code: true, id: true, name: true },
    }),
    entityService.list({ scope: context.scope, slug: "personel" }),
  ]);
  if (!personnel.ok) return personnel;
  return {
    data: {
      personnel: personnel.data.rows.filter((row) => row.status !== "Pasif").map((row) => ({ code: row.code, name: row.name })),
      projects,
      vehicles,
    },
    ok: true as const,
  };
}

export async function createVehicleAssignmentAction(values: VehicleAssignmentDraftInput) {
  const context = await getFleetContext({ mutation: true }); if (!context.ok) return context;
  const vehicle = await validateVehicle(context.scope, values.vehicleId); if (!vehicle.ok) return vehicle;
  const references = await validateAssignmentReferences(context.scope, values); if (!references.ok) return references;
  return revalidateSuccessful(await vehicleFleetService.createAssignment({ scope: context.scope, values }));
}
export async function completeVehicleAssignmentAction(id: string) {
  const context = await getFleetContext({ mutation: true });
  return context.ok ? revalidateSuccessful(await vehicleFleetService.completeAssignment({ id, scope: context.scope })) : context;
}
export async function transferVehicleAssignmentAction(id: string, values: VehicleAssignmentDraftInput) {
  const context = await getFleetContext({ mutation: true }); if (!context.ok) return context;
  const vehicle = await validateVehicle(context.scope, values.vehicleId); if (!vehicle.ok) return vehicle;
  const references = await validateAssignmentReferences(context.scope, values); if (!references.ok) return references;
  return revalidateSuccessful(await vehicleFleetService.transferAssignment({ id, scope: context.scope, values }));
}

export async function createVehicleFuelRecordAction(values: VehicleFuelRecordDraftInput) {
  const context = await getFleetContext({ mutation: true }); if (!context.ok) return context;
  const vehicle = await validateVehicle(context.scope, values.vehicleId); if (!vehicle.ok) return vehicle;
  return revalidateSuccessful(await vehicleFleetService.createFuelRecord({ entryOdometerKm: vehicle.data.entryOdometerKm, scope: context.scope, values }));
}
export async function cancelVehicleFuelRecordAction(id: string) {
  const context = await getFleetContext({ mutation: true });
  return context.ok ? revalidateSuccessful(await vehicleFleetService.cancelFuelRecord({ id, scope: context.scope })) : context;
}

export async function createVehicleMaintenancePlanAction(values: VehicleMaintenancePlanDraftInput) {
  const context = await getFleetContext({ mutation: true }); if (!context.ok) return context;
  const vehicle = await validateVehicle(context.scope, values.vehicleId); if (!vehicle.ok) return vehicle;
  return revalidateSuccessful(await vehicleFleetService.createMaintenancePlan({ scope: context.scope, values }));
}
export async function completeVehicleMaintenancePlanAction(id: string) {
  const context = await getFleetContext({ mutation: true });
  return context.ok ? revalidateSuccessful(await vehicleFleetService.completeMaintenancePlan({ id, scope: context.scope })) : context;
}
export async function cancelVehicleMaintenancePlanAction(id: string) {
  const context = await getFleetContext({ mutation: true });
  return context.ok ? revalidateSuccessful(await vehicleFleetService.cancelMaintenancePlan({ id, scope: context.scope })) : context;
}

export async function createVehicleMaintenanceRecordAction(values: VehicleMaintenanceRecordDraftInput) {
  const context = await getFleetContext({ mutation: true }); if (!context.ok) return context;
  const vehicle = await validateVehicle(context.scope, values.vehicleId); if (!vehicle.ok) return vehicle;
  return revalidateSuccessful(await vehicleFleetService.createMaintenanceRecord({ entryOdometerKm: vehicle.data.entryOdometerKm, scope: context.scope, values }));
}
export async function completeVehicleMaintenanceRecordAction(id: string) {
  const context = await getFleetContext({ mutation: true });
  return context.ok ? revalidateSuccessful(await vehicleFleetService.completeMaintenanceRecord({ id, scope: context.scope })) : context;
}

async function getFleetContext(input: { mutation?: boolean } = {}) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  if (input.mutation) {
    const permission = getVehicleFleetOperationPermission({ operation: "create", periodClosed: scope.periodClosed, role: scope.userRole });
    if (!permission.allowed) return failure(permission.reason);
  }
  return { ok: true as const, scope };
}

async function validateAssignmentReferences(scope: TenantScope, values: VehicleAssignmentDraftInput) {
  if (values.projectId?.trim()) {
    const project = await validateProject(scope, values.projectId);
    if (!project.ok) return project;
  }
  return values.driverPersonnelId?.trim() ? validatePersonnel(scope, values.driverPersonnelId) : { ok: true as const };
}
async function validateVehicle(scope: TenantScope, vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId.trim(), tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId, status: "Aktif" },
    select: { entryOdometerKm: true, id: true },
  });
  return vehicle ? { data: vehicle, ok: true as const } : failure("Aktif araç kaydı aktif kapsamda bulunamadı.");
}
async function validateProject(scope: TenantScope, projectId: string) {
  const project = await prisma.constructionProject.findFirst({
    where: { id: projectId.trim(), tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId }, select: { id: true },
  });
  return project ? { ok: true as const } : failure("İnşaat projesi aktif kapsamda bulunamadı.");
}
async function validatePersonnel(scope: TenantScope, personnelCode: string) {
  const personnel = await entityService.list({ scope, slug: "personel" });
  if (!personnel.ok) return personnel;
  const row = personnel.data.rows.find((item) => item.code === personnelCode.trim() && item.status !== "Pasif");
  return row ? { ok: true as const } : failure("Aktif personel kaydı bulunamadı.");
}
function failure(message: string) { return { errors: [message], ok: false as const }; }
function revalidateSuccessful<T extends { ok: boolean }>(result: T) {
  if (result.ok) {
    revalidatePath("/araclar");
    revalidatePath("/[module]", "page");
  }
  return result;
}
