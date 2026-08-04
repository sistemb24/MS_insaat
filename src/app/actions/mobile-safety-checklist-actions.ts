"use server";

import { revalidatePath } from "next/cache";

import { createAuditLogPrismaRepository, type AuditLogPrismaClientLike } from "@/lib/audit-log-prisma-repository";
import {
  getMobileSafetyChecklistPermission,
  type SafetyChecklistResponseDraftInput,
  type SafetyChecklistRunDraftInput,
  type SafetyChecklistTemplateDraftInput,
} from "@/lib/mobile-safety-checklist";
import {
  createMobileSafetyChecklistPrismaRepository,
  type MobileSafetyChecklistPrismaClientLike,
} from "@/lib/mobile-safety-checklist-prisma-repository";
import { createMobileSafetyChecklistService } from "@/lib/mobile-safety-checklist-service";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";
import type { TenantScope } from "@/lib/tenant-scope";

const auditLogRepository = createAuditLogPrismaRepository(prisma as unknown as AuditLogPrismaClientLike);
const mobileSafetyChecklistService = createMobileSafetyChecklistService({
  auditLogRepository,
  now: () => new Date().toISOString(),
  repository: createMobileSafetyChecklistPrismaRepository(prisma as unknown as MobileSafetyChecklistPrismaClientLike),
});

export async function listMobileSafetyChecklistOverviewAction() {
  const context = await getChecklistContext();
  return context.ok ? mobileSafetyChecklistService.list({ scope: context.scope }) : context;
}

export async function listMobileSafetyChecklistAuditLogsAction() {
  const context = await getChecklistContext();
  if (!context.ok) return context;
  if (!auditLogRepository.listByEntityType) return failure("Mobil İSG kontrol listesi audit bağlantısı hazır değil.");
  const entityTypes = [
    "mobile-safety-checklist-template",
    "mobile-safety-checklist-run",
    "mobile-safety-checklist-response",
  ];
  const rows = (await Promise.all(entityTypes.map((entityType) =>
    auditLogRepository.listByEntityType!({ entityType, limit: 100, scope: context.scope }),
  ))).flat().sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  return { data: { rows }, ok: true as const };
}

export async function createSafetyChecklistTemplateAction(values: SafetyChecklistTemplateDraftInput) {
  const context = await getChecklistContext({ mutation: true });
  return context.ok ? revalidateSuccessful(await mobileSafetyChecklistService.createTemplate({ scope: context.scope, values })) : context;
}

export async function archiveSafetyChecklistTemplateAction(id: string) {
  const context = await getChecklistContext({ mutation: true });
  return context.ok ? revalidateSuccessful(await mobileSafetyChecklistService.archiveTemplate({ id, scope: context.scope })) : context;
}

export async function createSafetyChecklistRunAction(input: {
  inspectionId?: string | null;
  values: SafetyChecklistRunDraftInput;
}) {
  const context = await getChecklistContext({ mutation: true });
  if (!context.ok) return context;
  const project = await validateProject(context.scope, input.values.projectId);
  if (!project.ok) return project;
  if (input.inspectionId?.trim()) {
    const inspection = await validateInspection(context.scope, input.inspectionId, input.values.projectId);
    if (!inspection.ok) return inspection;
  }
  return revalidateSuccessful(await mobileSafetyChecklistService.createRun({
    inspectionId: input.inspectionId,
    scope: context.scope,
    values: input.values,
  }));
}

export async function recordSafetyChecklistResponseAction(values: SafetyChecklistResponseDraftInput) {
  const context = await getChecklistContext({ mutation: true });
  return context.ok ? revalidateSuccessful(await mobileSafetyChecklistService.recordResponse({ scope: context.scope, values })) : context;
}

export async function completeSafetyChecklistRunAction(id: string) {
  const context = await getChecklistContext({ mutation: true });
  return context.ok ? revalidateSuccessful(await mobileSafetyChecklistService.completeRun({ id, scope: context.scope })) : context;
}

export async function linkSafetyChecklistResponseFindingAction(input: { findingId: string; responseId: string }) {
  const context = await getChecklistContext({ mutation: true });
  if (!context.ok) return context;
  const finding = await validateFinding(context.scope, input.findingId);
  if (!finding.ok) return finding;
  return revalidateSuccessful(await mobileSafetyChecklistService.linkFinding({ ...input, scope: context.scope }));
}

async function getChecklistContext(input: { mutation?: boolean } = {}) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  if (input.mutation) {
    const permission = getMobileSafetyChecklistPermission({ operation: "create", periodClosed: scope.periodClosed, role: scope.userRole });
    if (!permission.allowed) return failure(permission.reason);
  }
  return { ok: true as const, scope };
}

async function validateProject(scope: TenantScope, projectId: string) {
  const project = await prisma.constructionProject.findFirst({
    where: { id: projectId.trim(), tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId, status: "OPEN" },
    select: { id: true },
  });
  return project ? { data: project, ok: true as const } : failure("İnşaat projesi aktif kapsamda bulunamadı.");
}

async function validateInspection(scope: TenantScope, inspectionId: string, projectId: string) {
  const inspection = await prisma.safetyInspection.findFirst({
    where: { id: inspectionId.trim(), tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId, projectId: projectId.trim() },
    select: { id: true },
  });
  return inspection ? { data: inspection, ok: true as const } : failure("İSG denetimi aktif kapsam ve proje ile eşleşmiyor.");
}

async function validateFinding(scope: TenantScope, findingId: string) {
  const finding = await prisma.safetyFinding.findFirst({
    where: { id: findingId.trim(), tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId },
    select: { id: true },
  });
  return finding ? { data: finding, ok: true as const } : failure("İSG bulgusu aktif kapsamda bulunamadı.");
}

function failure(message: string) { return { errors: [message], ok: false as const }; }
function revalidateSuccessful<T extends { ok: boolean }>(result: T) {
  if (result.ok) {
    revalidatePath("/isg");
    revalidatePath("/[module]", "page");
  }
  return result;
}
