import type { TenantScope } from "./tenant-scope";
import type {
  UserManagementEmailOutboxRecord,
  UserManagementInvitationRecord,
  UserManagementRepository,
  UserManagementUserAccessRecord,
  UserManagementRole,
} from "./user-management-service";

type AppUserScopeAccessRecord = {
  company: {
    id: string;
    name: string;
  };
  id: string;
  isActive: boolean;
  periodId: string;
  role: string;
  tenantId: string;
  user: {
    email: string | null;
    id: string;
    name: string;
  };
};

type UserInvitationRecord = {
  companyId: string;
  email: string;
  expiresAt: Date | string;
  id: string;
  periodId: string;
  role: string;
  status: string;
  tenantId: string;
};

type EmailOutboxRecord = {
  companyId: string;
  createdAt: Date | string;
  id: string;
  periodId: string;
  recipientEmail: string;
  status: string;
  subject: string;
  template: string;
  tenantId: string;
};

export type UserManagementPrismaClientLike = {
  appUserScopeAccess: {
    findFirst(input: {
      include: {
        company: true;
        user: true;
      };
      where: {
        companyId: string;
        id: string;
        isActive: true;
        periodId: string;
        tenantId: string;
      };
    }): Promise<AppUserScopeAccessRecord | null>;
    findMany(input: {
      include: {
        company: true;
        user: true;
      };
      orderBy: [{ user: { name: "asc" } }, { role: "asc" }];
      where: {
        companyId: string;
        isActive: true;
        periodId: string;
        tenantId: string;
      };
    }): Promise<AppUserScopeAccessRecord[]>;
    update(input: {
      data: { isActive?: false; role?: UserManagementRole };
      include: {
        company: true;
        user: true;
      };
      where: {
        id: string;
      };
    }): Promise<AppUserScopeAccessRecord>;
  };
  emailOutbox: {
    findMany(input: {
      orderBy: [{ createdAt: "desc" }];
      take: 20;
      where: {
        companyId: string;
        periodId: string;
        tenantId: string;
      };
    }): Promise<EmailOutboxRecord[]>;
  };
  userInvitation: {
    findMany(input: {
      orderBy: [{ createdAt: "desc" }];
      take: 20;
      where: {
        companyId: string;
        periodId: string;
        tenantId: string;
      };
    }): Promise<UserInvitationRecord[]>;
  };
};

export function createUserManagementPrismaRepository(
  prisma: UserManagementPrismaClientLike,
): UserManagementRepository {
  return {
    async deactivateUserAccess({
      accessId,
      scope,
    }: {
      accessId: string;
      scope: TenantScope;
    }) {
      const existing = await prisma.appUserScopeAccess.findFirst({
        where: {
          companyId: scope.companyId,
          id: accessId,
          isActive: true,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
        },
        include: {
          company: true,
          user: true,
        },
      });

      if (!existing) {
        return null;
      }

      const row = await prisma.appUserScopeAccess.update({
        where: {
          id: accessId,
        },
        data: {
          isActive: false,
        },
        include: {
          company: true,
          user: true,
        },
      });

      return userAccessRecordToRow(row);
    },

    async updateUserAccessRole({ accessId, role, scope }) {
      const existing = await prisma.appUserScopeAccess.findFirst({ where: { companyId: scope.companyId, id: accessId, isActive: true, periodId: scope.periodId, tenantId: scope.tenantId }, include: { company: true, user: true } });
      if (!existing) return null;
      const row = await prisma.appUserScopeAccess.update({ where: { id: accessId }, data: { role }, include: { company: true, user: true } });
      return userAccessRecordToRow(row);
    },

    async listActiveUserAccesses({ scope }: { scope: TenantScope }) {
      const rows = await prisma.appUserScopeAccess.findMany({
        where: {
          companyId: scope.companyId,
          isActive: true,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
        },
        include: {
          company: true,
          user: true,
        },
        orderBy: [{ user: { name: "asc" } }, { role: "asc" }],
      });

      return rows.map(userAccessRecordToRow);
    },
    async listEmailOutboxMessages({ scope }: { scope: TenantScope }) {
      const rows = await prisma.emailOutbox.findMany({
        where: {
          companyId: scope.companyId,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
        },
        orderBy: [{ createdAt: "desc" }],
        take: 20,
      });

      return rows.map(emailOutboxRecordToRow);
    },
    async listInvitations({ scope }: { scope: TenantScope }) {
      const rows = await prisma.userInvitation.findMany({
        where: {
          companyId: scope.companyId,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
        },
        orderBy: [{ createdAt: "desc" }],
        take: 20,
      });

      return rows.map(invitationRecordToRow);
    },
  };
}

function userAccessRecordToRow(
  row: AppUserScopeAccessRecord,
): UserManagementUserAccessRecord {
  return {
    companyId: row.company.id,
    companyName: row.company.name,
    email: row.user.email,
    id: row.id,
    isActive: row.isActive,
    periodId: row.periodId,
    role: row.role,
    tenantId: row.tenantId,
    userId: row.user.id,
    userName: row.user.name,
  };
}

function emailOutboxRecordToRow(
  row: EmailOutboxRecord,
): UserManagementEmailOutboxRecord {
  return {
    companyId: row.companyId,
    createdAt:
      typeof row.createdAt === "string"
        ? row.createdAt
        : row.createdAt.toISOString(),
    id: row.id,
    periodId: row.periodId,
    recipientEmail: row.recipientEmail,
    status: row.status,
    subject: row.subject,
    template: row.template,
    tenantId: row.tenantId,
  };
}

function invitationRecordToRow(
  row: UserInvitationRecord,
): UserManagementInvitationRecord {
  return {
    companyId: row.companyId,
    email: row.email,
    expiresAt:
      typeof row.expiresAt === "string"
        ? row.expiresAt
        : row.expiresAt.toISOString(),
    id: row.id,
    periodId: row.periodId,
    role: row.role,
    status: row.status,
    tenantId: row.tenantId,
  };
}
