import "dotenv/config";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "../src/lib/audit-log-prisma-repository";
import {
  createEmployeeTransferPrismaRepository,
  type EmployeeTransferPrismaClientLike,
} from "../src/lib/employee-transfer-prisma-repository";
import { createEmployeeTransferService } from "../src/lib/employee-transfer-service";
import { prisma } from "../src/lib/prisma";
import type { TenantScope } from "../src/lib/tenant-scope";

const base = {
  companyId: "company-f22-kabul-20260730",
  companyName: "F22 Personel Transfer Kabul Şirketi",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-f22-kabul-20260730",
  periodLabel: "F22 Kabul 2026",
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
};
const adminScope: TenantScope = {
  ...base,
  userId: "user-ahmet",
  userName: "Transfer Yöneticisi",
  userRole: "admin",
};
const accountingScope: TenantScope = {
  ...base,
  userId: "user-main",
  userName: "Transfer Muhasebe Kullanıcısı",
  userRole: "accounting",
};
const viewerScope: TenantScope = {
  ...base,
  userId: "user-main",
  userName: "Transfer Salt Okuru",
  userRole: "viewer",
};
const timestamp = "2026-07-30T14:00:00.000Z";
const repository = createEmployeeTransferPrismaRepository(
  prisma as unknown as EmployeeTransferPrismaClientLike,
);
const auditRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);

function serviceFor(sequence: number) {
  return createEmployeeTransferService({
    auditLogRepository: auditRepository,
    createId: () => transferId(sequence),
    now: () => timestamp,
    repository,
  });
}

async function main() {
  await ensureAcceptanceScope();

  const approvedService = serviceFor(1);
  const approved = unwrap(await approvedService.create({
    currentPersonnelSiteName: "F22 Kuzey Şantiyesi",
    scope: accountingScope,
    values: {
      effectiveDate: "2026-07-28",
      note: "F22 onaylı transfer operasyon notu audit dışında kalır.",
      personnelCode: "F22-PER-001",
      personnelName: "F22 Ayşe Demir",
      requestKey: "F22-APPROVED-CREATE",
      sourceSiteCode: "F22-SITE-A",
      sourceSiteName: "F22 Kuzey Şantiyesi",
      targetSiteCode: "F22-SITE-B",
      targetSiteName: "F22 Güney Şantiyesi",
    },
  })).transfer;
  unwrap(await approvedService.submit({
    currentPersonnelSiteName: "F22 Kuzey Şantiyesi",
    requestKey: "F22-APPROVED-SUBMIT",
    scope: accountingScope,
    transferId: approved.id,
  }));
  const personnelBeforeApproval = await readPersonnel("F22-PER-001");
  const approvedResult = unwrap(await approvedService.approve({
    currentPersonnelSiteName: "F22 Kuzey Şantiyesi",
    expectedPersonnelUpdatedAt: personnelBeforeApproval.updatedAt.toISOString(),
    requestKey: "F22-APPROVED-APPROVE",
    scope: adminScope,
    today: "2026-07-30",
    transferId: approved.id,
  })).transfer;

  const rejectedService = serviceFor(2);
  const rejected = unwrap(await rejectedService.create({
    currentPersonnelSiteName: "F22 Kuzey Şantiyesi",
    scope: accountingScope,
    values: {
      effectiveDate: "2026-07-29",
      note: "F22 reddedilen transfer operasyon notu audit dışında kalır.",
      personnelCode: "F22-PER-002",
      personnelName: "F22 Mehmet Kaya",
      requestKey: "F22-REJECTED-CREATE",
      sourceSiteCode: "F22-SITE-A",
      sourceSiteName: "F22 Kuzey Şantiyesi",
      targetSiteCode: "F22-SITE-C",
      targetSiteName: "F22 Doğu Şantiyesi",
    },
  })).transfer;
  unwrap(await rejectedService.submit({
    currentPersonnelSiteName: "F22 Kuzey Şantiyesi",
    requestKey: "F22-REJECTED-SUBMIT",
    scope: accountingScope,
    transferId: rejected.id,
  }));
  const rejectedResult = unwrap(await rejectedService.reject({
    requestKey: "F22-REJECTED-REJECT",
    scope: adminScope,
    transferId: rejected.id,
  })).transfer;

  const submittedService = serviceFor(3);
  const submitted = unwrap(await submittedService.create({
    currentPersonnelSiteName: "F22 Doğu Şantiyesi",
    scope: adminScope,
    values: {
      effectiveDate: "2026-08-05",
      note: "F22 ileri tarihli bekleyen transfer notu audit dışında kalır.",
      personnelCode: "F22-PER-003",
      personnelName: "F22 Elif Yılmaz",
      requestKey: "F22-SUBMITTED-CREATE",
      sourceSiteCode: "F22-SITE-C",
      sourceSiteName: "F22 Doğu Şantiyesi",
      targetSiteCode: "F22-SITE-A",
      targetSiteName: "F22 Kuzey Şantiyesi",
    },
  })).transfer;
  const submittedResult = unwrap(await submittedService.submit({
    currentPersonnelSiteName: "F22 Doğu Şantiyesi",
    requestKey: "F22-SUBMITTED-SUBMIT",
    scope: adminScope,
    transferId: submitted.id,
  })).transfer;

  const draftService = serviceFor(4);
  const draft = unwrap(await draftService.create({
    currentPersonnelSiteName: "F22 Güney Şantiyesi",
    scope: accountingScope,
    values: {
      effectiveDate: "2026-07-30",
      note: "F22 zincir devamı taslak notu audit dışında kalır.",
      personnelCode: "F22-PER-001",
      personnelName: "F22 Ayşe Demir",
      requestKey: "F22-DRAFT-CREATE",
      sourceSiteCode: "F22-SITE-B",
      sourceSiteName: "F22 Güney Şantiyesi",
      targetSiteCode: "F22-SITE-C",
      targetSiteName: "F22 Doğu Şantiyesi",
    },
  })).transfer;

  const auditBeforeRetry = await countAudit();
  assert(unwrap(await approvedService.create({
    currentPersonnelSiteName: "F22 Kuzey Şantiyesi",
    scope: accountingScope,
    values: {
      effectiveDate: "2026-07-28",
      note: "F22 onaylı transfer operasyon notu audit dışında kalır.",
      personnelCode: "F22-PER-001",
      personnelName: "F22 Ayşe Demir",
      requestKey: "F22-APPROVED-CREATE",
      sourceSiteCode: "F22-SITE-A",
      sourceSiteName: "F22 Kuzey Şantiyesi",
      targetSiteCode: "F22-SITE-B",
      targetSiteName: "F22 Güney Şantiyesi",
    },
  })).idempotent, "Transfer oluşturma tekrarı idempotent olmalıdır.");
  assert(unwrap(await approvedService.submit({
    currentPersonnelSiteName: "F22 Güney Şantiyesi",
    requestKey: "F22-APPROVED-SUBMIT",
    scope: accountingScope,
    transferId: approved.id,
  })).idempotent, "Transfer gönderme tekrarı idempotent olmalıdır.");
  assert(unwrap(await approvedService.approve({
    currentPersonnelSiteName: "F22 Güney Şantiyesi",
    expectedPersonnelUpdatedAt: personnelBeforeApproval.updatedAt.toISOString(),
    requestKey: "F22-APPROVED-APPROVE",
    scope: adminScope,
    today: "2026-07-30",
    transferId: approved.id,
  })).idempotent, "Transfer onay tekrarı idempotent olmalıdır.");
  assert(await countAudit() === auditBeforeRetry, "Retry audit kaydını çoğaltmamalıdır.");

  await verifyAcceptance({
    approvedId: approvedResult.id,
    draftId: draft.id,
    rejectedId: rejectedResult.id,
    submittedId: submittedResult.id,
  });
}

async function ensureAcceptanceScope() {
  const tenant = await prisma.tenant.findUnique({
    select: { id: true },
    where: { id: base.tenantId },
  });
  assert(tenant, "F22 kabul tenant'ı bulunamadı.");
  await prisma.company.upsert({
    create: { id: base.companyId, name: base.companyName, tenantId: base.tenantId },
    update: { name: base.companyName },
    where: { id: base.companyId },
  });
  await prisma.period.upsert({
    create: {
      companyId: base.companyId,
      id: base.periodId,
      isClosed: false,
      label: base.periodLabel,
      tenantId: base.tenantId,
    },
    update: { isClosed: false, label: base.periodLabel },
    where: { id: base.periodId },
  });

  for (const [code, name] of [
    ["F22-SITE-A", "F22 Kuzey Şantiyesi"],
    ["F22-SITE-B", "F22 Güney Şantiyesi"],
    ["F22-SITE-C", "F22 Doğu Şantiyesi"],
  ] as const) {
    await prisma.entityRecord.upsert({
      create: {
        ...scopeFields(),
        code,
        createdBy: adminScope.userId,
        data: { name, status: "Aktif" },
        slug: "santiyeler",
        updatedBy: adminScope.userId,
      },
      update: { data: { name, status: "Aktif" }, updatedBy: adminScope.userId },
      where: {
        tenantId_companyId_periodId_slug_code: {
          ...scopeFields(),
          code,
          slug: "santiyeler",
        },
      },
    });
  }

  for (const [code, name, site, title] of [
    ["F22-PER-001", "F22 Ayşe Demir", "F22 Kuzey Şantiyesi", "Saha Mühendisi"],
    ["F22-PER-002", "F22 Mehmet Kaya", "F22 Kuzey Şantiyesi", "Formen"],
    ["F22-PER-003", "F22 Elif Yılmaz", "F22 Doğu Şantiyesi", "İSG Uzmanı"],
  ] as const) {
    await prisma.entityRecord.upsert({
      create: {
        ...scopeFields(),
        code,
        createdBy: adminScope.userId,
        data: {
          name,
          phone: `0532 000 00 0${code.slice(-1)}`,
          site,
          status: "Aktif",
          title,
        },
        slug: "personel",
        updatedBy: adminScope.userId,
      },
      update: { updatedBy: adminScope.userId },
      where: {
        tenantId_companyId_periodId_slug_code: {
          ...scopeFields(),
          code,
          slug: "personel",
        },
      },
    });
  }

  for (const [role, suffix] of [
    ["admin", "admin"],
    ["accounting", "accounting"],
    ["viewer", "viewer"],
  ] as const) {
    const userId = role === "admin" ? adminScope.userId : viewerScope.userId;
    await prisma.appUserScopeAccess.upsert({
      create: {
        ...scopeFields(),
        id: `scope-f22-kabul-${suffix}-20260730`,
        isActive: true,
        isDefault: false,
        licenseLabel: base.licenseLabel,
        role,
        userId,
      },
      update: { isActive: true, licenseLabel: base.licenseLabel, role },
      where: {
        userId_companyId_periodId: {
          companyId: base.companyId,
          periodId: base.periodId,
          userId,
        },
      },
    });
    await prisma.appSession.upsert({
      create: {
        ...scopeFields(),
        id: `session-f22-kabul-${suffix}-20260730`,
        licenseLabel: base.licenseLabel,
        role,
        userId,
      },
      update: {
        expiresAt: null,
        licenseLabel: base.licenseLabel,
        role,
        userId,
      },
      where: { id: `session-f22-kabul-${suffix}-20260730` },
    });
  }
}

async function verifyAcceptance(input: {
  approvedId: string;
  draftId: string;
  rejectedId: string;
  submittedId: string;
}) {
  const service = serviceFor(99);
  const overview = unwrap(await service.list({ scope: adminScope }));
  assert(overview.transfers.length === 4, "Kabul kapsamında dört transfer olmalıdır.");
  const statuses = new Map(overview.transfers.map((row) => [row.id, row.status]));
  assert(statuses.get(input.approvedId) === "APPROVED", "Onaylı transfer korunmalıdır.");
  assert(statuses.get(input.rejectedId) === "REJECTED", "Reddedilen transfer korunmalıdır.");
  assert(statuses.get(input.submittedId) === "SUBMITTED", "Bekleyen transfer korunmalıdır.");
  assert(statuses.get(input.draftId) === "DRAFT", "Zincir devamı taslağı korunmalıdır.");

  const [approvedPersonnel, rejectedPersonnel, submittedPersonnel] = await Promise.all([
    readPersonnel("F22-PER-001"),
    readPersonnel("F22-PER-002"),
    readPersonnel("F22-PER-003"),
  ]);
  const approvedData = jsonObject(approvedPersonnel.data);
  const rejectedData = jsonObject(rejectedPersonnel.data);
  const submittedData = jsonObject(submittedPersonnel.data);
  assert(approvedData.site === "F22 Güney Şantiyesi", "Onay personel şantiyesini hedefe taşımalıdır.");
  assert(approvedData.title === "Saha Mühendisi" && approvedData.phone === "0532 000 00 01", "Onay personel kartının diğer alanlarını korumalıdır.");
  assert(rejectedData.site === "F22 Kuzey Şantiyesi", "Red personel şantiyesini değiştirmemelidir.");
  assert(submittedData.site === "F22 Doğu Şantiyesi", "Bekleyen transfer personel şantiyesini değiştirmemelidir.");

  const foreign = {
    ...viewerScope,
    companyId: "company-demo-insaat",
    periodId: "period-2026",
  };
  assert(!(await service.get({
    scope: foreign,
    transferId: input.approvedId,
  })).ok, "Yanlış scope transferi okuyamamalıdır.");
  assert(!(await service.create({
    currentPersonnelSiteName: "F22 Kuzey Şantiyesi",
    scope: viewerScope,
    values: {
      effectiveDate: "2026-07-30",
      note: "",
      personnelCode: "F22-PER-002",
      personnelName: "F22 Mehmet Kaya",
      requestKey: "F22-VIEWER-DENIED",
      sourceSiteCode: "F22-SITE-A",
      sourceSiteName: "F22 Kuzey Şantiyesi",
      targetSiteCode: "F22-SITE-B",
      targetSiteName: "F22 Güney Şantiyesi",
    },
  })).ok, "Viewer transfer oluşturamamalıdır.");
  assert(!(await service.approve({
    currentPersonnelSiteName: "F22 Doğu Şantiyesi",
    expectedPersonnelUpdatedAt: submittedPersonnel.updatedAt.toISOString(),
    requestKey: "F22-ACCOUNTING-APPROVE-DENIED",
    scope: accountingScope,
    today: "2026-07-30",
    transferId: input.submittedId,
  })).ok, "Muhasebe transfer onaylayamamalıdır.");
  assert(!(await service.approve({
    currentPersonnelSiteName: "F22 Doğu Şantiyesi",
    expectedPersonnelUpdatedAt: submittedPersonnel.updatedAt.toISOString(),
    requestKey: "F22-FUTURE-DENIED",
    scope: adminScope,
    today: "2026-07-30",
    transferId: input.submittedId,
  })).ok, "Gelecek tarihli transfer onaylanamamalıdır.");
  assert(!(await service.create({
    currentPersonnelSiteName: "F22 Doğu Şantiyesi",
    scope: adminScope,
    values: {
      effectiveDate: "2026-07-30",
      note: "",
      personnelCode: "F22-PER-003",
      personnelName: "F22 Elif Yılmaz",
      requestKey: "F22-SECOND-PENDING-DENIED",
      sourceSiteCode: "F22-SITE-C",
      sourceSiteName: "F22 Doğu Şantiyesi",
      targetSiteCode: "F22-SITE-B",
      targetSiteName: "F22 Güney Şantiyesi",
    },
  })).ok, "İkinci bekleyen transfer oluşturulamamalıdır.");
  assert(!(await service.create({
    currentPersonnelSiteName: "F22 Kuzey Şantiyesi",
    scope: { ...accountingScope, periodClosed: true },
    values: {
      effectiveDate: "2026-07-30",
      note: "",
      personnelCode: "F22-PER-002",
      personnelName: "F22 Mehmet Kaya",
      requestKey: "F22-CLOSED-DENIED",
      sourceSiteCode: "F22-SITE-A",
      sourceSiteName: "F22 Kuzey Şantiyesi",
      targetSiteCode: "F22-SITE-B",
      targetSiteName: "F22 Güney Şantiyesi",
    },
  })).ok, "Kapalı dönem mutasyonu reddedilmelidir.");

  const audits = await prisma.auditLog.findMany({
    orderBy: [{ occurredAt: "asc" }, { action: "asc" }],
    select: { action: true, entityId: true, entityLabel: true, metadata: true },
    where: { ...scopeFields(), action: { startsWith: "employee-transfer." } },
  });
  assert(audits.length === 9, "F22 kabulü tam olarak dokuz audit kaydı taşımalıdır.");
  assert(audits.every((row) => row.entityId === row.entityLabel), "Audit etiketi teknik kimlik olmalıdır.");
  assert(audits.every((row) => !containsSensitiveDetail(row)), "Audit not, kişi/şantiye adı veya request key taşımamalıdır.");

  const [
    advanceCount,
    cashBankCount,
    expenseCount,
    leaveCount,
    ledgerCount,
    notificationCount,
    payrollCount,
    ppeCount,
    stockCount,
    timesheetCount,
    vehicleAssignmentCount,
  ] = await Promise.all([
    prisma.employeeAdvanceRequest.count({ where: scopeFields() }),
    prisma.cashBankMovement.count({ where: scopeFields() }),
    prisma.expense.count({ where: scopeFields() }),
    prisma.employeeLeaveRequest.count({ where: scopeFields() }),
    prisma.ledgerEntry.count({ where: scopeFields() }),
    prisma.notification.count({ where: scopeFields() }),
    prisma.payrollAccrual.count({ where: scopeFields() }),
    prisma.safetyPpeIssuance.count({ where: scopeFields() }),
    prisma.stockMovement.count({ where: scopeFields() }),
    prisma.timesheet.count({ where: scopeFields() }),
    prisma.vehicleAssignment.count({ where: scopeFields() }),
  ]);
  assert(
    advanceCount === 0 && cashBankCount === 0 && expenseCount === 0
      && leaveCount === 0 && ledgerCount === 0 && notificationCount === 0
      && payrollCount === 0 && ppeCount === 0 && stockCount === 0
      && timesheetCount === 0 && vehicleAssignmentCount === 0,
    "Personel transferi komşu modüllerde yan etki üretmemelidir.",
  );

  console.log(JSON.stringify({
    audit: {
      actions: audits.map((row) => row.action).sort(),
      count: audits.length,
    },
    isolation: {
      accountingApprovalRejected: true,
      closedPeriodRejected: true,
      foreignScopeRejected: true,
      futureApprovalRejected: true,
      secondPendingRejected: true,
      viewerWriteRejected: true,
    },
    ok: true,
    personnel: {
      approvedSite: approvedData.site,
      preservedPhone: approvedData.phone,
      preservedTitle: approvedData.title,
      rejectedSite: rejectedData.site,
      submittedSite: submittedData.site,
    },
    records: {
      statuses: overview.transfers.map((row) => row.status).sort(),
      transferCount: overview.transfers.length,
    },
    scope: scopeFields(),
    sideEffects: {
      advanceCount,
      cashBankCount,
      expenseCount,
      leaveCount,
      ledgerCount,
      notificationCount,
      payrollCount,
      ppeCount,
      stockCount,
      timesheetCount,
      vehicleAssignmentCount,
    },
  }, null, 2));
}

async function readPersonnel(code: string) {
  const personnel = await prisma.entityRecord.findFirst({
    where: { ...scopeFields(), code, slug: "personel" },
  });
  assert(personnel, `${code} personel kartı bulunamadı.`);
  return personnel;
}
function transferId(sequence: number) {
  return `F22-KABUL-20260730::employee-transfer::${String(sequence).padStart(3, "0")}`;
}
function scopeFields() {
  return { companyId: base.companyId, periodId: base.periodId, tenantId: base.tenantId };
}
async function countAudit() {
  return prisma.auditLog.count({
    where: { ...scopeFields(), action: { startsWith: "employee-transfer." } },
  });
}
function containsSensitiveDetail(value: unknown) {
  const serialized = JSON.stringify(value).toLocaleLowerCase("tr-TR");
  return serialized.includes("operasyon notu")
    || serialized.includes("bekleyen transfer notu")
    || serialized.includes("zincir devamı")
    || serialized.includes("f22 ayşe")
    || serialized.includes("f22 mehmet")
    || serialized.includes("f22 elif")
    || serialized.includes("f22 kuzey")
    || serialized.includes("f22 güney")
    || serialized.includes("f22 doğu")
    || serialized.includes("f22-approved")
    || serialized.includes("f22-rejected")
    || serialized.includes("f22-submitted")
    || serialized.includes("f22-draft");
}
function jsonObject(value: unknown): Record<string, string> {
  assert(value && typeof value === "object" && !Array.isArray(value), "Personel kartı verisi geçersizdir.");
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, String(item ?? "")]),
  );
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
