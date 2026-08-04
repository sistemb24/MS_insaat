import "dotenv/config";

import { createAuditLogPrismaRepository, type AuditLogPrismaClientLike } from "../src/lib/audit-log-prisma-repository";
import { createSupportTicketPrismaRepository, type SupportTicketPrismaClientLike } from "../src/lib/support-ticket-prisma-repository";
import { createSupportTicketService } from "../src/lib/support-ticket-service";
import { prisma } from "../src/lib/prisma";
import type { TenantScope } from "../src/lib/tenant-scope";

const base = {
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
  companyId: "company-f18-kabul-20260730",
  companyName: "F18 Destek Merkezi Kabul Şirketi",
  periodId: "period-f18-kabul-20260730",
  periodLabel: "F18 Kabul 2026",
  licenseLabel: "Kurumsal",
  periodClosed: true,
};
const requesterScope: TenantScope = {
  ...base,
  userId: "user-main",
  userName: "Destek Talebi Kullanıcısı",
  userRole: "viewer",
};
const adminScope: TenantScope = {
  ...base,
  userId: "user-ahmet",
  userName: "Destek Yöneticisi",
  userRole: "admin",
};
const timestamp = "2026-07-30T19:00:00.000Z";
const counters = new Map<string, number>();
const repository = createSupportTicketPrismaRepository(
  prisma as unknown as SupportTicketPrismaClientLike,
);
const auditRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);
const service = createSupportTicketService({
  auditLogRepository: auditRepository,
  createId: ({ kind }) => {
    const next = (counters.get(kind) ?? 0) + 1;
    counters.set(kind, next);
    return id(kind, next);
  },
  now: () => timestamp,
  repository,
});

async function main() {
  await ensureAcceptanceScope();

  const primary = unwrap(await service.createTicket({
    scope: requesterScope,
    values: {
      initialMessage: "F18 kabulünde rapor filtre sonucu görünmüyor.",
      priority: "HIGH",
      requestKey: "F18-PRIMARY-CREATE",
      requesterUserId: requesterScope.userId,
      subject: "Rapor filtresi desteği",
      type: "TECHNICAL",
    },
  })).ticket;
  unwrap(await service.reply({
    scope: requesterScope,
    values: {
      body: "Tarayıcı yenilendi ancak sorun devam ediyor.",
      requestKey: "F18-PRIMARY-REQUESTER-REPLY",
      ticketId: primary.id,
    },
  }));
  unwrap(await service.reply({
    scope: adminScope,
    values: {
      body: "Talep incelendi ve filtre ayarı düzeltildi.",
      requestKey: "F18-PRIMARY-ADMIN-REPLY",
      ticketId: primary.id,
    },
  }));
  await advance(primary.id, "RESOLVED");

  const closed = unwrap(await service.createTicket({
    scope: requesterScope,
    values: {
      initialMessage: "F18 kabulünde paket bilgisi açıklaması isteniyor.",
      priority: "LOW",
      requestKey: "F18-CLOSED-CREATE",
      requesterUserId: requesterScope.userId,
      subject: "Paket bilgisi sorusu",
      type: "ACCOUNT",
    },
  })).ticket;
  await advance(closed.id, "CLOSED");

  const auditBeforeRetry = await countAudit();
  assert(unwrap(await service.createTicket({
    scope: requesterScope,
    values: {
      initialMessage: "F18 kabulünde rapor filtre sonucu görünmüyor.",
      priority: "HIGH",
      requestKey: "F18-PRIMARY-CREATE",
      requesterUserId: requesterScope.userId,
      subject: "Rapor filtresi desteği",
      type: "TECHNICAL",
    },
  })).idempotent, "Tekrarlanan talep oluşturma idempotent olmalıdır.");
  assert(unwrap(await service.reply({
    scope: requesterScope,
    values: {
      body: "Tarayıcı yenilendi ancak sorun devam ediyor.",
      requestKey: "F18-PRIMARY-REQUESTER-REPLY",
      ticketId: primary.id,
    },
  })).idempotent, "Tekrarlanan requester yanıtı idempotent olmalıdır.");
  assert(unwrap(await service.transition({
    scope: adminScope,
    status: "RESOLVED",
    ticketId: primary.id,
  })).idempotent, "Tekrarlanan durum geçişi idempotent olmalıdır.");
  assert(await countAudit() === auditBeforeRetry, "Retry işlemleri audit kaydını çoğaltmamalıdır.");

  await verifyAcceptance(primary.id, closed.id);
}

async function ensureAcceptanceScope() {
  const tenant = await prisma.tenant.findUnique({
    where: { id: base.tenantId },
    select: { id: true },
  });
  assert(tenant, "F18 kabul tenant'ı bulunamadı.");
  await prisma.company.upsert({
    where: { id: base.companyId },
    create: { id: base.companyId, name: base.companyName, tenantId: base.tenantId },
    update: { name: base.companyName },
  });
  await prisma.period.upsert({
    where: { id: base.periodId },
    create: {
      companyId: base.companyId,
      id: base.periodId,
      isClosed: true,
      label: base.periodLabel,
      tenantId: base.tenantId,
    },
    update: { isClosed: true, label: base.periodLabel },
  });
  for (const [scope, suffix] of [[requesterScope, "viewer"], [adminScope, "admin"]] as const) {
    await prisma.appUserScopeAccess.upsert({
      where: {
        userId_companyId_periodId: {
          companyId: scope.companyId,
          periodId: scope.periodId,
          userId: scope.userId,
        },
      },
      create: {
        ...scopeFields(),
        id: `scope-f18-kabul-${suffix}-20260730`,
        isActive: true,
        isDefault: false,
        licenseLabel: scope.licenseLabel,
        role: scope.userRole,
        userId: scope.userId,
      },
      update: {
        isActive: true,
        licenseLabel: scope.licenseLabel,
        role: scope.userRole,
      },
    });
    await prisma.appSession.upsert({
      where: { id: `session-f18-kabul-${suffix}-20260730` },
      create: {
        ...scopeFields(),
        id: `session-f18-kabul-${suffix}-20260730`,
        licenseLabel: scope.licenseLabel,
        role: scope.userRole,
        userId: scope.userId,
      },
      update: {
        expiresAt: null,
        licenseLabel: scope.licenseLabel,
        role: scope.userRole,
        userId: scope.userId,
      },
    });
  }
}

async function advance(ticketId: string, target: "RESOLVED" | "CLOSED") {
  const order = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
  while (true) {
    const thread = unwrap(await service.getThread({ scope: adminScope, ticketId }));
    const currentIndex = order.indexOf(thread.ticket.status);
    const targetIndex = order.indexOf(target);
    if (currentIndex >= targetIndex) return;
    const next = order[currentIndex + 1];
    assert(next, "Destek talebi için sonraki durum bulunamadı.");
    unwrap(await service.transition({ scope: adminScope, status: next, ticketId }));
  }
}

async function verifyAcceptance(primaryId: string, closedId: string) {
  const requesterTickets = unwrap(await service.list({ scope: requesterScope })).tickets;
  const adminTickets = unwrap(await service.list({ scope: adminScope })).tickets;
  assert(requesterTickets.length === 2 && adminTickets.length === 2, "Kabul kapsamı iki destek talebi taşımalıdır.");
  const primaryThread = unwrap(await service.getThread({ scope: requesterScope, ticketId: primaryId }));
  const closedThread = unwrap(await service.getThread({ scope: adminScope, ticketId: closedId }));
  assert(primaryThread.ticket.status === "RESOLVED", "Birincil kabul talebi çözüldü durumunda olmalıdır.");
  assert(primaryThread.messages.length === 3, "Birincil kabul talebi üç mesaj taşımalıdır.");
  assert(closedThread.ticket.status === "CLOSED", "İkinci kabul talebi kapalı olmalıdır.");

  const foreignScope = { ...requesterScope, companyId: "company-demo-insaat", periodId: "period-2026" };
  const foreignRead = await service.getThread({ scope: foreignScope, ticketId: primaryId });
  assert(!foreignRead.ok, "Yanlış firma/dönem talebi okuyamamalıdır.");
  const otherOwnerScope = { ...requesterScope, userId: "user-ayse" };
  const ownerRead = await service.getThread({ scope: otherOwnerScope, ticketId: primaryId });
  assert(!ownerRead.ok, "Başka requester talebi okuyamamalıdır.");
  const closedReply = await service.reply({
    scope: requesterScope,
    values: { body: "Kapalı talebe yazılamaz.", requestKey: "F18-CLOSED-REPLY", ticketId: closedId },
  });
  assert(!closedReply.ok, "Kapalı talebe yanıt reddedilmelidir.");

  const audits = await prisma.auditLog.findMany({
    where: { ...scopeFields(), action: { startsWith: "support-ticket." } },
    orderBy: [{ occurredAt: "asc" }, { action: "asc" }],
    select: { action: true, actorUserId: true, entityId: true, entityLabel: true, metadata: true },
  });
  assert(audits.length === 9, "F18 kabulü tam olarak dokuz audit kaydı taşımalıdır.");
  assert(audits.every((row) => row.entityLabel === row.entityId), "Audit entity label yalnız teknik kimlik taşımalıdır.");
  assert(audits.every((row) => !containsSensitiveDetail(row)), "Audit konu, mesaj veya request key taşımamalıdır.");

  const [cashBankCount, expenseCount, ledgerCount, payrollCount, stockCount, timesheetCount] = await Promise.all([
    prisma.cashBankMovement.count({ where: scopeFields() }),
    prisma.expense.count({ where: scopeFields() }),
    prisma.ledgerEntry.count({ where: scopeFields() }),
    prisma.payrollAccrual.count({ where: scopeFields() }),
    prisma.stockMovement.count({ where: scopeFields() }),
    prisma.timesheet.count({ where: scopeFields() }),
  ]);
  assert(
    cashBankCount === 0 && expenseCount === 0 && ledgerCount === 0
      && payrollCount === 0 && stockCount === 0 && timesheetCount === 0,
    "Destek kabulü finans/stok/bordro/puantaj yan etkisi üretmemelidir.",
  );

  console.log(JSON.stringify({
    ok: true,
    scope: scopeFields(),
    records: {
      messageCount: await prisma.supportTicketMessage.count({ where: scopeFields() }),
      statuses: adminTickets.map((row) => row.status).sort(),
      ticketCount: adminTickets.length,
    },
    audit: {
      actions: audits.map((row) => row.action).sort(),
      count: audits.length,
    },
    isolation: { foreignScopeRejected: true, otherOwnerRejected: true },
    sideEffects: { cashBankCount, expenseCount, ledgerCount, payrollCount, stockCount, timesheetCount },
  }, null, 2));
}

function id(kind: string, sequence = 1) {
  return `F18-KABUL-20260730::${kind}::${String(sequence).padStart(3, "0")}`;
}
function scopeFields() {
  return { companyId: base.companyId, periodId: base.periodId, tenantId: base.tenantId };
}
async function countAudit() {
  return prisma.auditLog.count({ where: { ...scopeFields(), action: { startsWith: "support-ticket." } } });
}
function containsSensitiveDetail(value: unknown) {
  const serialized = JSON.stringify(value).toLocaleLowerCase("tr-TR");
  return serialized.includes("rapor filtresi")
    || serialized.includes("tarayıcı yenilendi")
    || serialized.includes("paket bilgisi")
    || serialized.includes("f18-primary")
    || serialized.includes("f18-closed");
}
function unwrap<T>(result: { data: T; ok: true } | { errors: string[]; ok: false }) {
  if (!result.ok) throw new Error(result.errors.join(" "));
  return result.data;
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
