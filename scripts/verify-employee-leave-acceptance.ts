import "dotenv/config";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "../src/lib/audit-log-prisma-repository";
import {
  createEmployeeLeavePrismaRepository,
  type EmployeeLeavePrismaClientLike,
} from "../src/lib/employee-leave-prisma-repository";
import { createEmployeeLeaveService } from "../src/lib/employee-leave-service";
import { prisma } from "../src/lib/prisma";
import type { TenantScope } from "../src/lib/tenant-scope";

const base = {
  companyId: "company-f20-kabul-20260730",
  companyName: "F20 Personel İzin Kabul Şirketi",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-f20-kabul-20260730",
  periodLabel: "F20 Kabul 2026",
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
};
const adminScope: TenantScope = {
  ...base,
  userId: "user-ahmet",
  userName: "İzin Yöneticisi",
  userRole: "admin",
};
const accountingScope: TenantScope = {
  ...base,
  userId: "user-main",
  userName: "İzin Muhasebe Kullanıcısı",
  userRole: "accounting",
};
const viewerScope: TenantScope = {
  ...base,
  userId: "user-main",
  userName: "İzin Salt Okuru",
  userRole: "viewer",
};
const timestamp = "2026-07-30T10:00:00.000Z";
const repository = createEmployeeLeavePrismaRepository(
  prisma as unknown as EmployeeLeavePrismaClientLike,
);
const auditRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);

function serviceFor(sequence: number) {
  return createEmployeeLeaveService({
    auditLogRepository: auditRepository,
    createId: (_scope, entity) =>
      entity === "balance" ? balanceId(1) : leaveId(sequence),
    now: () => timestamp,
    repository,
  });
}

async function main() {
  await ensureAcceptanceScope();
  const balanceResult = unwrap(await serviceFor(90).saveBalance({
    scope: adminScope,
    values: {
      adjustmentDays: 0,
      openingDays: 14,
      personnelCode: "F20-PER-001",
      personnelName: "F20 Ayşe Demir",
      requestKey: "F20-BALANCE-SAVE",
      year: 2026,
    },
  }));

  const annualService = serviceFor(1);
  const annual = unwrap(await annualService.create({
    scope: accountingScope,
    values: {
      chargeableDays: 3,
      documentFileId: null,
      endDate: "2026-08-12",
      leaveType: "ANNUAL",
      note: "F20 kabul yıllık izin açıklaması audit dışı kalır.",
      personnelCode: "F20-PER-001",
      personnelName: "F20 Ayşe Demir",
      requestKey: "F20-ANNUAL-CREATE",
      startDate: "2026-08-10",
    },
  })).leave;
  unwrap(await annualService.updateDraft({
    scope: accountingScope,
    values: {
      chargeableDays: 3,
      documentFileId: null,
      endDate: "2026-08-12",
      expectedRevisionNo: 1,
      leaveId: annual.id,
      leaveType: "ANNUAL",
      note: "F20 kabul yıllık izin açıklaması güncellendi ve audit dışı kalır.",
      personnelCode: "F20-PER-001",
      personnelName: "F20 Ayşe Demir",
      requestKey: "F20-ANNUAL-UPDATE",
      startDate: "2026-08-10",
    },
  }));
  unwrap(await annualService.submit({
    leaveId: annual.id,
    requestKey: "F20-ANNUAL-SUBMIT",
    scope: accountingScope,
  }));
  unwrap(await annualService.approve({
    leaveId: annual.id,
    requestKey: "F20-ANNUAL-APPROVE",
    scope: adminScope,
  }));

  const excuseService = serviceFor(2);
  const excuse = unwrap(await excuseService.create({
    scope: accountingScope,
    values: {
      chargeableDays: 1,
      documentFileId: null,
      endDate: "2026-09-01",
      leaveType: "EXCUSE",
      note: "F20 kabul mazeret ayrıntısı audit dışıdır.",
      personnelCode: "F20-PER-002",
      personnelName: "F20 Mehmet Kaya",
      requestKey: "F20-EXCUSE-CREATE",
      startDate: "2026-09-01",
    },
  })).leave;
  unwrap(await excuseService.submit({
    leaveId: excuse.id,
    requestKey: "F20-EXCUSE-SUBMIT",
    scope: accountingScope,
  }));
  unwrap(await excuseService.reject({
    leaveId: excuse.id,
    requestKey: "F20-EXCUSE-REJECT",
    scope: adminScope,
  }));

  const unpaidService = serviceFor(3);
  const unpaid = unwrap(await unpaidService.create({
    scope: accountingScope,
    values: {
      chargeableDays: 2,
      documentFileId: null,
      endDate: "2026-10-06",
      leaveType: "UNPAID",
      note: "F20 kabul ücretsiz izin ayrıntısı audit dışıdır.",
      personnelCode: "F20-PER-002",
      personnelName: "F20 Mehmet Kaya",
      requestKey: "F20-UNPAID-CREATE",
      startDate: "2026-10-05",
    },
  })).leave;
  unwrap(await unpaidService.submit({
    leaveId: unpaid.id,
    requestKey: "F20-UNPAID-SUBMIT",
    scope: accountingScope,
  }));
  unwrap(await unpaidService.approve({
    leaveId: unpaid.id,
    requestKey: "F20-UNPAID-APPROVE",
    scope: adminScope,
  }));
  unwrap(await unpaidService.cancel({
    leaveId: unpaid.id,
    requestKey: "F20-UNPAID-CANCEL",
    scope: adminScope,
  }));

  const overlapService = serviceFor(4);
  const overlap = unwrap(await overlapService.create({
    scope: accountingScope,
    values: {
      chargeableDays: 1,
      documentFileId: null,
      endDate: "2026-08-11",
      leaveType: "SICK",
      note: "Sağlık ayrıntısı tutulmaz ve audit dışıdır.",
      personnelCode: "F20-PER-001",
      personnelName: "F20 Ayşe Demir",
      requestKey: "F20-OVERLAP-CREATE",
      startDate: "2026-08-11",
    },
  })).leave;
  const overlapDenied = await overlapService.submit({
    leaveId: overlap.id,
    requestKey: "F20-OVERLAP-SUBMIT",
    scope: accountingScope,
  });
  assert(!overlapDenied.ok, "Çakışan izin onaya gönderilememelidir.");

  const auditBeforeRetry = await countAudit();
  assert(unwrap(await serviceFor(90).saveBalance({
    scope: adminScope,
    values: {
      adjustmentDays: 0,
      openingDays: 14,
      personnelCode: "F20-PER-001",
      personnelName: "F20 Ayşe Demir",
      requestKey: "F20-BALANCE-SAVE",
      year: 2026,
    },
  })).idempotent, "Bakiye tekrarı idempotent olmalıdır.");
  assert(unwrap(await annualService.create({
    scope: accountingScope,
    values: {
      chargeableDays: 3,
      documentFileId: null,
      endDate: "2026-08-12",
      leaveType: "ANNUAL",
      note: "F20 kabul yıllık izin açıklaması audit dışı kalır.",
      personnelCode: "F20-PER-001",
      personnelName: "F20 Ayşe Demir",
      requestKey: "F20-ANNUAL-CREATE",
      startDate: "2026-08-10",
    },
  })).idempotent, "İzin oluşturma tekrarı idempotent olmalıdır.");
  assert(unwrap(await annualService.approve({
    leaveId: annual.id,
    requestKey: "F20-ANNUAL-APPROVE",
    scope: adminScope,
  })).idempotent, "İzin onay tekrarı idempotent olmalıdır.");
  assert(await countAudit() === auditBeforeRetry, "Retry audit kaydını çoğaltmamalıdır.");

  await verifyAcceptance({
    annualId: annual.id,
    balanceId: balanceResult.balance.id,
    overlapId: overlap.id,
  });
}

async function ensureAcceptanceScope() {
  const tenant = await prisma.tenant.findUnique({
    select: { id: true },
    where: { id: base.tenantId },
  });
  assert(tenant, "F20 kabul tenant'ı bulunamadı.");
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
    ["F20-PER-001", "F20 Ayşe Demir"],
    ["F20-PER-002", "F20 Mehmet Kaya"],
  ] as const) {
    await prisma.entityRecord.upsert({
      create: {
        ...scopeFields(),
        code,
        createdBy: adminScope.userId,
        data: { name, status: "Aktif" },
        slug: "personel",
        updatedBy: adminScope.userId,
      },
      update: {
        data: { name, status: "Aktif" },
        updatedBy: adminScope.userId,
      },
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
        id: `scope-f20-kabul-${suffix}-20260730`,
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
        id: `session-f20-kabul-${suffix}-20260730`,
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
      where: { id: `session-f20-kabul-${suffix}-20260730` },
    });
  }
}

async function verifyAcceptance(input: {
  annualId: string;
  balanceId: string;
  overlapId: string;
}) {
  const overview = unwrap(await serviceFor(99).list({ scope: adminScope }));
  assert(overview.leaves.length === 4, "Kabul kapsamında dört izin olmalıdır.");
  assert(overview.balances.length === 1, "Kabul kapsamında tek bakiye olmalıdır.");
  assert(overview.balances[0]?.id === input.balanceId, "Kabul bakiyesi sabit kimliği korumalıdır.");
  assert(overview.balances[0]?.usedDays === 3, "Onaylı yıllık izin üç gün kullanmalıdır.");
  assert(
    overview.leaves.find((row) => row.id === input.annualId)?.status === "APPROVED",
    "Yıllık izin onaylı olmalıdır.",
  );
  assert(
    overview.leaves.find((row) => row.id === input.overlapId)?.status === "DRAFT",
    "Çakışan izin taslak kalmalıdır.",
  );
  const foreign = {
    ...viewerScope,
    companyId: "company-demo-insaat",
    periodId: "period-2026",
  };
  assert(
    !(await serviceFor(99).get({ leaveId: input.annualId, scope: foreign })).ok,
    "Yanlış scope izin kaydını okuyamamalıdır.",
  );
  assert(
    !(await serviceFor(99).approve({
      leaveId: input.overlapId,
      requestKey: "F20-VIEWER-DENIED",
      scope: viewerScope,
    })).ok,
    "Viewer izin onaylayamamalıdır.",
  );
  assert(
    !(await serviceFor(99).saveBalance({
      scope: accountingScope,
      values: {
        adjustmentDays: 0,
        openingDays: 14,
        personnelCode: "F20-PER-001",
        personnelName: "F20 Ayşe Demir",
        requestKey: "F20-ACCOUNTING-BALANCE-DENIED",
        year: 2026,
      },
    })).ok,
    "Muhasebe bakiye değiştirememelidir.",
  );
  assert(
    !(await serviceFor(99).cancel({
      leaveId: input.annualId,
      requestKey: "F20-CLOSED-DENIED",
      scope: { ...adminScope, periodClosed: true },
    })).ok,
    "Kapalı dönem mutasyonu reddedilmelidir.",
  );

  const audits = await prisma.auditLog.findMany({
    orderBy: [{ occurredAt: "asc" }, { action: "asc" }],
    select: { action: true, entityId: true, entityLabel: true, metadata: true },
    where: {
      ...scopeFields(),
      action: { startsWith: "employee-leave." },
    },
  });
  assert(audits.length === 13, "F20 kabulü tam olarak on üç audit kaydı taşımalıdır.");
  assert(audits.every((row) => row.entityId === row.entityLabel), "Audit etiketi teknik kimlik olmalıdır.");
  assert(audits.every((row) => !containsSensitiveDetail(row)), "Audit açıklama, sağlık detayı veya request key taşımamalıdır.");

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
    "İzin kabulü bildirim/finans/stok/bordro/puantaj yan etkisi üretmemelidir.",
  );

  console.log(JSON.stringify({
    audit: { actions: audits.map((row) => row.action).sort(), count: audits.length },
    isolation: {
      accountingBalanceRejected: true,
      closedPeriodRejected: true,
      foreignScopeRejected: true,
      overlapRejected: true,
      viewerWriteRejected: true,
    },
    ok: true,
    records: {
      balanceRemainingDays:
        overview.balances[0]!.openingDays
        + overview.balances[0]!.adjustmentDays
        - overview.balances[0]!.usedDays,
      balanceUsedDays: overview.balances[0]!.usedDays,
      leaveCount: overview.leaves.length,
      statuses: overview.leaves.map((row) => row.status).sort(),
    },
    scope: scopeFields(),
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

function leaveId(sequence: number) {
  return `F20-KABUL-20260730::employee-leave::${String(sequence).padStart(3, "0")}`;
}
function balanceId(sequence: number) {
  return `F20-KABUL-20260730::employee-leave-balance::${String(sequence).padStart(3, "0")}`;
}
function scopeFields() {
  return { companyId: base.companyId, periodId: base.periodId, tenantId: base.tenantId };
}
async function countAudit() {
  return prisma.auditLog.count({
    where: { ...scopeFields(), action: { startsWith: "employee-leave." } },
  });
}
function containsSensitiveDetail(value: unknown) {
  const serialized = JSON.stringify(value).toLocaleLowerCase("tr-TR");
  return serialized.includes("kabul yıllık izin")
    || serialized.includes("mazeret ayrıntısı")
    || serialized.includes("ücretsiz izin ayrıntısı")
    || serialized.includes("sağlık ayrıntısı")
    || serialized.includes("f20-annual")
    || serialized.includes("f20-excuse")
    || serialized.includes("f20-unpaid")
    || serialized.includes("f20-overlap")
    || serialized.includes("f20-balance");
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
