"use server";

import { revalidatePath } from "next/cache";

import { createAuditLogPrismaRepository, type AuditLogPrismaClientLike } from "@/lib/audit-log-prisma-repository";
import { createDeliveryNotePrismaRepository } from "@/lib/delivery-note-prisma-repository";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { createPurchaseInvoicePrismaRepository } from "@/lib/purchase-invoice-prisma-repository";
import { getActiveTenantScope } from "@/lib/server-active-scope";
import { summarizeStockDepotFromInvoices } from "@/lib/stock-depot-service";
import { createStockMovementPrismaRepository } from "@/lib/stock-movement-prisma-repository";
import { createStockMovementService, type StockMovementCreateValues } from "@/lib/stock-movement-service";

const auditLogRepository = createAuditLogPrismaRepository(prisma as unknown as AuditLogPrismaClientLike);
const deliveryNoteRepository = createDeliveryNotePrismaRepository(prisma);
const entityService = createEntityCrudService({ now: () => new Date().toISOString(), repository: createEntityPrismaRepository(prisma) });
const purchaseInvoiceRepository = createPurchaseInvoicePrismaRepository(prisma);
const stockMovementRepository = createStockMovementPrismaRepository(prisma);
const service = createStockMovementService({
  auditLogRepository,
  availability: async ({ excludeMovementId, scope, stockCode, stockName, warehouse }) => {
    const [invoices, deliveryNotes, movements] = await Promise.all([
      purchaseInvoiceRepository.list({ scope }),
      deliveryNoteRepository.list({ scope }),
      stockMovementRepository.list({ scope }),
    ]);
    const readModel = summarizeStockDepotFromInvoices(
      invoices,
      deliveryNotes,
      movements.filter((row) => row.id !== excludeMovementId),
    );
    const row = readModel.summaryRows.find((item) =>
      item.warehouse === warehouse &&
      (stockCode ? item.stockCode === stockCode : item.stockName === stockName),
    );
    return row?.balanceQuantity ?? 0;
  },
  now: () => new Date().toISOString(),
  repository: stockMovementRepository,
});

export async function listStockMovementsAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  return service.list({ scope });
}

export async function createStockMovementAction(values: StockMovementCreateValues) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  if (values.stockCode?.trim()) {
    const cards = await entityService.list({ scope, slug: "stok-kartlari" });
    if (!cards.ok) return cards;
    const card = cards.data.rows.find((row) => row.code === values.stockCode?.trim() && row.status !== "Pasif");
    if (!card || card.name !== values.stockName?.trim()) return { errors: ["Aktif stok kartı bulunamadı."], ok: false as const };
  }
  const result = await service.create({ scope, values });
  if (result.ok) revalidateStockSurfaces();
  return result;
}

export async function postStockMovementAction(id: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const result = await service.post({ id, scope });
  if (result.ok) revalidateStockSurfaces();
  return result;
}

export async function cancelStockMovementAction(id: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const result = await service.cancel({ id, scope });
  if (result.ok) revalidateStockSurfaces();
  return result;
}

export async function listStockMovementAuditLogsAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  if (!auditLogRepository.listByEntityType) return { errors: ["Audit log okuma bağlantısı hazır değil."], ok: false as const };
  return { data: { rows: await auditLogRepository.listByEntityType({ entityType: "stock-movement", limit: 100, scope }) }, ok: true as const };
}

function revalidateStockSurfaces() {
  revalidatePath("/stok-depo");
  revalidatePath("/raporlar");
  revalidatePath("/santiyeler");
}
