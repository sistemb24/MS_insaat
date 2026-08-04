"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import {
  createEmployeeTransferPrismaRepository,
  type EmployeeTransferPrismaClientLike,
} from "@/lib/employee-transfer-prisma-repository";
import {
  createEmployeeTransferService,
  type EmployeeTransferDraftUpdateInput,
} from "@/lib/employee-transfer-service";
import {
  getEmployeeTransferPermission,
  type EmployeeTransferDraftInput,
  type EmployeeTransferOperation,
} from "@/lib/employee-transfer";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import type { EntityRow } from "@/lib/entities";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { requireActiveSessionState } from "@/lib/server-active-scope";
import type { TenantScope } from "@/lib/tenant-scope";

const entityService = createEntityCrudService({
  now: () => new Date().toISOString(),
  repository: createEntityPrismaRepository(prisma),
});
const employeeTransferService = createEmployeeTransferService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  now: () => new Date().toISOString(),
  repository: createEmployeeTransferPrismaRepository(
    prisma as unknown as EmployeeTransferPrismaClientLike,
  ),
});

export async function listEmployeeTransfersAction() {
  const { scope } = await getContext();
  return employeeTransferService.list({ scope });
}

export async function listEmployeeTransferLookupsAction() {
  const { scope } = await getContext();
  const [personnel, sites] = await Promise.all([
    entityService.list({ scope, slug: "personel" }),
    entityService.list({ scope, slug: "santiyeler" }),
  ]);
  if (!personnel.ok) return personnel;
  if (!sites.ok) return sites;
  return {
    data: {
      personnel: personnel.data.rows
        .filter(isActive)
        .map((row) => ({
          code: row.code,
          name: row.name,
          site: row.site,
          updatedAt: row.updatedAt,
        })),
      sites: sites.data.rows
        .filter(isActive)
        .map((row) => ({ code: row.code, name: row.name })),
    },
    ok: true as const,
  };
}

export async function getEmployeeTransferAction(transferId: string) {
  const { scope } = await getContext();
  return employeeTransferService.get({ scope, transferId });
}

export async function createEmployeeTransferAction(values: EmployeeTransferDraftInput) {
  const { scope } = await getContext();
  const permission = authorize(scope, "create");
  if (!permission.ok) return permission;
  const references = await validateReferences(scope, values);
  if (!references.ok) return references;
  return revalidateSuccessful(await employeeTransferService.create({
    currentPersonnelSiteName: references.data.personnel.site,
    scope,
    values,
  }));
}

export async function updateEmployeeTransferDraftAction(
  values: EmployeeTransferDraftUpdateInput,
) {
  const { scope } = await getContext();
  const permission = authorize(scope, "edit");
  if (!permission.ok) return permission;
  const references = await validateReferences(scope, values);
  if (!references.ok) return references;
  return revalidateSuccessful(await employeeTransferService.updateDraft({
    currentPersonnelSiteName: references.data.personnel.site,
    scope,
    values,
  }));
}

export async function submitEmployeeTransferAction(input: MutationInput) {
  const { scope } = await getContext();
  const permission = authorize(scope, "submit");
  if (!permission.ok) return permission;
  const context = await resolveTransferReferences(scope, input.transferId);
  if (!context.ok) return context;
  return revalidateSuccessful(await employeeTransferService.submit({
    currentPersonnelSiteName: context.data.personnel.site,
    requestKey: input.requestKey,
    scope,
    transferId: input.transferId,
  }));
}

export async function approveEmployeeTransferAction(input: MutationInput) {
  const { scope } = await getContext();
  const permission = authorize(scope, "approve");
  if (!permission.ok) return permission;
  const context = await resolveTransferReferences(scope, input.transferId);
  if (!context.ok) return context;
  return revalidateSuccessful(await employeeTransferService.approve({
    currentPersonnelSiteName: context.data.personnel.site,
    expectedPersonnelUpdatedAt: context.data.personnel.updatedAt,
    requestKey: input.requestKey,
    scope,
    today: istanbulDateOnly(),
    transferId: input.transferId,
  }));
}

export async function rejectEmployeeTransferAction(input: MutationInput) {
  const { scope } = await getContext();
  return revalidateSuccessful(await employeeTransferService.reject({
    ...input,
    scope,
  }));
}

type MutationInput = { requestKey: string; transferId: string };

function authorize(scope: TenantScope, operation: EmployeeTransferOperation) {
  const permission = getEmployeeTransferPermission({
    operation,
    periodClosed: Boolean(scope.periodClosed),
    role: scope.userRole,
  });
  return permission.allowed
    ? { data: null, ok: true as const }
    : { errors: [permission.reason], ok: false as const };
}

async function getContext() {
  const { scope } = await requireActiveSessionState();
  await ensureTenantScope(prisma, scope);
  return { scope };
}

async function resolveTransferReferences(scope: TenantScope, transferId: string) {
  const result = await employeeTransferService.get({ scope, transferId });
  if (!result.ok) return result;
  const references = await validateReferences(scope, result.data.transfer);
  if (!references.ok) return references;
  return {
    data: {
      personnel: references.data.personnel,
      transfer: result.data.transfer,
    },
    ok: true as const,
  };
}

async function validateReferences(
  scope: TenantScope,
  values: Pick<
    EmployeeTransferDraftInput,
    | "personnelCode"
    | "personnelName"
    | "sourceSiteCode"
    | "sourceSiteName"
    | "targetSiteCode"
    | "targetSiteName"
  >,
) {
  const [personnelResult, sitesResult] = await Promise.all([
    entityService.list({ scope, slug: "personel" }),
    entityService.list({ scope, slug: "santiyeler" }),
  ]);
  if (!personnelResult.ok) return personnelResult;
  if (!sitesResult.ok) return sitesResult;

  const personnel = personnelResult.data.rows.find((row) =>
    isActive(row)
    && row.code === String(values.personnelCode ?? "").trim()
    && row.name === String(values.personnelName ?? "").trim());
  if (!personnel) {
    return { errors: ["Aktif personel kaydı bulunamadı."], ok: false as const };
  }
  const source = findActiveSite(
    sitesResult.data.rows,
    values.sourceSiteCode,
    values.sourceSiteName,
  );
  if (!source) {
    return { errors: ["Aktif kaynak şantiye bulunamadı."], ok: false as const };
  }
  const target = findActiveSite(
    sitesResult.data.rows,
    values.targetSiteCode,
    values.targetSiteName,
  );
  if (!target) {
    return { errors: ["Aktif hedef şantiye bulunamadı."], ok: false as const };
  }
  if (!personnel.updatedAt) {
    return {
      errors: ["Personel kartı sürüm bilgisi bulunamadı."],
      ok: false as const,
    };
  }
  return { data: { personnel, source, target }, ok: true as const };
}

function findActiveSite(rows: EntityRow[], code: string, name: string) {
  const normalizedCode = String(code ?? "").trim();
  const normalizedName = String(name ?? "").trim();
  return rows.find((row) =>
    isActive(row) && row.code === normalizedCode && row.name === normalizedName);
}

function isActive(row: EntityRow) {
  return row.status !== "Pasif";
}

function istanbulDateOnly(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Istanbul",
    year: "numeric",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

function revalidateSuccessful<T extends { ok: boolean }>(result: T) {
  if (result.ok) {
    revalidatePath("/personel");
    revalidatePath("/[module]", "page");
  }
  return result;
}
