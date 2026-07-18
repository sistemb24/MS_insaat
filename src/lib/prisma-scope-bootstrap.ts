import type { PrismaClient } from "@prisma/client";

import { demoSessionScopes } from "./session-scope";
import type { TenantScope } from "./tenant-scope";

export async function ensureTenantScope(
  prisma: PrismaClient,
  scope: TenantScope,
) {
  await prisma.tenant.upsert({
    where: { id: scope.tenantId },
    create: {
      id: scope.tenantId,
      name: scope.tenantName,
    },
    update: {
      name: scope.tenantName,
    },
  });

  await prisma.company.upsert({
    where: { id: scope.companyId },
    create: {
      id: scope.companyId,
      tenantId: scope.tenantId,
      name: scope.companyName,
    },
    update: {
      tenantId: scope.tenantId,
      name: scope.companyName,
    },
  });

  await prisma.period.upsert({
    where: { id: scope.periodId },
    create: {
      id: scope.periodId,
      tenantId: scope.tenantId,
      companyId: scope.companyId,
      label: scope.periodLabel,
    },
    update: {
      tenantId: scope.tenantId,
      companyId: scope.companyId,
      label: scope.periodLabel,
    },
  });

  await prisma.appUser.upsert({
    where: { id: scope.userId },
    create: {
      id: scope.userId,
      tenantId: scope.tenantId,
      name: scope.userName,
    },
    update: {
      tenantId: scope.tenantId,
      name: scope.userName,
    },
  });

  // Bu tenant'a ait tüm session kullanıcılarını da oluştur
  for (const sessionScope of Object.values(demoSessionScopes)) {
    if (sessionScope.tenantId === scope.tenantId) {
      await prisma.appUser.upsert({
        where: { id: sessionScope.userId },
        create: {
          id: sessionScope.userId,
          tenantId: sessionScope.tenantId,
          name: sessionScope.userName,
        },
        update: {
          tenantId: sessionScope.tenantId,
          name: sessionScope.userName,
        },
      });
    }
  }
}
