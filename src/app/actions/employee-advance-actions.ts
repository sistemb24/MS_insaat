"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { resolveActiveCashBankAccountOption } from "@/lib/cash-bank-account-selection";
import type { CashBankAccountOption } from "@/lib/cash-bank-movement-service";
import {
  createEmployeeAdvancePrismaRepository,
} from "@/lib/employee-advance-prisma-repository";
import {
  createEmployeeAdvanceService,
  type EmployeeAdvanceDraftUpdateInput,
  type EmployeeAdvanceFinanceApprovalInput,
  type EmployeeAdvanceSettlementInput,
} from "@/lib/employee-advance-service";
import type { EmployeeAdvanceDraftInput } from "@/lib/employee-advance";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { requireActiveSessionState } from "@/lib/server-active-scope";
import type { TenantScope } from "@/lib/tenant-scope";

const entityService = createEntityCrudService({
  now: () => new Date().toISOString(),
  repository: createEntityPrismaRepository(prisma),
});
const employeeAdvanceService = createEmployeeAdvanceService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  now: () => new Date().toISOString(),
  repository: createEmployeeAdvancePrismaRepository(prisma),
});

export async function listEmployeeAdvancesAction() {
  const { scope } = await getContext();
  return employeeAdvanceService.list({ scope });
}

export async function listEmployeeAdvanceLookupsAction(personnelCode?: string) {
  const { scope } = await getContext();
  const [personnel, accounts, payroll] = await Promise.all([
    entityService.list({ scope, slug: "personel" }),
    entityService.list({ scope, slug: "kasa-banka" }),
    employeeAdvanceService.listPayrollDeductions({ personnelCode, scope }),
  ]);
  if (!personnel.ok) return personnel;
  if (!accounts.ok) return accounts;
  if (!payroll.ok) return payroll;
  return {
    data: {
      accounts: accounts.data.rows
        .filter((row) => row.status !== "Pasif")
        .map((row) => ({ code: row.code, name: row.name })),
      payrollDeductions: payroll.data.rows,
      personnel: personnel.data.rows
        .filter((row) => row.status !== "Pasif")
        .map((row) => ({ code: row.code, name: row.name })),
    },
    ok: true as const,
  };
}

export async function getEmployeeAdvanceAction(advanceId: string) {
  const { scope } = await getContext();
  return employeeAdvanceService.get({ advanceId, scope });
}

export async function createEmployeeAdvanceAction(values: EmployeeAdvanceDraftInput) {
  const { scope } = await getContext();
  const personnel = await validatePersonnel(scope, values);
  if (!personnel.ok) return personnel;
  return revalidateSuccessful(await employeeAdvanceService.create({ scope, values }));
}

export async function updateEmployeeAdvanceDraftAction(
  values: EmployeeAdvanceDraftUpdateInput,
) {
  const { scope } = await getContext();
  const personnel = await validatePersonnel(scope, values);
  if (!personnel.ok) return personnel;
  return revalidateSuccessful(
    await employeeAdvanceService.updateDraft({ scope, values }),
  );
}

export async function submitEmployeeAdvanceAction(input: MutationInput) {
  const { scope } = await getContext();
  return revalidateSuccessful(await employeeAdvanceService.submit({ ...input, scope }));
}

export async function managerApproveEmployeeAdvanceAction(input: MutationInput) {
  const { scope } = await getContext();
  return revalidateSuccessful(
    await employeeAdvanceService.managerApprove({ ...input, scope }),
  );
}

export async function managerRejectEmployeeAdvanceAction(input: MutationInput) {
  const { scope } = await getContext();
  return revalidateSuccessful(
    await employeeAdvanceService.managerReject({ ...input, scope }),
  );
}

export async function financeApproveEmployeeAdvanceAction(
  values: EmployeeAdvanceFinanceApprovalInput,
) {
  const { scope } = await getContext();
  return revalidateSuccessful(
    await employeeAdvanceService.financeApprove({ scope, values }),
  );
}

export async function financeRejectEmployeeAdvanceAction(input: MutationInput) {
  const { scope } = await getContext();
  return revalidateSuccessful(
    await employeeAdvanceService.financeReject({ ...input, scope }),
  );
}

export async function cancelEmployeeAdvanceAction(input: MutationInput) {
  const { scope } = await getContext();
  return revalidateSuccessful(await employeeAdvanceService.cancel({ ...input, scope }));
}

export async function payEmployeeAdvanceAction(input: {
  account: CashBankAccountOption;
  advanceId: string;
  expectedRevisionNo: number;
  paymentDate: string;
  requestKey: string;
}) {
  const { scope } = await getContext();
  const accountRows = await entityService.list({ scope, slug: "kasa-banka" });
  if (!accountRows.ok) return accountRows;
  const resolved = resolveActiveCashBankAccountOption({
    account: {
      code: String(input.account?.code ?? "").trim(),
      name: String(input.account?.name ?? "").trim(),
    },
    rows: accountRows.data.rows,
  });
  if (!resolved.ok) return resolved;
  if (!resolved.data.account) {
    return {
      errors: ["Aktif kasa/banka hesabı seçilmelidir."],
      ok: false as const,
    };
  }
  return revalidateSuccessful(await employeeAdvanceService.pay({
    scope,
    values: {
      accountCode: resolved.data.account.code,
      accountName: resolved.data.account.name,
      advanceId: input.advanceId,
      expectedRevisionNo: input.expectedRevisionNo,
      paymentDate: input.paymentDate,
      requestKey: input.requestKey,
    },
  }));
}

export async function settleEmployeeAdvanceAction(
  values: EmployeeAdvanceSettlementInput,
) {
  const { scope } = await getContext();
  return revalidateSuccessful(await employeeAdvanceService.settle({ scope, values }));
}

type MutationInput = { advanceId: string; requestKey: string };

async function getContext() {
  const { scope } = await requireActiveSessionState();
  await ensureTenantScope(prisma, scope);
  return { scope };
}

async function validatePersonnel(
  scope: TenantScope,
  values: { personnelCode: string; personnelName: string },
) {
  const result = await entityService.list({ scope, slug: "personel" });
  if (!result.ok) return result;
  const code = String(values.personnelCode ?? "").trim();
  const name = String(values.personnelName ?? "").trim();
  const row = result.data.rows.find((candidate) =>
    candidate.code === code
    && candidate.name === name
    && candidate.status !== "Pasif");
  return row
    ? { data: null, ok: true as const }
    : { errors: ["Aktif personel kaydı bulunamadı."], ok: false as const };
}

function revalidateSuccessful<T extends { ok: boolean }>(result: T) {
  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/kasa-banka");
    revalidatePath("/personel");
    revalidatePath("/raporlar");
    revalidatePath("/[module]", "page");
  }
  return result;
}
