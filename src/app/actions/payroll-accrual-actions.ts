"use server";

import { revalidatePath } from "next/cache";

import { resolveActiveCashBankAccountOption } from "@/lib/cash-bank-account-selection";
import type { CashBankAccountOption } from "@/lib/cash-bank-movement-service";
import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import { createLedgerPrismaRepository, type LedgerPrismaClientLike } from "@/lib/ledger-prisma-repository";
import { createPayrollAccrualLedgerPostingPrismaRepository, type PayrollAccrualLedgerPostingPrismaClientLike } from "@/lib/payroll-accrual-ledger-posting-prisma-repository";
import { createPayrollAccrualLedgerPostingService } from "@/lib/payroll-accrual-ledger-posting-service";
import {
  createPayrollPaymentPostingPrismaRepository,
  type PayrollPaymentPostingPrismaClientLike,
} from "@/lib/payroll-payment-posting-prisma-repository";
import { createPayrollPaymentPostingService } from "@/lib/payroll-payment-posting-service";
import {
  createPayrollAccrualReversalPrismaRepository,
  type PayrollAccrualReversalPrismaClientLike,
} from "@/lib/payroll-accrual-reversal-prisma-repository";
import { createPayrollAccrualReversalService } from "@/lib/payroll-accrual-reversal-service";
import {
  createPayrollAccrualPrismaRepository,
  type PayrollAccrualPrismaClientLike,
} from "@/lib/payroll-accrual-prisma-repository";
import { createPayrollAccrualService } from "@/lib/payroll-accrual-service";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";
import { createTimesheetPrismaRepository } from "@/lib/timesheet-prisma-repository";

const auditLogRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);

const payrollAccrualRepository = createPayrollAccrualPrismaRepository(
  prisma as unknown as PayrollAccrualPrismaClientLike,
);

const ledgerRepository = createLedgerPrismaRepository(
  prisma as unknown as LedgerPrismaClientLike,
);

const payrollAccrualLedgerPostingService = createPayrollAccrualLedgerPostingService({
  repository: createPayrollAccrualLedgerPostingPrismaRepository(
    prisma as unknown as PayrollAccrualLedgerPostingPrismaClientLike,
  ),
  now: () => new Date().toISOString(),
});

const payrollPaymentPostingService = createPayrollPaymentPostingService({
  repository: createPayrollPaymentPostingPrismaRepository(
    prisma as unknown as PayrollPaymentPostingPrismaClientLike,
  ),
  now: () => new Date().toISOString(),
});

const payrollAccrualReversalService = createPayrollAccrualReversalService({
  repository: createPayrollAccrualReversalPrismaRepository(
    prisma as unknown as PayrollAccrualReversalPrismaClientLike,
  ),
  now: () => new Date().toISOString(),
});

const payrollAccrualService = createPayrollAccrualService({
  auditLogRepository,
  ledgerPostingService: payrollAccrualLedgerPostingService,
  ledgerRepository,
  now: () => new Date().toISOString(),
  repository: payrollAccrualRepository,
});

const entityCrudService = createEntityCrudService({
  repository: createEntityPrismaRepository(prisma),
  now: () => new Date().toISOString(),
});

const timesheetRepository = createTimesheetPrismaRepository(prisma);

export async function listPayrollAccrualsAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  return payrollAccrualService.list({ scope });
}

export async function createPayrollAccrualFromTimesheetAction(
  timesheetId: string,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const timesheets = await timesheetRepository.list({ scope });
  const timesheet = timesheets.find((row) => row.id === timesheetId);

  if (!timesheet) {
    return {
      ok: false as const,
      errors: ["Puantaj kaydı bulunamadı."],
    };
  }

  const result = await payrollAccrualService.createFromTimesheet({
    scope,
    timesheet,
  });

  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/personel");
    revalidatePath("/raporlar");
  }

  return result;
}

export async function postPayrollAccrualAction(id: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await payrollAccrualService.post({
    scope,
    id,
  });

  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/personel");
    revalidatePath("/raporlar");
  }

  return result;
}

export async function cancelPayrollAccrualAction(id: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await payrollAccrualService.cancel({
    scope,
    id,
  });

  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/personel");
    revalidatePath("/raporlar");
  }

  return result;
}

export async function reversePayrollAccrualAction(id: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await payrollAccrualReversalService.reverse({
    payrollAccrualId: id,
    scope,
  });

  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/kasa-banka");
    revalidatePath("/personel");
    revalidatePath("/raporlar");
  }

  return result.ok
    ? { ok: true as const, data: result.data.payrollAccrual }
    : { ok: false as const, errors: result.errors };
}

export async function payPayrollAccrualAction(
  id: string,
  account?: CashBankAccountOption,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const payrollAccruals = await payrollAccrualRepository.list({ scope });
  const payrollAccrual = payrollAccruals.find((row) => row.id === id);

  if (!payrollAccrual) {
    return {
      ok: false as const,
      errors: ["Maaş tahakkuku kaydı bulunamadı."],
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

  if (!resolvedAccount.data.account) {
    return {
      ok: false as const,
      errors: ["Maaş ödemesi için aktif kasa/banka hesabı bulunamadı."],
    };
  }

  const result = await payrollPaymentPostingService.post({
    account: resolvedAccount.data.account,
    payrollAccrual,
    scope,
  });

  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/kasa-banka");
    revalidatePath("/personel");
    revalidatePath("/raporlar");
  }

  return result.ok
    ? { ok: true as const, data: result.data.movement }
    : { ok: false as const, errors: result.errors };
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
