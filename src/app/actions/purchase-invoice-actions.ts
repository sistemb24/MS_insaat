"use server";

import { revalidatePath } from "next/cache";

import { resolveActiveCashBankAccountOption } from "@/lib/cash-bank-account-selection";
import { createCashBankMovementPrismaRepository } from "@/lib/cash-bank-movement-prisma-repository";
import {
  createCashBankMovementService,
  type CashBankAccountOption,
  type CashBankMovementRow,
} from "@/lib/cash-bank-movement-service";
import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";

import {
  validatePurchaseInvoiceStockCodes,
  type PurchaseInvoiceCreateValues,
} from "@/lib/purchase-invoice-service";
import {
  createPurchaseInvoiceLedgerPostingPrismaRepository,
  type PurchaseInvoiceLedgerPostingPrismaClientLike,
} from "@/lib/purchase-invoice-ledger-posting-prisma-repository";
import { createPurchaseInvoiceLedgerPostingService } from "@/lib/purchase-invoice-ledger-posting-service";
import { createInvoiceCashBankLedgerPostingService } from "@/lib/invoice-cash-bank-ledger-posting-service";
import { createInvoiceLedgerReversalService } from "@/lib/invoice-ledger-reversal-service";
import { createLedgerPrismaRepository, type LedgerPrismaClientLike } from "@/lib/ledger-prisma-repository";
import { createPurchaseInvoicePrismaRepository } from "@/lib/purchase-invoice-prisma-repository";
import { createPurchaseInvoiceService } from "@/lib/purchase-invoice-service";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";

const auditLogRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);
const purchaseInvoiceLedgerPostingService =
  createPurchaseInvoiceLedgerPostingService({
    now: () => new Date().toISOString(),
    repository: createPurchaseInvoiceLedgerPostingPrismaRepository(
      prisma as unknown as PurchaseInvoiceLedgerPostingPrismaClientLike,
    ),
  });
const purchaseInvoiceLedgerReversalService = createInvoiceLedgerReversalService({
  kind: "purchase",
  now: () => new Date().toISOString(),
  repository: createLedgerPrismaRepository(prisma as unknown as LedgerPrismaClientLike),
  cashBankMovementRepository: createCashBankMovementPrismaRepository(prisma),
  auditLogRepository,
});

const purchaseInvoiceService = createPurchaseInvoiceService({
  auditLogRepository,
  ledgerPostingService: purchaseInvoiceLedgerPostingService,
  ledgerReversalService: purchaseInvoiceLedgerReversalService,
  ledgerRepository: createLedgerPrismaRepository(prisma as unknown as LedgerPrismaClientLike),
  repository: createPurchaseInvoicePrismaRepository(prisma),
  now: () => new Date().toISOString(),
});
const cashBankMovementService = createCashBankMovementService({
  now: () => new Date().toISOString(),
  repository: createCashBankMovementPrismaRepository(prisma),
});
const invoiceCashBankLedgerPostingService = createInvoiceCashBankLedgerPostingService({
  now: () => new Date().toISOString(),
  repository: createLedgerPrismaRepository(prisma as unknown as LedgerPrismaClientLike),
  auditLogRepository,
});
const entityCrudService = createEntityCrudService({
  repository: createEntityPrismaRepository(prisma),
  now: () => new Date().toISOString(),
});
const purchaseInvoiceRepository = createPurchaseInvoicePrismaRepository(prisma);

export async function listPurchaseInvoicesAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  return purchaseInvoiceService.list({
    scope,
  });
}

export async function createPurchaseInvoiceAction(
  values: PurchaseInvoiceCreateValues,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const stockReferenceResult = await validateStockReferences(scope, values);
  if (!stockReferenceResult.ok) return stockReferenceResult;

  const result = await purchaseInvoiceService.create({
    scope,
    values,
  });

  if (result.ok) {
    revalidatePath("/faturalar");
  }

  return result;
}

export async function updatePurchaseInvoiceAction(
  id: string,
  values: PurchaseInvoiceCreateValues,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const stockReferenceResult = await validateStockReferences(scope, values);
  if (!stockReferenceResult.ok) return stockReferenceResult;

  const result = await purchaseInvoiceService.update({
    scope,
    id,
    values,
  });

  if (result.ok) {
    revalidatePath("/faturalar");
  }

  return result;
}

async function validateStockReferences(
  scope: Awaited<ReturnType<typeof getActiveTenantScope>>,
  values: PurchaseInvoiceCreateValues,
) {
  const hasStockReferences = (values.lines ?? []).some((line) => Boolean(line.stockCode?.trim()));
  if (!hasStockReferences) return { ok: true as const };

  const result = await entityCrudService.list({ scope, slug: "stok-kartlari" });
  if (!result.ok) return result;

  const activeCodes = new Set(
    result.data.rows
      .filter((row) => row.status !== "Pasif")
      .map((row) => row.code),
  );
  const errors = validatePurchaseInvoiceStockCodes(values, activeCodes);
  return errors.length > 0 ? { ok: false as const, errors } : { ok: true as const };
}

export async function cancelPurchaseInvoiceAction(id: string) {
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

  const result = await purchaseInvoiceService.cancel({
    scope: { ...scope, periodClosed: period?.isClosed ?? false },
    id,
  });

  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/faturalar");
    revalidatePath("/kasa-banka");
    revalidatePath("/raporlar");
    revalidatePath("/ayarlar");
    revalidatePath("/[module]", "page");
  }

  return result;
}

export async function postPurchaseInvoiceAction(id: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const period = await prisma.period.findFirst({
    select: {
      isClosed: true,
    },
    where: {
      companyId: scope.companyId,
      id: scope.periodId,
      tenantId: scope.tenantId,
    },
  });

  const result = await purchaseInvoiceService.post({
    scope: {
      ...scope,
      periodClosed: period?.isClosed ?? false,
    },
    id,
  });

  if (result.ok) {
    revalidatePath("/faturalar");
    revalidatePath("/ayarlar");
    revalidatePath("/[module]", "page");
  }

  return result;
}

export async function payPurchaseInvoiceAction(
  id: string,
  account?: CashBankAccountOption,
  amount?: number,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const purchaseInvoices = await purchaseInvoiceRepository.list({ scope });
  const purchaseInvoice = purchaseInvoices.find((row) => row.id === id);

  if (!purchaseInvoice) {
    return {
      ok: false as const,
      errors: ["Alış faturası kaydı bulunamadı."],
    };
  }

  const accountRowsResult = await entityCrudService.list({
    scope,
    slug: "kasa-banka",
  });

  if (!accountRowsResult.ok) {
    return accountRowsResult;
  }

  const resolvedAccount = resolveActiveCashBankAccountOption({
    account: normalizeCashBankAccountOption(account),
    rows: accountRowsResult.data.rows,
  });

  if (!resolvedAccount.ok) {
    return resolvedAccount;
  }

  const period = await prisma.period.findFirst({
    select: { isClosed: true },
    where: { id: scope.periodId, tenantId: scope.tenantId, companyId: scope.companyId },
  });
  if (!period || period.isClosed) {
    return { ok: false as const, errors: ["Kapalı veya bulunamayan dönemde fatura ödemesi oluşturulamaz."] };
  }

  const recovery = await findUnpostedInvoiceMovement({
    accountCode: resolvedAccount.data.account?.code ?? "KASA-0001",
    movementType: "Fatura Ödemesi",
    requestedAmount: amount,
    scope,
    sourceId: purchaseInvoice.id,
    sourceType: "purchase-invoice",
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
    return { ok: true as const, data: recovery.data };
  }

  const result = await cashBankMovementService.createPurchaseInvoicePayment({
    account: resolvedAccount.data.account,
    amount,
    purchaseInvoice,
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
  }

  return result;
}

function normalizeCashBankAccountOption(
  account: CashBankAccountOption | undefined,
) {
  if (!account) {
    return undefined;
  }

  const code = account.code.trim();
  const name = account.name.trim();

  if (!code || !name) {
    return undefined;
  }

  return { code, name };
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
export async function listPurchaseInvoiceAuditLogsAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  if (!auditLogRepository.listByEntityType) {
    return {
      ok: false as const,
      errors: ["Audit log okuma repository bağlantısı hazır değil."],
    };
  }

  return {
    ok: true as const,
    data: {
      rows: await auditLogRepository.listByEntityType({
        entityType: "purchase-invoice",
        limit: 100,
        scope,
      }),
    },
  };
}




