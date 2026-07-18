"use server";

import { revalidatePath } from "next/cache";

import { createAuditLogPrismaRepository, type AuditLogPrismaClientLike } from "@/lib/audit-log-prisma-repository";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import { createPersonnelAssetPrismaRepository } from "@/lib/personnel-asset-prisma-repository";
import { createPersonnelAssetService, type PersonnelAssetCreateValues } from "@/lib/personnel-asset-service";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";

const auditLogRepository = createAuditLogPrismaRepository(prisma as unknown as AuditLogPrismaClientLike);
const entityService = createEntityCrudService({ now: () => new Date().toISOString(), repository: createEntityPrismaRepository(prisma) });
const service = createPersonnelAssetService({
  auditLogRepository,
  now: () => new Date().toISOString(),
  repository: createPersonnelAssetPrismaRepository(prisma),
});

export async function listPersonnelAssetsAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  return service.list({ scope });
}

export async function createPersonnelAssetAction(values: PersonnelAssetCreateValues) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const personnel = await entityService.list({ scope, slug: "personel" });
  if (!personnel.ok) return personnel;
  const activeRow = personnel.data.rows.find((row) => row.code === values.personnelCode?.trim() && row.status !== "Pasif");
  if (!activeRow || activeRow.name !== values.personnelName?.trim()) {
    return { errors: ["Aktif personel kaydı bulunamadı."], ok: false as const };
  }
  const result = await service.create({ scope, values });
  if (result.ok) revalidatePersonnelSurfaces();
  return result;
}

export async function returnPersonnelAssetAction(id: string) {
  return transition(id, "return");
}

export async function markPersonnelAssetLostAction(id: string) {
  return transition(id, "lost");
}

export async function markPersonnelAssetUnusableAction(id: string) {
  return transition(id, "unusable");
}

export async function listPersonnelAssetAuditLogsAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  if (!auditLogRepository.listByEntityType) return { errors: ["Audit log okuma bağlantısı hazır değil."], ok: false as const };
  return { data: { rows: await auditLogRepository.listByEntityType({ entityType: "personnel-asset", limit: 100, scope }) }, ok: true as const };
}

async function transition(id: string, action: "lost" | "return" | "unusable") {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const result = action === "return"
    ? await service.returnAsset({ id, scope })
    : action === "lost"
      ? await service.markLost({ id, scope })
      : await service.markUnusable({ id, scope });
  if (result.ok) revalidatePersonnelSurfaces();
  return result;
}

function revalidatePersonnelSurfaces() {
  revalidatePath("/personel");
  revalidatePath("/raporlar");
}
