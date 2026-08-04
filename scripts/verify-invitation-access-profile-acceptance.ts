import "dotenv/config";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "../src/lib/audit-log-prisma-repository";
import { prisma } from "../src/lib/prisma";
import type { TenantScope } from "../src/lib/tenant-scope";
import {
  createUserInvitationPrismaRepository,
  type UserInvitationPrismaClientLike,
} from "../src/lib/user-invitation-prisma-repository";
import { createUserInvitationService } from "../src/lib/user-invitation-service";
import { CUSTOM_RBAC_USER_TYPE } from "../src/lib/user-invitation-access-profile";

const base = {
  companyId: "company-f31-kabul-20260731",
  companyName: "F31 Özel Davet Kabul Şirketi",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-f31-kabul-20260731",
  periodLabel: "F31 Kabul 2026",
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
};
const adminScope: TenantScope = {
  ...base,
  userId: "user-ahmet",
  userName: "F31 Yöneticisi",
  userRole: "admin",
};
const repository = createUserInvitationPrismaRepository(
  prisma as unknown as UserInvitationPrismaClientLike,
);
const service = createUserInvitationService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  now: () => "2026-07-31T23:30:00.000Z",
  passwordHasher: (password) => `acceptance:${password.length}`,
  repository,
  tokenFactory: createTokenFactory(),
});
const emails = [
  "f31-custom@example.com",
  "f31-legacy@example.com",
  "f31-fail@example.com",
];

async function main() {
  await ensureScope();
  await cleanupAcceptanceRows();
  await seedProfile("profile-f31-reader", "ACTIVE", "F31 Doküman Okuyucu");
  await seedProfile("profile-f31-fail", "ACTIVE", "F31 Sonradan Pasif");
  const sideEffectsBefore = await operationalCounts();

  const custom = unwrap(
    await service.createInvitation({
      scope: adminScope,
      values: {
        accessProfileId: "profile-f31-reader",
        email: emails[0],
        role: CUSTOM_RBAC_USER_TYPE,
      },
    }),
  );
  const acceptedCustom = unwrap(
    await service.acceptInvitation({
      values: {
        fullName: "F31 Özel Kullanıcı",
        password: "Strong123!",
        passwordConfirm: "Strong123!",
        token: custom.token,
      },
    }),
  );
  const customState = await readIdentityState(acceptedCustom.email);
  assert(customState.users === 1, "Özel davet tek kullanıcı oluşturmalıdır.");
  assert(customState.sessions === 1, "Özel davet tek session oluşturmalıdır.");
  assert(customState.accesses === 1, "Özel davet tek erişim oluşturmalıdır.");
  assert(customState.assignments === 1, "Özel davet tek profil ataması oluşturmalıdır.");
  const acceptedCustomUser = await prisma.appUser.findFirst({
    where: {
      tenantId: adminScope.tenantId,
      email: emails[0],
    },
  });
  assert(acceptedCustomUser, "Özel davet kabulünde uygulama kullanıcısı oluşturulamadı.");
  const acceptedCustomAccess = await prisma.appUserScopeAccess.findFirst({
    where: { ...periodScope(), userId: acceptedCustomUser.id },
  });
  assert(
    acceptedCustomAccess?.role === "viewer",
    "Özel davet kabulünde viewer kapsam erişimi oluşturulamadı.",
  );
  const assignment = await prisma.userAccessProfileAssignment.findFirst({
    where: { ...periodScope(), profileId: "profile-f31-reader" },
  });
  assert(assignment?.revisionNo === 1, "Profil ataması ilk revizyonda olmalıdır.");
  assert(
    !(await service.acceptInvitation({
      values: {
        fullName: "F31 Özel Kullanıcı",
        password: "Strong123!",
        passwordConfirm: "Strong123!",
        token: custom.token,
      },
    })).ok,
    "Aynı davet ikinci kez kabul edilememelidir.",
  );
  assert(
    JSON.stringify(await readIdentityState(emails[0])) === JSON.stringify(customState),
    "Kabul retry ikinci kimlik veya atama üretmemelidir.",
  );

  const legacy = unwrap(
    await service.createInvitation({
      scope: adminScope,
      values: { email: emails[1], role: "İSG Uzmanı" },
    }),
  );
  unwrap(
    await service.acceptInvitation({
      values: {
        fullName: "F31 Eski Davet",
        password: "Strong123!",
        passwordConfirm: "Strong123!",
        token: legacy.token,
      },
    }),
  );
  assert(
    (await readIdentityState(emails[1])).assignments === 0,
    "Profilsiz eski tip davet profil ataması üretmemelidir.",
  );

  const fail = unwrap(
    await service.createInvitation({
      scope: adminScope,
      values: {
        accessProfileId: "profile-f31-fail",
        email: emails[2],
        role: CUSTOM_RBAC_USER_TYPE,
      },
    }),
  );
  await prisma.accessProfile.update({
    data: { status: "INACTIVE" },
    where: { id: "profile-f31-fail" },
  });
  assert(
    !(await service.acceptInvitation({
      values: {
        fullName: "F31 Başarısız Kullanıcı",
        password: "Strong123!",
        passwordConfirm: "Strong123!",
        token: fail.token,
      },
    })).ok,
    "Pasife alınmış profil kabulde fail-closed reddedilmelidir.",
  );
  assert(
    Object.values(await readIdentityState(emails[2])).every((count) => count === 0),
    "Başarısız kabul kısmi kimlik veya atama bırakmamalıdır.",
  );
  assert(
    !(await service.createInvitation({
      scope: adminScope,
      values: {
        accessProfileId: "foreign-profile",
        email: "f31-foreign@example.com",
        role: CUSTOM_RBAC_USER_TYPE,
      },
    })).ok,
    "Yabancı profil daveti reddedilmelidir.",
  );

  const audits = await prisma.auditLog.findMany({
    where: { ...periodScope(), entityType: "user-invitation" },
  });
  const auditText = JSON.stringify(audits);
  for (const sensitive of [
    "F31 Doküman Okuyucu",
    "F31 Sonradan Pasif",
    "Strong123!",
    custom.token,
    fail.token,
  ]) {
    assert(!auditText.includes(sensitive), "Audit profil içeriği, token veya şifre taşımamalıdır.");
  }
  assert(
    JSON.stringify(await operationalCounts()) === JSON.stringify(sideEffectsBefore),
    "Davet profili finansal veya doküman yan etkisi üretmemelidir.",
  );

  console.log(JSON.stringify({
    atomicFailureSideEffects: 0,
    auditCount: audits.length,
    customAssignmentCount: customState.assignments,
    documentSideEffects: 0,
    financialSideEffects: 0,
    legacyCompatibility: true,
    retrySideEffects: 0,
    status: "PASS",
  }, null, 2));
}

async function ensureScope() {
  await prisma.company.upsert({
    create: { id: base.companyId, name: base.companyName, tenantId: base.tenantId },
    update: { name: base.companyName },
    where: { id: base.companyId },
  });
  await prisma.period.upsert({
    create: { companyId: base.companyId, id: base.periodId, isClosed: false, label: base.periodLabel, tenantId: base.tenantId },
    update: { isClosed: false, label: base.periodLabel },
    where: { id: base.periodId },
  });
}

async function seedProfile(id: string, status: "ACTIVE" | "INACTIVE", name: string) {
  await prisma.accessProfile.create({
    data: {
      companyId: base.companyId,
      createdAt: new Date("2026-07-31T23:00:00.000Z"),
      createdBy: adminScope.userId,
      description: "Kabul profili",
      id,
      lastMutationKey: `${id}-create`,
      name,
      normalizedName: name.toLocaleLowerCase("tr-TR"),
      revisionNo: 1,
      status,
      tenantId: base.tenantId,
      updatedAt: new Date("2026-07-31T23:00:00.000Z"),
      updatedBy: adminScope.userId,
    },
  });
}

async function cleanupAcceptanceRows() {
  const users = await prisma.appUser.findMany({
    select: { id: true },
    where: { email: { in: emails } },
  });
  const userIds = users.map((user) => user.id);
  await prisma.appCredential.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userAccessProfileAssignment.deleteMany({ where: companyScope() });
  await prisma.appUserScopeAccess.deleteMany({ where: { ...companyScope(), userId: { in: userIds } } });
  await prisma.appSession.deleteMany({ where: { ...companyScope(), userId: { in: userIds } } });
  await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  await prisma.emailOutbox.deleteMany({ where: companyScope() });
  await prisma.auditLog.deleteMany({ where: { ...periodScope(), entityType: "user-invitation" } });
  await prisma.userInvitation.deleteMany({ where: companyScope() });
  await prisma.accessProfile.deleteMany({ where: companyScope() });
}

async function readIdentityState(email: string) {
  const user = await prisma.appUser.findFirst({ where: { email } });
  return {
    accesses: user ? await prisma.appUserScopeAccess.count({ where: { ...companyScope(), userId: user.id } }) : 0,
    assignments: user ? await prisma.userAccessProfileAssignment.count({ where: { ...companyScope(), userId: user.id } }) : 0,
    credentials: user ? await prisma.appCredential.count({ where: { userId: user.id } }) : 0,
    sessions: user ? await prisma.appSession.count({ where: { ...companyScope(), userId: user.id } }) : 0,
    users: user ? 1 : 0,
  };
}
function operationalCounts() {
  return Promise.all([
    prisma.documentFile.count({ where: companyScope() }),
    prisma.expense.count({ where: companyScope() }),
    prisma.ledgerEntry.count({ where: companyScope() }),
    prisma.cashBankMovement.count({ where: companyScope() }),
  ]);
}
function companyScope() {
  return { companyId: base.companyId, tenantId: base.tenantId };
}
function periodScope() {
  return { ...companyScope(), periodId: base.periodId };
}
function createTokenFactory() {
  let index = 0;
  return () => `f31-token-${++index}`;
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
