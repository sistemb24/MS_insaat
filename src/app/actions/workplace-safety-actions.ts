"use server";

import { createAuditLogPrismaRepository, type AuditLogPrismaClientLike } from "@/lib/audit-log-prisma-repository";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";
import {
  createWorkplaceSafetyPrismaRepository,
  type WorkplaceSafetyPrismaClientLike,
} from "@/lib/workplace-safety-prisma-repository";
import { createWorkplaceSafetyService } from "@/lib/workplace-safety-service";
import type {
  SafetyFindingDraftInput,
  SafetyInspectionDraftInput,
  SafetyPpeIssuanceInput,
  SafetyTrainingDraftInput,
  SafetyTrainingAttendanceInput,
  SafetyWorkAccidentDraftInput,
} from "@/lib/workplace-safety";
import { getWorkplaceSafetyPermission } from "@/lib/workplace-safety";
import type { TenantScope } from "@/lib/tenant-scope";

const auditLogRepository = createAuditLogPrismaRepository(prisma as unknown as AuditLogPrismaClientLike);
const entityService = createEntityCrudService({
  now: () => new Date().toISOString(),
  repository: createEntityPrismaRepository(prisma),
});
const workplaceSafetyService = createWorkplaceSafetyService({
  auditLogRepository,
  now: () => new Date().toISOString(),
  repository: createWorkplaceSafetyPrismaRepository(prisma as unknown as WorkplaceSafetyPrismaClientLike),
});

export async function listWorkplaceSafetyOverviewAction() {
  const context = await getSafetyContext();
  if (!context.ok) return context;
  return workplaceSafetyService.list({ scope: context.scope });
}

export async function listWorkplaceSafetyAuditLogsAction() {
  const context = await getSafetyContext();
  if (!context.ok) return context;
  if (!auditLogRepository.listByEntityType) return failure("İSG audit kaydı bağlantısı hazır değil.");
  const entityTypes = [
    "workplace-safety-work-accident",
    "workplace-safety-training",
    "workplace-safety-training-attendance",
    "workplace-safety-inspection",
    "workplace-safety-finding",
    "workplace-safety-ppe-issuance",
  ];
  const rows = (await Promise.all(entityTypes.map((entityType) =>
    auditLogRepository.listByEntityType!({ entityType, limit: 100, scope: context.scope }),
  ))).flat().sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  return { data: { rows }, ok: true as const };
}

export async function listWorkplaceSafetyLookupsAction() {
  const context = await getSafetyContext();
  if (!context.ok) return context;
  const [projects, personnel] = await Promise.all([
    prisma.constructionProject.findMany({
      where: {
        tenantId: context.scope.tenantId,
        companyId: context.scope.companyId,
        periodId: context.scope.periodId,
        status: "OPEN",
      },
      orderBy: [{ code: "asc" }],
      select: { code: true, id: true, name: true },
    }),
    entityService.list({ scope: context.scope, slug: "personel" }),
  ]);
  if (!personnel.ok) return personnel;
  return {
    data: {
      personnel: personnel.data.rows.filter((row) => row.status !== "Pasif").map((row) => ({ code: row.code, name: row.name })),
      projects,
    },
    ok: true as const,
  };
}

export async function createSafetyWorkAccidentAction(values: SafetyWorkAccidentDraftInput) {
  const context = await getSafetyContext({ mutation: true });
  if (!context.ok) return context;
  const reference = await validateReferences(context.scope, values);
  if (!reference.ok) return reference;
  return workplaceSafetyService.createWorkAccident({ scope: context.scope, values });
}

export async function recordSafetyWorkAccidentAction(id: string) {
  const context = await getSafetyContext({ mutation: true });
  return context.ok ? workplaceSafetyService.recordWorkAccident({ id, scope: context.scope }) : context;
}

export async function closeSafetyWorkAccidentAction(id: string) {
  const context = await getSafetyContext({ mutation: true });
  return context.ok ? workplaceSafetyService.closeWorkAccident({ id, scope: context.scope }) : context;
}

export async function createSafetyTrainingAction(values: SafetyTrainingDraftInput) {
  const context = await getSafetyContext({ mutation: true });
  return context.ok ? workplaceSafetyService.createTraining({ scope: context.scope, values }) : context;
}

export async function planSafetyTrainingAction(id: string) {
  const context = await getSafetyContext({ mutation: true });
  return context.ok ? workplaceSafetyService.planTraining({ id, scope: context.scope }) : context;
}

export async function completeSafetyTrainingAction(id: string) {
  const context = await getSafetyContext({ mutation: true });
  return context.ok ? workplaceSafetyService.completeTraining({ id, scope: context.scope }) : context;
}

export async function recordSafetyTrainingAttendanceAction(values: SafetyTrainingAttendanceInput) {
  const context = await getSafetyContext({ mutation: true });
  if (!context.ok) return context;
  const personnel = await validatePersonnel(context.scope, values.personnelId);
  if (!personnel.ok) return personnel;
  return workplaceSafetyService.recordTrainingAttendance({ scope: context.scope, values });
}

export async function createSafetyInspectionAction(values: SafetyInspectionDraftInput) {
  const context = await getSafetyContext({ mutation: true });
  if (!context.ok) return context;
  const project = await validateProject(context.scope, values.projectId);
  if (!project.ok) return project;
  return workplaceSafetyService.createInspection({ scope: context.scope, values });
}

export async function completeSafetyInspectionAction(id: string) {
  const context = await getSafetyContext({ mutation: true });
  return context.ok ? workplaceSafetyService.completeInspection({ id, scope: context.scope }) : context;
}

export async function createSafetyFindingAction(values: SafetyFindingDraftInput) {
  const context = await getSafetyContext({ mutation: true });
  if (!context.ok) return context;
  if (values.ownerPersonnelId?.trim()) {
    const personnel = await validatePersonnel(context.scope, values.ownerPersonnelId);
    if (!personnel.ok) return personnel;
  }
  return workplaceSafetyService.createFinding({ scope: context.scope, values });
}

export async function resolveSafetyFindingAction(id: string) {
  const context = await getSafetyContext({ mutation: true });
  return context.ok ? workplaceSafetyService.resolveFinding({ id, scope: context.scope }) : context;
}

export async function createSafetyPpeIssuanceAction(values: SafetyPpeIssuanceInput) {
  const context = await getSafetyContext({ mutation: true });
  if (!context.ok) return context;
  const personnel = await validatePersonnel(context.scope, values.personnelId);
  if (!personnel.ok) return personnel;
  return workplaceSafetyService.createPpeIssuance({ scope: context.scope, values });
}

export async function returnSafetyPpeIssuanceAction(id: string) {
  const context = await getSafetyContext({ mutation: true });
  return context.ok ? workplaceSafetyService.returnPpeIssuance({ id, scope: context.scope }) : context;
}

async function getSafetyContext(input: { mutation?: boolean } = {}) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  if (input.mutation) {
    const permission = getWorkplaceSafetyPermission({
      operation: "create",
      periodClosed: scope.periodClosed,
      role: scope.userRole,
    });
    if (!permission.allowed) return failure(permission.reason);
  }
  return { ok: true as const, scope };
}

async function validateReferences(scope: TenantScope, values: SafetyWorkAccidentDraftInput) {
  if (values.projectId?.trim()) {
    const project = await validateProject(scope, values.projectId);
    if (!project.ok) return project;
  }
  if (values.personnelId?.trim()) return validatePersonnel(scope, values.personnelId);
  return { ok: true as const };
}

async function validateProject(scope: TenantScope, projectId: string) {
  const project = await prisma.constructionProject.findFirst({
    where: {
      id: projectId.trim(), tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId,
    },
    select: { id: true },
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
