import "dotenv/config";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "../src/lib/audit-log-prisma-repository";
import { createEmployeeAdvancePrismaRepository } from "../src/lib/employee-advance-prisma-repository";
import { createEmployeeAdvanceService } from "../src/lib/employee-advance-service";
import { prisma } from "../src/lib/prisma";
import type { TenantScope } from "../src/lib/tenant-scope";

const base = {
  companyId: "company-f21-kabul-20260730",
  companyName: "F21 Personel Avans Kabul Şirketi",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-f21-kabul-20260730",
  periodLabel: "F21 Kabul 2026",
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
};
const adminScope: TenantScope = {
  ...base,
  userId: "user-ahmet",
  userName: "Avans Yöneticisi",
  userRole: "admin",
};
const accountingScope: TenantScope = {
  ...base,
  userId: "user-main",
  userName: "Avans Muhasebe Kullanıcısı",
  userRole: "accounting",
};
const viewerScope: TenantScope = {
  ...base,
  userId: "user-main",
  userName: "Avans Salt Okuru",
  userRole: "viewer",
};
const timestamp = "2026-07-30T12:00:00.000Z";
const repository = createEmployeeAdvancePrismaRepository(prisma);
const auditRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);

function serviceFor(sequence: number) {
  const counters = new Map<string, number>();
  return createEmployeeAdvanceService({
    auditLogRepository: auditRepository,
    createId: (_scope, entity) => {
      const next = (counters.get(entity) ?? 0) + 1;
      counters.set(entity, next);
      return `F21-KABUL-20260730::${String(sequence).padStart(3, "0")}::${entity}::${next}`;
    },
    now: () => timestamp,
    repository,
  });
}

async function main() {
  await ensureAcceptanceScope();

  const paidService = serviceFor(1);
  const paid = unwrap(await paidService.create({
    scope: accountingScope,
    values: {
      note: "F21 kabul özel avans açıklaması audit dışında kalır.",
      personnelCode: "F21-PER-001",
      personnelName: "F21 Ayşe Demir",
      requestDate: "2026-08-01",
      requestedAmount: 3000,
      requestKey: "F21-PAID-CREATE",
    },
  })).advance;
  const submitted = unwrap(await paidService.submit({
    advanceId: paid.id,
    requestKey: "F21-PAID-SUBMIT",
    scope: accountingScope,
  })).advance;
  const managed = unwrap(await paidService.managerApprove({
    advanceId: paid.id,
    requestKey: "F21-PAID-MANAGER",
    scope: adminScope,
  })).advance;
  const financed = unwrap(await paidService.financeApprove({
    scope: accountingScope,
    values: {
      advanceId: paid.id,
      approvedAmount: 3000,
      expectedRevisionNo: managed.revisionNo,
      requestKey: "F21-PAID-FINANCE",
    },
  })).advance;
  const paymentValues = {
    accountCode: "F21-KASA-001",
    accountName: "F21 Merkez Kasa",
    advanceId: paid.id,
    expectedRevisionNo: financed.revisionNo,
    paymentDate: "2026-08-02",
    requestKey: "F21-PAID-PAYMENT",
  };
  const payment = unwrap(await paidService.pay({
    scope: accountingScope,
    values: paymentValues,
  }));
  unwrap(await paidService.settle({
    scope: accountingScope,
    values: {
      advanceId: paid.id,
      amount: 1000,
      payrollAccrualId: payrollId(),
      payrollLinePersonCode: "F21-PER-001",
      requestKey: "F21-PAID-SETTLE-1",
      settlementDate: "2026-08-31",
    },
  }));
  const settled = unwrap(await paidService.settle({
    scope: accountingScope,
    values: {
      advanceId: paid.id,
      amount: 2000,
      payrollAccrualId: payrollId(),
      payrollLinePersonCode: "F21-PER-001",
      requestKey: "F21-PAID-SETTLE-2",
      settlementDate: "2026-08-31",
    },
  }));

  const rejectedService = serviceFor(2);
  const rejected = unwrap(await rejectedService.create({
    scope: accountingScope,
    values: {
      note: "F21 yönetici ret açıklaması audit dışında kalır.",
      personnelCode: "F21-PER-002",
      personnelName: "F21 Mehmet Kaya",
      requestDate: "2026-08-03",
      requestedAmount: 4500,
      requestKey: "F21-REJECT-CREATE",
    },
  })).advance;
  unwrap(await rejectedService.submit({
    advanceId: rejected.id,
    requestKey: "F21-REJECT-SUBMIT",
    scope: accountingScope,
  }));
  unwrap(await rejectedService.managerReject({
    advanceId: rejected.id,
    requestKey: "F21-REJECT-MANAGER",
    scope: adminScope,
  }));

  const cancelledService = serviceFor(3);
  const cancelled = unwrap(await cancelledService.create({
    scope: adminScope,
    values: {
      note: "F21 iptal açıklaması audit dışında kalır.",
      personnelCode: "F21-PER-002",
      personnelName: "F21 Mehmet Kaya",
      requestDate: "2026-08-04",
      requestedAmount: 2500,
      requestKey: "F21-CANCEL-CREATE",
    },
  })).advance;
  unwrap(await cancelledService.submit({
    advanceId: cancelled.id,
    requestKey: "F21-CANCEL-SUBMIT",
    scope: adminScope,
  }));
  const cancelManaged = unwrap(await cancelledService.managerApprove({
    advanceId: cancelled.id,
    requestKey: "F21-CANCEL-MANAGER",
    scope: adminScope,
  })).advance;
  const cancelFinanced = unwrap(await cancelledService.financeApprove({
    scope: accountingScope,
    values: {
      advanceId: cancelled.id,
      approvedAmount: 2000,
      expectedRevisionNo: cancelManaged.revisionNo,
      requestKey: "F21-CANCEL-FINANCE",
    },
  })).advance;
  unwrap(await cancelledService.cancel({
    advanceId: cancelled.id,
    requestKey: "F21-CANCEL",
    scope: accountingScope,
  }));

  const draftService = serviceFor(4);
  const draft = unwrap(await draftService.create({
    scope: adminScope,
    values: {
      note: "F21 taslak açıklaması audit dışında kalır.",
      personnelCode: "F21-PER-001",
      personnelName: "F21 Ayşe Demir",
      requestDate: "2026-08-05",
      requestedAmount: 1500,
      requestKey: "F21-DRAFT-CREATE",
    },
  })).advance;

  const auditBeforeRetry = await countAudit();
  assert(unwrap(await paidService.create({
    scope: accountingScope,
    values: {
      note: "F21 kabul özel avans açıklaması audit dışında kalır.",
      personnelCode: "F21-PER-001",
      personnelName: "F21 Ayşe Demir",
      requestDate: "2026-08-01",
      requestedAmount: 3000,
      requestKey: "F21-PAID-CREATE",
    },
  })).idempotent, "Avans oluşturma tekrarı idempotent olmalıdır.");
  assert(unwrap(await paidService.pay({
    scope: accountingScope,
    values: paymentValues,
  })).idempotent, "Ödeme tekrarı idempotent olmalıdır.");
  assert(unwrap(await paidService.settle({
    scope: accountingScope,
    values: {
      advanceId: paid.id,
      amount: 2000,
      payrollAccrualId: payrollId(),
      payrollLinePersonCode: "F21-PER-001",
      requestKey: "F21-PAID-SETTLE-2",
      settlementDate: "2026-08-31",
    },
  })).idempotent, "Mahsup tekrarı idempotent olmalıdır.");
  assert(await countAudit() === auditBeforeRetry, "Retry audit kaydını çoğaltmamalıdır.");

  await verifyAcceptance({
    cancelledId: cancelled.id,
    draftId: draft.id,
    paymentLedgerId: payment.advance.paymentLedgerEntryId!,
    paymentMovementId: payment.advance.paymentMovementId!,
    rejectedId: rejected.id,
    settledId: settled.advance.id,
  });

  void submitted;
  void financed;
  void cancelFinanced;
}

async function ensureAcceptanceScope() {
  const tenant = await prisma.tenant.findUnique({
    select: { id: true },
    where: { id: base.tenantId },
  });
  assert(tenant, "F21 kabul tenant'ı bulunamadı.");
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
  for (const [slug, code, name] of [
    ["personel", "F21-PER-001", "F21 Ayşe Demir"],
    ["personel", "F21-PER-002", "F21 Mehmet Kaya"],
    ["kasa-banka", "F21-KASA-001", "F21 Merkez Kasa"],
  ] as const) {
    await prisma.entityRecord.upsert({
      create: {
        ...scopeFields(),
        code,
        createdBy: adminScope.userId,
        data: { name, status: "Aktif" },
        slug,
        updatedBy: adminScope.userId,
      },
      update: { data: { name, status: "Aktif" }, updatedBy: adminScope.userId },
      where: {
        tenantId_companyId_periodId_slug_code: {
          ...scopeFields(),
          code,
          slug,
        },
      },
    });
  }
  const payroll = await prisma.payrollAccrual.findFirst({
    select: { id: true },
    where: { ...scopeFields(), id: payrollId() },
  });
  if (!payroll) {
    await prisma.payrollAccrual.create({
      data: {
        ...scopeFields(),
        createdAt: new Date(timestamp),
        createdBy: accountingScope.userId,
        deductionTotal: 3000,
        documentNo: "F21-BRD-2026-08",
        grossTotal: 13000,
        id: payrollId(),
        lineCount: 1,
        lines: {
          create: {
            advanceDeduction: 3000,
            debtDeduction: 0,
            deductionTotal: 3000,
            grossTotal: 13000,
            lineNo: 1,
            netTotal: 10000,
            overtimeHours: 0,
            personCode: "F21-PER-001",
            personName: "F21 Ayşe Demir",
            regularWorkedDays: 30,
          },
        },
        month: 8,
        netTotal: 10000,
        siteCode: "F21-SITE-001",
        siteName: "F21 Kabul Şantiyesi",
        sourceTimesheetId: "F21-TIMESHEET-001",
        sourceTimesheetNo: "F21-PNT-2026-08",
        status: "Kaydedildi",
        updatedAt: new Date(timestamp),
        updatedBy: accountingScope.userId,
        year: 2026,
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
        id: `scope-f21-kabul-${suffix}-20260730`,
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
        id: `session-f21-kabul-${suffix}-20260730`,
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
      where: { id: `session-f21-kabul-${suffix}-20260730` },
    });
  }
}

async function verifyAcceptance(input: {
  cancelledId: string;
  draftId: string;
  paymentLedgerId: string;
  paymentMovementId: string;
  rejectedId: string;
  settledId: string;
}) {
  const overview = unwrap(await serviceFor(99).list({ scope: adminScope }));
  assert(overview.advances.length === 4, "Kabul kapsamında dört avans olmalıdır.");
  assert(overview.settlements.length === 2, "Kabul kapsamında iki mahsup olmalıdır.");
  const statuses = new Map(overview.advances.map((row) => [row.id, row.status]));
  assert(statuses.get(input.settledId) === "SETTLED", "Ödenen avans kapanmalıdır.");
  assert(statuses.get(input.rejectedId) === "REJECTED", "Reddedilen avans korunmalıdır.");
  assert(statuses.get(input.cancelledId) === "CANCELLED", "İptal edilen avans korunmalıdır.");
  assert(statuses.get(input.draftId) === "DRAFT", "Taslak avans korunmalıdır.");

  const payment = overview.advances.find((row) => row.id === input.settledId)!;
  assert(payment.approvedAmount === 3000, "Finans onay tutarı 3.000 TL olmalıdır.");
  assert(payment.settledAmount === 3000, "Toplam mahsup 3.000 TL olmalıdır.");
  assert(payment.paymentMovementId === input.paymentMovementId, "Ödeme hareketi sabit kalmalıdır.");
  assert(payment.paymentLedgerEntryId === input.paymentLedgerId, "Yevmiye kaydı sabit kalmalıdır.");

  const [movement, ledger] = await Promise.all([
    prisma.cashBankMovement.findFirst({
      where: { ...scopeFields(), id: input.paymentMovementId },
    }),
    prisma.ledgerEntry.findFirst({
      include: { lines: true },
      where: { ...scopeFields(), id: input.paymentLedgerId },
    }),
  ]);
  assert(movement?.amount.toNumber() === 3000 && movement.direction === "Çıkış", "Tek 3.000 TL avans çıkışı bulunmalıdır.");
  assert(ledger?.debitTotal.toNumber() === 3000 && ledger.creditTotal.toNumber() === 3000, "Avans yevmiyesi dengeli olmalıdır.");
  assert(ledger?.lines.some((line) => line.accountCode === "135" && line.debit.toNumber() === 3000), "135 Personel Avansları borç satırı bulunmalıdır.");
  assert(ledger?.lines.some((line) => line.accountCode === "F21-KASA-001" && line.credit.toNumber() === 3000), "Kasa alacak satırı bulunmalıdır.");

  const payrollLine = await prisma.payrollAccrualLine.findFirst({
    where: { payrollAccrualId: payrollId(), personCode: "F21-PER-001" },
  });
  assert(payrollLine?.advanceDeduction.toNumber() === 3000, "Mevcut bordro kesintisi değişmemelidir.");

  const foreign = { ...viewerScope, companyId: "company-demo-insaat", periodId: "period-2026" };
  assert(!(await serviceFor(99).get({ advanceId: input.settledId, scope: foreign })).ok, "Yanlış scope avansı okuyamamalıdır.");
  assert(!(await serviceFor(99).managerApprove({ advanceId: input.draftId, requestKey: "F21-VIEWER-DENIED", scope: viewerScope })).ok, "Viewer yönetici kararı verememelidir.");
  assert(!(await serviceFor(99).pay({
    scope: adminScope,
    values: {
      accountCode: "F21-KASA-001",
      accountName: "F21 Merkez Kasa",
      advanceId: input.cancelledId,
      expectedRevisionNo: 5,
      paymentDate: "2026-08-10",
      requestKey: "F21-ADMIN-PAY-DENIED",
    },
  })).ok, "Admin finans ödemesi yapamamalıdır.");
  assert(!(await serviceFor(99).create({
    scope: { ...accountingScope, periodClosed: true },
    values: {
      note: "",
      personnelCode: "F21-PER-001",
      personnelName: "F21 Ayşe Demir",
      requestDate: "2026-08-10",
      requestedAmount: 1000,
      requestKey: "F21-CLOSED-DENIED",
    },
  })).ok, "Kapalı dönem mutasyonu reddedilmelidir.");

  const audits = await prisma.auditLog.findMany({
    orderBy: [{ occurredAt: "asc" }, { action: "asc" }],
    select: { action: true, entityId: true, entityLabel: true, metadata: true },
    where: { ...scopeFields(), action: { startsWith: "employee-advance." } },
  });
  assert(audits.length === 16, "F21 kabulü tam olarak on altı audit kaydı taşımalıdır.");
  assert(audits.every((row) => row.entityId === row.entityLabel), "Audit etiketi teknik kimlik olmalıdır.");
  assert(audits.every((row) => !containsSensitiveDetail(row)), "Audit açıklama, hesap adı veya request key taşımamalıdır.");

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
  assert(cashBankCount === 1 && ledgerCount === 1 && payrollCount === 1, "Yalnız beklenen ödeme, yevmiye ve kaynak bordro bulunmalıdır.");
  assert(expenseCount === 0 && notificationCount === 0 && stockCount === 0 && timesheetCount === 0, "Avans kabulü istenmeyen çapraz modül yan etkisi üretmemelidir.");

  console.log(JSON.stringify({
    audit: { actions: audits.map((row) => row.action).sort(), count: audits.length },
    finance: {
      cashBankCount,
      ledgerCount,
      paymentAmount: movement?.amount.toNumber(),
      payrollAdvanceDeduction: payrollLine?.advanceDeduction.toNumber(),
      settlementCount: overview.settlements.length,
    },
    isolation: {
      adminPaymentRejected: true,
      closedPeriodRejected: true,
      foreignScopeRejected: true,
      viewerWriteRejected: true,
    },
    ok: true,
    records: {
      advanceCount: overview.advances.length,
      settledAmount: payment.settledAmount,
      statuses: overview.advances.map((row) => row.status).sort(),
    },
    scope: scopeFields(),
    sideEffects: { expenseCount, notificationCount, stockCount, timesheetCount },
  }, null, 2));
}

function payrollId() {
  return "F21-KABUL-20260730::payroll::001";
}
function scopeFields() {
  return { companyId: base.companyId, periodId: base.periodId, tenantId: base.tenantId };
}
async function countAudit() {
  return prisma.auditLog.count({
    where: { ...scopeFields(), action: { startsWith: "employee-advance." } },
  });
}
function containsSensitiveDetail(value: unknown) {
  const serialized = JSON.stringify(value).toLocaleLowerCase("tr-TR");
  return serialized.includes("özel avans açıklaması")
    || serialized.includes("ret açıklaması")
    || serialized.includes("iptal açıklaması")
    || serialized.includes("taslak açıklaması")
    || serialized.includes("f21-paid")
    || serialized.includes("f21-reject")
    || serialized.includes("f21-cancel")
    || serialized.includes("f21-draft")
    || serialized.includes("f21 merkez kasa");
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
