"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import {
  createEmployeeLeavePrismaRepository,
  type EmployeeLeavePrismaClientLike,
} from "@/lib/employee-leave-prisma-repository";
import {
  createEmployeeLeaveService,
  type EmployeeLeaveBalanceInput,
  type EmployeeLeaveDraftUpdateInput,
} from "@/lib/employee-leave-service";
import type { EmployeeLeaveDraftInput } from "@/lib/employee-leave";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { requireActiveSessionState } from "@/lib/server-active-scope";
import type { TenantScope } from "@/lib/tenant-scope";

const entityService = createEntityCrudService({
  now: () => new Date().toISOString(),
  repository: createEntityPrismaRepository(prisma),
});
const employeeLeaveService = createEmployeeLeaveService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  now: () => new Date().toISOString(),
  repository: createEmployeeLeavePrismaRepository(
    prisma as unknown as EmployeeLeavePrismaClientLike,
  ),
});

export async function listEmployeeLeavesAction() {
  const { scope } = await getContext();
  return employeeLeaveService.list({ scope });
}

export async function listEmployeeLeaveLookupsAction() {
  const { scope } = await getContext();
  const personnel = await entityService.list({ scope, slug: "personel" });
  if (!personnel.ok) return personnel;
  const documents = await prisma.documentFile.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
    where: {
      companyId: scope.companyId,
      deletedAt: null,
      periodId: scope.periodId,
      tenantId: scope.tenantId,
    },
  });
  return {
    data: {
      documents: documents.map((row) => ({ id: row.id, name: row.name })),
      personnel: personnel.data.rows
        .filter((row) => row.status !== "Pasif")
        .map((row) => ({ code: row.code, name: row.name })),
    },
    ok: true as const,
  };
}

export async function getEmployeeLeaveAction(leaveId: string) {
  const { scope } = await getContext();
  return employeeLeaveService.get({ leaveId, scope });
}

export async function createEmployeeLeaveAction(values: EmployeeLeaveDraftInput) {
  const { scope } = await getContext();
  const reference = await validateReferences(scope, values);
  if (!reference.ok) return reference;
  return revalidateSuccessful(await employeeLeaveService.create({ scope, values }));
}

export async function updateEmployeeLeaveDraftAction(
  values: EmployeeLeaveDraftUpdateInput,
) {
  const { scope } = await getContext();
  const reference = await validateReferences(scope, values);
  if (!reference.ok) return reference;
  return revalidateSuccessful(await employeeLeaveService.updateDraft({ scope, values }));
}

export async function saveEmployeeLeaveBalanceAction(
  values: EmployeeLeaveBalanceInput,
) {
  const { scope } = await getContext();
  const personnel = await validatePersonnel(scope, values);
  if (!personnel.ok) return personnel;
  return revalidateSuccessful(await employeeLeaveService.saveBalance({ scope, values }));
}

export async function submitEmployeeLeaveAction(input: MutationInput) {
  const { scope } = await getContext();
  return revalidateSuccessful(await employeeLeaveService.submit({ ...input, scope }));
}

export async function approveEmployeeLeaveAction(input: MutationInput) {
  const { scope } = await getContext();
  return revalidateSuccessful(await employeeLeaveService.approve({ ...input, scope }));
}

export async function rejectEmployeeLeaveAction(input: MutationInput) {
  const { scope } = await getContext();
  return revalidateSuccessful(await employeeLeaveService.reject({ ...input, scope }));
}

export async function cancelEmployeeLeaveAction(input: MutationInput) {
  const { scope } = await getContext();
  return revalidateSuccessful(await employeeLeaveService.cancel({ ...input, scope }));
}

type MutationInput = { leaveId: string; requestKey: string };

async function getContext() {
  const { scope } = await requireActiveSessionState();
  await ensureTenantScope(prisma, scope);
  return { scope };
}

async function validateReferences(
  scope: TenantScope,
  values: Pick<
    EmployeeLeaveDraftInput,
    "documentFileId" | "personnelCode" | "personnelName"
  >,
) {
  const personnel = await validatePersonnel(scope, values);
  if (!personnel.ok) return personnel;
  const documentFileId = String(values.documentFileId ?? "").trim();
  if (!documentFileId) return { data: null, ok: true as const };
  const document = await prisma.documentFile.findFirst({
    where: {
      companyId: scope.companyId,
      deletedAt: null,
      id: documentFileId,
      periodId: scope.periodId,
      tenantId: scope.tenantId,
    },
  });
  return document
    ? { data: null, ok: true as const }
    : { errors: ["İzin belgesi aktif kapsamda bulunamadı."], ok: false as const };
}

async function validatePersonnel(
  scope: TenantScope,
  values: { personnelCode: string; personnelName: string },
) {
  const result = await entityService.list({ scope, slug: "personel" });
  if (!result.ok) return result;
  const code = String(values.personnelCode ?? "").trim();
  const name = String(values.personnelName ?? "").trim();
  const row = result.data.rows.find((candidate) =>
    candidate.code === code
    && candidate.name === name
    && candidate.status !== "Pasif");
  return row
    ? { data: null, ok: true as const }
    : { errors: ["Aktif personel kaydı bulunamadı."], ok: false as const };
}

function revalidateSuccessful<T extends { ok: boolean }>(result: T) {
  if (result.ok) {
    revalidatePath("/personel");
    revalidatePath("/[module]", "page");
  }
  return result;
}
