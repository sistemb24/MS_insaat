import "dotenv/config";

import { randomUUID } from "node:crypto";

import { prisma } from "../src/lib/prisma";
import { createTenantAuthSessionPrismaRepository } from "../src/lib/tenant-auth-session-prisma-repository";

const suffix = randomUUID();
const foreignTenantId = `acceptance-tenant-${suffix}`;
const foreignCompanyId = `acceptance-company-${suffix}`;
const foreignPeriodId = `acceptance-period-${suffix}`;
const foreignUserId = `acceptance-user-${suffix}`;
const foreignScopeId = `acceptance-scope-${suffix}`;
let authSessionId: string | undefined;

async function main() {
  const localScope = await prisma.appSession.findFirst({
    where: { tenantId: "tenant-noa-demo" },
    select: { id: true, userId: true },
  });
  assert(localScope, "Yerel kabul scope'u bulunamadı.");

  await prisma.$transaction(async (tx) => {
    await tx.tenant.create({ data: { id: foreignTenantId, name: "F35 Isolation Acceptance" } });
    await tx.company.create({
      data: { id: foreignCompanyId, name: "Foreign Acceptance Company", tenantId: foreignTenantId },
    });
    await tx.period.create({
      data: {
        companyId: foreignCompanyId,
        id: foreignPeriodId,
        label: "Acceptance",
        tenantId: foreignTenantId,
      },
    });
    await tx.appUser.create({
      data: { id: foreignUserId, name: "Foreign Acceptance User", tenantId: foreignTenantId },
    });
    await tx.appSession.create({
      data: {
        companyId: foreignCompanyId,
        id: foreignScopeId,
        licenseLabel: "Acceptance",
        periodId: foreignPeriodId,
        role: "admin",
        tenantId: foreignTenantId,
        userId: foreignUserId,
      },
    });
  });

  const repository = createTenantAuthSessionPrismaRepository(prisma);
  const now = new Date();
  const auth = await repository.create({
    now,
    scopeSessionId: localScope.id,
    userId: localScope.userId,
  });
  authSessionId = auth.id;

  const switched = await repository.switchScope({
    authSessionId: auth.id,
    now,
    scopeSessionId: foreignScopeId,
    userId: localScope.userId,
  });
  assert(switched === null, "Başka tenant scope'una geçiş reddedilmeliydi.");

  const persisted = await prisma.appAuthSession.findUnique({
    where: { id: auth.id },
    select: { revokedAt: true, scopeSessionId: true },
  });
  assert(
    persisted?.scopeSessionId === localScope.id && persisted.revokedAt === null,
    "Reddedilen geçiş mevcut auth scope'unu değiştirmemelidir.",
  );

  await cleanup();
  console.log(
    JSON.stringify({
      authScopeUnchanged: true,
      foreignScopeSwitchRejected: true,
      temporaryRecordsRemovedAfterRun: true,
    }),
  );
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function cleanup() {
  if (authSessionId) {
    await prisma.appAuthSession.deleteMany({ where: { id: authSessionId } });
    authSessionId = undefined;
  }
  await prisma.tenant.deleteMany({ where: { id: foreignTenantId } });
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Isolation acceptance failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
