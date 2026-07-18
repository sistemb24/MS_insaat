import type { TenantUserRole } from "./tenant-scope";
import type {
  UserScopeAccessRecord,
  UserScopeAccessRepository,
} from "./user-scope-access";

type AppUserScopeAccessRecord = {
  id: string;
  role: string;
  licenseLabel: string;
  isDefault: boolean;
  tenant: {
    id: string;
    name: string;
  };
  company: {
    id: string;
    name: string;
  };
  period: {
    id: string;
    label: string;
  };
  user: {
    id: string;
    name: string;
  };
};

type AppUserScopeAccessClient = {
  findMany(input: {
    where: {
      isActive: true;
      userId: string;
    };
    include: {
      company: true;
      period: true;
      tenant: true;
      user: true;
    };
    orderBy: [
      { isDefault: "desc" },
      { company: { name: "asc" } },
      { period: { label: "desc" } },
    ];
  }): Promise<AppUserScopeAccessRecord[]>;
};

export type UserScopeAccessPrismaClientLike = {
  appUserScopeAccess: AppUserScopeAccessClient;
};

export function createUserScopeAccessPrismaRepository(
  prisma: UserScopeAccessPrismaClientLike,
): UserScopeAccessRepository {
  return {
    async listActiveForUser({ userId }: { userId: string }) {
      const accessRows = await prisma.appUserScopeAccess.findMany({
        where: {
          isActive: true,
          userId,
        },
        include: {
          company: true,
          period: true,
          tenant: true,
          user: true,
        },
        orderBy: [
          { isDefault: "desc" },
          { company: { name: "asc" } },
          { period: { label: "desc" } },
        ],
      });

      return accessRows.map(accessRecordToScopeAccessRecord);
    },
  };
}

function accessRecordToScopeAccessRecord(
  access: AppUserScopeAccessRecord,
): UserScopeAccessRecord {
  return {
    id: access.id,
    tenantId: access.tenant.id,
    tenantName: access.tenant.name,
    companyId: access.company.id,
    companyName: access.company.name,
    periodId: access.period.id,
    periodLabel: access.period.label,
    userId: access.user.id,
    userName: access.user.name,
    userRole: normalizeRole(access.role),
    licenseLabel: access.licenseLabel,
    isDefault: access.isDefault,
  };
}

function normalizeRole(role: string): TenantUserRole {
  if (role === "admin" || role === "accounting" || role === "viewer") {
    return role;
  }

  return "viewer";
}
