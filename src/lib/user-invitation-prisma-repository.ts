import type {
  UserInvitationCredentialCreate,
  UserInvitationRepository,
  UserInvitationRow,
  UserInvitationScopeAccessCreate,
  UserInvitationSessionCreate,
  UserInvitationUserCreate,
} from "./user-invitation-service";
import { UserInvitationRepositoryError } from "./user-invitation-service";
import type { AccessProfileAssignmentSnapshot } from "./access-profile";
import type { TenantScope } from "./tenant-scope";

type UserInvitationRecord = {
  accessProfileId?: string | null;
  acceptedAt: Date | string | null;
  companyId: string;
  createdAt: Date | string;
  email: string;
  expiresAt: Date | string;
  id: string;
  invitedBy: string;
  periodId: string;
  revokedAt: Date | string | null;
  role: string;
  status: string;
  tenantId: string;
  tokenHash: string;
  updatedAt: Date | string;
};

type UserInvitationClient = {
  create(input: {
    data: ReturnType<typeof invitationRowToCreateData>;
  }): Promise<UserInvitationRecord>;
  findFirst(input: {
    where: {
      companyId: string;
      id: string;
      periodId: string;
      tenantId: string;
    };
  }): Promise<UserInvitationRecord | null>;
  findUnique(input: {
    where: {
      tokenHash: string;
    };
  }): Promise<UserInvitationRecord | null>;
  update(input: {
    data: {
      acceptedAt?: Date | null;
      expiresAt?: Date;
      revokedAt?: Date | null;
      status: "accepted" | "pending" | "revoked";
      tokenHash?: string;
      updatedAt: Date;
    };
    where: {
      id: string;
    };
  }): Promise<UserInvitationRecord>;
};

type AccessProfileClient = {
  findFirst(input: {
    select: { companyId: true; id: true; status: true; tenantId: true };
    where: {
      companyId: string;
      id: string;
      status?: "ACTIVE";
      tenantId: string;
    };
  }): Promise<{
    companyId: string;
    id: string;
    status: string;
    tenantId: string;
  } | null>;
};

type UserAccessProfileAssignmentClient = {
  create(input: {
    data: ReturnType<typeof accessProfileAssignmentData>;
  }): Promise<unknown>;
};

export type UserInvitationPrismaClientLike = {
  $transaction?<T>(
    callback: (transaction: UserInvitationPrismaClientLike) => Promise<T>,
  ): Promise<T>;
  accessProfile?: AccessProfileClient;
  appCredential: {
    create(input: {
      data: UserInvitationCredentialCreate;
    }): Promise<unknown>;
  };
  appSession: {
    create(input: {
      data: UserInvitationSessionCreate;
    }): Promise<unknown>;
  };
  appUser: {
    create(input: {
      data: UserInvitationUserCreate;
    }): Promise<unknown>;
  };
  appUserScopeAccess: {
    create(input: {
      data: UserInvitationScopeAccessCreate;
    }): Promise<unknown>;
  };
  userAccessProfileAssignment?: UserAccessProfileAssignmentClient;
  userInvitation: UserInvitationClient;
};

export function createUserInvitationPrismaRepository(
  prisma: UserInvitationPrismaClientLike,
): UserInvitationRepository {
  return {
    async acceptInvitation({
      acceptedAt,
      accessProfileAssignment,
      credential,
      invitation,
      scopeAccess,
      session,
      user,
    }) {
      const execute = async (client: UserInvitationPrismaClientLike) => {
        if (accessProfileAssignment) {
          const activeProfile = await client.accessProfile?.findFirst({
            select: {
              companyId: true,
              id: true,
              status: true,
              tenantId: true,
            },
            where: {
              companyId: invitation.companyId,
              id: accessProfileAssignment.profileId,
              status: "ACTIVE",
              tenantId: invitation.tenantId,
            },
          });
          if (!activeProfile || !client.userAccessProfileAssignment) {
            throw new UserInvitationRepositoryError(
              "Davet için seçilen aktif yetki profili bulunamadı.",
            );
          }
        }
        await client.appUser.create({ data: user });
        await client.appSession.create({ data: session });
        await client.appUserScopeAccess.create({ data: scopeAccess });
        await client.appCredential.create({ data: credential });
        if (accessProfileAssignment) {
          await client.userAccessProfileAssignment!.create({
            data: accessProfileAssignmentData(accessProfileAssignment),
          });
        }
        await client.userInvitation.update({
          data: {
            acceptedAt: new Date(acceptedAt),
            status: "accepted",
            updatedAt: new Date(acceptedAt),
          },
          where: {
            id: invitation.id,
          },
        });
      };
      if (prisma.$transaction) {
        await prisma.$transaction(execute);
      } else {
        await execute(prisma);
      }
    },

    async createInvitation({ invitation }) {
      const row = await prisma.userInvitation.create({
        data: invitationRowToCreateData(invitation),
      });

      return invitationRecordToRow(row);
    },

    async findByIdInScope({
      invitationId,
      scope,
    }: {
      invitationId: string;
      scope: TenantScope;
    }) {
      const row = await prisma.userInvitation.findFirst({
        where: {
          companyId: scope.companyId,
          id: invitationId,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
        },
      });

      return row ? invitationRecordToRow(row) : null;
    },

    async findByTokenHash({ tokenHash }) {
      const row = await prisma.userInvitation.findUnique({
        where: {
          tokenHash,
        },
      });

      return row ? invitationRecordToRow(row) : null;
    },

    async findAccessProfile({ companyId, profileId, tenantId }) {
      if (!prisma.accessProfile) return null;
      const profile = await prisma.accessProfile.findFirst({
        select: {
          companyId: true,
          id: true,
          status: true,
          tenantId: true,
        },
        where: { companyId, id: profileId, tenantId },
      });
      return profile
        ? {
            ...profile,
            status: profile.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
          }
        : null;
    },

    async revokeInvitation({ invitation, revokedAt }) {
      const row = await prisma.userInvitation.update({
        data: {
          revokedAt: new Date(revokedAt),
          status: "revoked",
          updatedAt: new Date(revokedAt),
        },
        where: {
          id: invitation.id,
        },
      });

      return invitationRecordToRow(row);
    },

    async resendInvitation({ expiresAt, invitation, resentAt, tokenHash }) {
      const row = await prisma.userInvitation.update({
        data: {
          acceptedAt: null,
          expiresAt: new Date(expiresAt),
          revokedAt: null,
          status: "pending",
          tokenHash,
          updatedAt: new Date(resentAt),
        },
        where: {
          id: invitation.id,
        },
      });

      return invitationRecordToRow(row);
    },
  };
}

function invitationRowToCreateData(row: UserInvitationRow) {
  return {
    acceptedAt: row.acceptedAt ? new Date(row.acceptedAt) : null,
    accessProfileId: row.accessProfileId ?? null,
    companyId: row.companyId,
    createdAt: new Date(row.createdAt),
    email: row.email,
    expiresAt: new Date(row.expiresAt),
    id: row.id,
    invitedBy: row.invitedBy,
    periodId: row.periodId,
    revokedAt: row.revokedAt ? new Date(row.revokedAt) : null,
    role: row.role,
    status: row.status,
    tenantId: row.tenantId,
    tokenHash: row.tokenHash,
    updatedAt: new Date(row.updatedAt),
  };
}

function invitationRecordToRow(row: UserInvitationRecord): UserInvitationRow {
  return {
    acceptedAt: row.acceptedAt ? toIsoString(row.acceptedAt) : undefined,
    accessProfileId: row.accessProfileId ?? undefined,
    companyId: row.companyId,
    createdAt: toIsoString(row.createdAt),
    email: row.email,
    expiresAt: toIsoString(row.expiresAt),
    id: row.id,
    invitedBy: row.invitedBy,
    periodId: row.periodId,
    revokedAt: row.revokedAt ? toIsoString(row.revokedAt) : undefined,
    role: row.role,
    status: normalizeStatus(row.status),
    tenantId: row.tenantId,
    tokenHash: row.tokenHash,
    updatedAt: toIsoString(row.updatedAt),
  };
}

function accessProfileAssignmentData(row: AccessProfileAssignmentSnapshot) {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function normalizeStatus(value: string): UserInvitationRow["status"] {
  if (
    value === "pending" ||
    value === "accepted" ||
    value === "revoked" ||
    value === "expired"
  ) {
    return value;
  }

  return "pending";
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
