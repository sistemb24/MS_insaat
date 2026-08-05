import "dotenv/config";

import {
  createAnnouncementPrismaRepository,
  type AnnouncementPrismaClientLike,
} from "../src/lib/announcement-prisma-repository";
import { createAnnouncementService } from "../src/lib/announcement-service";
import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "../src/lib/audit-log-prisma-repository";
import { prisma } from "../src/lib/prisma";
import type { TenantScope } from "../src/lib/tenant-scope";

const base = {
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
  companyId: "company-f19-kabul-20260730",
  companyName: "F19 Bilgi Merkezi Kabul Şirketi",
  periodId: "period-f19-kabul-20260730",
  periodLabel: "F19 Kabul 2026",
  licenseLabel: "Kurumsal",
  periodClosed: false,
};
const adminScope: TenantScope = {
  ...base,
  userId: "user-ahmet",
  userName: "Bilgi Merkezi Yöneticisi",
  userRole: "admin",
};
const viewerScope: TenantScope = {
  ...base,
  userId: "user-main",
  userName: "Bilgi Merkezi Okuyucusu",
  userRole: "viewer",
};
const timestamp = "2026-07-30T10:00:00.000Z";
const repository = createAnnouncementPrismaRepository(
  prisma as unknown as AnnouncementPrismaClientLike,
);
const auditRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);

function serviceFor(sequence: number) {
  return createAnnouncementService({
    auditLogRepository: auditRepository,
    createId: () => id(sequence),
    now: () => timestamp,
    repository,
  });
}

async function main() {
  await ensureAcceptanceScope();

  const primaryService = serviceFor(1);
  const primary = unwrap(await primaryService.create({
    scope: adminScope,
    values: {
      category: "UPDATE",
      content: "F19 kabulünde yeni rapor filtreleri ve mobil görünüm kullanıma açıldı.",
      priority: "IMPORTANT",
      requestKey: "F19-PRIMARY-CREATE",
      summary: "Rapor Merkezi filtreleri ve mobil kart görünümü güncellendi.",
      title: "Yeni: Rapor Merkezi deneyimi yayında",
    },
  })).announcement;
  unwrap(await primaryService.updateDraft({
    scope: adminScope,
    values: {
      announcementId: primary.id,
      category: "UPDATE",
      content: "F19 kabulünde yeni rapor filtreleri, mobil görünüm ve yazdırma düzeni kullanıma açıldı.",
      expectedRevisionNo: 1,
      priority: "IMPORTANT",
      requestKey: "F19-PRIMARY-UPDATE",
      summary: "Rapor filtreleri, mobil kartlar ve yazdırma görünümü güncellendi.",
      title: "Yeni: Rapor Merkezi deneyimi yayında",
    },
  }));
  unwrap(await primaryService.publish({
    announcementId: primary.id,
    requestKey: "F19-PRIMARY-PUBLISH",
    scope: adminScope,
  }));

  const maintenanceService = serviceFor(2);
  const maintenance = unwrap(await maintenanceService.create({
    scope: adminScope,
    values: {
      category: "MAINTENANCE",
      content: "F19 izole kabul ortamında planlı bakım bilgilendirmesi doğrulanmaktadır.",
      priority: "NORMAL",
      requestKey: "F19-MAINTENANCE-CREATE",
      summary: "Kabul ortamı için planlı bakım bilgilendirmesi.",
      title: "Planlı bakım bilgilendirmesi",
    },
  })).announcement;
  unwrap(await maintenanceService.publish({
    announcementId: maintenance.id,
    requestKey: "F19-MAINTENANCE-PUBLISH",
    scope: adminScope,
  }));

  const archivedService = serviceFor(3);
  const archived = unwrap(await archivedService.create({
    scope: adminScope,
    values: {
      category: "NEWS",
      content: "F19 kabulünde geçmiş şirket haberi arşiv görünürlüğünü doğrular.",
      priority: "NORMAL",
      requestKey: "F19-ARCHIVED-CREATE",
      summary: "Geçmiş şirket haberi arşivlendi.",
      title: "Geçmiş şirket haberi",
    },
  })).announcement;
  unwrap(await archivedService.publish({
    announcementId: archived.id,
    requestKey: "F19-ARCHIVED-PUBLISH",
    scope: adminScope,
  }));
  unwrap(await archivedService.archive({
    announcementId: archived.id,
    requestKey: "F19-ARCHIVED-ARCHIVE",
    scope: adminScope,
  }));

  const draftService = serviceFor(4);
  const draft = unwrap(await draftService.create({
    scope: adminScope,
    values: {
      category: "ANNOUNCEMENT",
      content: "Bu içerik yalnız yönetici taslak görünürlüğü kabulü içindir.",
      priority: "NORMAL",
      requestKey: "F19-DRAFT-CREATE",
      summary: "Yalnız yöneticiye görünür kabul taslağı.",
      title: "Yönetici taslak duyurusu",
    },
  })).announcement;
  await normalizeAcceptanceTimestamps();

  const auditBeforeRetry = await countAudit();
  assert(unwrap(await primaryService.create({
    scope: adminScope,
    values: {
      category: "UPDATE",
      content: "F19 kabulünde yeni rapor filtreleri ve mobil görünüm kullanıma açıldı.",
      priority: "IMPORTANT",
      requestKey: "F19-PRIMARY-CREATE",
      summary: "Rapor Merkezi filtreleri ve mobil kart görünümü güncellendi.",
      title: "Yeni: Rapor Merkezi deneyimi yayında",
    },
  })).idempotent, "Tekrarlanan duyuru oluşturma idempotent olmalıdır.");
  assert(unwrap(await primaryService.updateDraft({
    scope: adminScope,
    values: {
      announcementId: primary.id,
      category: "UPDATE",
      content: "F19 kabulünde yeni rapor filtreleri, mobil görünüm ve yazdırma düzeni kullanıma açıldı.",
      expectedRevisionNo: 1,
      priority: "IMPORTANT",
      requestKey: "F19-PRIMARY-UPDATE",
      summary: "Rapor filtreleri, mobil kartlar ve yazdırma görünümü güncellendi.",
      title: "Yeni: Rapor Merkezi deneyimi yayında",
    },
  })).idempotent, "Tekrarlanan taslak güncellemesi idempotent olmalıdır.");
  assert(unwrap(await primaryService.publish({
    announcementId: primary.id,
    requestKey: "F19-PRIMARY-PUBLISH",
    scope: adminScope,
  })).idempotent, "Tekrarlanan yayımlama idempotent olmalıdır.");
  assert(await countAudit() === auditBeforeRetry, "Retry işlemleri audit kaydını çoğaltmamalıdır.");

  await verifyAcceptance({
    archivedId: archived.id,
    draftId: draft.id,
    primaryId: primary.id,
  });
}

async function ensureAcceptanceScope() {
  const tenant = await prisma.tenant.findUnique({
    where: { id: base.tenantId },
    select: { id: true },
  });
  assert(tenant, "F19 kabul tenant'ı bulunamadı.");
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
      isClosed: false,
      label: base.periodLabel,
      tenantId: base.tenantId,
    },
    update: { isClosed: false, label: base.periodLabel },
  });
  for (const [scope, suffix] of [[adminScope, "admin"], [viewerScope, "viewer"]] as const) {
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
        id: `scope-f19-kabul-${suffix}-20260730`,
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
      where: { id: `session-f19-kabul-${suffix}-20260730` },
      create: {
        ...scopeFields(),
        id: `session-f19-kabul-${suffix}-20260730`,
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

async function verifyAcceptance(input: {
  archivedId: string;
  draftId: string;
  primaryId: string;
}) {
  const adminRows = unwrap(await serviceFor(99).list({ scope: adminScope })).announcements;
  const viewerRows = unwrap(await serviceFor(99).list({ scope: viewerScope })).announcements;
  assert(adminRows.length === 4, "Admin kabul kapsamında dört duyuru görmelidir.");
  assert(viewerRows.length === 2, "Viewer yalnız iki yayımlanmış duyuruyu görmelidir.");
  assert(viewerRows.every((row) => row.status === "PUBLISHED"), "Viewer yalnız yayımlanmış kayıt görmelidir.");
  assert(adminRows.find((row) => row.id === input.primaryId)?.revisionNo === 3, "Birincil duyuru üçüncü revizyonda olmalıdır.");
  assert(adminRows.find((row) => row.id === input.archivedId)?.status === "ARCHIVED", "Arşiv kabul kaydı arşivlenmiş olmalıdır.");

  const foreignScope = {
    ...viewerScope,
    companyId: "company-demo-insaat",
    periodId: "period-2026",
  };
  assert(
    !(await serviceFor(99).get({ announcementId: input.primaryId, scope: foreignScope })).ok,
    "Yanlış firma/dönem duyuruyu okuyamamalıdır.",
  );
  assert(
    !(await serviceFor(99).get({ announcementId: input.draftId, scope: viewerScope })).ok,
    "Viewer taslak duyuruyu okuyamamalıdır.",
  );
  assert(
    !(await serviceFor(99).create({ scope: viewerScope, values: {
      category: "NEWS",
      content: "Yetkisiz içerik",
      priority: "NORMAL",
      requestKey: "F19-VIEWER-DENIED",
      summary: "Yetkisiz özet",
      title: "Yetkisiz duyuru",
    } })).ok,
    "Viewer duyuru oluşturamamalıdır.",
  );
  assert(
    !(await serviceFor(99).archive({
      announcementId: input.primaryId,
      requestKey: "F19-CLOSED-DENIED",
      scope: { ...adminScope, periodClosed: true },
    })).ok,
    "Kapalı dönem admin mutasyonu reddedilmelidir.",
  );

  const audits = await prisma.auditLog.findMany({
    where: { ...scopeFields(), action: { startsWith: "announcement." } },
    orderBy: [{ occurredAt: "asc" }, { action: "asc" }],
    select: {
      action: true,
      actorUserId: true,
      entityId: true,
      entityLabel: true,
      metadata: true,
    },
  });
  assert(audits.length === 9, "F19 kabulü tam olarak dokuz audit kaydı taşımalıdır.");
  assert(audits.every((row) => row.entityLabel === row.entityId), "Audit entity label yalnız teknik kimlik taşımalıdır.");
  assert(audits.every((row) => !containsSensitiveDetail(row)), "Audit başlık, özet, içerik veya request key taşımamalıdır.");

  const [
    cashBankCount,
    expenseCount,
    ledgerCount,
    notificationCount,
    payrollCount,
    stockCount,
    timesheetCount,
  ] = await Promise.all([
    prisma.cashBankMovement.count({ where: scopeFields() }),
    prisma.expense.count({ where: scopeFields() }),
    prisma.ledgerEntry.count({ where: scopeFields() }),
    prisma.notification.count({ where: scopeFields() }),
    prisma.payrollAccrual.count({ where: scopeFields() }),
    prisma.stockMovement.count({ where: scopeFields() }),
    prisma.timesheet.count({ where: scopeFields() }),
  ]);
  assert(
    cashBankCount === 0 && expenseCount === 0 && ledgerCount === 0
      && notificationCount === 0 && payrollCount === 0
      && stockCount === 0 && timesheetCount === 0,
    "Bilgi Merkezi kabulü bildirim/finans/stok/bordro/puantaj yan etkisi üretmemelidir.",
  );

  console.log(JSON.stringify({
    ok: true,
    scope: scopeFields(),
    records: {
      adminCount: adminRows.length,
      statuses: adminRows.map((row) => row.status).sort(),
      viewerPublishedCount: viewerRows.length,
    },
    audit: {
      actions: audits.map((row) => row.action).sort(),
      count: audits.length,
    },
    isolation: {
      closedPeriodRejected: true,
      foreignScopeRejected: true,
      viewerDraftRejected: true,
      viewerWriteRejected: true,
    },
    sideEffects: {
      cashBankCount,
      expenseCount,
      ledgerCount,
      notificationCount,
      payrollCount,
      stockCount,
      timesheetCount,
    },
  }, null, 2));
}

async function normalizeAcceptanceTimestamps() {
  const publishedAt = new Date(timestamp);
  await prisma.announcement.updateMany({
    where: { ...scopeFields(), status: "PUBLISHED" },
    data: { publishedAt },
  });
  await prisma.announcement.updateMany({
    where: { ...scopeFields(), status: "ARCHIVED" },
    data: {
      archivedAt: publishedAt,
      publishedAt: new Date("2026-07-01T10:00:00.000Z"),
    },
  });
}

function id(sequence: number) {
  return `F19-KABUL-20260730::announcement::${String(sequence).padStart(3, "0")}`;
}
function scopeFields() {
  return { companyId: base.companyId, periodId: base.periodId, tenantId: base.tenantId };
}
async function countAudit() {
  return prisma.auditLog.count({
    where: { ...scopeFields(), action: { startsWith: "announcement." } },
  });
}
function containsSensitiveDetail(value: unknown) {
  const serialized = JSON.stringify(value).toLocaleLowerCase("tr-TR");
  return serialized.includes("rapor merkezi")
    || serialized.includes("planlı bakım")
    || serialized.includes("geçmiş şirket")
    || serialized.includes("yönetici taslak")
    || serialized.includes("f19-primary")
    || serialized.includes("f19-maintenance")
    || serialized.includes("f19-archived")
    || serialized.includes("f19-draft");
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
