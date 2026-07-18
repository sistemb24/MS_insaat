"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { resolveActiveCashBankAccountOption } from "@/lib/cash-bank-account-selection";
import { createCashBankMovementPrismaRepository } from "@/lib/cash-bank-movement-prisma-repository";
import type { CashBankMovementRow } from "@/lib/cash-bank-movement-service";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import { createLedgerPrismaRepository, type LedgerPrismaClientLike } from "@/lib/ledger-prisma-repository";
import { createExpenseLedgerPostingService } from "@/lib/expense-ledger-posting-service";
import { createExpensePrismaRepository } from "@/lib/expense-prisma-repository";
import {
  createExpenseService,
  type ExpenseCreateValues,
} from "@/lib/expense-service";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";

const expenseRepository = createExpensePrismaRepository(prisma);
const cashBankMovementRepository = createCashBankMovementPrismaRepository(prisma);
const ledgerRepository = createLedgerPrismaRepository(prisma as unknown as LedgerPrismaClientLike);
const expenseService = createExpenseService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  cashBankMovementRepository,
  ledgerPostingService: createExpenseLedgerPostingService({
    auditLogRepository: createAuditLogPrismaRepository(prisma as unknown as AuditLogPrismaClientLike),
    repository: ledgerRepository,
  }),
  ledgerRepository,
  now: () => new Date().toISOString(),
  repository: expenseRepository,
});
const entityCrudService = createEntityCrudService({
  now: () => new Date().toISOString(),
  repository: createEntityPrismaRepository(prisma),
});

export async function listExpensesAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  return expenseService.list({ scope });
}

export async function createExpenseAction(values: ExpenseCreateValues) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const accountRowsResult = await entityCrudService.list({
    scope,
    slug: "kasa-banka",
  });

  if (!accountRowsResult.ok) {
    return accountRowsResult;
  }

  const resolvedAccount = resolveActiveCashBankAccountOption({
    account: normalizeCashBankAccountOption({
      code: values.accountCode,
      name: values.accountName,
    }),
    rows: accountRowsResult.data.rows,
  });

  if (!resolvedAccount.ok) {
    return resolvedAccount;
  }

  const account = resolvedAccount.data.account;

  if (!account) {
    return {
      ok: false as const,
      errors: ["Ödeme hesabı aktif kasa/banka tanımlarında bulunamadı."],
    };
  }

  const result = await expenseService.create({
    scope,
    values: {
      ...values,
      accountCode: account.code,
      accountName: account.name,
    },
  });

  if (!result.ok) {
    return result;
  }

  const paymentMovement = await findExpensePaymentMovement(
    result.data.id,
    await cashBankMovementRepository.list({ scope }),
  );

  revalidatePath("/");
  revalidatePath("/giderler");
  revalidatePath("/kasa-banka");
  revalidatePath("/raporlar");

  return {
    ok: true as const,
    data: {
      expense: result.data,
      paymentMovement,
    },
  };
}

function normalizeCashBankAccountOption(
  account: { code: string; name: string } | undefined,
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

async function findExpensePaymentMovement(
  expenseId: string,
  movements: CashBankMovementRow[],
) {
  return movements.find(
    (movement) =>
      movement.sourceType === "expense" &&
      movement.sourceId === expenseId &&
      movement.movementType === "Gider Ödemesi",
  );
}

