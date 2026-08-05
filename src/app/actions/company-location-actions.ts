"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import type { CompanyLocationSaveInput } from "@/lib/company-location";
import {
  createCompanyLocationPrismaRepository,
  type CompanyLocationPrismaClientLike,
} from "@/lib/company-location-prisma-repository";
import { createCompanyLocationService } from "@/lib/company-location-service";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";

const companyLocationService = createCompanyLocationService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  repository: createCompanyLocationPrismaRepository(
    prisma as unknown as CompanyLocationPrismaClientLike,
  ),
});

export async function listCompanyLocationsAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  return companyLocationService.list({ scope });
}

export async function saveCompanyLocationAction(
  values: CompanyLocationSaveInput,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const result = await companyLocationService.save({ scope, values });
  if (result.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/[module]", "page");
  }
  return result;
}
