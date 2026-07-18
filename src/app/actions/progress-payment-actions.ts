"use server";

import { revalidatePath } from "next/cache";

import { resolveActiveCashBankAccountOption } from "@/lib/cash-bank-account-selection";
import { createCashBankMovementPrismaRepository } from "@/lib/cash-bank-movement-prisma-repository";
import {
  createCashBankMovementService,
  type CashBankAccountOption,
} from "@/lib/cash-bank-movement-service";
import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import { createLedgerPrismaRepository, type LedgerPrismaClientLike } from "@/lib/ledger-prisma-repository";
import { createInvoiceCashBankLedgerPostingService } from "@/lib/invoice-cash-bank-ledger-posting-service";
import {
  createProgressPaymentLedgerPostingPrismaRepository,
  type ProgressPaymentLedgerPostingPrismaClientLike,
} from "@/lib/progress-payment-ledger-posting-prisma-repository";
import { createProgressPaymentLedgerPostingService } from "@/lib/progress-payment-ledger-posting-service";
import type { ProgressPaymentCreateValues } from "@/lib/progress-payment-service";
import { createProgressPaymentPrismaRepository } from "@/lib/progress-payment-prisma-repository";
import { createProgressPaymentService } from "@/lib/progress-payment-service";
import { prisma } from "@/lib/prisma";

import { getSubscriptionFeatureActionContext } from "./subscription-feature-action-guard";

const auditLogRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);

const ledgerRepository = createLedgerPrismaRepository(
  prisma as unknown as LedgerPrismaClientLike,
);

const progressMovementLedgerPostingService = createInvoiceCashBankLedgerPostingService({
  auditLogRepository,
  repository: ledgerRepository,
  now: () => new Date().toISOString(),
});

const progressPaymentLedgerPostingService = createProgressPaymentLedgerPostingService({
  repository: createProgressPaymentLedgerPostingPrismaRepository(
    prisma as unknown as ProgressPaymentLedgerPostingPrismaClientLike,
  ),
  now: () => new Date().toISOString(),
});

const progressPaymentService = createProgressPaymentService({
  auditLogRepository,
  ledgerPostingService: progressPaymentLedgerPostingService,
  ledgerRepository,
  repository: createProgressPaymentPrismaRepository(prisma),
  now: () => new Date().toISOString(),
});

const progressPaymentRepository = createProgressPaymentPrismaRepository(prisma);

const cashBankMovementService = createCashBankMovementService({
  now: () => new Date().toISOString(),
  repository: createCashBankMovementPrismaRepository(prisma),
});

const entityCrudService = createEntityCrudService({
  repository: createEntityPrismaRepository(prisma),
  now: () => new Date().toISOString(),
});

export async function listProgressPaymentsAction() {
  const context = await getProgressPaymentActionContext();

  if (!context.ok) {
    return context.result;
  }

  return progressPaymentService.list({ scope: context.scope });
}

export async function createProgressPaymentAction(
  values: ProgressPaymentCreateValues,
) {
  const context = await getProgressPaymentActionContext();

  if (!context.ok) {
    return context.result;
  }

  const result = await progressPaymentService.create({
    scope: context.scope,
    values,
  });

  if (result.ok) {
    revalidatePath("/hakedis");
  }

  return result;
}

export async function postProgressPaymentAction(id: string) {
  const context = await getProgressPaymentActionContext();

  if (!context.ok) {
    return context.result;
  }

  const result = await progressPaymentService.post({
    scope: context.scope,
    id,
  });

  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/hakedis");
    revalidatePath("/kasa-banka");
    revalidatePath("/raporlar");
    revalidatePath("/ayarlar");
    revalidatePath("/[module]", "page");
  }

  return result;
}

export async function cancelProgressPaymentAction(id: string) {
  const context = await getProgressPaymentActionContext();

  if (!context.ok) {
    return context.result;
  }

  const result = await progressPaymentService.cancel({
    scope: context.scope,
    id,
  });

  if (result.ok) {
    revalidatePath("/hakedis");
  }

  return result;
}

export async function payProgressPaymentAction(
  id: string,
  account?: CashBankAccountOption,
) {
  const context = await getProgressPaymentActionContext();

  if (!context.ok) {
    return context.result;
  }

  const progressPayments = await progressPaymentRepository.list({
    scope: context.scope,
  });
  const progressPayment = progressPayments.find((row) => row.id === id);

  if (!progressPayment) {
    return {
      ok: false as const,
      errors: ["Hakediş kaydı bulunamadı."],
    };
  }

  const accountRowsResult = await entityCrudService.list({
    scope: context.scope,
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
    where: { id: context.scope.periodId, tenantId: context.scope.tenantId, companyId: context.scope.companyId },
  });
  if (!period || period.isClosed) {
    return { ok: false as const, errors: ["Kapalı veya bulunamayan dönemde hakediş ödemesi oluşturulamaz."] };
  }

  const result = await cashBankMovementService.createProgressPaymentPayment({
    account: resolvedAccount.data.account,
    progressPayment,
    scope: context.scope,
  });

  if (result.ok) {
    const ledgerResult = await progressMovementLedgerPostingService.post({
      movement: result.data,
      scope: { ...context.scope, periodClosed: false },
    });
    if (!ledgerResult.ok) return ledgerResult;
    result.data.ledgerEntryId = ledgerResult.data.ledgerEntry.id;
    result.data.ledgerDocumentNo = ledgerResult.data.ledgerEntry.documentNo;
  }

  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/hakedis");
    revalidatePath("/kasa-banka");
    revalidatePath("/raporlar");
  }

  return result;
}


export async function collectProgressPaymentAction(
  id: string,
  account?: CashBankAccountOption,
) {
  const context = await getProgressPaymentActionContext();

  if (!context.ok) {
    return context.result;
  }

  const progressPayments = await progressPaymentRepository.list({
    scope: context.scope,
  });
  const progressPayment = progressPayments.find((row) => row.id === id);

  if (!progressPayment) {
    return {
      ok: false as const,
      errors: ["Hakediş kaydı bulunamadı."],
    };
  }

  const accountRowsResult = await entityCrudService.list({
    scope: context.scope,
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
    where: { id: context.scope.periodId, tenantId: context.scope.tenantId, companyId: context.scope.companyId },
  });
  if (!period || period.isClosed) {
    return { ok: false as const, errors: ["Kapalı veya bulunamayan dönemde hakediş tahsilatı oluşturulamaz."] };
  }

  const result = await cashBankMovementService.createProgressPaymentCollection({
    account: resolvedAccount.data.account,
    progressPayment,
    scope: context.scope,
  });

  if (result.ok) {
    const ledgerResult = await progressMovementLedgerPostingService.post({
      movement: result.data,
      scope: { ...context.scope, periodClosed: false },
    });
    if (!ledgerResult.ok) return ledgerResult;
    result.data.ledgerEntryId = ledgerResult.data.ledgerEntry.id;
    result.data.ledgerDocumentNo = ledgerResult.data.ledgerEntry.documentNo;
  }

  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/hakedis");
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

export async function listProgressPaymentAuditLogsAction() {
  const context = await getProgressPaymentActionContext();

  if (!context.ok) {
    return context.result;
  }

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
        entityType: "progress-payment",
        limit: 100,
        scope: context.scope,
      }),
    },
  };
}

function getProgressPaymentActionContext() {
  return getSubscriptionFeatureActionContext("progress-payments");
}

