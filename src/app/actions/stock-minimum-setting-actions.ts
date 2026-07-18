"use server";

import { revalidatePath } from "next/cache";

import {
  createStockMinimumSettingPrismaRepository,
  type StockMinimumSettingPrismaClientLike,
} from "@/lib/stock-minimum-setting-prisma-repository";
import {
  createStockMinimumSettingService,
  type StockMinimumSettingSaveValues,
} from "@/lib/stock-minimum-setting-service";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";

const stockMinimumSettingService = createStockMinimumSettingService({
  repository: createStockMinimumSettingPrismaRepository(
    prisma as unknown as StockMinimumSettingPrismaClientLike,
  ),
});

export async function listStockMinimumSettingsAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  return stockMinimumSettingService.list({ scope });
}

export async function saveStockMinimumSettingAction(
  values: StockMinimumSettingSaveValues,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await stockMinimumSettingService.save({
    scope,
    values,
  });

  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/stok-depo");
    revalidatePath("/bildirimler");
    revalidatePath("/[module]", "page");
  }

  return result;
}
