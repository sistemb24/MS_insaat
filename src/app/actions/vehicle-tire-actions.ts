"use server";

import { revalidatePath } from "next/cache";

import { createAuditLogPrismaRepository, type AuditLogPrismaClientLike } from "@/lib/audit-log-prisma-repository";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";
import {
  getVehicleTireOperationPermission,
  type VehicleTireMountDraftInput,
} from "@/lib/vehicle-tire-operations";
import {
  createVehicleTirePrismaRepository,
  type VehicleTirePrismaClientLike,
} from "@/lib/vehicle-tire-prisma-repository";
import { createVehicleTireService } from "@/lib/vehicle-tire-service";
import type { TenantScope } from "@/lib/tenant-scope";

const auditLogRepository = createAuditLogPrismaRepository(prisma as unknown as AuditLogPrismaClientLike);
const vehicleTireService = createVehicleTireService({
  auditLogRepository,
  now: () => new Date().toISOString(),
  repository: createVehicleTirePrismaRepository(prisma as unknown as VehicleTirePrismaClientLike),
});

export async function listVehicleTireRecordsAction() {
  const context = await getTireContext();
  return context.ok ? vehicleTireService.list({ scope: context.scope }) : context;
}

export async function listVehicleTireAuditLogsAction() {
  const context = await getTireContext();
  if (!context.ok) return context;
  if (!auditLogRepository.listByEntityType) return failure("Lastik operasyon audit kaydı bağlantısı hazır değil.");
  const rows = (await auditLogRepository.listByEntityType({ entityType: "vehicle-tire-record", limit: 100, scope: context.scope }))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  return { data: { rows }, ok: true as const };
}

export async function createVehicleTireMountAction(values: VehicleTireMountDraftInput) {
  const context = await getTireContext({ mutation: true }); if (!context.ok) return context;
  const vehicle = await validateVehicle(context.scope, values.vehicleId); if (!vehicle.ok) return vehicle;
  return revalidateSuccessful(await vehicleTireService.createMount({ entryOdometerKm: vehicle.data.entryOdometerKm, scope: context.scope, values }));
}

export async function removeVehicleTireRecordAction(input: { id: string; removedOdometerKm: number; removedOn: string }) {
  const context = await getTireContext({ mutation: true });
  return context.ok ? revalidateSuccessful(await vehicleTireService.removeTireRecord({ ...input, scope: context.scope })) : context;
}

async function getTireContext(input: { mutation?: boolean } = {}) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  if (input.mutation) {
    const permission = getVehicleTireOperationPermission({ operation: "create", periodClosed: scope.periodClosed, role: scope.userRole });
    if (!permission.allowed) return failure(permission.reason);
  }
  return { ok: true as const, scope };
}

async function validateVehicle(scope: TenantScope, vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId.trim(), tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId, status: "Aktif" },
    select: { entryOdometerKm: true, id: true },
  });
  return vehicle ? { data: vehicle, ok: true as const } : failure("Aktif araç kaydı aktif kapsamda bulunamadı.");
}
function failure(message: string) { return { errors: [message], ok: false as const }; }
function revalidateSuccessful<T extends { ok: boolean }>(result: T) {
  if (result.ok) {
    revalidatePath("/araclar");
    revalidatePath("/[module]", "page");
  }
  return result;
}
