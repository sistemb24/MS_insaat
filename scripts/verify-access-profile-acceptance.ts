import "dotenv/config";

import {
  canUseDocumentPermission,
  type AccessProfileSaveValues,
} from "../src/lib/access-profile";
import {
  createAccessProfilePrismaRepository,
  type AccessProfilePrismaClientLike,
} from "../src/lib/access-profile-prisma-repository";
import { createAccessProfileService } from "../src/lib/access-profile-service";
import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "../src/lib/audit-log-prisma-repository";
import { prisma } from "../src/lib/prisma";
import type { TenantScope } from "../src/lib/tenant-scope";

const base = {
  companyId: "company-f30-kabul-20260731",
  companyName: "F30 Yetki Profili Kabul Şirketi",
  licenseLabel: "Kurumsal",
  periodClosed: true,
  periodId: "period-f30-kabul-20260731",
  periodLabel: "F30 Kabul 2026",
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
};
const adminScope: TenantScope = {
  ...base,
  userId: "user-ahmet",
  userName: "F30 Yöneticisi",
  userRole: "admin",
};
const viewerScope: TenantScope = {
  ...base,
  userId: "user-viewer",
  userName: "F30 Görüntüleyici",
  userRole: "viewer",
};
const accountingScope: TenantScope = {
  ...base,
  userId: "user-main",
  userName: "F30 Muhasebe",
  userRole: "accounting",
};
const repository = createAccessProfilePrismaRepository(
  prisma as unknown as AccessProfilePrismaClientLike,
);
const service = createAccessProfileService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  now: () => "2026-07-31T23:00:00.000Z",
  repository,
});

async function main() {
  await ensureScope();
  await prisma.userAccessProfileAssignment.deleteMany({ where: companyScope() });
  await prisma.accessProfile.deleteMany({ where: companyScope() });
  await prisma.auditLog.deleteMany({
    where: {
      ...periodScope(),
      entityType: { in: ["access-profile", "access-profile-assignment"] },
    },
  });
  const before = await sideEffectSnapshot();
  const values: AccessProfileSaveValues = {
    description: "Saha ekibi yalnızca doküman okur",
    expectedRevisionNo: 0,
    name: "Saha Doküman Okuyucu",
    permissions: ["document.view"],
    requestKey: "F30-PROFILE-1",
  };
  const created = unwrap(await service.save({ scope: adminScope, values }));
  assert(created.profile.revisionNo === 1, "İlk profil revizyonu 1 olmalıdır.");
  assert(
    unwrap(await service.save({ scope: adminScope, values })).idempotent,
    "Aynı profil isteği idempotent olmalıdır.",
  );
  assert(
    !(await service.save({ scope: accountingScope, values: { ...values, requestKey: "DENIED" } })).ok,
    "Muhasebe rolü profil yönetememelidir.",
  );
  assert(
    !(await service.save({
      scope: adminScope,
      values: { ...values, name: " saha  doküman okuyucu ", requestKey: "DUPLICATE" },
    })).ok,
    "Normalize tekrar profil reddedilmelidir.",
  );
  const assigned = unwrap(
    await service.assign({
      scope: adminScope,
      values: {
        expectedRevisionNo: 0,
        profileId: created.profile.id,
        requestKey: "F30-ASSIGN-1",
        userId: viewerScope.userId,
      },
    }),
  );
  assert(assigned.assignment?.revisionNo === 1, "Atama revizyonu 1 olmalıdır.");
  const access = await service.resolveDocumentAccess({ scope: viewerScope });
  assert(
    canUseDocumentPermission("viewer", access, "document.view"),
    "Atanmış viewer dokümanları görebilmelidir.",
  );
  assert(
    !canUseDocumentPermission("viewer", access, "document.file.create"),
    "Atanmış viewer açık grant olmadan dosya yükleyememelidir.",
  );
  assert(
    canUseDocumentPermission("admin", access, "document.file.create"),
    "Admin profil kararından bağımsız tam yetkili kalmalıdır.",
  );
  assert(
    canUseDocumentPermission("accounting", undefined, "document.file.create"),
    "Atanmamış accounting eski rol fallback'ini korumalıdır.",
  );
  assert(
    !(await service.changeStatus({
      scope: adminScope,
      values: {
        expectedRevisionNo: created.profile.revisionNo,
        id: created.profile.id,
        requestKey: "F30-INACTIVE-WITH-ASSIGNMENT",
        status: "INACTIVE",
      },
    })).ok,
    "Aktif atamalı profil pasifleştirilememelidir.",
  );
  const foreignAccess = await service.resolveDocumentAccess({
    scope: { ...viewerScope, companyId: "company-f30-foreign-20260731" },
  });
  assert(!foreignAccess.assigned, "Atama yabancı firmaya sızmamalıdır.");

  const audits = await prisma.auditLog.findMany({
    where: {
      ...periodScope(),
      entityType: { in: ["access-profile", "access-profile-assignment"] },
    },
  });
  assert(audits.length === 2, "İki başarılı mutation iki audit üretmelidir.");
  const auditText = JSON.stringify(audits.map((row) => row.metadata));
  for (const sensitive of [values.description, values.name, values.requestKey, viewerScope.userName]) {
    assert(!auditText.includes(sensitive), "Audit hassas profil veya kullanıcı içeriği taşımamalıdır.");
  }
  assert(
    JSON.stringify(await sideEffectSnapshot()) === JSON.stringify(before),
    "Profil yönetimi session, doküman ve finansal yan etki üretmemelidir.",
  );
  console.log(
    JSON.stringify(
      {
        adminBypass: true,
        auditCount: audits.length,
        companyIsolation: true,
        documentGrant: ["document.view"],
        documentSideEffects: 0,
        financialSideEffects: 0,
        legacyFallback: true,
        sessionSideEffects: 0,
        status: "PASS",
      },
      null,
      2,
    ),
  );
}

async function ensureScope() {
  const tenant = await prisma.tenant.findUnique({ where: { id: base.tenantId } });
  assert(tenant, "F30 kabul tenant'ı bulunamadı.");
  for (const company of [
    { id: base.companyId, name: base.companyName },
    { id: "company-f30-foreign-20260731", name: "F30 Yabancı Şirket" },
  ]) {
    await prisma.company.upsert({
      create: { ...company, tenantId: base.tenantId },
      update: { name: company.name },
      where: { id: company.id },
    });
  }
  await prisma.period.upsert({
    create: { companyId: base.companyId, id: base.periodId, isClosed: true, label: base.periodLabel, tenantId: base.tenantId },
    update: { isClosed: true, label: base.periodLabel },
    where: { id: base.periodId },
  });
  for (const [scope, suffix] of [
    [adminScope, "admin"],
    [accountingScope, "accounting"],
    [viewerScope, "viewer"],
  ] as const) {
    await prisma.appUserScopeAccess.upsert({
      create: { ...periodScope(), id: `scope-f30-${suffix}`, isActive: true, isDefault: false, licenseLabel: scope.licenseLabel, role: scope.userRole, userId: scope.userId },
      update: { isActive: true, role: scope.userRole },
      where: { userId_companyId_periodId: { companyId: base.companyId, periodId: base.periodId, userId: scope.userId } },
    });
  }
}

async function sideEffectSnapshot() {
  return {
    documents: await prisma.documentFile.count({ where: companyScope() }),
    expenses: await prisma.expense.count({ where: companyScope() }),
    ledger: await prisma.ledgerEntry.count({ where: companyScope() }),
    sessions: await prisma.appSession.count({ where: companyScope() }),
  };
}
function companyScope() {
  return { companyId: base.companyId, tenantId: base.tenantId };
}
function periodScope() {
  return { ...companyScope(), periodId: base.periodId };
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
  .finally(async () => prisma.$disconnect());
