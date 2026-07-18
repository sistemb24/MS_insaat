import { demoSessionScopes } from "./session-scope";
import type { TenantScope } from "./tenant-scope";

type AppUserScopeAccessWrite = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  userId: string;
  role: string;
  licenseLabel: string;
  isDefault: boolean;
  isActive: boolean;
};

type AppUserScopeAccessUpsertInput = {
  where: { id: string };
  create: AppUserScopeAccessWrite;
  update: Omit<AppUserScopeAccessWrite, "id">;
};

type UserScopeAccessSeedPrismaClientLike = {
  appUserScopeAccess: {
    upsert(input: AppUserScopeAccessUpsertInput): Promise<unknown>;
  };
};

export type SeedDemoUserScopeAccessesInput = {
  prisma: UserScopeAccessSeedPrismaClientLike;
};

const demoAccessRows = [
  {
    id: "access-demo-accounting",
    scope: demoSessionScopes["demo-accounting"],
  },
  {
    id: "access-demo-viewer",
    scope: demoSessionScopes["demo-viewer"],
  },
  {
    id: "access-demo-ahmet",
    scope: demoSessionScopes["demo-ahmet"],
  },
  {
    id: "access-demo-ayse",
    scope: demoSessionScopes["demo-ayse"],
  },
  {
    id: "access-demo-mehmet",
    scope: demoSessionScopes["demo-mehmet"],
  },
  // Firma 2 - AKDENİZ İNŞAAT kullanıcıları
  {
    id: "access-demo-akdeniz-admin",
    scope: demoSessionScopes["demo-akdeniz-admin"],
  },
  {
    id: "access-demo-akdeniz-muhasebe",
    scope: demoSessionScopes["demo-akdeniz-muhasebe"],
  },
  {
    id: "access-demo-akdeniz-saha",
    scope: demoSessionScopes["demo-akdeniz-saha"],
  },
  // Firma 3 - ANADOLU YAPI kullanıcıları
  {
    id: "access-demo-anadolu-admin",
    scope: demoSessionScopes["demo-anadolu-admin"],
  },
  {
    id: "access-demo-anadolu-muhasebe",
    scope: demoSessionScopes["demo-anadolu-muhasebe"],
  },
  {
    id: "access-demo-anadolu-saha",
    scope: demoSessionScopes["demo-anadolu-saha"],
  },
] as const;

export async function seedDemoUserScopeAccesses({
  prisma,
}: SeedDemoUserScopeAccessesInput) {
  for (const accessRow of demoAccessRows) {
    const data = scopeToAccessWrite(accessRow.id, accessRow.scope);

    await prisma.appUserScopeAccess.upsert({
      where: { id: accessRow.id },
      create: data,
      update: withoutId(data),
    });
  }

  return {
    accessIds: demoAccessRows.map((accessRow) => accessRow.id),
    seeded: demoAccessRows.length,
  };
}

function scopeToAccessWrite(
  id: string,
  scope: TenantScope,
): AppUserScopeAccessWrite {
  return {
    id,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    userId: scope.userId,
    role: scope.userRole,
    licenseLabel: scope.licenseLabel,
    isDefault: true,
    isActive: true,
  };
}

function withoutId(
  data: AppUserScopeAccessWrite,
): Omit<AppUserScopeAccessWrite, "id"> {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    periodId: data.periodId,
    userId: data.userId,
    role: data.role,
    licenseLabel: data.licenseLabel,
    isDefault: data.isDefault,
    isActive: data.isActive,
  };
}
