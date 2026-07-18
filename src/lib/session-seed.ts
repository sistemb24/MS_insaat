import { demoSessionScopes } from "./session-scope";
import type { TenantScope } from "./tenant-scope";

type AppSessionUpsertInput = {
  where: { id: string };
  create: AppSessionWrite;
  update: Omit<AppSessionWrite, "id">;
};

type AppSessionWrite = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  userId: string;
  role: string;
  licenseLabel: string;
  expiresAt: Date | null;
};

type SessionSeedPrismaClientLike = {
  appSession: {
    upsert(input: AppSessionUpsertInput): Promise<unknown>;
  };
};

export type SeedDemoAppSessionsInput = {
  expiresAt?: Date | null;
  prisma: SessionSeedPrismaClientLike;
};

export async function seedDemoAppSessions({
  expiresAt = null,
  prisma,
}: SeedDemoAppSessionsInput) {
  const entries = Object.entries(demoSessionScopes);

  for (const [sessionId, scope] of entries) {
    const data = scopeToSessionWrite(sessionId, scope, expiresAt);

    await prisma.appSession.upsert({
      where: { id: sessionId },
      create: data,
      update: withoutId(data),
    });
  }

  return {
    seeded: entries.length,
    sessionIds: entries.map(([sessionId]) => sessionId),
  };
}

function scopeToSessionWrite(
  sessionId: string,
  scope: TenantScope,
  expiresAt: Date | null,
): AppSessionWrite {
  return {
    id: sessionId,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    userId: scope.userId,
    role: scope.userRole,
    licenseLabel: scope.licenseLabel,
    expiresAt,
  };
}

function withoutId(data: AppSessionWrite): Omit<AppSessionWrite, "id"> {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    periodId: data.periodId,
    userId: data.userId,
    role: data.role,
    licenseLabel: data.licenseLabel,
    expiresAt: data.expiresAt,
  };
}
