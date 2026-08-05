import type {
  AuditLogEntry,
  AuditLogReadRepository,
  AuditLogRepository,
} from "./audit-log";
import { createAuditLogEntry } from "./audit-log";
import type { TenantScope } from "./tenant-scope";

export const USER_MANAGEMENT_ROLES = ["admin", "accounting", "viewer"] as const;
export type UserManagementRole = (typeof USER_MANAGEMENT_ROLES)[number];

export type UserManagementUserAccessRecord = {
  companyId: string;
  companyName: string;
  email: string | null;
  id: string;
  isActive: boolean;
  periodId: string;
  role: string;
  tenantId: string;
  userId: string;
  userName: string;
};

export type UserManagementAccessProfileAssignmentRecord = {
  companyId: string;
  id: string;
  periodId: string;
  profileId: string;
  tenantId: string;
  userId: string;
};

export type UserManagementAccessMutationRecord = {
  access: UserManagementUserAccessRecord;
  removedAssignment: UserManagementAccessProfileAssignmentRecord | null;
};

export type UserManagementInvitationRecord = {
  companyId: string;
  email: string;
  expiresAt: string;
  id: string;
  periodId: string;
  role: string;
  status: string;
  tenantId: string;
};

export type UserManagementEmailOutboxRecord = {
  companyId: string;
  createdAt: string;
  id: string;
  periodId: string;
  recipientEmail: string;
  status: string;
  subject: string;
  template: string;
  tenantId: string;
};

export type UserManagementUserRow = {
  companyName: string;
  email: string;
  fullName: string;
  id: string;
  role: string;
  statusLabel: string;
  userId?: string;
};

export type UserManagementInvitationRow = {
  email: string;
  expiresAt: string;
  id: string;
  role: string;
  status: string;
  statusLabel: string;
};

export type UserManagementEmailOutboxRow = {
  createdAt: string;
  id: string;
  recipientEmail: string;
  status: string;
  statusLabel: string;
  subject: string;
  template: string;
};

export type UserManagementAuditRow = {
  action: string;
  detail: string;
  entityLabel: string;
  id: string;
  occurredAt: string;
};

export type UserManagementOverview = {
  activeUsers: UserManagementUserRow[];
  auditLogs: UserManagementAuditRow[];
  emailOutboxMessages?: UserManagementEmailOutboxRow[];
  invitations: UserManagementInvitationRow[];
  summary: {
    acceptedInvitationCount: number;
    activeUserCount: number;
    pendingInvitationCount: number;
  };
};

export type UserManagementResult<T> =
  | { data: T; ok: true }
  | { errors: string[]; ok: false };

export type UserManagementRepository = {
  deactivateUserAccess(input: {
    accessId: string;
    scope: TenantScope;
  }): Promise<UserManagementAccessMutationRecord | null>;
  updateUserAccessRole(input: {
    accessId: string;
    role: UserManagementRole;
    scope: TenantScope;
  }): Promise<UserManagementAccessMutationRecord | null>;
  listActiveUserAccesses(input: {
    scope: TenantScope;
  }): Promise<UserManagementUserAccessRecord[]>;
  listEmailOutboxMessages(input: {
    scope: TenantScope;
  }): Promise<UserManagementEmailOutboxRecord[]>;
  listInvitations(input: {
    scope: TenantScope;
  }): Promise<UserManagementInvitationRecord[]>;
};

export class UserManagementRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserManagementRepositoryError";
  }
}

export function createUserManagementService({
  auditLogReadRepository,
  auditLogRepository,
  now = () => new Date().toISOString(),
  repository,
}: {
  auditLogReadRepository?: AuditLogReadRepository;
  auditLogRepository?: AuditLogRepository;
  now?: () => string;
  repository: UserManagementRepository;
}) {
  return {
    async updateUserAccessRole({
      accessId,
      role,
      scope,
    }: {
      accessId: string;
      role: UserManagementRole;
      scope: TenantScope;
    }): Promise<
      UserManagementResult<{
        removedAccessProfileId: string | null;
        updatedAccess: UserManagementUserAccessRecord;
      }>
    > {
      if (scope.userRole !== "admin") {
        return { ok: false, errors: ["Kullanıcı rolü değiştirme yetkisi yalnız admin rolündedir."] };
      }
      if (!USER_MANAGEMENT_ROLES.includes(role)) {
        return { ok: false, errors: ["Geçersiz kullanıcı rolü."] };
      }
      const access = (await repository.listActiveUserAccesses({ scope })).find((row) => row.id === accessId);
      if (!access) return { ok: false, errors: ["Kullanıcı erişimi bulunamadı."] };
      if (access.userId === scope.userId && role !== "admin") {
        return { ok: false, errors: ["Kendi admin rolünüzü bu ekrandan düşüremezsiniz."] };
      }
      if (access.role === role) {
        return {
          ok: true,
          data: { removedAccessProfileId: null, updatedAccess: access },
        };
      }
      try {
        const mutation = await repository.updateUserAccessRole({
          accessId,
          role,
          scope,
        });
        if (!mutation) {
          return { ok: false, errors: ["Kullanıcı erişimi bulunamadı."] };
        }
        const { access: updatedAccess, removedAssignment } = mutation;
        await auditLogRepository?.record(
          createAuditLogEntry(scope, {
            action: "user-management.role-change",
            entityId: updatedAccess.id,
            entityLabel: `${updatedAccess.userName} / ${updatedAccess.email ?? "-"}`,
            entityType: "user-access",
            occurredAt: now(),
            metadata: {
              email: updatedAccess.email ?? "-",
              ...(removedAssignment
                ? {
                    accessProfileRemovalReason: "role-change",
                    removedAccessProfileId: removedAssignment.profileId,
                  }
                : {}),
              role: updatedAccess.role,
              statusFrom: access.role,
              statusTo: updatedAccess.role,
              userId: updatedAccess.userId,
            },
          }),
        );
        return {
          ok: true,
          data: {
            removedAccessProfileId: removedAssignment?.profileId ?? null,
            updatedAccess,
          },
        };
      } catch (error) {
        return userManagementMutationFailure(
          error,
          "Kullanıcı rolü ve yetki profili birlikte güncellenemedi.",
        );
      }
    },
    async deactivateUserAccess({
      accessId,
      scope,
    }: {
      accessId: string;
      scope: TenantScope;
    }): Promise<
      UserManagementResult<{
        deactivatedAccess: UserManagementUserAccessRecord;
        removedAccessProfileId: string | null;
      }>
    > {
      if (scope.userRole !== "admin") {
        return {
          ok: false,
          errors: [
            "Kullanıcı devre dışı bırakma yetkisi yalnız admin rolündedir.",
          ],
        };
      }

      const activeAccesses = await repository.listActiveUserAccesses({ scope });
      const access = activeAccesses.find((row) => row.id === accessId);

      if (!access) {
        return { ok: false, errors: ["Kullanıcı erişimi bulunamadı."] };
      }

      if (access.userId === scope.userId) {
        return {
          ok: false,
          errors: ["Aktif kullanıcı kendi erişimini devre dışı bırakamaz."],
        };
      }

      try {
        const mutation = await repository.deactivateUserAccess({
          accessId,
          scope,
        });

        if (!mutation) {
          return { ok: false, errors: ["Kullanıcı erişimi bulunamadı."] };
        }
        const { access: deactivatedAccess, removedAssignment } = mutation;

        await auditLogRepository?.record(
          createAuditLogEntry(scope, {
            action: "user-management.deactivate",
            entityId: deactivatedAccess.id,
            entityLabel: `${deactivatedAccess.userName} / ${deactivatedAccess.email ?? "-"}`,
            entityType: "user-access",
            occurredAt: now(),
            metadata: {
              email: deactivatedAccess.email ?? "-",
              ...(removedAssignment
                ? {
                    accessProfileRemovalReason: "access-deactivation",
                    removedAccessProfileId: removedAssignment.profileId,
                  }
                : {}),
              role: deactivatedAccess.role,
              statusFrom: "active",
              statusTo: "inactive",
              userId: deactivatedAccess.userId,
            },
          }),
        );

        return {
          ok: true,
          data: {
            deactivatedAccess,
            removedAccessProfileId: removedAssignment?.profileId ?? null,
          },
        };
      } catch (error) {
        return userManagementMutationFailure(
          error,
          "Kullanıcı erişimi ve yetki profili birlikte devre dışı bırakılamadı.",
        );
      }
    },

    async listOverview({
      scope,
    }: {
      scope: TenantScope;
    }): Promise<UserManagementResult<{ overview: UserManagementOverview }>> {
      const [userAccesses, invitations, auditLogs, emailOutboxMessages] =
        await Promise.all([
          repository.listActiveUserAccesses({ scope }),
          repository.listInvitations({ scope }),
          listUserManagementAuditLogs(auditLogReadRepository, scope),
          repository.listEmailOutboxMessages({ scope }),
        ]);
      const activeUsers = userAccesses
        .filter((access) => isSameScope(access, scope) && access.isActive)
        .map(userAccessToRow);
      const currentTime = now();
      const invitationRows = invitations
        .filter((invitation) => isSameScope(invitation, scope))
        .map((invitation) => invitationToRow(invitation, currentTime));

      return {
        ok: true,
        data: {
          overview: {
            activeUsers,
            auditLogs: auditLogs.map(auditLogToRow),
            emailOutboxMessages: emailOutboxMessages
              .filter((message) => isSameScope(message, scope))
              .map(emailOutboxMessageToRow),
            invitations: invitationRows,
            summary: {
              acceptedInvitationCount: invitationRows.filter(
                (invitation) => invitation.status === "accepted",
              ).length,
              activeUserCount: activeUsers.length,
              pendingInvitationCount: invitationRows.filter(
                (invitation) => invitation.status === "pending",
              ).length,
            },
          },
        },
      };
    },
  };
}

async function listUserManagementAuditLogs(
  repository: AuditLogReadRepository | undefined,
  scope: TenantScope,
) {
  if (!repository) {
    return [];
  }

  const auditLogs = await Promise.all([
    repository.listByEntityType({
      scope,
      entityType: "user-access",
      limit: 20,
    }),
    repository.listByEntityType({
      scope,
      entityType: "user-invitation",
      limit: 20,
    }),
  ]);

  return auditLogs
    .flat()
    .sort(compareAuditLogsDesc)
    .slice(0, 20);
}

function compareAuditLogsDesc(left: AuditLogEntry, right: AuditLogEntry) {
  const occurredDiff =
    new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();

  if (occurredDiff !== 0) {
    return occurredDiff;
  }

  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

function auditLogToRow(entry: AuditLogEntry): UserManagementAuditRow {
  return {
    action: entry.action,
    detail: formatAuditLogDetail(entry),
    entityLabel: entry.entityLabel,
    id: entry.id,
    occurredAt: entry.occurredAt,
  };
}

function formatAuditLogDetail(entry: AuditLogEntry) {
  const statusFrom = entry.metadata.statusFrom;
  const statusTo = entry.metadata.statusTo;

  if (typeof statusFrom === "string" && typeof statusTo === "string") {
    const statusDetail = `${statusFrom} -> ${statusTo}`;
    const expiresAt = entry.metadata.expiresAt;

    if (entry.action === "user-invitation.resend" && typeof expiresAt === "string") {
      return `${statusDetail} / Geçerlilik: ${formatAuditDateFromIso(expiresAt)}`;
    }

    return statusDetail;
  }

  if (typeof entry.metadata.role === "string") {
    return `Rol: ${entry.metadata.role}`;
  }

  return "-";
}

function formatAuditDateFromIso(value: string) {
  return new Intl.DateTimeFormat("tr-TR").format(new Date(value));
}

export function createSeededUserManagementMemoryRepository({
  accessProfileAssignments = [],
  emailOutboxMessages = [],
  invitations = [],
  userAccesses = [],
}: {
  accessProfileAssignments?: UserManagementAccessProfileAssignmentRecord[];
  emailOutboxMessages?: UserManagementEmailOutboxRecord[];
  invitations?: UserManagementInvitationRecord[];
  userAccesses?: UserManagementUserAccessRecord[];
} = {}): UserManagementRepository {
  return {
    async updateUserAccessRole({ accessId, role, scope }) {
      const index = userAccesses.findIndex((access) => access.id === accessId && isSameScope(access, scope) && access.isActive);
      if (index === -1) return null;
      const access = userAccesses[index]!;
      const removedAssignment =
        role === "viewer"
          ? null
          : removeMemoryAccessProfileAssignment(
              accessProfileAssignments,
              scope,
              access.userId,
            );
      userAccesses[index] = { ...access, role };
      return { access: userAccesses[index]!, removedAssignment };
    },
    async deactivateUserAccess({ accessId, scope }) {
      const index = userAccesses.findIndex(
        (access) =>
          access.id === accessId && isSameScope(access, scope) && access.isActive,
      );

      if (index === -1) {
        return null;
      }

      const access = userAccesses[index]!;
      const removedAssignment = removeMemoryAccessProfileAssignment(
        accessProfileAssignments,
        scope,
        access.userId,
      );
      const deactivatedAccess = { ...access, isActive: false };
      userAccesses[index] = deactivatedAccess;

      return { access: deactivatedAccess, removedAssignment };
    },
    async listActiveUserAccesses({ scope }) {
      return userAccesses.filter(
        (access) => isSameScope(access, scope) && access.isActive,
      );
    },
    async listEmailOutboxMessages({ scope }) {
      return emailOutboxMessages.filter((message) => isSameScope(message, scope));
    },
    async listInvitations({ scope }) {
      return invitations.filter((invitation) => isSameScope(invitation, scope));
    },
  };
}

function removeMemoryAccessProfileAssignment(
  assignments: UserManagementAccessProfileAssignmentRecord[],
  scope: TenantScope,
  userId: string,
) {
  const index = assignments.findIndex(
    (assignment) =>
      isSameScope(assignment, scope) && assignment.userId === userId,
  );
  if (index === -1) return null;
  return assignments.splice(index, 1)[0] ?? null;
}

function userManagementMutationFailure<T>(
  error: unknown,
  fallback: string,
): UserManagementResult<T> {
  return {
    errors: [
      error instanceof UserManagementRepositoryError ? error.message : fallback,
    ],
    ok: false,
  };
}

function emailOutboxMessageToRow(
  message: UserManagementEmailOutboxRecord,
): UserManagementEmailOutboxRow {
  return {
    createdAt: message.createdAt,
    id: message.id,
    recipientEmail: message.recipientEmail,
    status: message.status,
    statusLabel: formatEmailOutboxStatus(message.status),
    subject: message.subject,
    template: message.template,
  };
}

function formatEmailOutboxStatus(status: string) {
  if (status === "pending") {
    return "Bekliyor";
  }

  if (status === "sent") {
    return "Gönderildi";
  }

  if (status === "failed") {
    return "Hatalı";
  }

  return status;
}

function userAccessToRow(
  access: UserManagementUserAccessRecord,
): UserManagementUserRow {
  return {
    companyName: access.companyName,
    email: access.email ?? "-",
    fullName: access.userName,
    id: access.id,
    role: access.role,
    statusLabel: "Aktif",
    userId: access.userId,
  };
}

function invitationToRow(
  invitation: UserManagementInvitationRecord,
  currentTime: string,
): UserManagementInvitationRow {
  const status = resolveInvitationStatus(invitation, currentTime);

  return {
    email: invitation.email,
    expiresAt: invitation.expiresAt,
    id: invitation.id,
    role: invitation.role,
    status,
    statusLabel: formatInvitationStatus(status),
  };
}

function resolveInvitationStatus(
  invitation: UserManagementInvitationRecord,
  currentTime: string,
) {
  if (
    invitation.status === "pending" &&
    new Date(invitation.expiresAt).getTime() <= new Date(currentTime).getTime()
  ) {
    return "expired";
  }

  return invitation.status;
}

function formatInvitationStatus(status: string) {
  if (status === "pending") {
    return "Bekliyor";
  }

  if (status === "accepted") {
    return "Kabul Edildi";
  }

  if (status === "revoked") {
    return "İptal Edildi";
  }

  if (status === "expired") {
    return "Süresi Doldu";
  }

  return status;
}

function isSameScope(
  row: { companyId: string; periodId: string; tenantId: string },
  scope: TenantScope,
) {
  return (
    row.tenantId === scope.tenantId &&
    row.companyId === scope.companyId &&
    row.periodId === scope.periodId
  );
}
