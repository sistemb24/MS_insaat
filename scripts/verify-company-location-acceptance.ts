import "dotenv/config";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "../src/lib/audit-log-prisma-repository";
import {
  createCompanyLocationPrismaRepository,
  type CompanyLocationPrismaClientLike,
} from "../src/lib/company-location-prisma-repository";
import { createCompanyLocationService } from "../src/lib/company-location-service";
import { prisma } from "../src/lib/prisma";
import type { TenantScope } from "../src/lib/tenant-scope";

const base = {
  companyId: "company-f26-kabul-20260730",
  companyName: "F26 Lokasyon Dizini Kabul Şirketi",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-f26-kabul-20260730",
  periodLabel: "F26 Kabul 2026",
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
};
const adminScope: TenantScope = {
  ...base,
  userId: "user-ahmet",
  userName: "F26 Lokasyon Yöneticisi",
  userRole: "admin",
};
const accountingScope: TenantScope = {
  ...base,
  userId: "user-main",
  userName: "F26 Muhasebe Kullanıcısı",
  userRole: "accounting",
};
const viewerScope: TenantScope = {
  ...base,
  userId: "user-viewer",
  userName: "F26 Salt Okur",
  userRole: "viewer",
};
const service = createCompanyLocationService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  now: () => "2026-07-30T21:00:00.000Z",
  repository: createCompanyLocationPrismaRepository(
    prisma as unknown as CompanyLocationPrismaClientLike,
  ),
});
const headquarters = {
  addressLine: "Atatürk Bulvarı No: 26",
  city: "Ankara",
  code: "MRK-26",
  district: "Çankaya",
  email: "merkez@f26-kabul.example",
  expectedRevisionNo: 0,
  name: "F26 Ana Merkez",
  phone: "+90 312 555 26 26",
  postalCode: "06550",
  requestKey: "F26-LOCATION-HQ-1",
  responsiblePerson: "F26 Merkez Sorumlusu",
  status: "ACTIVE" as const,
  type: "HEADQUARTERS" as const,
};

async function main() {
  await ensureScope();
  await prisma.auditLog.deleteMany({
    where: { ...periodScopeFields(), entityType: "company-location" },
  });
  await prisma.companyLocation.deleteMany({ where: companyScopeFields() });
  await prisma.entityRecord.deleteMany({
    where: { ...periodScopeFields(), slug: "santiyeler" },
  });
  await prisma.entityRecord.create({
    data: {
      ...periodScopeFields(),
      code: "SANT-0026",
      createdBy: adminScope.userId,
      data: {
        code: "SANT-0026",
        name: "F26 Federatif Kabul Şantiyesi",
        responsible: "F26 Şantiye Sorumlusu",
        status: "Aktif",
      },
      slug: "santiyeler",
      updatedBy: adminScope.userId,
    },
  });

  const operationalBefore = await operationalCounts();
  const sessionBefore = await sessionSnapshot();
  const profileBefore = await prisma.companyProfile.findMany({
    where: companyScopeFields(),
  });

  const initial = unwrap(await service.list({ scope: adminScope })).locations;
  assert(initial.length === 1, "İlk dizin yalnız federatif şantiyeyi içermelidir.");
  assert(
    initial[0]?.source === "site-record" && !initial[0].canManage,
    "Şantiye salt-okunur federatif kaynak olmalıdır.",
  );

  const savedHeadquarters = unwrap(
    await service.save({
      scope: { ...adminScope, periodClosed: true },
      values: headquarters,
    }),
  );
  assert(savedHeadquarters.location.revisionNo === 1, "Merkez revizyonu 1 olmalıdır.");

  const retry = unwrap(
    await service.save({
      scope: { ...adminScope, periodClosed: true },
      values: {
        ...headquarters,
        expectedRevisionNo: 1,
        id: savedHeadquarters.location.id,
      },
    }),
  );
  assert(retry.idempotent, "Aynı request key idempotent olmalıdır.");

  assert(
    !(await service.save({
      scope: adminScope,
      values: {
        ...headquarters,
        code: "MRK-SECOND",
        requestKey: "F26-SECOND-HQ",
      },
    })).ok,
    "İkinci aktif merkez reddedilmelidir.",
  );

  const branch = unwrap(
    await service.save({
      scope: adminScope,
      values: {
        ...headquarters,
        addressLine: "İstanbul Caddesi No: 10",
        city: "İstanbul",
        code: "SB-26",
        district: "Kadıköy",
        email: "sube@f26-kabul.example",
        name: "F26 İstanbul Şubesi",
        phone: "+90 216 555 26 26",
        requestKey: "F26-LOCATION-BRANCH-1",
        responsiblePerson: "F26 Şube Sorumlusu",
        type: "BRANCH",
      },
    }),
  );
  assert(branch.location.revisionNo === 1, "Şube revizyonu 1 olmalıdır.");

  assert(
    !(await service.save({
      scope: adminScope,
      values: {
        ...headquarters,
        id: branch.location.id,
        requestKey: "F26-STALE",
        type: "BRANCH",
      },
    })).ok,
    "Eski revizyon reddedilmelidir.",
  );
  for (const deniedScope of [accountingScope, viewerScope]) {
    assert(
      !(await service.save({
        scope: deniedScope,
        values: {
          ...headquarters,
          code: `OF-${deniedScope.userRole}`,
          requestKey: `F26-${deniedScope.userRole}`,
          type: "OFFICE",
        },
      })).ok,
      `${deniedScope.userRole} yazamamalıdır.`,
    );
  }

  const anotherPeriod = unwrap(
    await service.list({
      scope: {
        ...adminScope,
        periodId: "period-f25-another",
        periodLabel: "Başka Dönem",
      },
    }),
  ).locations;
  assert(
    anotherPeriod.filter((row) => row.source === "company-location").length === 2,
    "Kalıcı lokasyonlar dönemler arasında okunmalıdır.",
  );
  assert(
    anotherPeriod.every((row) => row.source !== "site-record"),
    "Şantiyeler yalnız seçili dönemden okunmalıdır.",
  );
  const foreign = unwrap(
    await service.list({
      scope: {
        ...adminScope,
        companyId: "company-demo-insaat",
        companyName: "DEMO İNŞAAT",
      },
    }),
  ).locations;
  assert(
    !foreign.some((row) => row.code === headquarters.code || row.code === "SB-26"),
    "Lokasyon yabancı firmaya sızmamalıdır.",
  );

  const audits = await prisma.auditLog.findMany({
    where: { ...periodScopeFields(), entityType: "company-location" },
  });
  assert(audits.length === 2, "İki başarılı mutation iki audit üretmelidir.");
  const auditJson = JSON.stringify(audits.map((row) => row.metadata));
  for (const sensitive of [
    headquarters.addressLine,
    headquarters.email,
    headquarters.phone,
    headquarters.requestKey,
    headquarters.responsiblePerson,
  ]) {
    assert(!auditJson.includes(sensitive), "Audit hassas lokasyon değeri içeriyor.");
  }

  const finalDirectory = unwrap(await service.list({ scope: adminScope })).locations;
  assert(finalDirectory.length === 3, "Dizin iki lokasyon ve bir şantiye içermelidir.");
  assert(
    (await prisma.entityRecord.count({
      where: { ...periodScopeFields(), slug: "santiyeler" },
    })) === 1,
    "Şantiye master kaydı çoğaltılmamalıdır.",
  );
  assert(
    JSON.stringify(await operationalCounts()) === JSON.stringify(operationalBefore),
    "Lokasyon dizini operasyonel yan etki üretmemelidir.",
  );
  assert(
    JSON.stringify(await sessionSnapshot()) === JSON.stringify(sessionBefore),
    "Lokasyon dizini session kayıtlarını değiştirmemelidir.",
  );
  assert(
    JSON.stringify(await prisma.companyProfile.findMany({
      where: companyScopeFields(),
    })) === JSON.stringify(profileBefore),
    "Lokasyon dizini firma profilini değiştirmemelidir.",
  );

  console.log(JSON.stringify({
    auditCount: audits.length,
    companyId: base.companyId,
    directoryCount: finalDirectory.length,
    managedLocationCount: 2,
    operationalSideEffects: 0,
    periodIndependentManagedLocations: true,
    profileSideEffects: 0,
    sensitiveAuditValues: 0,
    sessionSideEffects: 0,
    siteMasterDuplicates: 0,
    siteProjectionCount: 1,
    status: "PASS",
  }, null, 2));
}

async function ensureScope() {
  const tenant = await prisma.tenant.findUnique({
    select: { id: true },
    where: { id: base.tenantId },
  });
  assert(tenant, "F26 kabul tenant'ı bulunamadı.");
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
        ...periodScopeFields(),
        id: `scope-f26-kabul-${suffix}-20260730`,
        isActive: true,
        isDefault: false,
        licenseLabel: scope.licenseLabel,
        role: scope.userRole,
        userId: scope.userId,
      },
      update: { isActive: true, licenseLabel: scope.licenseLabel, role: scope.userRole },
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
        id: `session-f26-kabul-${suffix}-20260730`,
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
      where: { id: `session-f26-kabul-${suffix}-20260730` },
    });
  }
}

function operationalCounts() {
  return Promise.all([
    prisma.expense.count({ where: periodScopeFields() }),
    prisma.purchaseInvoice.count({ where: periodScopeFields() }),
    prisma.salesInvoice.count({ where: periodScopeFields() }),
    prisma.progressPayment.count({ where: periodScopeFields() }),
    prisma.cashBankMovement.count({ where: periodScopeFields() }),
    prisma.stockMovement.count({ where: periodScopeFields() }),
  ]);
}

function sessionSnapshot() {
  return prisma.appSession.findMany({
    orderBy: { id: "asc" },
    select: { companyId: true, id: true, periodId: true, role: true, userId: true },
    where: periodScopeFields(),
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
  .finally(() => prisma.$disconnect());
