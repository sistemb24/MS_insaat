import { createHash, randomBytes } from "node:crypto";

import type { AuditLogEntryInput, AuditLogRepository } from "./audit-log";
import { createAuditLogEntry } from "./audit-log";
import type { EmailOutboxMessageInput, EmailOutboxRepository } from "./email-outbox";
import { createPasswordHash } from "./password-hash";
import { getP0SettingsContract } from "./settings-contract";
import type { TenantScope } from "./tenant-scope";
import { validateTenantScope } from "./tenant-scope";
import type {
  AccessProfileAssignmentSnapshot,
  AccessProfileSnapshot,
} from "./access-profile";
import {
  createInvitationAccessProfileAssignment,
  normalizeInvitationAccessProfileId,
  validateInvitationAccessProfile,
  validateInvitationAccessProfileSelection,
} from "./user-invitation-access-profile";

export type UserInvitationRow = {
  accessProfileId?: string;
  acceptedAt?: string;
  companyId: string;
  createdAt: string;
  email: string;
  expiresAt: string;
  id: string;
  invitedBy: string;
  periodId: string;
  revokedAt?: string;
  role: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  tenantId: string;
  tokenHash: string;
  updatedAt: string;
};

export type UserInvitationCreateValues = {
  accessProfileId?: string;
  email: string;
  role: string;
};

export type UserInvitationAcceptValues = {
  fullName: string;
  password: string;
  passwordConfirm: string;
  token: string;
};

export type UserInvitationUserCreate = {
  email: string;
  id: string;
  name: string;
  tenantId: string;
};

export type UserInvitationSessionCreate = {
  companyId: string;
  expiresAt: null;
  id: string;
  licenseLabel: string;
  periodId: string;
  role: "admin" | "accounting" | "viewer";
  tenantId: string;
  userId: string;
};

export type UserInvitationScopeAccessCreate = {
  companyId: string;
  id: string;
  isActive: true;
  isDefault: true;
  licenseLabel: string;
  periodId: string;
  role: "admin" | "accounting" | "viewer";
  tenantId: string;
  userId: string;
};

export type UserInvitationCredentialCreate = {
  defaultSessionId: string;
  email: string;
  passwordHash: string;
  tenantId: string;
  userId: string;
};

export type UserInvitationResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      errors: string[];
    };

export type UserInvitationRepository = {
  acceptInvitation(input: {
    acceptedAt: string;
    accessProfileAssignment?: AccessProfileAssignmentSnapshot;
    credential: UserInvitationCredentialCreate;
    invitation: UserInvitationRow;
    scopeAccess: UserInvitationScopeAccessCreate;
    session: UserInvitationSessionCreate;
    user: UserInvitationUserCreate;
  }): Promise<void>;
  createInvitation(input: {
    invitation: UserInvitationRow;
  }): Promise<UserInvitationRow>;
  findByIdInScope(input: {
    invitationId: string;
    scope: TenantScope;
  }): Promise<UserInvitationRow | null>;
  findByTokenHash(input: {
    tokenHash: string;
  }): Promise<UserInvitationRow | null>;
  findAccessProfile(input: {
    companyId: string;
    profileId: string;
    tenantId: string;
  }): Promise<
    Pick<AccessProfileSnapshot, "companyId" | "id" | "status" | "tenantId"> | null
  >;
  revokeInvitation(input: {
    invitation: UserInvitationRow;
    revokedAt: string;
  }): Promise<UserInvitationRow>;
  resendInvitation(input: {
    expiresAt: string;
    invitation: UserInvitationRow;
    resentAt: string;
    tokenHash: string;
  }): Promise<UserInvitationRow>;
};

export class UserInvitationRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserInvitationRepositoryError";
  }
}

export function createUserInvitationService({
  appBaseUrl = "http://localhost:3000",
  auditLogRepository,
  emailOutboxRepository,
  now = () => new Date().toISOString(),
  passwordHasher = createPasswordHash,
  repository,
  tokenFactory = createInviteToken,
}: {
  appBaseUrl?: string;
  auditLogRepository?: AuditLogRepository;
  emailOutboxRepository?: EmailOutboxRepository;
  now?: () => string;
  passwordHasher?: (password: string) => string;
  repository: UserInvitationRepository;
  tokenFactory?: () => string;
}) {
  return {
    async acceptInvitation({
      values,
    }: {
      values: UserInvitationAcceptValues;
    }): Promise<
      UserInvitationResult<{ email: string; sessionId: string }>
    > {
      const normalized = normalizeAcceptValues(values);
      const invitation = normalized.token
        ? await repository.findByTokenHash({
            tokenHash: hashInviteToken(normalized.token),
          })
        : null;
      const accessProfile = invitation?.accessProfileId
        ? await repository.findAccessProfile({
            companyId: invitation.companyId,
            profileId: invitation.accessProfileId,
            tenantId: invitation.tenantId,
          })
        : null;
      const errors = [
        ...validateInvitationForAccept(invitation, now()),
        ...(invitation?.accessProfileId
          ? validateInvitationAccessProfile(accessProfile)
          : []),
        ...validateAcceptValues(normalized),
      ];

      if (!invitation || errors.length > 0) {
        return {
          ok: false,
          errors:
            errors.length > 0
              ? errors
              : ["Davet bağlantısı geçersiz veya süresi dolmuştur."],
        };
      }

      const acceptedAt = now();
      const identity = normalizeIdPart(invitation.email);
      const userId = `${invitation.tenantId}::user::${identity}`;
      const sessionId = [
        invitation.tenantId,
        invitation.companyId,
        invitation.periodId,
        "session",
        identity,
      ].join("::");
      const accessId = [
        invitation.tenantId,
        invitation.companyId,
        invitation.periodId,
        "access",
        identity,
      ].join("::");
      const role = mapUserTypeToSessionRole(invitation.role);
      const licenseLabel = "Pilot P0";

      try {
        await repository.acceptInvitation({
          acceptedAt,
          accessProfileAssignment: invitation.accessProfileId
            ? createInvitationAccessProfileAssignment({
                acceptedAt,
                companyId: invitation.companyId,
                periodId: invitation.periodId,
                profileId: invitation.accessProfileId,
                tenantId: invitation.tenantId,
                userId,
              })
            : undefined,
          credential: {
          defaultSessionId: sessionId,
          email: invitation.email,
          passwordHash: passwordHasher(normalized.password),
          tenantId: invitation.tenantId,
          userId,
        },
          invitation,
          scopeAccess: {
          companyId: invitation.companyId,
          id: accessId,
          isActive: true,
          isDefault: true,
          licenseLabel,
          periodId: invitation.periodId,
          role,
          tenantId: invitation.tenantId,
          userId,
        },
          session: {
          companyId: invitation.companyId,
          expiresAt: null,
          id: sessionId,
          licenseLabel,
          periodId: invitation.periodId,
          role,
          tenantId: invitation.tenantId,
          userId,
        },
          user: {
          email: invitation.email,
          id: userId,
          name: normalized.fullName || invitation.email.split("@")[0] || invitation.email,
          tenantId: invitation.tenantId,
          },
        });
      } catch (error) {
        return {
          ok: false,
          errors: [
            error instanceof UserInvitationRepositoryError
              ? error.message
              : "Davet kabulü atomik olarak tamamlanamadı.",
          ],
        };
      }
      await auditLogRepository?.record({
        action: "user-invitation.accept",
        actorUserId: userId,
        companyId: invitation.companyId,
        entityId: invitation.id,
        entityLabel: formatInvitationEntityLabel(invitation),
        entityType: "user-invitation",
        metadata: {
          ...(invitation.accessProfileId
            ? { accessProfileId: invitation.accessProfileId }
            : {}),
          email: invitation.email,
          role: invitation.role,
          sessionId,
          statusFrom: "pending",
          statusTo: "accepted",
          userId,
        },
        occurredAt: acceptedAt,
        periodId: invitation.periodId,
        tenantId: invitation.tenantId,
      } satisfies AuditLogEntryInput);

      return {
        ok: true,
        data: {
          email: invitation.email,
          sessionId,
        },
      };
    },

    async createInvitation({
      scope,
      values,
    }: {
      scope: TenantScope;
      values: UserInvitationCreateValues;
    }): Promise<
      UserInvitationResult<{ invitation: UserInvitationRow; token: string }>
    > {
      const normalized = normalizeCreateValues(values);
      const accessProfile = normalized.accessProfileId
        ? await repository.findAccessProfile({
            companyId: scope.companyId,
            profileId: normalized.accessProfileId,
            tenantId: scope.tenantId,
          })
        : null;
      const errors = [
        ...validateTenantScope(scope),
        ...validateCreatePermission(scope),
        ...validateCreateValues(normalized),
        ...(normalized.accessProfileId
          ? validateInvitationAccessProfile(accessProfile)
          : []),
      ];

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      const timestamp = now();
      const token = tokenFactory();
      const invitation: UserInvitationRow = {
        acceptedAt: undefined,
        accessProfileId: normalized.accessProfileId,
        companyId: scope.companyId,
        createdAt: timestamp,
        email: normalized.email,
        expiresAt: addDays(timestamp, 7),
        id: createInvitationId(scope, normalized.email),
        invitedBy: scope.userId,
        periodId: scope.periodId,
        revokedAt: undefined,
        role: normalized.role,
        status: "pending",
        tenantId: scope.tenantId,
        tokenHash: hashInviteToken(token),
        updatedAt: timestamp,
      };
      const persistedInvitation = await repository.createInvitation({ invitation });

      await auditLogRepository?.record(
        createAuditLogEntry(scope, {
          action: "user-invitation.create",
          entityId: persistedInvitation.id,
          entityLabel: formatInvitationEntityLabel(persistedInvitation),
          entityType: "user-invitation",
          occurredAt: timestamp,
          metadata: {
            ...(persistedInvitation.accessProfileId
              ? { accessProfileId: persistedInvitation.accessProfileId }
              : {}),
            email: persistedInvitation.email,
            expiresAt: persistedInvitation.expiresAt,
            role: persistedInvitation.role,
            statusTo: "pending",
          },
        }),
      );
      await emailOutboxRepository?.enqueue(
        createInvitationEmailOutboxMessage({
          action: "create",
          appBaseUrl,
          createdAt: timestamp,
          invitation: persistedInvitation,
          token,
        }),
      );

      return {
        ok: true,
        data: {
          invitation: persistedInvitation,
          token,
        },
      };
    },

    async revokeInvitation({
      invitationId,
      scope,
    }: {
      invitationId: string;
      scope: TenantScope;
    }): Promise<UserInvitationResult<{ invitation: UserInvitationRow }>> {
      if (scope.userRole !== "admin") {
        return {
          ok: false,
          errors: ["Davet iptali için admin yetkisi gereklidir."],
        };
      }

      const invitation = await repository.findByIdInScope({
        invitationId,
        scope,
      });

      if (!invitation) {
        return { ok: false, errors: ["Davet kaydı bulunamadı."] };
      }

      if (invitation.status !== "pending" || invitation.acceptedAt) {
        return {
          ok: false,
          errors: ["Yalnız bekleyen davetler iptal edilebilir."],
        };
      }

      const revokedAt = now();
      const revokedInvitation = await repository.revokeInvitation({
        invitation,
        revokedAt,
      });

      await auditLogRepository?.record(
        createAuditLogEntry(scope, {
          action: "user-invitation.revoke",
          entityId: revokedInvitation.id,
          entityLabel: formatInvitationEntityLabel(revokedInvitation),
          entityType: "user-invitation",
          occurredAt: revokedAt,
          metadata: {
            email: revokedInvitation.email,
            role: revokedInvitation.role,
            statusFrom: "pending",
            statusTo: "revoked",
          },
        }),
      );

      return {
        ok: true,
        data: {
          invitation: revokedInvitation,
        },
      };
    },

    async resendInvitation({
      invitationId,
      scope,
    }: {
      invitationId: string;
      scope: TenantScope;
    }): Promise<
      UserInvitationResult<{ invitation: UserInvitationRow; token: string }>
    > {
      if (scope.userRole !== "admin") {
        return {
          ok: false,
          errors: ["Davet yeniden gönderimi için admin yetkisi gereklidir."],
        };
      }

      const invitation = await repository.findByIdInScope({
        invitationId,
        scope,
      });

      if (!invitation) {
        return { ok: false, errors: ["Davet kaydı bulunamadı."] };
      }

      const resentAt = now();
      const statusFrom = resolveResendStatus(invitation, resentAt);

      if (statusFrom !== "expired" && statusFrom !== "revoked") {
        return {
          ok: false,
          errors: [
            "Yalnız süresi dolmuş veya iptal edilmiş davetler yeniden gönderilebilir.",
          ],
        };
      }

      const token = tokenFactory();
      const resentInvitation = await repository.resendInvitation({
        expiresAt: addDays(resentAt, 7),
        invitation,
        resentAt,
        tokenHash: hashInviteToken(token),
      });

      await auditLogRepository?.record(
        createAuditLogEntry(scope, {
          action: "user-invitation.resend",
          entityId: resentInvitation.id,
          entityLabel: formatInvitationEntityLabel(resentInvitation),
          entityType: "user-invitation",
          occurredAt: resentAt,
          metadata: {
            email: resentInvitation.email,
            expiresAt: resentInvitation.expiresAt,
            role: resentInvitation.role,
            statusFrom,
            statusTo: "pending",
          },
        }),
      );
      await emailOutboxRepository?.enqueue(
        createInvitationEmailOutboxMessage({
          action: "resend",
          appBaseUrl,
          createdAt: resentAt,
          invitation: resentInvitation,
          statusFrom,
          token,
        }),
      );

      return {
        ok: true,
        data: {
          invitation: resentInvitation,
          token,
        },
      };
    },
  };
}

function createInvitationEmailOutboxMessage({
  action,
  appBaseUrl,
  createdAt,
  invitation,
  statusFrom,
  token,
}: {
  action: "create" | "resend";
  appBaseUrl: string;
  createdAt: string;
  invitation: UserInvitationRow;
  statusFrom?: string;
  token: string;
}): EmailOutboxMessageInput {
  const inviteUrl = createInviteUrl(appBaseUrl, token);
  const template =
    action === "create" ? "user-invitation-create" : "user-invitation-resend";
  const opening =
    action === "create"
      ? "NOA İnşaat Yönetim hesabınıza katılmak için davet bağlantısı:"
      : "NOA İnşaat Yönetim hesabınıza katılmak için yenilenen davet bağlantısı:";

  return {
    bodyText: `${opening}\n${inviteUrl}\n\nRol: ${invitation.role}\nGeçerlilik: ${invitation.expiresAt}`,
    channel: "email",
    companyId: invitation.companyId,
    createdAt,
    id: createEmailOutboxId(invitation, template, createdAt),
    metadata: {
      action,
      expiresAt: invitation.expiresAt,
      invitationId: invitation.id,
      inviteUrl,
      role: invitation.role,
      ...(statusFrom ? { statusFrom } : {}),
    },
    periodId: invitation.periodId,
    recipientEmail: invitation.email,
    status: "pending",
    subject:
      action === "create"
        ? "NOA İnşaat kullanıcı daveti"
        : "NOA İnşaat davet bağlantınız yenilendi",
    template,
    tenantId: invitation.tenantId,
  };
}

function createInviteUrl(appBaseUrl: string, token: string) {
  return `${appBaseUrl.replace(/\/$/, "")}/davet?token=${encodeURIComponent(token)}`;
}

function createEmailOutboxId(
  invitation: UserInvitationRow,
  template: string,
  createdAt: string,
) {
  return [
    invitation.tenantId,
    invitation.companyId,
    invitation.periodId,
    "email-outbox",
    template,
    normalizeIdPart(invitation.email),
    normalizeIdPart(createdAt),
  ].join("::");
}

function formatInvitationEntityLabel(invitation: UserInvitationRow) {
  return `${invitation.email} / ${invitation.role}`;
}

function resolveResendStatus(invitation: UserInvitationRow, nowIso: string) {
  if (invitation.status === "revoked") {
    return "revoked";
  }

  if (
    invitation.status === "pending" &&
    new Date(invitation.expiresAt).getTime() <= new Date(nowIso).getTime()
  ) {
    return "expired";
  }

  return invitation.status;
}

export function createSeededUserInvitationMemoryRepository({
  acceptedAssignments = [],
  accessProfiles = [],
  invitations = [],
}: {
  acceptedAssignments?: AccessProfileAssignmentSnapshot[];
  accessProfiles?: AccessProfileSnapshot[];
  invitations?: UserInvitationRow[];
} = {}): UserInvitationRepository {
  const rows = [...invitations];

  return {
    async acceptInvitation({ acceptedAt, accessProfileAssignment, credential, invitation, scopeAccess, session, user }) {
      const index = rows.findIndex((row) => row.id === invitation.id);

      if (index >= 0) {
        rows[index] = {
          ...rows[index],
          acceptedAt,
          status: "accepted",
          updatedAt: acceptedAt,
        };
      }

      void credential;
      if (accessProfileAssignment) {
        acceptedAssignments.push(accessProfileAssignment);
      }
      void scopeAccess;
      void session;
      void user;
    },

    async createInvitation({ invitation }) {
      rows.push(invitation);

      return invitation;
    },

    async findByIdInScope({ invitationId, scope }) {
      return (
        rows.find(
          (row) =>
            row.id === invitationId &&
            row.tenantId === scope.tenantId &&
            row.companyId === scope.companyId &&
            row.periodId === scope.periodId,
        ) ?? null
      );
    },

    async findByTokenHash({ tokenHash }) {
      return rows.find((row) => row.tokenHash === tokenHash) ?? null;
    },

    async findAccessProfile({ companyId, profileId, tenantId }) {
      return (
        accessProfiles.find(
          (profile) =>
            profile.id === profileId &&
            profile.companyId === companyId &&
            profile.tenantId === tenantId,
        ) ?? null
      );
    },

    async revokeInvitation({ invitation, revokedAt }) {
      const index = rows.findIndex((row) => row.id === invitation.id);
      const revokedInvitation = {
        ...invitation,
        revokedAt,
        status: "revoked" as const,
        updatedAt: revokedAt,
      };

      if (index >= 0) {
        rows[index] = revokedInvitation;
      }

      return revokedInvitation;
    },
    async resendInvitation({ expiresAt, invitation, resentAt, tokenHash }) {
      const index = rows.findIndex((row) => row.id === invitation.id);
      const resentInvitation = {
        ...invitation,
        acceptedAt: undefined,
        expiresAt,
        revokedAt: undefined,
        status: "pending" as const,
        tokenHash,
        updatedAt: resentAt,
      };

      if (index >= 0) {
        rows[index] = resentInvitation;
      }

      return resentInvitation;
    },
  };
}

export function canCreateUserInvitations(scope: TenantScope) {
  return scope.userRole === "admin";
}

function normalizeCreateValues(
  values: UserInvitationCreateValues,
): UserInvitationCreateValues {
  return {
    accessProfileId: normalizeInvitationAccessProfileId(values.accessProfileId),
    email: values.email.trim().toLowerCase(),
    role: values.role.trim(),
  };
}

function normalizeAcceptValues(
  values: UserInvitationAcceptValues,
): UserInvitationAcceptValues {
  return {
    fullName: values.fullName.trim(),
    password: values.password,
    passwordConfirm: values.passwordConfirm,
    token: values.token.trim(),
  };
}

function validateCreatePermission(scope: TenantScope) {
  return canCreateUserInvitations(scope)
    ? []
    : ["Kullanıcı daveti için admin yetkisi gereklidir."];
}

function validateCreateValues(values: UserInvitationCreateValues) {
  const errors: string[] = [];
  const allowedRoles = new Set(
    getP0SettingsContract().userTypeRows.map((row) => row.type),
  );

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.push("Geçerli e-posta zorunludur.");
  }

  if (!allowedRoles.has(values.role)) {
    errors.push("Geçerli kullanıcı tipi seçilmelidir.");
  }

  errors.push(...validateInvitationAccessProfileSelection(values));

  return errors;
}

function validateAcceptValues(values: UserInvitationAcceptValues) {
  const errors: string[] = [];

  if (values.password.length < 8) {
    errors.push("Şifre en az 8 karakter olmalıdır.");
  }

  if (values.password !== values.passwordConfirm) {
    errors.push("Şifre tekrarı eşleşmelidir.");
  }

  return errors;
}

function validateInvitationForAccept(
  invitation: UserInvitationRow | null,
  nowIso: string,
) {
  if (!invitation) {
    return ["Davet bağlantısı geçersiz veya süresi dolmuştur."];
  }

  if (
    invitation.status !== "pending" ||
    invitation.acceptedAt ||
    invitation.revokedAt
  ) {
    return ["Davet bağlantısı daha önce kullanılmış veya iptal edilmiştir."];
  }

  if (new Date(invitation.expiresAt).getTime() <= new Date(nowIso).getTime()) {
    return ["Davet süresi dolmuştur."];
  }

  return [];
}

function mapUserTypeToSessionRole(
  userType: string,
): UserInvitationSessionCreate["role"] {
  if (userType === "Admin (Tüm Yetkiler)") {
    return "admin";
  }

  return "viewer";
}

function createInviteToken() {
  return randomBytes(24).toString("base64url");
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function addDays(isoDate: string, dayCount: number) {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + dayCount);

  return date.toISOString();
}

function createInvitationId(scope: TenantScope, email: string) {
  return [
    scope.tenantId,
    scope.companyId,
    scope.periodId,
    "user-invitation",
    normalizeIdPart(email),
  ].join("::");
}

function normalizeIdPart(value: string) {
  return (
    value
      .trim()
      .toLocaleLowerCase("tr")
      .replace(/ğ/g, "g")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ş/g, "s")
      .replace(/ü/g, "u")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "kayit"
  );
}
