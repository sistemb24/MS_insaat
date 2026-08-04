"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import type {
  SupplierCategorySaveValues,
  SupplierCategoryStatusValues,
} from "@/lib/supplier-category";
import {
  createSupplierCategoryPrismaRepository,
  type SupplierCategoryPrismaClientLike,
} from "@/lib/supplier-category-prisma-repository";
import { createSupplierCategoryService } from "@/lib/supplier-category-service";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";

const supplierCategoryService = createSupplierCategoryService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  repository: createSupplierCategoryPrismaRepository(
    prisma as unknown as SupplierCategoryPrismaClientLike,
  ),
});

export async function listSupplierCategoriesAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  return supplierCategoryService.list({ scope });
}

export async function saveSupplierCategoryAction(values: SupplierCategorySaveValues) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const result = await supplierCategoryService.save({ scope, values });
  if (result.ok) revalidateSupplierCategoryConsumers();
  return result;
}

export async function changeSupplierCategoryStatusAction(
  values: SupplierCategoryStatusValues,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const result = await supplierCategoryService.changeStatus({ scope, values });
  if (result.ok) revalidateSupplierCategoryConsumers();
  return result;
}

function revalidateSupplierCategoryConsumers() {
  revalidatePath("/ayarlar");
  revalidatePath("/tedarikciler");
  revalidatePath("/[module]", "page");
}
