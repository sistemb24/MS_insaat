import "dotenv/config";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "../src/lib/audit-log-prisma-repository";
import {
  createCompanyProfilePrismaRepository,
  type CompanyProfilePrismaClientLike,
} from "../src/lib/company-profile-prisma-repository";
import { createCompanyProfileService } from "../src/lib/company-profile-service";
import { prisma } from "../src/lib/prisma";
import type { TenantScope } from "../src/lib/tenant-scope";

const base = {
  companyId: "company-f25-kabul-20260730",
  companyName: "F25 Firma Profili Kabul Şirketi",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-f25-kabul-20260730",
  periodLabel: "F25 Kabul 2026",
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
};
const adminScope: TenantScope = {
  ...base,
  userId: "user-ahmet",
  userName: "F25 Firma Yöneticisi",
  userRole: "admin",
};
const accountingScope: TenantScope = {
  ...base,
  userId: "user-main",
  userName: "F25 Muhasebe Kullanıcısı",
  userRole: "accounting",
};
const viewerScope: TenantScope = {
  ...base,
  userId: "user-viewer",
  userName: "F25 Salt Okur",
  userRole: "viewer",
};
const timestamp = "2026-07-30T20:00:00.000Z";
const service = createCompanyProfileService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  now: () => timestamp,
  repository: createCompanyProfilePrismaRepository(
    prisma as unknown as CompanyProfilePrismaClientLike,
  ),
});

const values = {
  addressLine: "Atatürk Bulvarı No: 25",
  city: "Ankara",
  district: "Çankaya",
  email: "firma@f25-kabul.example",
  expectedRevisionNo: 0,
  legalName: "F25 Kabul İnşaat Sanayi ve Ticaret A.Ş.",
  mersisNumber: "0123456789012345",
  phone: "+90 312 555 25 25",
  postalCode: "06550",
  requestKey: "F25-COMPANY-PROFILE-SAVE-1",
  taxNumber: "1234567890",
  taxOffice: "Çankaya",
};

async function main() {
  await ensureScope();
  await prisma.auditLog.deleteMany({
    where: { ...periodScopeFields(), entityType: "company-profile" },
  });
  await prisma.companyProfile.deleteMany({ where: companyScopeFields() });

  const operationalBefore = await operationalCounts();
  const sessionBefore = await sessionSnapshot();
  const companyBefore = await prisma.company.findUniqueOrThrow({
    select: { name: true },
    where: { id: base.companyId },
  });

  const fallback = unwrap(await service.get({ scope: adminScope })).profile;
  assert(fallback.source === "fallback", "İlk okuma fallback olmalıdır.");
  assert(
    fallback.legalName === base.companyName,
    "Fallback hukuki unvan Company.name olmalıdır.",
  );

  const saved = unwrap(
    await service.save({
      scope: { ...adminScope, periodClosed: true },
      values,
    }),
  );
  assert(!saved.idempotent, "İlk yazım idempotent olmamalıdır.");
  assert(saved.profile.revisionNo === 1, "İlk kalıcı revizyon 1 olmalıdır.");
  assert(
    saved.profile.legalName === values.legalName,
    "Kalıcı hukuki unvan okunmalıdır.",
  );

  const retry = unwrap(
    await service.save({
      scope: { ...adminScope, periodClosed: true },
      values,
    }),
  );
  assert(retry.idempotent, "Aynı işlem anahtarı idempotent olmalıdır.");
  assert((await auditCount()) === 1, "Retry ikinci audit üretmemelidir.");

  assert(
    !(await service.save({
      scope: adminScope,
      values: { ...values, requestKey: "F25-STALE" },
    })).ok,
    "Eski revizyon reddedilmelidir.",
  );
  assert(
    !(await service.save({
      scope: accountingScope,
      values: { ...values, expectedRevisionNo: 1, requestKey: "F25-ACCOUNTING" },
    })).ok,
    "Muhasebe rolü yazamamalıdır.",
  );
  assert(
    !(await service.save({
      scope: viewerScope,
      values: { ...values, expectedRevisionNo: 1, requestKey: "F25-VIEWER" },
    })).ok,
    "Viewer rolü yazamamalıdır.",
  );

  const anotherPeriod = unwrap(
    await service.get({
      scope: {
        ...adminScope,
        periodId: "period-f25-another",
        periodLabel: "F25 Kabul 2027",
      },
    }),
  ).profile;
  assert(
    anotherPeriod.legalName === values.legalName,
    "Company profili dönemler arasında aynı okunmalıdır.",
  );

  const foreign = unwrap(
    await service.get({
      scope: {
        ...adminScope,
        companyId: "company-demo-insaat",
        companyName: "DEMO İNŞAAT",
      },
    }),
  ).profile;
  assert(
    foreign.source === "fallback" || foreign.legalName !== values.legalName,
    "Firma profili yabancı kapsama sızmamalıdır.",
  );

  const audit = await prisma.auditLog.findFirst({
    where: { ...periodScopeFields(), entityType: "company-profile" },
  });
  const auditJson = JSON.stringify(audit?.metadata ?? {});
  for (const sensitive of [
    values.addressLine,
    values.email,
    values.mersisNumber,
    values.phone,
    values.requestKey,
    values.taxNumber,
  ]) {
    assert(!auditJson.includes(sensitive), "Audit hassas profil değeri içeriyor.");
  }
  assert(
    JSON.stringify(await operationalCounts()) === JSON.stringify(operationalBefore),
    "Firma profili operasyonel kayıtlarda yan etki üretmemelidir.",
  );
  assert(
    JSON.stringify(await sessionSnapshot()) === JSON.stringify(sessionBefore),
    "Firma profili session kayıtlarını değiştirmemelidir.",
  );
  const companyAfter = await prisma.company.findUniqueOrThrow({
    select: { name: true },
    where: { id: base.companyId },
  });
  assert(
    companyAfter.name === companyBefore.name &&
      companyAfter.name === base.companyName,
    "Company.name kapsam etiketi değişmemelidir.",
  );

  console.log(
    JSON.stringify(
      {
        auditCount: await auditCount(),
        companyId: base.companyId,
        companyNameUnchanged: true,
        legalName: saved.profile.legalName,
        operationalSideEffects: 0,
        periodIndependent: true,
        revisionNo: saved.profile.revisionNo,
        sensitiveAuditValues: 0,
        sessionSideEffects: 0,
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
  assert(tenant, "F25 kabul tenant'ı bulunamadı.");
  await prisma.company.upsert({
    create: {
      id: base.companyId,
      name: base.companyName,
      tenantId: base.tenantId,
    },
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
        id: `scope-f25-kabul-${suffix}-20260730`,
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
        id: `session-f25-kabul-${suffix}-20260730`,
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
      where: { id: `session-f25-kabul-${suffix}-20260730` },
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
    prisma.ledgerEntry.count({ where: periodScopeFields() }),
  ]);
}

function sessionSnapshot() {
  return prisma.appSession.findMany({
    orderBy: { id: "asc" },
    select: { companyId: true, id: true, periodId: true, role: true, userId: true },
    where: periodScopeFields(),
  });
}

function auditCount() {
  return prisma.auditLog.count({
    where: { ...periodScopeFields(), entityType: "company-profile" },
  });
}

function companyScopeFields() {
  return {
    companyId: base.companyId,
    tenantId: base.tenantId,
  };
}

function periodScopeFields() {
  return {
    ...companyScopeFields(),
    periodId: base.periodId,
  };
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
