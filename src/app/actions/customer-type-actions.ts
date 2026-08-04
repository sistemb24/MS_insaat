"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import {
  createCustomerTypePrismaRepository,
  type CustomerTypePrismaClientLike,
} from "@/lib/customer-type-prisma-repository";
import { createCustomerTypeService } from "@/lib/customer-type-service";
import type {
  CustomerTypeSaveValues,
  CustomerTypeStatusValues,
} from "@/lib/customer-type";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";

const customerTypeService = createCustomerTypeService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  repository: createCustomerTypePrismaRepository(
    prisma as unknown as CustomerTypePrismaClientLike,
  ),
});

export async function listCustomerTypesAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  return customerTypeService.list({ scope });
}

export async function saveCustomerTypeAction(values: CustomerTypeSaveValues) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const result = await customerTypeService.save({ scope, values });
  if (result.ok) revalidateCustomerTypeConsumers();
  return result;
}

export async function changeCustomerTypeStatusAction(
  values: CustomerTypeStatusValues,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const result = await customerTypeService.changeStatus({ scope, values });
  if (result.ok) revalidateCustomerTypeConsumers();
  return result;
}

function revalidateCustomerTypeConsumers() {
  revalidatePath("/ayarlar");
  revalidatePath("/musteriler");
  revalidatePath("/[module]", "page");
}
