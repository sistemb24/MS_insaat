import "dotenv/config";

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
import {
  createUserManagementPrismaRepository,
  type UserManagementMutationClientLike,
  type UserManagementPrismaClientLike,
} from "../src/lib/user-management-prisma-repository";
import { createUserManagementService } from "../src/lib/user-management-service";

const base = {
  companyId: "company-f32-kabul-20260802",
  companyName: "F32 Profil Yaşam Döngüsü Kabul Şirketi",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-f32-kabul-20260802",
  periodLabel: "F32 Kabul 2026",
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
};
const foreign = {
  companyId: "company-f32-foreign-20260802",
  companyName: "F32 Yabancı Şirket",
  periodId: "period-f32-foreign-20260802",
  periodLabel: "F32 Yabancı 2026",
};
const adminScope: TenantScope = {
  ...base,
  userId: "user-ahmet",
  userName: "F32 Yöneticisi",
  userRole: "admin",
};
const userIds = {
  accountingTarget: "user-viewer",
  adminTarget: "user-main",
  deactivateTarget: "user-ayse",
  foreignTarget: "user-mehmet",
};
const auditRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);
const repository = createUserManagementPrismaRepository(
  prisma as unknown as UserManagementPrismaClientLike,
);
const service = createUserManagementService({
  auditLogReadRepository: auditRepository,
  auditLogRepository: auditRepository,
  now: () => "2026-08-02T21:30:00.000Z",
  repository,
});

async function main() {
  await ensureScope();
  await cleanup();
  await seedProfile("profile-f32-main", base.companyId, "F32 Yaşam Döngüsü Profili");
  await seedProfile("profile-f32-foreign", foreign.companyId, "F32 Yabancı Profil");
  await seedAccesses();
  const before = await operationalCounts();

  await seedAssignment("assignment-f32-accounting", userIds.accountingTarget);
  const accountingResult = unwrap(
    await service.updateUserAccessRole({
      accessId: "scope-f32-accounting-target",
      role: "accounting",
      scope: adminScope,
    }),
  );
  assert(
    accountingResult.removedAccessProfileId === "profile-f32-main",
    "Viewer → accounting geçişi profil atamasını kaldırmalıdır.",
  );
  await assertAccessAndAssignment(userIds.accountingTarget, "accounting", 0);

  await seedAssignment("assignment-f32-admin", userIds.adminTarget);
  const adminResult = unwrap(
    await service.updateUserAccessRole({
      accessId: "scope-f32-admin-target",
      role: "admin",
      scope: adminScope,
    }),
  );
  assert(
    adminResult.removedAccessProfileId === "profile-f32-main",
    "Viewer → admin geçişi profil atamasını kaldırmalıdır.",
  );
  await assertAccessAndAssignment(userIds.adminTarget, "admin", 0);

  const viewerResult = unwrap(
    await service.updateUserAccessRole({
      accessId: "scope-f32-deactivate-target",
      role: "viewer",
      scope: adminScope,
    }),
  );
  assert(
    viewerResult.removedAccessProfileId === null,
    "Accounting → viewer geçişi otomatik profil üretmemelidir.",
  );
  await assertAccessAndAssignment(userIds.deactivateTarget, "viewer", 0);
  await seedAssignment("assignment-f32-deactivate", userIds.deactivateTarget);
  const deactivated = unwrap(
    await service.deactivateUserAccess({
      accessId: "scope-f32-deactivate-target",
      scope: adminScope,
    }),
  );
  assert(
    deactivated.removedAccessProfileId === "profile-f32-main",
    "Deaktivasyon profil atamasını kaldırmalıdır.",
  );
  const deactivatedAccess = await prisma.appUserScopeAccess.findUnique({
    where: { id: "scope-f32-deactivate-target" },
  });
  assert(deactivatedAccess?.isActive === false, "Kullanıcı erişimi pasif olmalıdır.");
  assert(
    (await prisma.userAccessProfileAssignment.count({
      where: { ...periodScope(), userId: userIds.deactivateTarget },
    })) === 0,
    "Pasif kullanıcı ataması kalmamalıdır.",
  );

  await seedAssignment("assignment-f32-atomic", userIds.accountingTarget);
  await prisma.appUserScopeAccess.update({
    data: { role: "viewer" },
    where: { id: "scope-f32-accounting-target" },
  });
  const failingService = createUserManagementService({
    repository: createUserManagementPrismaRepository(createFailingTransactionClient()),
  });
  const failed = await failingService.updateUserAccessRole({
    accessId: "scope-f32-accounting-target",
    role: "accounting",
    scope: adminScope,
  });
  assert(!failed.ok, "Atama silme hatası rol değişikliğini reddetmelidir.");
  await assertAccessAndAssignment(userIds.accountingTarget, "viewer", 1);
  await prisma.userAccessProfileAssignment.deleteMany({
    where: { ...periodScope(), userId: userIds.accountingTarget },
  });

  await seedForeignAssignment();
  assert(
    !(await service.updateUserAccessRole({
      accessId: "scope-f32-foreign-target",
      role: "accounting",
      scope: adminScope,
    })).ok,
    "Yabancı firma erişimi ana scope'tan değiştirilememelidir.",
  );
  const foreignAssignmentCount = await prisma.userAccessProfileAssignment.count({
    where: {
      companyId: foreign.companyId,
      periodId: foreign.periodId,
      tenantId: base.tenantId,
      userId: userIds.foreignTarget,
    },
  });
  assert(foreignAssignmentCount === 1, "Yabancı firma ataması korunmalıdır.");

  const profileService = createAccessProfileService({
    auditLogRepository: auditRepository,
    now: () => "2026-08-02T21:35:00.000Z",
    repository: createAccessProfilePrismaRepository(
      prisma as unknown as AccessProfilePrismaClientLike,
    ),
  });
  const profile = await prisma.accessProfile.findUnique({
    where: { id: "profile-f32-main" },
  });
  assert(profile, "Ana kabul profili bulunamadı.");
  const inactivated = unwrap(
    await profileService.changeStatus({
      scope: adminScope,
      values: {
        expectedRevisionNo: profile.revisionNo,
        id: profile.id,
        requestKey: "F32-PROFILE-INACTIVE",
        status: "INACTIVE",
      },
    }),
  );
  assert(
    inactivated.profile.status === "INACTIVE",
    "Atamalar temizlendikten sonra profil pasife alınabilmelidir.",
  );

  const audits = await prisma.auditLog.findMany({
    where: { ...periodScope(), entityType: "user-access" },
  });
  assert(audits.length === 4, "Dört başarılı kullanıcı mutasyonu audit üretmelidir.");
  const auditText = JSON.stringify(audits.map((row) => row.metadata));
  for (const sensitive of [
    "F32 Yaşam Döngüsü Profili",
    "document.view",
    "permissionCodes",
  ]) {
    assert(!auditText.includes(sensitive), "Audit profil içeriği taşımamalıdır.");
  }
  assert(
    JSON.stringify(await operationalCounts()) === JSON.stringify(before),
    "Faz 32 finans, ledger, doküman veya session yan etkisi üretmemelidir.",
  );

  console.log(
    JSON.stringify(
      {
        atomicRollback: true,
        auditCount: audits.length,
        deactivationCleanup: true,
        documentSideEffects: 0,
        financialSideEffects: 0,
        foreignScopePreserved: true,
        profileDeactivationUnblocked: true,
        roleCleanup: ["accounting", "admin"],
        sessionSideEffects: 0,
        status: "PASS",
        viewerFallbackPreserved: true,
      },
      null,
      2,
    ),
  );
}

async function ensureScope() {
  for (const userId of [adminScope.userId, ...Object.values(userIds)]) {
    assert(
      await prisma.appUser.findUnique({ where: { id: userId } }),
      `Kabul kullanıcısı bulunamadı: ${userId}`,
    );
  }
  for (const company of [
    { id: base.companyId, name: base.companyName },
    { id: foreign.companyId, name: foreign.companyName },
  ]) {
    await prisma.company.upsert({
      create: { ...company, tenantId: base.tenantId },
      update: { name: company.name },
      where: { id: company.id },
    });
  }
  for (const period of [
    { companyId: base.companyId, id: base.periodId, label: base.periodLabel },
    { companyId: foreign.companyId, id: foreign.periodId, label: foreign.periodLabel },
  ]) {
    await prisma.period.upsert({
      create: { ...period, isClosed: false, tenantId: base.tenantId },
      update: { isClosed: false, label: period.label },
      where: { id: period.id },
    });
  }
}

async function cleanup() {
  await prisma.userAccessProfileAssignment.deleteMany({
    where: { companyId: { in: [base.companyId, foreign.companyId] }, tenantId: base.tenantId },
  });
  await prisma.auditLog.deleteMany({
    where: { companyId: { in: [base.companyId, foreign.companyId] }, tenantId: base.tenantId },
  });
  await prisma.accessProfile.deleteMany({
    where: { companyId: { in: [base.companyId, foreign.companyId] }, tenantId: base.tenantId },
  });
}

async function seedAccesses() {
  for (const row of [
    { id: "scope-f32-admin", role: "admin", userId: adminScope.userId },
    { id: "scope-f32-accounting-target", role: "viewer", userId: userIds.accountingTarget },
    { id: "scope-f32-admin-target", role: "viewer", userId: userIds.adminTarget },
    { id: "scope-f32-deactivate-target", role: "accounting", userId: userIds.deactivateTarget },
  ]) {
    await prisma.appUserScopeAccess.upsert({
      create: {
        ...periodScope(),
        id: row.id,
        isActive: true,
        isDefault: false,
        licenseLabel: base.licenseLabel,
        role: row.role,
        userId: row.userId,
      },
      update: { isActive: true, role: row.role },
      where: {
        userId_companyId_periodId: {
          companyId: base.companyId,
          periodId: base.periodId,
          userId: row.userId,
        },
      },
    });
  }
  await prisma.appUserScopeAccess.upsert({
    create: {
      companyId: foreign.companyId,
      id: "scope-f32-foreign-target",
      isActive: true,
      isDefault: false,
      licenseLabel: base.licenseLabel,
      periodId: foreign.periodId,
      role: "viewer",
      tenantId: base.tenantId,
      userId: userIds.foreignTarget,
    },
    update: { isActive: true, role: "viewer" },
    where: {
      userId_companyId_periodId: {
        companyId: foreign.companyId,
        periodId: foreign.periodId,
        userId: userIds.foreignTarget,
      },
    },
  });
}

async function seedProfile(id: string, companyId: string, name: string) {
  await prisma.accessProfile.create({
    data: {
      companyId,
      createdBy: adminScope.userId,
      description: "İzole kabul profili",
      id,
      lastMutationKey: `${id}-create`,
      name,
      normalizedName: name.toLocaleLowerCase("tr-TR"),
      revisionNo: 1,
      status: "ACTIVE",
      tenantId: base.tenantId,
      updatedBy: adminScope.userId,
    },
  });
}

async function seedAssignment(id: string, userId: string) {
  await prisma.userAccessProfileAssignment.create({
    data: {
      ...periodScope(),
      createdBy: adminScope.userId,
      id,
      lastMutationKey: `${id}-create`,
      profileId: "profile-f32-main",
      revisionNo: 1,
      updatedBy: adminScope.userId,
      userId,
    },
  });
}

async function seedForeignAssignment() {
  await prisma.userAccessProfileAssignment.create({
    data: {
      companyId: foreign.companyId,
      createdBy: adminScope.userId,
      id: "assignment-f32-foreign",
      lastMutationKey: "assignment-f32-foreign-create",
      periodId: foreign.periodId,
      profileId: "profile-f32-foreign",
      revisionNo: 1,
      tenantId: base.tenantId,
      updatedBy: adminScope.userId,
      userId: userIds.foreignTarget,
    },
  });
}

function createFailingTransactionClient(): UserManagementPrismaClientLike {
  return {
    appUserScopeAccess: prisma.appUserScopeAccess as unknown as UserManagementPrismaClientLike["appUserScopeAccess"],
    emailOutbox: prisma.emailOutbox as unknown as UserManagementPrismaClientLike["emailOutbox"],
    userAccessProfileAssignment: prisma.userAccessProfileAssignment as unknown as NonNullable<UserManagementPrismaClientLike["userAccessProfileAssignment"]>,
    userInvitation: prisma.userInvitation as unknown as UserManagementPrismaClientLike["userInvitation"],
    async $transaction<T>(
      callback: (client: UserManagementMutationClientLike) => Promise<T>,
    ) {
      return prisma.$transaction(async (transaction) =>
        callback({
          appUserScopeAccess: transaction.appUserScopeAccess as unknown as UserManagementMutationClientLike["appUserScopeAccess"],
          userAccessProfileAssignment: {
            deleteMany: async () => ({ count: 0 }),
            findFirst: (input) =>
              transaction.userAccessProfileAssignment.findFirst(
                input as Parameters<typeof transaction.userAccessProfileAssignment.findFirst>[0],
              ) as Promise<ReturnType<NonNullable<UserManagementMutationClientLike["userAccessProfileAssignment"]>["findFirst"]> extends Promise<infer R> ? R : never>,
          },
        }),
      );
    },
  };
}

async function assertAccessAndAssignment(
  userId: string,
  role: string,
  assignmentCount: number,
) {
  const access = await prisma.appUserScopeAccess.findFirst({
    where: { ...periodScope(), userId },
  });
  assert(access?.role === role, `Kullanıcı rolü ${role} olmalıdır.`);
  assert(
    (await prisma.userAccessProfileAssignment.count({
      where: { ...periodScope(), userId },
    })) === assignmentCount,
    `Kullanıcı profil ataması ${assignmentCount} olmalıdır.`,
  );
}

function operationalCounts() {
  return Promise.all([
    prisma.documentFile.count({ where: companyScope() }),
    prisma.expense.count({ where: companyScope() }),
    prisma.ledgerEntry.count({ where: companyScope() }),
    prisma.cashBankMovement.count({ where: companyScope() }),
    prisma.appSession.count({ where: companyScope() }),
  ]);
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
