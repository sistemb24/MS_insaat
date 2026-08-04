import "dotenv/config";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "../src/lib/audit-log-prisma-repository";
import {
  createFinanceSettingsPrismaRepository,
  type FinanceSettingsPrismaClientLike,
} from "../src/lib/finance-settings-prisma-repository";
import { createFinanceSettingsService } from "../src/lib/finance-settings-service";
import { prisma } from "../src/lib/prisma";
import type { TenantScope } from "../src/lib/tenant-scope";

const base = {
  companyId: "company-f24-kabul-20260730",
  companyName: "F24 Finans Ayarları Kabul Şirketi",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-f24-kabul-20260730",
  periodLabel: "F24 Kabul 2026",
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
};
const adminScope: TenantScope = {
  ...base,
  userId: "user-ahmet",
  userName: "F24 Finans Yöneticisi",
  userRole: "admin",
};
const accountingScope: TenantScope = {
  ...base,
  userId: "user-main",
  userName: "F24 Muhasebe Kullanıcısı",
  userRole: "accounting",
};
const viewerScope: TenantScope = {
  ...base,
  userId: "user-viewer",
  userName: "F24 Salt Okur",
  userRole: "viewer",
};
const timestamp = "2026-07-30T19:00:00.000Z";
const service = createFinanceSettingsService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  now: () => timestamp,
  repository: createFinanceSettingsPrismaRepository(
    prisma as unknown as FinanceSettingsPrismaClientLike,
  ),
});

async function main() {
  await ensureScope();
  await prisma.auditLog.deleteMany({
    where: { ...scopeFields(), entityType: "finance-settings" },
  });
  await prisma.financeSetting.deleteMany({ where: scopeFields() });

  const operationalBefore = await operationalCounts();
  const fallback = unwrap(await service.get({ scope: adminScope })).settings;
  assert(fallback.source === "fallback", "İlk okuma fallback olmalıdır.");
  assert(fallback.defaultVatRate === 20, "Fallback KDV oranı %20 olmalıdır.");

  const values = {
    defaultVatRate: 18,
    expectedRevisionNo: 0,
    requestKey: "F24-FINANCE-SAVE-1",
    showVatBreakdown: false,
  };
  const saved = unwrap(await service.save({ scope: adminScope, values }));
  assert(!saved.idempotent, "İlk yazım idempotent olmamalıdır.");
  assert(saved.settings.revisionNo === 1, "İlk kalıcı revizyon 1 olmalıdır.");
  assert(saved.settings.defaultVatRate === 18, "Kalıcı KDV oranı %18 olmalıdır.");

  const retry = unwrap(await service.save({ scope: adminScope, values }));
  assert(retry.idempotent, "Aynı işlem anahtarı idempotent olmalıdır.");
  assert(
    (await auditCount()) === 1,
    "İlk yazım ve retry toplamda tek audit üretmelidir.",
  );

  assert(
    !(await service.save({
      scope: adminScope,
      values: { ...values, requestKey: "F24-STALE-SAVE" },
    })).ok,
    "Eski revizyonla yazım reddedilmelidir.",
  );
  assert(
    !(await service.save({
      scope: accountingScope,
      values: { ...values, expectedRevisionNo: 1, requestKey: "F24-ACCOUNTING" },
    })).ok,
    "Muhasebe rolü yazamamalıdır.",
  );
  assert(
    !(await service.save({
      scope: viewerScope,
      values: { ...values, expectedRevisionNo: 1, requestKey: "F24-VIEWER" },
    })).ok,
    "Viewer rolü yazamamalıdır.",
  );
  assert(
    !(await service.save({
      scope: { ...adminScope, periodClosed: true },
      values: { ...values, expectedRevisionNo: 1, requestKey: "F24-CLOSED" },
    })).ok,
    "Kapalı dönemde yönetici yazamamalıdır.",
  );

  const foreign = unwrap(
    await service.get({
      scope: {
        ...adminScope,
        companyId: "company-demo-insaat",
        periodId: "period-2026",
      },
    }),
  ).settings;
  assert(
    foreign.defaultVatRate !== 18 || foreign.source === "fallback",
    "F24 ayarı yabancı kapsama sızmamalıdır.",
  );
  assert(
    JSON.stringify(await operationalCounts()) === JSON.stringify(operationalBefore),
    "Finans ayarı yazımı operasyonel kayıtlarda yan etki üretmemelidir.",
  );

  const audit = await prisma.auditLog.findFirst({
    where: { ...scopeFields(), entityType: "finance-settings" },
  });
  const auditJson = JSON.stringify(audit?.metadata ?? {});
  assert(!auditJson.includes("F24-FINANCE-SAVE-1"), "Audit işlem anahtarı içermemelidir.");

  console.log(
    JSON.stringify(
      {
        auditCount: await auditCount(),
        companyId: base.companyId,
        defaultVatRate: saved.settings.defaultVatRate,
        operationalSideEffects: 0,
        periodId: base.periodId,
        revisionNo: saved.settings.revisionNo,
        showVatBreakdown: saved.settings.showVatBreakdown,
        status: "PASS",
      },
      null,
      2,
    ),
  );
}

async function ensureScope() {
  const tenant = await prisma.tenant.findUnique({
    select: { id: true },
    where: { id: base.tenantId },
  });
  assert(tenant, "F24 kabul tenant'ı bulunamadı.");
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
  for (const [scope, suffix] of [
    [adminScope, "admin"],
    [accountingScope, "accounting"],
    [viewerScope, "viewer"],
  ] as const) {
    await prisma.appUserScopeAccess.upsert({
      create: {
        ...scopeFields(),
        id: `scope-f24-kabul-${suffix}-20260730`,
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
      where: {
        userId_companyId_periodId: {
          companyId: scope.companyId,
          periodId: scope.periodId,
          userId: scope.userId,
        },
      },
    });
    await prisma.appSession.upsert({
      create: {
        ...scopeFields(),
        id: `session-f24-kabul-${suffix}-20260730`,
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
      where: { id: `session-f24-kabul-${suffix}-20260730` },
    });
  }
}

async function operationalCounts() {
  return Promise.all([
    prisma.expense.count({ where: scopeFields() }),
    prisma.purchaseInvoice.count({ where: scopeFields() }),
    prisma.salesInvoice.count({ where: scopeFields() }),
    prisma.progressPayment.count({ where: scopeFields() }),
    prisma.cashBankMovement.count({ where: scopeFields() }),
    prisma.ledgerEntry.count({ where: scopeFields() }),
  ]);
}

function auditCount() {
  return prisma.auditLog.count({
    where: { ...scopeFields(), entityType: "finance-settings" },
  });
}

function scopeFields() {
  return {
    companyId: base.companyId,
    periodId: base.periodId,
    tenantId: base.tenantId,
  };
}

function unwrap<T>(result: { data: T; ok: true } | { errors: string[]; ok: false }) {
  if (!result.ok) throw new Error(result.errors.join(" "));
  return result.data;
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
