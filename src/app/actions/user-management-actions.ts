"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";
import {
  createUserManagementPrismaRepository,
  type UserManagementPrismaClientLike,
} from "@/lib/user-management-prisma-repository";
import { createUserManagementService } from "@/lib/user-management-service";

const auditLogRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);

const userManagementService = createUserManagementService({
  auditLogReadRepository: auditLogRepository,
  auditLogRepository,
  repository: createUserManagementPrismaRepository(
    prisma as unknown as UserManagementPrismaClientLike,
  ),
});

export async function listUserManagementOverviewAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  return userManagementService.listOverview({ scope });
}

export async function deactivateUserAccessAction(accessId: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await userManagementService.deactivateUserAccess({
    accessId,
    scope,
  });

  if (result.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/[module]", "page");
  }

  return result;
}

export async function updateUserAccessRoleAction(accessId: string, role: "admin" | "accounting" | "viewer") {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const result = await userManagementService.updateUserAccessRole({ accessId, role, scope });
  if (result.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/[module]", "page");
  }
  return result;
}
