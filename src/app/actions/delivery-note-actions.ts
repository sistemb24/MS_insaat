"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { createDeliveryNotePrismaRepository } from "@/lib/delivery-note-prisma-repository";
import {
  createDeliveryNoteService,
  validateDeliveryNoteStockCodes,
  type DeliveryNoteCreateValues,
} from "@/lib/delivery-note-service";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { createPurchaseInvoicePrismaRepository } from "@/lib/purchase-invoice-prisma-repository";
import { getActiveTenantScope } from "@/lib/server-active-scope";

const auditLogRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);
const entityService = createEntityCrudService({
  now: () => new Date().toISOString(),
  repository: createEntityPrismaRepository(prisma),
});
const purchaseInvoiceRepository = createPurchaseInvoicePrismaRepository(prisma);
const service = createDeliveryNoteService({
  auditLogRepository,
  now: () => new Date().toISOString(),
  repository: createDeliveryNotePrismaRepository(prisma),
});

export async function listDeliveryNotesAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  return service.list({ scope });
}

export async function createDeliveryNoteAction(values: DeliveryNoteCreateValues) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const references = await validateReferences(scope, values);
  if (!references.ok) return references;
  const result = await service.create({ scope, values });
  if (result.ok) revalidateSurfaces();
  return result;
}

export async function updateDeliveryNoteAction(
  id: string,
  values: DeliveryNoteCreateValues,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const references = await validateReferences(scope, values);
  if (!references.ok) return references;
  const result = await service.update({ id, scope, values });
  if (result.ok) revalidateSurfaces();
  return result;
}

export async function postDeliveryNoteAction(id: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const result = await service.post({ id, scope });
  if (result.ok) revalidateSurfaces();
  return result;
}

export async function cancelDeliveryNoteAction(id: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const result = await service.cancel({ id, scope });
  if (result.ok) revalidateSurfaces();
  return result;
}

export async function listDeliveryNoteAuditLogsAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  if (!auditLogRepository.listByEntityType) {
    return { errors: ["Audit log okuma bağlantısı hazır değil."], ok: false as const };
  }
  return {
    data: {
      rows: await auditLogRepository.listByEntityType({
        entityType: "delivery-note",
        limit: 100,
        scope,
      }),
    },
    ok: true as const,
  };
}

async function validateReferences(
  scope: Awaited<ReturnType<typeof getActiveTenantScope>>,
  values: DeliveryNoteCreateValues,
) {
  const stockCodes = (values.lines ?? []).map((line) => line.stockCode?.trim()).filter(Boolean);
  if (stockCodes.length > 0) {
    const result = await entityService.list({ scope, slug: "stok-kartlari" });
    if (!result.ok) return result;
    const activeCodes = result.data.rows.filter((row) => row.status !== "Pasif").map((row) => row.code);
    const errors = validateDeliveryNoteStockCodes(values, activeCodes);
    if (errors.length > 0) return { errors, ok: false as const };
  }

  if (values.linkedPurchaseInvoiceId?.trim()) {
    const invoices = await purchaseInvoiceRepository.list({ scope });
    const invoice = invoices.find((row) => row.id === values.linkedPurchaseInvoiceId);
    if (!invoice || invoice.status === "İptal") {
      return { errors: ["Bağlı alış faturası bulunamadı veya iptal edilmiş."], ok: false as const };
    }
    if (
      invoice.counterpartyCode !== values.supplierCode?.trim() ||
      invoice.siteCode !== values.siteCode?.trim()
    ) {
      return { errors: ["İrsaliye tedarikçi ve şantiyesi bağlı alış faturasıyla eşleşmelidir."], ok: false as const };
    }
  }
  return { ok: true as const };
}

function revalidateSurfaces() {
  revalidatePath("/faturalar");
  revalidatePath("/stok-depo");
  revalidatePath("/raporlar");
}
