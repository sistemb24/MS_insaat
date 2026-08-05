import "dotenv/config";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "../src/lib/audit-log-prisma-repository";
import {
  createCustomerTypePrismaRepository,
  type CustomerTypePrismaClientLike,
} from "../src/lib/customer-type-prisma-repository";
import { createCustomerTypeService } from "../src/lib/customer-type-service";
import { prisma } from "../src/lib/prisma";
import type { TenantScope } from "../src/lib/tenant-scope";

const base = {
  companyId: "company-f29-kabul-20260731",
  companyName: "F29 Müşteri Tipi Kabul Şirketi",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-f29-kabul-20260731",
  periodLabel: "F29 Kabul 2026",
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
};
const adminScope: TenantScope = {
  ...base,
  userId: "user-ahmet",
  userName: "F29 Müşteri Tipi Yöneticisi",
  userRole: "admin",
};
const accountingScope: TenantScope = {
  ...base,
  userId: "user-main",
  userName: "F29 Muhasebe Kullanıcısı",
  userRole: "accounting",
};
const viewerScope: TenantScope = {
  ...base,
  userId: "user-viewer",
  userName: "F29 Salt Okur",
  userRole: "viewer",
};
const repository = createCustomerTypePrismaRepository(
  prisma as unknown as CustomerTypePrismaClientLike,
);
const service = createCustomerTypeService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  now: () => "2026-07-31T22:00:00.000Z",
  repository,
});

async function main() {
  await ensureScope();
  await prisma.auditLog.deleteMany({
    where: { ...periodScopeFields(), entityType: "customer-type" },
  });
  await prisma.customerType.deleteMany({ where: companyScopeFields() });
  await prisma.entityRecord.deleteMany({ where: companyScopeFields() });
  await seedCustomerUsage();

  const operationalBefore = await operationalCounts();
  const customerRecordsBefore = await customerRecordSnapshot();
  const initial = unwrap(await service.list({ scope: adminScope })).customerTypes;
  const discovered = initial.find(
    (row) => row.normalizedName === "kamu iştiraki",
  );
  assert(
    discovered?.source === "existing-record" && discovered.usageCount === 2,
    "Mevcut müşteri tipi iki dönemden federatif keşfedilmelidir.",
  );

  const corporateValues = {
    description: "Kurumsal müşteri kartları",
    expectedRevisionNo: 0,
    name: "Kurumsal",
    requestKey: "F29-CUSTOMER-TYPE-CORPORATE-1",
  };
  const corporate = unwrap(
    await service.save({
      scope: { ...adminScope, periodClosed: true },
      values: corporateValues,
    }),
  );
  assert(corporate.customerType.revisionNo === 1, "İlk revizyon 1 olmalıdır.");
  const retry = unwrap(
    await service.save({
      scope: { ...adminScope, periodClosed: true },
      values: corporateValues,
    }),
  );
  assert(retry.idempotent, "Aynı request key idempotent olmalıdır.");

  const publicAffiliate = unwrap(
    await service.save({
      scope: adminScope,
      values: {
        description: "Federatif değerin yönetilen karşılığı",
        expectedRevisionNo: 0,
        name: "Kamu İştiraki",
        requestKey: "F29-CUSTOMER-TYPE-PUBLIC-1",
      },
    }),
  );
  assert(
    !(await service.save({
      scope: adminScope,
      values: {
        description: "Tekrar",
        expectedRevisionNo: 0,
        name: "  kamu   iştiraki ",
        requestKey: "F29-CUSTOMER-TYPE-DUPLICATE",
      },
    })).ok,
    "Normalize tekrar müşteri tipi reddedilmelidir.",
  );
  for (const deniedScope of [accountingScope, viewerScope]) {
    assert(
      !(await service.save({
        scope: deniedScope,
        values: {
          description: "",
          expectedRevisionNo: 0,
          name: `Yetkisiz ${deniedScope.userRole}`,
          requestKey: `F29-DENIED-${deniedScope.userRole}`,
        },
      })).ok,
      `${deniedScope.userRole} müşteri tipi yazamamalıdır.`,
    );
  }
  assert(
    !(await service.save({
      scope: adminScope,
      values: {
        description: "Eski revizyon",
        expectedRevisionNo: 0,
        id: publicAffiliate.customerType.id,
        name: "Kamu İştiraki",
        requestKey: "F29-STALE",
      },
    })).ok,
    "Eski revizyon reddedilmelidir.",
  );
  const inactive = unwrap(
    await service.changeStatus({
      scope: adminScope,
      values: {
        expectedRevisionNo: publicAffiliate.customerType.revisionNo,
        id: publicAffiliate.customerType.id,
        requestKey: "F29-CUSTOMER-TYPE-PUBLIC-INACTIVE",
        status: "INACTIVE",
      },
    }),
  );
  assert(inactive.customerType.revisionNo === 2, "Durum değişimi revizyonu artırmalıdır.");

  const finalDirectory = unwrap(
    await service.list({ scope: adminScope }),
  ).customerTypes;
  const finalPublicAffiliate = finalDirectory.find(
    (row) => row.id === publicAffiliate.customerType.id,
  );
  assert(
    finalPublicAffiliate?.source === "managed" &&
      finalPublicAffiliate.status === "INACTIVE" &&
      finalPublicAffiliate.usageCount === 2,
    "Yönetilen tip keşfedilmiş değerin kullanımını korumalıdır.",
  );
  const foreign = unwrap(
    await service.list({
      scope: {
        ...adminScope,
        companyId: "company-f29-foreign-20260731",
        companyName: "F29 Yabancı Şirket",
      },
    }),
  ).customerTypes;
  assert(foreign.length === 0, "Müşteri tipleri yabancı firmaya sızmamalıdır.");

  const audits = await prisma.auditLog.findMany({
    where: { ...periodScopeFields(), entityType: "customer-type" },
  });
  assert(audits.length === 3, "Üç başarılı mutation üç audit üretmelidir.");
  const auditJson = JSON.stringify(audits.map((row) => row.metadata));
  for (const sensitive of [
    corporateValues.description,
    corporateValues.name,
    corporateValues.requestKey,
    "Kamu İştiraki",
    "F29-CUSTOMER-TYPE-PUBLIC-INACTIVE",
  ]) {
    assert(!auditJson.includes(sensitive), "Audit tip içeriği veya request key taşımamalıdır.");
  }
  assert(
    JSON.stringify(await customerRecordSnapshot()) ===
      JSON.stringify(customerRecordsBefore),
    "Sözlük yönetimi mevcut müşteri kayıtlarını değiştirmemelidir.",
  );
  assert(
    JSON.stringify(await operationalCounts()) === JSON.stringify(operationalBefore),
    "Sözlük yönetimi operasyonel yan etki üretmemelidir.",
  );

  console.log(JSON.stringify({
    auditCount: audits.length,
    companyId: base.companyId,
    customerRecordSideEffects: 0,
    discoveredUsageCount: finalPublicAffiliate.usageCount,
    managedCustomerTypeCount: finalDirectory.filter(
      (row) => row.source === "managed",
    ).length,
    operationalSideEffects: 0,
    periodIndependentDiscovery: true,
    sensitiveAuditValues: 0,
    status: "PASS",
  }, null, 2));
}

async function ensureScope() {
  const tenant = await prisma.tenant.findUnique({
    select: { id: true },
    where: { id: base.tenantId },
  });
  assert(tenant, "F29 kabul tenant'ı bulunamadı.");
  for (const company of [
    { id: base.companyId, name: base.companyName },
    { id: "company-f29-foreign-20260731", name: "F29 Yabancı Şirket" },
  ]) {
    await prisma.company.upsert({
      create: { ...company, tenantId: base.tenantId },
      update: { name: company.name },
      where: { id: company.id },
    });
  }
  for (const period of [
    { companyId: base.companyId, id: base.periodId, label: base.periodLabel },
    {
      companyId: base.companyId,
      id: "period-f29-previous-20260731",
      label: "F29 Önceki Dönem",
    },
  ]) {
    await prisma.period.upsert({
      create: { ...period, isClosed: false, tenantId: base.tenantId },
      update: { isClosed: false, label: period.label },
      where: { id: period.id },
    });
  }
  for (const [scope, suffix] of [
    [adminScope, "admin"],
    [accountingScope, "accounting"],
    [viewerScope, "viewer"],
  ] as const) {
    await prisma.appUserScopeAccess.upsert({
      create: {
        ...periodScopeFields(),
        id: `scope-f29-kabul-${suffix}-20260731`,
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
        ...periodScopeFields(),
        id: `session-f29-kabul-${suffix}-20260731`,
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
      where: { id: `session-f29-kabul-${suffix}-20260731` },
    });
  }
}

async function seedCustomerUsage() {
  for (const [periodId, code] of [
    [base.periodId, "MUS-F29-01"],
    ["period-f29-previous-20260731", "MUS-F29-02"],
  ] as const) {
    await prisma.entityRecord.create({
      data: {
        companyId: base.companyId,
        code,
        createdBy: adminScope.userId,
        data: {
          balance: "0,00 TL",
          code,
          customerType: "Kamu İştiraki",
          name: `${code} Kabul Müşterisi`,
          status: "Aktif",
        },
        periodId,
        slug: "musteriler",
        tenantId: base.tenantId,
        updatedBy: adminScope.userId,
      },
    });
  }
}

function operationalCounts() {
  return Promise.all([
    prisma.expense.count({ where: companyScopeFields() }),
    prisma.salesInvoice.count({ where: companyScopeFields() }),
    prisma.cashBankMovement.count({ where: companyScopeFields() }),
    prisma.ledgerEntry.count({ where: companyScopeFields() }),
    prisma.stockMovement.count({ where: companyScopeFields() }),
  ]);
}

function customerRecordSnapshot() {
  return prisma.entityRecord.findMany({
    orderBy: [{ periodId: "asc" }, { code: "asc" }],
    select: { code: true, data: true, periodId: true, updatedAt: true },
    where: { ...companyScopeFields(), slug: "musteriler" },
  });
}

function companyScopeFields() {
  return { companyId: base.companyId, tenantId: base.tenantId };
}

function periodScopeFields() {
  return { ...companyScopeFields(), periodId: base.periodId };
}

function unwrap<T>(
  result: { data: T; ok: true } | { errors: string[]; ok: false },
) {
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
