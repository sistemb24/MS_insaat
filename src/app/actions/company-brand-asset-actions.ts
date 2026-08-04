"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import {
  createCompanyBrandAssetPrismaRepository,
  type CompanyBrandAssetPrismaClientLike,
} from "@/lib/company-brand-asset-prisma-repository";
import { createCompanyBrandAssetService } from "@/lib/company-brand-asset-service";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";

const companyBrandAssetService = createCompanyBrandAssetService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  repository: createCompanyBrandAssetPrismaRepository(
    prisma as unknown as CompanyBrandAssetPrismaClientLike,
  ),
});

export async function getCompanyBrandAssetAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  return companyBrandAssetService.get({ scope });
}

export async function uploadCompanyBrandAssetAction(formData: FormData) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const logo = formData.get("logo");
  if (!(logo instanceof File)) {
    return { errors: ["Logo dosyası zorunludur."], ok: false as const };
  }

  const result = await companyBrandAssetService.mutate({
    content: new Uint8Array(await logo.arrayBuffer()),
    expectedRevisionNo: readRevision(formData.get("expectedRevisionNo")),
    mimeType: logo.type,
    originalFileName: logo.name,
    requestKey: String(formData.get("requestKey") ?? ""),
    scope,
  });
  if (result.ok) revalidateBrandConsumers();
  return result;
}

export async function removeCompanyBrandAssetAction(values: {
  expectedRevisionNo: number;
  requestKey: string;
}) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await companyBrandAssetService.mutate({
    expectedRevisionNo: values.expectedRevisionNo,
    remove: true,
    requestKey: values.requestKey,
    scope,
  });
  if (result.ok) revalidateBrandConsumers();
  return result;
}

function readRevision(value: FormDataEntryValue | null) {
  const revision = Number(value);
  return Number.isInteger(revision) ? revision : -1;
}

function revalidateBrandConsumers() {
  revalidatePath("/ayarlar");
  revalidatePath("/faturalar");
  revalidatePath("/hakedis");
  revalidatePath("/[module]", "page");
}
