"use server";

import { revalidatePath } from "next/cache";

import { listChequesAction } from "@/app/actions/cheque-actions";
import { listArventoVehicleFleetOverviewAction } from "@/app/actions/arvento-fleet-actions";
import { listEntityRowsAction } from "@/app/actions/entity-actions";
import { listPurchaseInvoicesAction } from "@/app/actions/purchase-invoice-actions";
import {
  createNotificationCenterPrismaRepository,
  type NotificationCenterPrismaClientLike,
} from "@/lib/notification-center-prisma-repository";
import {
  createOperationalNotificationRows,
  createNotificationCenterService,
  type NotificationCategoryKey,
} from "@/lib/notification-center-service";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";
import { summarizeStockDepotFromInvoices } from "@/lib/stock-depot-service";
import {
  createStockMinimumSettingPrismaRepository,
  type StockMinimumSettingPrismaClientLike,
} from "@/lib/stock-minimum-setting-prisma-repository";
import {
  buildStockMinimumThresholds,
  buildStockMinimumThresholdsFromStockCards,
  createStockMinimumSettingService,
  mergeStockMinimumThresholds,
} from "@/lib/stock-minimum-setting-service";
import type { TenantScope } from "@/lib/tenant-scope";

const notificationCenterRepository = createNotificationCenterPrismaRepository(
  prisma as unknown as NotificationCenterPrismaClientLike,
);
const notificationCenterService = createNotificationCenterService({
  repository: notificationCenterRepository,
});
const stockMinimumSettingService = createStockMinimumSettingService({
  repository: createStockMinimumSettingPrismaRepository(
    prisma as unknown as StockMinimumSettingPrismaClientLike,
  ),
});

export async function listNotificationCenterAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  await notificationCenterService.ensureSeedNotifications({ scope });
  await notificationCenterService.ensureGeneratedNotifications({
    notifications: await createDomainNotifications(scope),
    scope,
  });

  return notificationCenterService.list({
    scope,
    today: new Date().toISOString().slice(0, 10),
  });
}

async function createDomainNotifications(scope: TenantScope) {
  const [
    chequeResult,
    subcontractorResult,
    purchaseInvoiceResult,
    stockMinimumSettingResult,
      stockCardResult,
      vehicleFleetResult,
  ] =
    await Promise.all([
      listChequesAction(),
      listEntityRowsAction("taseronlar"),
      listPurchaseInvoicesAction(),
      stockMinimumSettingService.list({ scope }),
      listEntityRowsAction("stok-kartlari"),
      listArventoVehicleFleetOverviewAction(),
    ]);
  const purchaseInvoices = purchaseInvoiceResult.ok
    ? purchaseInvoiceResult.data.rows
    : [];
  const stockSummaryRows =
    summarizeStockDepotFromInvoices(purchaseInvoices).summaryRows;
  const stockMinimums = mergeStockMinimumThresholds({
    settings: stockMinimumSettingResult.ok
      ? buildStockMinimumThresholds(stockMinimumSettingResult.data.rows)
      : [],
    stockCards: stockCardResult.ok
      ? buildStockMinimumThresholdsFromStockCards(stockCardResult.data.rows)
      : [],
  });

  return createOperationalNotificationRows({
    cheques: chequeResult.ok ? chequeResult.data.rows : [],
    stockMinimums,
    stockSummaryRows,
    subcontractorRows: subcontractorResult.ok ? subcontractorResult.data.rows : [],
    vehicleCards: vehicleFleetResult.ok ? vehicleFleetResult.data.vehicleCards : [],
    today: new Date().toISOString().slice(0, 10),
  });
}

export async function getNotificationUnreadCountAction() {
  const result = await listNotificationCenterAction();

  if (!result.ok) {
    return 0;
  }

  return result.data.model.summary.unreadCount;
}

export async function setNotificationPreferenceAction(input: {
  categoryKey: NotificationCategoryKey;
  inAppEnabled: boolean;
}) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await notificationCenterService.setPreference({
    categoryKey: input.categoryKey,
    inAppEnabled: input.inAppEnabled,
    scope,
  });

  if (result.ok) {
    revalidateNotificationRoutes();
  }

  return result;
}

export async function markNotificationAsReadAction(notificationId: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await notificationCenterService.markAsRead({
    notificationId,
    scope,
  });

  if (result.ok) {
    revalidateNotificationRoutes();
  }

  return result;
}

function revalidateNotificationRoutes() {
  revalidatePath("/");
  revalidatePath("/bildirimler");
  revalidatePath("/[module]", "page");
}
