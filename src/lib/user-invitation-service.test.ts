import { createHash } from "node:crypto";

import { describe, expect, test } from "vitest";

import type { AuditLogEntryInput } from "./audit-log";
import {
  createSeededUserInvitationMemoryRepository,
  createUserInvitationService,
  type UserInvitationRow,
} from "./user-invitation-service";
import { defaultTenantScope, type TenantScope } from "./tenant-scope";
import type { AccessProfileSnapshot } from "./access-profile";
import { CUSTOM_RBAC_USER_TYPE } from "./user-invitation-access-profile";

const adminScope: TenantScope = {
  ...defaultTenantScope,
  userId: "user-admin",
  userName: "Admin Kullanıcı",
  userRole: "admin",
};

const invitation: UserInvitationRow = {
  acceptedAt: undefined,
  companyId: adminScope.companyId,
  createdAt: "2026-07-02T10:00:00.000Z",
  email: "isg@example.com",
  expiresAt: "2026-07-09T10:00:00.000Z",
  id: "tenant-noa-demo::company-demo-insaat::period-2026::user-invitation::isg-example-com",
  invitedBy: "user-admin",
  periodId: adminScope.periodId,
  revokedAt: undefined,
  role: "İSG Uzmanı",
  status: "pending",
  tenantId: adminScope.tenantId,
  tokenHash: createHash("sha256").update("invite-token").digest("hex"),
  updatedAt: "2026-07-02T10:00:00.000Z",
};

describe("user invitation service", () => {
  test("creates and accepts a custom invitation with an active profile assignment", async () => {
    const acceptedAssignments: import("./access-profile").AccessProfileAssignmentSnapshot[] = [];
    const accessProfile: AccessProfileSnapshot = {
      companyId: adminScope.companyId,
      createdAt: "2026-07-01T10:00:00.000Z",
      createdBy: adminScope.userId,
      description: "Yalnız doküman okuma",
      id: "profile-document-reader",
      lastMutationKey: "profile-create",
      name: "Doküman Okuyucu",
      normalizedName: "doküman okuyucu",
      permissions: ["document.view"],
      revisionNo: 1,
      status: "ACTIVE",
      tenantId: adminScope.tenantId,
      updatedAt: "2026-07-01T10:00:00.000Z",
      updatedBy: adminScope.userId,
    };
    const repository = createSeededUserInvitationMemoryRepository({
      acceptedAssignments,
      accessProfiles: [accessProfile],
    });
    const auditLogs: AuditLogEntryInput[] = [];
    const service = createUserInvitationService({
      auditLogRepository: createMemoryAuditRepository(auditLogs),
      now: () => "2026-07-31T10:00:00.000Z",
      repository,
      tokenFactory: () => "custom-invite-token",
    });

    const created = await service.createInvitation({
      scope: adminScope,
      values: {
        accessProfileId: accessProfile.id,
        email: "ozel@example.com",
        role: CUSTOM_RBAC_USER_TYPE,
      },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const accepted = await service.acceptInvitation({
      values: {
        fullName: "Özel Kullanıcı",
        password: "Strong123!",
        passwordConfirm: "Strong123!",
        token: created.data.token,
      },
    });
    expect(accepted.ok).toBe(true);
    expect(acceptedAssignments).toHaveLength(1);
    expect(acceptedAssignments[0]).toMatchObject({
      companyId: adminScope.companyId,
      periodId: adminScope.periodId,
      profileId: accessProfile.id,
      revisionNo: 1,
      tenantId: adminScope.tenantId,
    });
    expect(auditLogs.map((entry) => entry.metadata.accessProfileId)).toEqual([
      accessProfile.id,
      accessProfile.id,
    ]);
    expect(JSON.stringify(auditLogs)).not.toContain(accessProfile.name);
    expect(JSON.stringify(auditLogs)).not.toContain(accessProfile.description);
    expect(JSON.stringify(auditLogs)).not.toContain("custom-invite-token");
  });

  test("rejects missing, foreign and inactive profiles for custom invitations", async () => {
    const inactiveProfile: AccessProfileSnapshot = {
      companyId: adminScope.companyId,
      createdAt: "2026-07-01T10:00:00.000Z",
      createdBy: adminScope.userId,
      description: "",
      id: "profile-inactive",
      lastMutationKey: "profile-create",
      name: "Pasif Profil",
      normalizedName: "pasif profil",
      permissions: [],
      revisionNo: 2,
      status: "INACTIVE",
      tenantId: adminScope.tenantId,
      updatedAt: "2026-07-02T10:00:00.000Z",
      updatedBy: adminScope.userId,
    };
    const service = createUserInvitationService({
      repository: createSeededUserInvitationMemoryRepository({
        accessProfiles: [inactiveProfile],
      }),
    });

    for (const accessProfileId of [undefined, "foreign-profile", inactiveProfile.id]) {
      const result = await service.createInvitation({
        scope: adminScope,
        values: {
          accessProfileId,
          email: `${accessProfileId ?? "missing"}@example.com`,
          role: CUSTOM_RBAC_USER_TYPE,
        },
      });
      expect(result.ok).toBe(false);
    }
  });

  test("creates a normalized tenant scoped invitation with a 7 day token", async () => {
    const auditLogs: AuditLogEntryInput[] = [];
    const emailMessages: unknown[] = [];
    const service = createUserInvitationService({
      auditLogRepository: createMemoryAuditRepository(auditLogs),
      emailOutboxRepository: createMemoryEmailOutboxRepository(emailMessages),
      now: () => "2026-07-02T10:00:00.000Z",
      repository: createSeededUserInvitationMemoryRepository(),
      tokenFactory: () => "invite-token",
    });

    const result = await service.createInvitation({
      scope: adminScope,
      values: {
        email: " ISG@Example.COM ",
        role: "İSG Uzmanı",
      },
    });

    expect(result).toEqual({
      ok: true,
      data: {
        invitation,
        token: "invite-token",
      },
    });
    expect(auditLogs).toEqual([
      {
        action: "user-invitation.create",
        actorUserId: adminScope.userId,
        companyId: adminScope.companyId,
        entityId: invitation.id,
        entityLabel: "isg@example.com / İSG Uzmanı",
        entityType: "user-invitation",
        metadata: {
          email: "isg@example.com",
          expiresAt: "2026-07-09T10:00:00.000Z",
          role: "İSG Uzmanı",
          statusTo: "pending",
        },
        occurredAt: "2026-07-02T10:00:00.000Z",
        periodId: adminScope.periodId,
        tenantId: adminScope.tenantId,
      },
    ]);
    expect(emailMessages).toEqual([
      {
        bodyText:
          "NOA İnşaat Yönetim hesabınıza katılmak için davet bağlantısı:\nhttp://localhost:3000/davet?token=invite-token\n\nRol: İSG Uzmanı\nGeçerlilik: 2026-07-09T10:00:00.000Z",
        channel: "email",
        companyId: adminScope.companyId,
        createdAt: "2026-07-02T10:00:00.000Z",
        id: "tenant-noa-demo::company-demo-insaat::period-2026::email-outbox::user-invitation-create::isg-example-com::2026-07-02t10-00-00-000z",
        metadata: {
          action: "create",
          expiresAt: "2026-07-09T10:00:00.000Z",
          invitationId: invitation.id,
          inviteUrl: "http://localhost:3000/davet?token=invite-token",
          role: "İSG Uzmanı",
        },
        periodId: adminScope.periodId,
        recipientEmail: "isg@example.com",
        status: "pending",
        subject: "NOA İnşaat kullanıcı daveti",
        template: "user-invitation-create",
        tenantId: adminScope.tenantId,
      },
    ]);
  });

  test("rejects non-admin invitation creation and invalid fields", async () => {
    const service = createUserInvitationService({
      repository: createSeededUserInvitationMemoryRepository(),
    });

    await expect(
      service.createInvitation({
        scope: defaultTenantScope,
        values: {
          email: "not-an-email",
          role: "Legacy Rol",
        },
      }),
    ).resolves.toEqual({
      ok: false,
      errors: [
        "Kullanıcı daveti için admin yetkisi gereklidir.",
        "Geçerli e-posta zorunludur.",
        "Geçerli kullanıcı tipi seçilmelidir.",
      ],
    });
  });

  test("accepts a pending invitation by token and creates login access records", async () => {
    const auditLogs: AuditLogEntryInput[] = [];
    const service = createUserInvitationService({
      auditLogRepository: createMemoryAuditRepository(auditLogs),
      now: () => "2026-07-03T10:00:00.000Z",
      passwordHasher: (password) => `hash:${password}`,
      repository: createSeededUserInvitationMemoryRepository({
        invitations: [invitation],
      }),
    });

    await expect(
      service.acceptInvitation({
        values: {
          fullName: "İSG Kullanıcısı",
          password: "Strong123!",
          passwordConfirm: "Strong123!",
          token: "invite-token",
        },
      }),
    ).resolves.toEqual({
      ok: true,
      data: {
        email: "isg@example.com",
        sessionId:
          "tenant-noa-demo::company-demo-insaat::period-2026::session::isg-example-com",
      },
    });
    expect(auditLogs).toEqual([
      {
        action: "user-invitation.accept",
        actorUserId: "tenant-noa-demo::user::isg-example-com",
        companyId: adminScope.companyId,
        entityId: invitation.id,
        entityLabel: "isg@example.com / İSG Uzmanı",
        entityType: "user-invitation",
        metadata: {
          email: "isg@example.com",
          role: "İSG Uzmanı",
          sessionId:
            "tenant-noa-demo::company-demo-insaat::period-2026::session::isg-example-com",
          statusFrom: "pending",
          statusTo: "accepted",
          userId: "tenant-noa-demo::user::isg-example-com",
        },
        occurredAt: "2026-07-03T10:00:00.000Z",
        periodId: adminScope.periodId,
        tenantId: adminScope.tenantId,
      },
    ]);
  });

  test("rejects expired invitations and weak password confirmation", async () => {
    const service = createUserInvitationService({
      now: () => "2026-07-10T10:00:01.000Z",
      repository: createSeededUserInvitationMemoryRepository({
        invitations: [invitation],
      }),
    });

    await expect(
      service.acceptInvitation({
        values: {
          fullName: "",
          password: "short",
          passwordConfirm: "different",
          token: "invite-token",
        },
      }),
    ).resolves.toEqual({
      ok: false,
      errors: [
        "Davet süresi dolmuştur.",
        "Şifre en az 8 karakter olmalıdır.",
        "Şifre tekrarı eşleşmelidir.",
      ],
    });
  });

  test("revokes a pending invitation in the active scope", async () => {
    const auditLogs: AuditLogEntryInput[] = [];
    const service = createUserInvitationService({
      auditLogRepository: createMemoryAuditRepository(auditLogs),
      now: () => "2026-07-03T12:00:00.000Z",
      repository: createSeededUserInvitationMemoryRepository({
        invitations: [invitation],
      }),
    });

    await expect(
      service.revokeInvitation({
        invitationId: invitation.id,
        scope: adminScope,
      }),
    ).resolves.toEqual({
      ok: true,
      data: {
        invitation: {
          ...invitation,
          revokedAt: "2026-07-03T12:00:00.000Z",
          status: "revoked",
          updatedAt: "2026-07-03T12:00:00.000Z",
        },
      },
    });
    expect(auditLogs).toEqual([
      {
        action: "user-invitation.revoke",
        actorUserId: adminScope.userId,
        companyId: adminScope.companyId,
        entityId: invitation.id,
        entityLabel: "isg@example.com / İSG Uzmanı",
        entityType: "user-invitation",
        metadata: {
          email: "isg@example.com",
          role: "İSG Uzmanı",
          statusFrom: "pending",
          statusTo: "revoked",
        },
        occurredAt: "2026-07-03T12:00:00.000Z",
        periodId: adminScope.periodId,
        tenantId: adminScope.tenantId,
      },
    ]);
  });

  test("resends an expired invitation with a new token and audit metadata", async () => {
    const auditLogs: AuditLogEntryInput[] = [];
    const emailMessages: unknown[] = [];
    const service = createUserInvitationService({
      auditLogRepository: createMemoryAuditRepository(auditLogs),
      emailOutboxRepository: createMemoryEmailOutboxRepository(emailMessages),
      now: () => "2026-07-10T10:00:00.000Z",
      repository: createSeededUserInvitationMemoryRepository({
        invitations: [
          {
            ...invitation,
            expiresAt: "2026-07-09T10:00:00.000Z",
            status: "pending",
          },
        ],
      }),
      tokenFactory: () => "resent-token",
    });

    await expect(
      service.resendInvitation({
        invitationId: invitation.id,
        scope: adminScope,
      }),
    ).resolves.toEqual({
      ok: true,
      data: {
        invitation: {
          ...invitation,
          expiresAt: "2026-07-17T10:00:00.000Z",
          status: "pending",
          tokenHash: createHash("sha256").update("resent-token").digest("hex"),
          updatedAt: "2026-07-10T10:00:00.000Z",
        },
        token: "resent-token",
      },
    });
    expect(auditLogs).toEqual([
      {
        action: "user-invitation.resend",
        actorUserId: adminScope.userId,
        companyId: adminScope.companyId,
        entityId: invitation.id,
        entityLabel: "isg@example.com / İSG Uzmanı",
        entityType: "user-invitation",
        metadata: {
          email: "isg@example.com",
          expiresAt: "2026-07-17T10:00:00.000Z",
          role: "İSG Uzmanı",
          statusFrom: "expired",
          statusTo: "pending",
        },
        occurredAt: "2026-07-10T10:00:00.000Z",
        periodId: adminScope.periodId,
        tenantId: adminScope.tenantId,
      },
    ]);
    expect(emailMessages).toEqual([
      {
        bodyText:
          "NOA İnşaat Yönetim hesabınıza katılmak için yenilenen davet bağlantısı:\nhttp://localhost:3000/davet?token=resent-token\n\nRol: İSG Uzmanı\nGeçerlilik: 2026-07-17T10:00:00.000Z",
        channel: "email",
        companyId: adminScope.companyId,
        createdAt: "2026-07-10T10:00:00.000Z",
        id: "tenant-noa-demo::company-demo-insaat::period-2026::email-outbox::user-invitation-resend::isg-example-com::2026-07-10t10-00-00-000z",
        metadata: {
          action: "resend",
          expiresAt: "2026-07-17T10:00:00.000Z",
          invitationId: invitation.id,
          inviteUrl: "http://localhost:3000/davet?token=resent-token",
          role: "İSG Uzmanı",
          statusFrom: "expired",
        },
        periodId: adminScope.periodId,
        recipientEmail: "isg@example.com",
        status: "pending",
        subject: "NOA İnşaat davet bağlantınız yenilendi",
        template: "user-invitation-resend",
        tenantId: adminScope.tenantId,
      },
    ]);
  });

  test("rejects invitation resend for non-admin, active pending and accepted rows", async () => {
    const service = createUserInvitationService({
      now: () => "2026-07-03T10:00:00.000Z",
      repository: createSeededUserInvitationMemoryRepository({
        invitations: [
          invitation,
          {
            ...invitation,
            acceptedAt: "2026-07-03T10:00:00.000Z",
            id: `${invitation.id}-accepted`,
            status: "accepted",
          },
        ],
      }),
    });

    await expect(
      service.resendInvitation({
        invitationId: invitation.id,
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Davet yeniden gönderimi için admin yetkisi gereklidir."],
    });
    await expect(
      service.resendInvitation({
        invitationId: invitation.id,
        scope: adminScope,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Yalnız süresi dolmuş veya iptal edilmiş davetler yeniden gönderilebilir."],
    });
    await expect(
      service.resendInvitation({
        invitationId: `${invitation.id}-accepted`,
        scope: adminScope,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Yalnız süresi dolmuş veya iptal edilmiş davetler yeniden gönderilebilir."],
    });
  });

  test("rejects invitation revocation for non-admin and non-pending rows", async () => {
    const service = createUserInvitationService({
      repository: createSeededUserInvitationMemoryRepository({
        invitations: [
          {
            ...invitation,
            acceptedAt: "2026-07-03T10:00:00.000Z",
            status: "accepted",
          },
        ],
      }),
    });

    await expect(
      service.revokeInvitation({
        invitationId: invitation.id,
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Davet iptali için admin yetkisi gereklidir."],
    });
    await expect(
      service.revokeInvitation({
        invitationId: invitation.id,
        scope: adminScope,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Yalnız bekleyen davetler iptal edilebilir."],
    });
  });
});

function createMemoryAuditRepository(entries: AuditLogEntryInput[]) {
  return {
    async record(input: AuditLogEntryInput) {
      entries.push(input);
    },
  };
}

function createMemoryEmailOutboxRepository(entries: unknown[]) {
  return {
    async enqueue(input: unknown) {
      entries.push(input);
    },
  };
}
