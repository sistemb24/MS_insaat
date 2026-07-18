"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { resolveActiveCashBankAccountOption } from "@/lib/cash-bank-account-selection";
import {
  createBankLedgerPrismaRepository,
  createBankIntegrationPrismaRepository,
  type BankIntegrationPrismaClientLike,
  type BankLedgerPrismaClientLike,
} from "@/lib/bank-integration-prisma-repository";
import {
  buildBankIntegrationOverview,
  createBankIntegrationService,
  type BankIntegrationTestValues,
  type BankTransactionSyncDateRange,
} from "@/lib/bank-integration-service";
import {
  createCashBankMovementPrismaRepository,
  type CashBankMovementPrismaClientLike,
} from "@/lib/cash-bank-movement-prisma-repository";
import type { CashBankAccountOption } from "@/lib/cash-bank-movement-service";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";
import {
  createSubscriptionPrismaRepository,
  type SubscriptionPrismaClientLike,
} from "@/lib/subscription-prisma-repository";
import {
  listSubscriptionOverview,
  requireSubscriptionFeature,
} from "@/lib/subscription-service";
import type { TenantScope } from "@/lib/tenant-scope";

const cashBankMovementRepository = createCashBankMovementPrismaRepository(
  prisma as unknown as CashBankMovementPrismaClientLike,
);
const entityCrudService = createEntityCrudService({
  now: () => new Date().toISOString(),
  repository: createEntityPrismaRepository(prisma),
});
const bankIntegrationService = createBankIntegrationService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  cashBankMovementRepository,
  ledgerRepository: createBankLedgerPrismaRepository(
    prisma as unknown as BankLedgerPrismaClientLike,
  ),
  repository: createBankIntegrationPrismaRepository(
    prisma as unknown as BankIntegrationPrismaClientLike,
  ),
});
const subscriptionRepository = createSubscriptionPrismaRepository(
  prisma as unknown as SubscriptionPrismaClientLike,
);

export async function listBankIntegrationOverviewAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await bankIntegrationService.listConnections({ scope });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true as const,
    data: {
      overview: buildBankIntegrationOverview(result.data),
    },
  };
}

export async function testBankSandboxConnectionAction(
  values: BankIntegrationTestValues,
) {
  const context = await getBankIntegrationMutationContext();

  if (!context.ok) {
    return context.result;
  }

  const result = await bankIntegrationService.testSandboxConnection({
    scope: context.scope,
    values,
  });

  if (result.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/[module]", "page");
  }

  return result;
}

export async function syncBankSandboxTransactionsAction(
  connectionId: string,
  dateRange: BankTransactionSyncDateRange = {},
) {
  const context = await getBankIntegrationMutationContext();

  if (!context.ok) {
    return context.result;
  }

  const result = await bankIntegrationService.syncSandboxTransactions({
    connectionId,
    dateFrom: normalizeSyncDate(dateRange.dateFrom),
    dateTo: normalizeSyncDate(dateRange.dateTo),
    scope: context.scope,
  });

  if (result.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/kasa-banka");
    revalidatePath("/[module]", "page");
  }

  return result;
}

export async function approveBankTransactionMatchAction(values: {
  cashBankMovementId: string;
  transactionId: string;
}) {
  const context = await getBankIntegrationMutationContext();

  if (!context.ok) {
    return context.result;
  }

  const cashBankMovements = await cashBankMovementRepository.list({
    scope: context.scope,
  });
  const result = await bankIntegrationService.approveMatchSuggestion({
    cashBankMovementId: values.cashBankMovementId,
    cashBankMovements,
    scope: context.scope,
    transactionId: values.transactionId,
  });

  if (result.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/kasa-banka");
    revalidatePath("/[module]", "page");
  }

  return result;
}

export async function approveManualBankTransactionMatchAction(values: {
  cashBankMovementId: string;
  transactionId: string;
}) {
  const context = await getBankIntegrationMutationContext();

  if (!context.ok) {
    return context.result;
  }

  const cashBankMovements = await cashBankMovementRepository.list({
    scope: context.scope,
  });
  const result = await bankIntegrationService.approveManualMatch({
    cashBankMovementId: values.cashBankMovementId,
    cashBankMovements,
    scope: context.scope,
    transactionId: values.transactionId,
  });

  if (result.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/kasa-banka");
    revalidatePath("/[module]", "page");
  }

  return result;
}

export async function createCashBankMovementFromBankTransactionAction(
  transactionId: string,
  account?: CashBankAccountOption,
) {
  const context = await getBankIntegrationMutationContext();

  if (!context.ok) {
    return context.result;
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

  const result =
    await bankIntegrationService.createCashBankMovementFromTransaction({
      account: resolvedAccount.data.account,
      scope: context.scope,
      transactionId,
    });

  if (result.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/kasa-banka");
    revalidatePath("/[module]", "page");
  }

  return result;
}

export async function createPartialCashBankMovementFromBankTransactionAction(
  transactionId: string,
  cashBankMovementId: string,
  account?: CashBankAccountOption,
) {
  const context = await getBankIntegrationMutationContext();

  if (!context.ok) {
    return context.result;
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

  const result =
    await bankIntegrationService.createPartialCashBankMovementFromTransaction({
      account: resolvedAccount.data.account,
      cashBankMovementId,
      scope: context.scope,
      transactionId,
    });

  if (result.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/kasa-banka");
    revalidatePath("/[module]", "page");
  }

  return result;
}

function normalizeSyncDate(value?: string) {
  const normalized = value?.trim() ?? "";

  return normalized || undefined;
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

async function requireBankIntegrationSubscription(scope: TenantScope) {
  const snapshot = await subscriptionRepository.getCurrentSnapshot({ scope });

  return requireSubscriptionFeature(
    listSubscriptionOverview(snapshot),
    "bank-integration",
  );
}

async function getBankIntegrationMutationContext() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const subscriptionGuard = await requireBankIntegrationSubscription(scope);

  if (!subscriptionGuard.ok) {
    return {
      ok: false as const,
      result: subscriptionGuard,
    };
  }

  return {
    ok: true as const,
    scope,
  };
}

export async function ignoreBankTransactionAction(transactionId: string) {
  const context = await getBankIntegrationMutationContext();

  if (!context.ok) {
    return context.result;
  }

  const result = await bankIntegrationService.ignoreBankTransaction({
    scope: context.scope,
    transactionId,
  });

  if (result.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/[module]", "page");
  }

  return result;
}
export async function reopenIgnoredBankTransactionAction(transactionId: string) {
  const context = await getBankIntegrationMutationContext();

  if (!context.ok) {
    return context.result;
  }

  const result = await bankIntegrationService.reopenIgnoredBankTransaction({
    scope: context.scope,
    transactionId,
  });

  if (result.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/[module]", "page");
  }

  return result;
}
export async function reopenBankTransactionMatchAction(transactionId: string) {
  const context = await getBankIntegrationMutationContext();

  if (!context.ok) {
    return context.result;
  }

  const result = await bankIntegrationService.reopenMatchApproval({
    scope: context.scope,
    transactionId,
  });

  if (result.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/kasa-banka");
    revalidatePath("/[module]", "page");
  }

  return result;
}


