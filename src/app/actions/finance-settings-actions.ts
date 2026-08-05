"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import type { FinanceSettingsSaveInput } from "@/lib/finance-settings";
import {
  createFinanceSettingsPrismaRepository,
  type FinanceSettingsPrismaClientLike,
} from "@/lib/finance-settings-prisma-repository";
import { createFinanceSettingsService } from "@/lib/finance-settings-service";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";

const financeSettingsService = createFinanceSettingsService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  repository: createFinanceSettingsPrismaRepository(
    prisma as unknown as FinanceSettingsPrismaClientLike,
  ),
});

export async function getFinanceSettingsAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  return financeSettingsService.get({ scope });
}

export async function saveFinanceSettingsAction(values: FinanceSettingsSaveInput) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await financeSettingsService.save({ scope, values });
  if (result.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/giderler");
    revalidatePath("/faturalar");
    revalidatePath("/hakedis");
    revalidatePath("/[module]", "page");
  }

  return result;
}
