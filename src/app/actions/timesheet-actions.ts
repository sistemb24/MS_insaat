"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";
import {
  createPayrollAccrualPrismaRepository,
  type PayrollAccrualPrismaClientLike,
} from "@/lib/payroll-accrual-prisma-repository";
import { createTimesheetPrismaRepository } from "@/lib/timesheet-prisma-repository";
import {
  createTimesheetService,
  type TimesheetCreateValues,
} from "@/lib/timesheet-service";

const auditLogRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);

const timesheetService = createTimesheetService({
  auditLogRepository,
  payrollAccrualDependency: createPayrollAccrualPrismaRepository(
    prisma as unknown as PayrollAccrualPrismaClientLike,
  ),
  repository: createTimesheetPrismaRepository(prisma),
  now: () => new Date().toISOString(),
});

export async function listTimesheetsAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  return timesheetService.list({ scope });
}

export async function createTimesheetAction(values: TimesheetCreateValues) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await timesheetService.create({
    scope,
    values,
  });

  if (result.ok) {
    revalidatePath("/puantaj");
  }

  return result;
}

export async function postTimesheetAction(id: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await timesheetService.post({
    scope,
    id,
  });

  if (result.ok) {
    revalidatePath("/puantaj");
  }

  return result;
}

export async function cancelTimesheetAction(id: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await timesheetService.cancel({
    scope,
    id,
  });

  if (result.ok) {
    revalidatePath("/puantaj");
  }

  return result;
}

export async function listTimesheetAuditLogsAction() {
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
        entityType: "timesheet",
        limit: 100,
        scope,
      }),
    },
  };
}
