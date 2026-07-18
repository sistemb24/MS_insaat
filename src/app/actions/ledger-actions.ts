"use server";

import { revalidatePath } from "next/cache";
import { createAuditLogPrismaRepository, type AuditLogPrismaClientLike } from "@/lib/audit-log-prisma-repository";
import { createLedgerPrismaRepository, type LedgerPrismaClientLike } from "@/lib/ledger-prisma-repository";
import { createLedgerService, type LedgerJournalDraft } from "@/lib/ledger-service";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";

const ledgerService = createLedgerService({
  repository: createLedgerPrismaRepository(prisma as unknown as LedgerPrismaClientLike),
  auditLogRepository: createAuditLogPrismaRepository(prisma as unknown as AuditLogPrismaClientLike),
});
const ledgerAuditRepository = createAuditLogPrismaRepository(prisma as unknown as AuditLogPrismaClientLike);

export async function listLedgerAuditLogsAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const [entryAudits, periodAudits] = await Promise.all([
    ledgerAuditRepository.listByEntityType({ scope, entityType: "ledger-entry" }),
    ledgerAuditRepository.listByEntityType({ scope, entityType: "ledger-period" }),
  ]);
  return [...entryAudits, ...periodAudits].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

export async function listLedgerEntriesAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  return ledgerService.list({ scope });
}

export async function getLedgerPeriodStatusAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const period = await prisma.period.findFirst({
    select: { isClosed: true },
    where: { id: scope.periodId, tenantId: scope.tenantId, companyId: scope.companyId },
  }) as unknown as { isClosed?: boolean } | null;
  return { isClosed: period?.isClosed ?? false };
}

export async function postLedgerJournalAction(draft: LedgerJournalDraft) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const period = await prisma.period.findFirst({
    select: { isClosed: true },
    where: { id: scope.periodId, tenantId: scope.tenantId, companyId: scope.companyId },
  }) as unknown as { isClosed?: boolean } | null;
  const result = await ledgerService.post({ draft, scope: { ...scope, periodClosed: period?.isClosed ?? false } });
  if (result.ok) { revalidatePath("/ayarlar"); revalidatePath("/[module]", "page"); }
  return result;
}

export async function closeLedgerPeriodAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  if (scope.userRole !== "admin") return { ok: false as const, errors: ["Dönem kapatma yetkisi yalnızca admin rolündedir."] };
  const period = await prisma.period.findFirst({
    select: { isClosed: true, label: true },
    where: { id: scope.periodId, tenantId: scope.tenantId, companyId: scope.companyId },
  }) as unknown as { isClosed?: boolean; label?: string } | null;
  if (period?.isClosed) return { ok: false as const, errors: ["Dönem zaten kapalı."] };
  await prisma.period.update({ where: { id: scope.periodId }, data: { isClosed: true } as never });
  await ledgerAuditRepository.record({
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    actorUserId: scope.userId,
    action: "ledger.period.close",
    entityType: "ledger-period",
    entityId: scope.periodId,
    entityLabel: period?.label ?? scope.periodLabel,
    occurredAt: new Date().toISOString(),
    metadata: { statusFrom: "open", statusTo: "closed" },
  });
  revalidatePath("/ayarlar");
  return { ok: true as const };
}

export async function reopenLedgerPeriodAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  if (scope.userRole !== "admin") return { ok: false as const, errors: ["Dönem açma yetkisi yalnızca admin rolündedir."] };
  const period = await prisma.period.findFirst({
    select: { isClosed: true, label: true },
    where: { id: scope.periodId, tenantId: scope.tenantId, companyId: scope.companyId },
  }) as unknown as { isClosed?: boolean; label?: string } | null;
  if (!period?.isClosed) return { ok: false as const, errors: ["Dönem zaten açık."] };
  await prisma.period.update({ where: { id: scope.periodId }, data: { isClosed: false } as never });
  await ledgerAuditRepository.record({
    tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId, actorUserId: scope.userId,
    action: "ledger.period.reopen", entityType: "ledger-period", entityId: scope.periodId,
    entityLabel: period.label ?? scope.periodLabel, occurredAt: new Date().toISOString(),
    metadata: { statusFrom: "closed", statusTo: "open" },
  });
  revalidatePath("/ayarlar");
  return { ok: true as const };
}
