"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import { resolveActiveCashBankAccountOption } from "@/lib/cash-bank-account-selection";
import { createCashBankMovementPrismaRepository } from "@/lib/cash-bank-movement-prisma-repository";
import { createCashBankMovementService, type CashBankAccountOption, type CashBankMovementRow } from "@/lib/cash-bank-movement-service";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { createSalesInvoicePrismaRepository } from "@/lib/sales-invoice-prisma-repository";
import {
  createPurchaseInvoiceLedgerPostingPrismaRepository,
  type PurchaseInvoiceLedgerPostingPrismaClientLike,
} from "@/lib/purchase-invoice-ledger-posting-prisma-repository";
import { createSalesInvoiceLedgerPostingService } from "@/lib/purchase-invoice-ledger-posting-service";
import { createInvoiceCashBankLedgerPostingService } from "@/lib/invoice-cash-bank-ledger-posting-service";
import { createInvoiceLedgerReversalService } from "@/lib/invoice-ledger-reversal-service";
import { createLedgerPrismaRepository, type LedgerPrismaClientLike } from "@/lib/ledger-prisma-repository";
import {
  createSalesInvoiceService,
  validateSalesInvoiceStockCodes,
  type SalesInvoiceCreateValues,
} from "@/lib/sales-invoice-service";
import { getActiveTenantScope } from "@/lib/server-active-scope";

const auditLogRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);
const entityCrudService = createEntityCrudService({
  repository: createEntityPrismaRepository(prisma),
  now: () => new Date().toISOString(),
});
const cashBankMovementService = createCashBankMovementService({
  now: () => new Date().toISOString(),
  repository: createCashBankMovementPrismaRepository(prisma),
});
const salesInvoiceLedgerPostingService = createSalesInvoiceLedgerPostingService({
  now: () => new Date().toISOString(),
  repository: createPurchaseInvoiceLedgerPostingPrismaRepository(
    prisma as unknown as PurchaseInvoiceLedgerPostingPrismaClientLike,
  ),
});
const salesInvoiceLedgerReversalService = createInvoiceLedgerReversalService({
  kind: "sales",
  now: () => new Date().toISOString(),
  repository: createLedgerPrismaRepository(prisma as unknown as LedgerPrismaClientLike),
  cashBankMovementRepository: createCashBankMovementPrismaRepository(prisma),
  auditLogRepository,
});
const invoiceCashBankLedgerPostingService = createInvoiceCashBankLedgerPostingService({
  now: () => new Date().toISOString(),
  repository: createLedgerPrismaRepository(prisma as unknown as LedgerPrismaClientLike),
  auditLogRepository,
});
const salesInvoiceService = createSalesInvoiceService({
  auditLogRepository,
  ledgerPostingService: salesInvoiceLedgerPostingService,
  ledgerReversalService: salesInvoiceLedgerReversalService,
  ledgerRepository: createLedgerPrismaRepository(prisma as unknown as LedgerPrismaClientLike),
  repository: createSalesInvoicePrismaRepository(prisma),
  now: () => new Date().toISOString(),
});

export async function listSalesInvoicesAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  return salesInvoiceService.list({ scope });
}

export async function createSalesInvoiceAction(values: SalesInvoiceCreateValues) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const stockResult = await validateStockReferences(scope, values);
  if (!stockResult.ok) return stockResult;

  const result = await salesInvoiceService.create({ scope, values });
  if (result.ok) revalidateInvoicePaths();
  return result;
}

export async function updateSalesInvoiceAction(
  id: string,
  values: SalesInvoiceCreateValues,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const stockResult = await validateStockReferences(scope, values);
  if (!stockResult.ok) return stockResult;

  const result = await salesInvoiceService.update({ scope, id, values });
  if (result.ok) revalidateInvoicePaths();
  return result;
}

export async function cancelSalesInvoiceAction(id: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const period = await prisma.period.findFirst({
    select: { isClosed: true },
    where: {
      companyId: scope.companyId,
      id: scope.periodId,
      tenantId: scope.tenantId,
    },
  });
  const result = await salesInvoiceService.cancel({
    scope: { ...scope, periodClosed: period?.isClosed ?? false },
    id,
  });
  if (result.ok) revalidateInvoicePaths();
  return result;
}

export async function postSalesInvoiceAction(id: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const period = await prisma.period.findFirst({
    select: { isClosed: true },
    where: {
      companyId: scope.companyId,
      id: scope.periodId,
      tenantId: scope.tenantId,
    },
  });
  const result = await salesInvoiceService.post({
    scope: { ...scope, periodClosed: period?.isClosed ?? false },
    id,
  });
  if (result.ok) revalidateInvoicePaths();
  return result;
}

export async function collectSalesInvoiceAction(
  id: string,
  account?: CashBankAccountOption,
  amount?: number,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const salesInvoices = await createSalesInvoicePrismaRepository(prisma).list({ scope });
  const salesInvoice = salesInvoices.find((row) => row.id === id);
  if (!salesInvoice) {
    return { ok: false as const, errors: ["Satış faturası kaydı bulunamadı."] };
  }

  const accountRowsResult = await entityCrudService.list({ scope, slug: "kasa-banka" });
  if (!accountRowsResult.ok) return accountRowsResult;
  const resolvedAccount = resolveActiveCashBankAccountOption({
    account: account ? { code: account.code.trim(), name: account.name.trim() } : undefined,
    rows: accountRowsResult.data.rows,
  });
  if (!resolvedAccount.ok) return resolvedAccount;

  const period = await prisma.period.findFirst({
    select: { isClosed: true },
    where: { id: scope.periodId, tenantId: scope.tenantId, companyId: scope.companyId },
  });
  if (!period || period.isClosed) {
    return { ok: false as const, errors: ["Kapalı veya bulunamayan dönemde satış tahsilatı oluşturulamaz."] };
  }

  const recovery = await findUnpostedInvoiceMovement({
    accountCode: resolvedAccount.data.account?.code ?? "KASA-0001",
    movementType: "Tahsilat",
    requestedAmount: amount,
    scope,
    sourceId: salesInvoice.id,
    sourceType: "sales-invoice",
  });
  if (!recovery.ok) return recovery;
  if (recovery.data) {
    const ledgerResult = await invoiceCashBankLedgerPostingService.post({
      movement: recovery.data,
      scope: { ...scope, periodClosed: false },
    });
    if (!ledgerResult.ok) return ledgerResult;
    recovery.data.ledgerEntryId = ledgerResult.data.ledgerEntry.id;
    recovery.data.ledgerDocumentNo = ledgerResult.data.ledgerEntry.documentNo;
    revalidatePath("/");
    revalidatePath("/faturalar");
    revalidatePath("/kasa-banka");
    revalidatePath("/raporlar");
    revalidatePath("/musteriler");
    return { ok: true as const, data: recovery.data };
  }

  const result = await cashBankMovementService.createSalesInvoiceCollection({
    account: resolvedAccount.data.account,
    amount,
    salesInvoice,
    scope,
  });
  if (result.ok) {
    const ledgerResult = await invoiceCashBankLedgerPostingService.post({
      movement: result.data,
      scope: { ...scope, periodClosed: false },
    });
    if (!ledgerResult.ok) return ledgerResult;
    result.data.ledgerEntryId = ledgerResult.data.ledgerEntry.id;
    result.data.ledgerDocumentNo = ledgerResult.data.ledgerEntry.documentNo;
  }
  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/faturalar");
    revalidatePath("/kasa-banka");
    revalidatePath("/raporlar");
    revalidatePath("/musteriler");
  }
  return result;
}

export async function listSalesInvoiceAuditLogsAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  if (!auditLogRepository.listByEntityType) {
    return { ok: false as const, errors: ["Audit log okuma bağlantısı hazır değil."] };
  }

  return {
    ok: true as const,
    data: {
      rows: await auditLogRepository.listByEntityType({
        entityType: "sales-invoice",
        limit: 100,
        scope,
      }),
    },
  };
}

async function validateStockReferences(
  scope: Awaited<ReturnType<typeof getActiveTenantScope>>,
  values: SalesInvoiceCreateValues,
) {
  const hasStockReferences = (values.lines ?? []).some((line) =>
    Boolean(line.stockCode?.trim()),
  );
  if (!hasStockReferences) return { ok: true as const };

  const result = await entityCrudService.list({ scope, slug: "stok-kartlari" });
  if (!result.ok) return result;

  const activeCodes = new Set(
    result.data.rows.filter((row) => row.status !== "Pasif").map((row) => row.code),
  );
  const errors = validateSalesInvoiceStockCodes(values, activeCodes);
  return errors.length > 0
    ? { ok: false as const, errors }
    : { ok: true as const };
}

async function findUnpostedInvoiceMovement({
  accountCode,
  movementType,
  requestedAmount,
  scope,
  sourceId,
  sourceType,
}: {
  accountCode: string;
  movementType: CashBankMovementRow["movementType"];
  requestedAmount?: number;
  scope: Awaited<ReturnType<typeof getActiveTenantScope>>;
  sourceId: string;
  sourceType: string;
}) {
  const listed = await cashBankMovementService.list({ scope });
  if (!listed.ok) return listed;

  const linkedRows = listed.data.rows.filter(
    (row) =>
      row.sourceType === sourceType &&
      row.sourceId === sourceId &&
      row.movementType === movementType,
  );
  const unpostedRows = linkedRows.filter(
    (row) => !row.ledgerDocumentNo && row.accountCode === accountCode,
  );
  const candidate = requestedAmount === undefined
    ? unpostedRows[0]
    : unpostedRows.find((row) => Math.abs(row.amount - requestedAmount) < 0.005);

  return { ok: true as const, data: candidate };
}

function revalidateInvoicePaths() {
  revalidatePath("/");
  revalidatePath("/faturalar");
  revalidatePath("/musteriler");
  revalidatePath("/raporlar");
  revalidatePath("/kasa-banka");
  revalidatePath("/santiyeler");
  revalidatePath("/ayarlar");
  revalidatePath("/[module]", "page");
}
