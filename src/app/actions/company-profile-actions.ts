"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import type { CompanyProfileSaveInput } from "@/lib/company-profile";
import {
  createCompanyProfilePrismaRepository,
  type CompanyProfilePrismaClientLike,
} from "@/lib/company-profile-prisma-repository";
import { createCompanyProfileService } from "@/lib/company-profile-service";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";

const companyProfileService = createCompanyProfileService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  repository: createCompanyProfilePrismaRepository(
    prisma as unknown as CompanyProfilePrismaClientLike,
  ),
});

export async function getCompanyProfileAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  return companyProfileService.get({ scope });
}

export async function saveCompanyProfileAction(values: CompanyProfileSaveInput) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await companyProfileService.save({ scope, values });
  if (result.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/faturalar");
    revalidatePath("/hakedis");
    revalidatePath("/[module]", "page");
  }
  return result;
}
