import "dotenv/config";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "../src/lib/audit-log-prisma-repository";
import {
  createSupplierCategoryPrismaRepository,
  type SupplierCategoryPrismaClientLike,
} from "../src/lib/supplier-category-prisma-repository";
import { createSupplierCategoryService } from "../src/lib/supplier-category-service";
import { prisma } from "../src/lib/prisma";
import type { TenantScope } from "../src/lib/tenant-scope";

const base = {
  companyId: "company-f28-kabul-20260731",
  companyName: "F28 Tedarikçi Kategori Kabul Şirketi",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-f28-kabul-20260731",
  periodLabel: "F28 Kabul 2026",
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
};
const adminScope: TenantScope = {
  ...base,
  userId: "user-ahmet",
  userName: "F28 Kategori Yöneticisi",
  userRole: "admin",
};
const accountingScope: TenantScope = {
  ...base,
  userId: "user-main",
  userName: "F28 Muhasebe Kullanıcısı",
  userRole: "accounting",
};
const viewerScope: TenantScope = {
  ...base,
  userId: "user-viewer",
  userName: "F28 Salt Okur",
  userRole: "viewer",
};
const repository = createSupplierCategoryPrismaRepository(
  prisma as unknown as SupplierCategoryPrismaClientLike,
);
const service = createSupplierCategoryService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  now: () => "2026-07-31T21:00:00.000Z",
  repository,
});

async function main() {
  await ensureScope();
  await prisma.auditLog.deleteMany({
    where: { ...periodScopeFields(), entityType: "supplier-category" },
  });
  await prisma.supplierCategory.deleteMany({ where: companyScopeFields() });
  await prisma.entityRecord.deleteMany({ where: companyScopeFields() });
  await seedSupplierUsage();

  const operationalBefore = await operationalCounts();
  const supplierRecordsBefore = await supplierRecordSnapshot();
  const initial = unwrap(await service.list({ scope: adminScope })).categories;
  const discovered = initial.find((row) => row.normalizedName === "hazır beton");
  assert(
    discovered?.source === "existing-record" && discovered.usageCount === 2,
    "Mevcut tedarikçi kategorisi iki dönemden federatif keşfedilmelidir.",
  );

  const materialValues = {
    description: "Malzeme tedarikçileri",
    expectedRevisionNo: 0,
    name: "Malzeme",
    requestKey: "F28-CATEGORY-MATERIAL-1",
  };
  const material = unwrap(
    await service.save({
      scope: { ...adminScope, periodClosed: true },
      values: materialValues,
    }),
  );
  assert(material.category.revisionNo === 1, "İlk kategori revizyonu 1 olmalıdır.");
  const retry = unwrap(
    await service.save({
      scope: { ...adminScope, periodClosed: true },
      values: materialValues,
    }),
  );
  assert(retry.idempotent, "Aynı request key idempotent olmalıdır.");

  const concrete = unwrap(
    await service.save({
      scope: adminScope,
      values: {
        description: "Federatif değerin yönetilen karşılığı",
        expectedRevisionNo: 0,
        name: "Hazır Beton",
        requestKey: "F28-CATEGORY-CONCRETE-1",
      },
    }),
  );
  assert(
    !(await service.save({
      scope: adminScope,
      values: {
        description: "Tekrar",
        expectedRevisionNo: 0,
        name: "  hazır   beton ",
        requestKey: "F28-CATEGORY-DUPLICATE",
      },
    })).ok,
    "Normalize tekrar kategori reddedilmelidir.",
  );
  for (const deniedScope of [accountingScope, viewerScope]) {
    assert(
      !(await service.save({
        scope: deniedScope,
        values: {
          description: "",
          expectedRevisionNo: 0,
          name: `Yetkisiz ${deniedScope.userRole}`,
          requestKey: `F28-DENIED-${deniedScope.userRole}`,
        },
      })).ok,
      `${deniedScope.userRole} kategori yazamamalıdır.`,
    );
  }
  assert(
    !(await service.save({
      scope: adminScope,
      values: {
        description: "Eski revizyon",
        expectedRevisionNo: 0,
        id: concrete.category.id,
        name: "Hazır Beton",
        requestKey: "F28-STALE",
      },
    })).ok,
    "Eski revizyon reddedilmelidir.",
  );
  const inactive = unwrap(
    await service.changeStatus({
      scope: adminScope,
      values: {
        expectedRevisionNo: concrete.category.revisionNo,
        id: concrete.category.id,
        requestKey: "F28-CATEGORY-CONCRETE-INACTIVE",
        status: "INACTIVE",
      },
    }),
  );
  assert(inactive.category.revisionNo === 2, "Durum değişimi revizyonu artırmalıdır.");

  const finalDirectory = unwrap(await service.list({ scope: adminScope })).categories;
  const finalConcrete = finalDirectory.find((row) => row.id === concrete.category.id);
  assert(
    finalConcrete?.source === "managed" &&
      finalConcrete.status === "INACTIVE" &&
      finalConcrete.usageCount === 2,
    "Yönetilen kategori keşfedilmiş değerin kullanımını korumalıdır.",
  );
  const foreign = unwrap(
    await service.list({
      scope: {
        ...adminScope,
        companyId: "company-f28-foreign-20260731",
        companyName: "F28 Yabancı Şirket",
      },
    }),
  ).categories;
  assert(foreign.length === 0, "Kategoriler yabancı firmaya sızmamalıdır.");

  const audits = await prisma.auditLog.findMany({
    where: { ...periodScopeFields(), entityType: "supplier-category" },
  });
  assert(audits.length === 3, "Üç başarılı mutation üç audit üretmelidir.");
  const auditJson = JSON.stringify(audits.map((row) => row.metadata));
  for (const sensitive of [
    materialValues.description,
    materialValues.name,
    materialValues.requestKey,
    "Hazır Beton",
    "F28-CATEGORY-CONCRETE-INACTIVE",
  ]) {
    assert(!auditJson.includes(sensitive), "Audit kategori içeriği veya request key taşımamalıdır.");
  }
  assert(
    JSON.stringify(await supplierRecordSnapshot()) === JSON.stringify(supplierRecordsBefore),
    "Kategori yönetimi mevcut tedarikçi kayıtlarını değiştirmemelidir.",
  );
  assert(
    JSON.stringify(await operationalCounts()) === JSON.stringify(operationalBefore),
    "Kategori yönetimi operasyonel yan etki üretmemelidir.",
  );

  console.log(JSON.stringify({
    auditCount: audits.length,
    companyId: base.companyId,
    discoveredUsageCount: finalConcrete.usageCount,
    managedCategoryCount: finalDirectory.filter((row) => row.source === "managed").length,
    operationalSideEffects: 0,
    periodIndependentDiscovery: true,
    sensitiveAuditValues: 0,
    status: "PASS",
    supplierRecordSideEffects: 0,
  }, null, 2));
}

async function ensureScope() {
  const tenant = await prisma.tenant.findUnique({
    select: { id: true },
    where: { id: base.tenantId },
  });
  assert(tenant, "F28 kabul tenant'ı bulunamadı.");
  for (const company of [
    { id: base.companyId, name: base.companyName },
    { id: "company-f28-foreign-20260731", name: "F28 Yabancı Şirket" },
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
      id: "period-f28-previous-20260731",
      label: "F28 Önceki Dönem",
    },
  ]) {
    await prisma.period.upsert({
      create: {
        ...period,
        isClosed: false,
        tenantId: base.tenantId,
      },
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
        id: `scope-f28-kabul-${suffix}-20260731`,
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
        id: `session-f28-kabul-${suffix}-20260731`,
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
      where: { id: `session-f28-kabul-${suffix}-20260731` },
    });
  }
}

async function seedSupplierUsage() {
  for (const [periodId, code] of [
    [base.periodId, "TED-F28-01"],
    ["period-f28-previous-20260731", "TED-F28-02"],
  ] as const) {
    await prisma.entityRecord.create({
      data: {
        companyId: base.companyId,
        code,
        createdBy: adminScope.userId,
        data: {
          balance: "0,00 TL",
          category: "Hazır Beton",
          code,
          name: `${code} Kabul Tedarikçisi`,
          status: "Aktif",
        },
        periodId,
        slug: "tedarikciler",
        tenantId: base.tenantId,
        updatedBy: adminScope.userId,
      },
    });
  }
}

function operationalCounts() {
  return Promise.all([
    prisma.expense.count({ where: companyScopeFields() }),
    prisma.purchaseInvoice.count({ where: companyScopeFields() }),
    prisma.cashBankMovement.count({ where: companyScopeFields() }),
    prisma.ledgerEntry.count({ where: companyScopeFields() }),
    prisma.stockMovement.count({ where: companyScopeFields() }),
  ]);
}

function supplierRecordSnapshot() {
  return prisma.entityRecord.findMany({
    orderBy: [{ periodId: "asc" }, { code: "asc" }],
    select: { code: true, data: true, periodId: true, updatedAt: true },
    where: { ...companyScopeFields(), slug: "tedarikciler" },
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
