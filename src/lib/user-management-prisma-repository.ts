import type { TenantScope } from "./tenant-scope";
import type {
  UserManagementAccessProfileAssignmentRecord,
  UserManagementAccessMutationRecord,
  UserManagementEmailOutboxRecord,
  UserManagementInvitationRecord,
  UserManagementRepository,
  UserManagementUserAccessRecord,
  UserManagementRole,
} from "./user-management-service";
import { UserManagementRepositoryError } from "./user-management-service";
import { resolveAccessProfileAssignmentLifecycle } from "./user-management-profile-lifecycle";

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

type AccessProfileAssignmentRecord = {
  companyId: string;
  id: string;
  periodId: string;
  profileId: string;
  tenantId: string;
  userId: string;
};

export type UserManagementMutationClientLike = {
  appUserScopeAccess: UserManagementPrismaClientLike["appUserScopeAccess"];
  userAccessProfileAssignment?: {
    deleteMany(input: {
      where: {
        companyId: string;
        id: string;
        periodId: string;
        tenantId: string;
        userId: string;
      };
    }): Promise<{ count: number }>;
    findFirst(input: {
      where: {
        companyId: string;
        periodId: string;
        tenantId: string;
        userId: string;
      };
    }): Promise<AccessProfileAssignmentRecord | null>;
  };
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
  userAccessProfileAssignment?: UserManagementMutationClientLike["userAccessProfileAssignment"];
  $transaction?<T>(
    callback: (client: UserManagementMutationClientLike) => Promise<T>,
  ): Promise<T>;
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
      return runAccessMutation(prisma, {
        accessId,
        operation: "deactivate",
        scope,
      });
    },

    async updateUserAccessRole({ accessId, role, scope }) {
      return runAccessMutation(prisma, {
        accessId,
        operation: "role-change",
        role,
        scope,
      });
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

async function runAccessMutation(
  prisma: UserManagementPrismaClientLike,
  input: {
    accessId: string;
    operation: "deactivate" | "role-change";
    role?: UserManagementRole;
    scope: TenantScope;
  },
): Promise<UserManagementAccessMutationRecord | null> {
  const execute = async (
    client: UserManagementMutationClientLike,
  ): Promise<UserManagementAccessMutationRecord | null> => {
    const existing = await client.appUserScopeAccess.findFirst({
      where: {
        companyId: input.scope.companyId,
        id: input.accessId,
        isActive: true,
        periodId: input.scope.periodId,
        tenantId: input.scope.tenantId,
      },
      include: {
        company: true,
        user: true,
      },
    });
    if (!existing) return null;

    const lifecycle = resolveAccessProfileAssignmentLifecycle({
      operation: input.operation,
      targetRole: input.role,
    });
    const assignment =
      lifecycle.removeAssignment && client.userAccessProfileAssignment
        ? await client.userAccessProfileAssignment.findFirst({
            where: {
              companyId: input.scope.companyId,
              periodId: input.scope.periodId,
              tenantId: input.scope.tenantId,
              userId: existing.user.id,
            },
          })
        : null;

    const row = await client.appUserScopeAccess.update({
      where: { id: input.accessId },
      data:
        input.operation === "deactivate"
          ? { isActive: false }
          : { role: input.role },
      include: {
        company: true,
        user: true,
      },
    });

    if (assignment && client.userAccessProfileAssignment) {
      const deleted = await client.userAccessProfileAssignment.deleteMany({
        where: {
          companyId: input.scope.companyId,
          id: assignment.id,
          periodId: input.scope.periodId,
          tenantId: input.scope.tenantId,
          userId: existing.user.id,
        },
      });
      if (deleted.count !== 1) {
        throw new UserManagementRepositoryError(
          "Yetki profili ataması beklenen kapsamda kaldırılamadı.",
        );
      }
    }

    return {
      access: userAccessRecordToRow(row),
      removedAssignment: assignment
        ? accessProfileAssignmentRecordToRow(assignment)
        : null,
    };
  };

  if (prisma.$transaction) {
    return prisma.$transaction((client) => execute(client));
  }
  return execute(prisma);
}

function accessProfileAssignmentRecordToRow(
  row: AccessProfileAssignmentRecord,
): UserManagementAccessProfileAssignmentRecord {
  return {
    companyId: row.companyId,
    id: row.id,
    periodId: row.periodId,
    profileId: row.profileId,
    tenantId: row.tenantId,
    userId: row.userId,
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
