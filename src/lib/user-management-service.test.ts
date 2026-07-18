import { describe, expect, test } from "vitest";

import type { AuditLogEntry, AuditLogEntryInput } from "./audit-log";
import type { TenantScope } from "./tenant-scope";
import {
  createSeededUserManagementMemoryRepository,
  createUserManagementService,
  type UserManagementEmailOutboxRecord,
  type UserManagementInvitationRecord,
  type UserManagementUserAccessRecord,
} from "./user-management-service";

const scope: TenantScope = {
  companyId: "company-demo-insaat",
  companyName: "DEMO İNŞAAT",
  licenseLabel: "Pilot P0",
  periodId: "period-2026",
  periodLabel: "2026",
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
  userId: "admin-user",
  userName: "Ana Kullanıcı",
  userRole: "admin",
};

describe("user management service", () => {
  test("updates a scoped user role and records the transition", async () => {
    const auditLogs: AuditLogEntryInput[] = [];
    const service = createUserManagementService({
      auditLogRepository: { record: async (entry) => { auditLogs.push(entry); } },
      repository: createSeededUserManagementMemoryRepository({ userAccesses: [createUserAccess({ role: "viewer" })] }),
    });

    await expect(service.updateUserAccessRole({ accessId: "access-1", role: "accounting", scope })).resolves.toMatchObject({ ok: true, data: { updatedAccess: { role: "accounting" } } });
    expect(auditLogs[0]).toMatchObject({ action: "user-management.role-change", metadata: { statusFrom: "viewer", statusTo: "accounting" } });
  });

  test("builds active user and invitation overview for the active scope", async () => {
    const service = createUserManagementService({
      now: () => "2026-07-08T10:00:00.000Z",
      repository: createSeededUserManagementMemoryRepository({
        invitations: [createInvitation({ status: "pending" })],
        userAccesses: [createUserAccess({ role: "viewer" })],
      }),
    });

    await expect(service.listOverview({ scope })).resolves.toEqual({
      ok: true,
      data: {
        overview: {
          activeUsers: [
            {
              companyName: "DEMO İNŞAAT",
              email: "isg@example.com",
              fullName: "İSG Kullanıcısı",
              id: "access-1",
              role: "viewer",
              statusLabel: "Aktif",
              userId: "isg-user",
            },
          ],
          invitations: [
            {
              email: "isg@example.com",
              expiresAt: "2026-07-09T10:00:00.000Z",
              id: "invite-1",
              role: "İSG Uzmanı",
              status: "pending",
              statusLabel: "Bekliyor",
            },
          ],
          auditLogs: [],
          emailOutboxMessages: [],
          summary: {
            acceptedInvitationCount: 0,
            activeUserCount: 1,
            pendingInvitationCount: 1,
          },
        },
      },
    });
  });

  test("keeps rows tenant, company and period scoped", async () => {
    const service = createUserManagementService({
      repository: createSeededUserManagementMemoryRepository({
        invitations: [
          createInvitation({ id: "same-scope", status: "accepted" }),
          createInvitation({ companyId: "other-company", id: "other-scope" }),
        ],
        userAccesses: [
          createUserAccess({ id: "same-scope" }),
          createUserAccess({ companyId: "other-company", id: "other-scope" }),
        ],
      }),
    });

    const result = await service.listOverview({ scope });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.data.overview.activeUsers : []).toHaveLength(1);
    expect(result.ok ? result.data.overview.invitations : []).toHaveLength(1);
    expect(
      result.ok ? result.data.overview.invitations[0]?.statusLabel : "",
    ).toBe("Kabul Edildi");
  });

  test("marks expired pending invitations and excludes them from pending summary", async () => {
    const service = createUserManagementService({
      now: () => "2026-07-10T10:00:00.000Z",
      repository: createSeededUserManagementMemoryRepository({
        invitations: [
          createInvitation({
            expiresAt: "2026-07-09T10:00:00.000Z",
            status: "pending",
          }),
        ],
      }),
    });

    await expect(service.listOverview({ scope })).resolves.toEqual({
      ok: true,
      data: {
        overview: {
          activeUsers: [],
          auditLogs: [],
          emailOutboxMessages: [],
          invitations: [
            {
              email: "isg@example.com",
              expiresAt: "2026-07-09T10:00:00.000Z",
              id: "invite-1",
              role: "İSG Uzmanı",
              status: "expired",
              statusLabel: "Süresi Doldu",
            },
          ],
          summary: {
            acceptedInvitationCount: 0,
            activeUserCount: 0,
            pendingInvitationCount: 0,
          },
        },
      },
    });
  });

  test("includes user access audit rows in the overview", async () => {
    const service = createUserManagementService({
      auditLogReadRepository: createMemoryAuditReadRepository([
        createAuditLog({
          metadata: {
            statusFrom: "active",
            statusTo: "inactive",
          },
        }),
      ]),
      repository: createSeededUserManagementMemoryRepository(),
    });

    await expect(service.listOverview({ scope })).resolves.toEqual({
      ok: true,
      data: {
        overview: {
          activeUsers: [],
          emailOutboxMessages: [],
          invitations: [],
          auditLogs: [
            {
              action: "user-management.deactivate",
              detail: "active -> inactive",
              entityLabel: "İSG Kullanıcısı / isg@example.com",
              id: "audit-1",
              occurredAt: "2026-07-03T12:00:00.000Z",
            },
          ],
          summary: {
            acceptedInvitationCount: 0,
            activeUserCount: 0,
            pendingInvitationCount: 0,
          },
        },
      },
    });
  });

  test("includes invitation audit rows in the user management audit overview", async () => {
    const service = createUserManagementService({
      auditLogReadRepository: createMemoryAuditReadRepository([
        createAuditLog({
          action: "user-invitation.revoke",
          createdAt: "2026-07-03T12:05:00.000Z",
          entityId: "invite-1",
          entityLabel: "isg@example.com / İSG Uzmanı",
          entityType: "user-invitation",
          id: "audit-invite-1",
          metadata: {
            statusFrom: "pending",
            statusTo: "revoked",
          },
          occurredAt: "2026-07-03T12:05:00.000Z",
        }),
        createAuditLog({
          metadata: {
            statusFrom: "active",
            statusTo: "inactive",
          },
        }),
      ]),
      repository: createSeededUserManagementMemoryRepository(),
    });

    const result = await service.listOverview({ scope });

    expect(result.ok ? result.data.overview.auditLogs : []).toEqual([
      {
        action: "user-invitation.revoke",
        detail: "pending -> revoked",
        entityLabel: "isg@example.com / İSG Uzmanı",
        id: "audit-invite-1",
        occurredAt: "2026-07-03T12:05:00.000Z",
      },
      {
        action: "user-management.deactivate",
        detail: "active -> inactive",
        entityLabel: "İSG Kullanıcısı / isg@example.com",
        id: "audit-1",
        occurredAt: "2026-07-03T12:00:00.000Z",
      },
    ]);
  });

  test("shows renewed expiry date in resend invitation audit detail", async () => {
    const service = createUserManagementService({
      auditLogReadRepository: createMemoryAuditReadRepository([
        createAuditLog({
          action: "user-invitation.resend",
          createdAt: "2026-07-10T10:00:00.000Z",
          entityId: "invite-1",
          entityLabel: "isg@example.com / İSG Uzmanı",
          entityType: "user-invitation",
          id: "audit-resend-1",
          metadata: {
            expiresAt: "2026-07-17T10:00:00.000Z",
            statusFrom: "expired",
            statusTo: "pending",
          },
          occurredAt: "2026-07-10T10:00:00.000Z",
        }),
      ]),
      repository: createSeededUserManagementMemoryRepository(),
    });

    const result = await service.listOverview({ scope });

    expect(result.ok ? result.data.overview.auditLogs[0]?.detail : "").toBe(
      "expired -> pending / Geçerlilik: 17.07.2026",
    );
  });

  test("includes recent invitation email outbox rows in the overview", async () => {
    const service = createUserManagementService({
      repository: createSeededUserManagementMemoryRepository({
        emailOutboxMessages: [
          createEmailOutboxMessage(),
          createEmailOutboxMessage({
            companyId: "other-company",
            id: "mail-other-scope",
          }),
        ],
      }),
    });

    const result = await service.listOverview({ scope });

    expect(result.ok ? result.data.overview.emailOutboxMessages : []).toEqual([
      {
        createdAt: "2026-07-02T10:00:00.000Z",
        id: "mail-1",
        recipientEmail: "isg@example.com",
        status: "pending",
        statusLabel: "Bekliyor",
        subject: "NOA İnşaat kullanıcı daveti",
        template: "user-invitation-create",
      },
    ]);
  });

  test("deactivates a user access row and records audit metadata", async () => {
    const auditLogs: AuditLogEntryInput[] = [];
    const service = createUserManagementService({
      auditLogRepository: createMemoryAuditRepository(auditLogs),
      now: () => "2026-07-03T12:00:00.000Z",
      repository: createSeededUserManagementMemoryRepository({
        userAccesses: [createUserAccess()],
      }),
    });

    await expect(
      service.deactivateUserAccess({
        accessId: "access-1",
        scope,
      }),
    ).resolves.toEqual({
      ok: true,
      data: {
        deactivatedAccess: {
          companyId: scope.companyId,
          companyName: scope.companyName,
          email: "isg@example.com",
          id: "access-1",
          isActive: false,
          periodId: scope.periodId,
          role: "viewer",
          tenantId: scope.tenantId,
          userId: "isg-user",
          userName: "İSG Kullanıcısı",
        },
      },
    });
    expect(auditLogs).toEqual([
      {
        action: "user-management.deactivate",
        actorUserId: scope.userId,
        companyId: scope.companyId,
        entityId: "access-1",
        entityLabel: "İSG Kullanıcısı / isg@example.com",
        entityType: "user-access",
        metadata: {
          email: "isg@example.com",
          role: "viewer",
          statusFrom: "active",
          statusTo: "inactive",
          userId: "isg-user",
        },
        occurredAt: "2026-07-03T12:00:00.000Z",
        periodId: scope.periodId,
        tenantId: scope.tenantId,
      },
    ]);
  });

  test("rejects user deactivation for non-admin and self access", async () => {
    const service = createUserManagementService({
      repository: createSeededUserManagementMemoryRepository({
        userAccesses: [
          createUserAccess(),
          createUserAccess({ id: "self-access", userId: scope.userId }),
        ],
      }),
    });

    await expect(
      service.deactivateUserAccess({
        accessId: "access-1",
        scope: { ...scope, userRole: "accounting" },
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Kullanıcı devre dışı bırakma yetkisi yalnız admin rolündedir."],
    });
    await expect(
      service.deactivateUserAccess({
        accessId: "self-access",
        scope,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Aktif kullanıcı kendi erişimini devre dışı bırakamaz."],
    });
  });
});

function createUserAccess(
  overrides: Partial<UserManagementUserAccessRecord> = {},
): UserManagementUserAccessRecord {
  return {
    companyId: scope.companyId,
    companyName: scope.companyName,
    email: "isg@example.com",
    id: "access-1",
    isActive: true,
    periodId: scope.periodId,
    role: "viewer",
    tenantId: scope.tenantId,
    userId: "isg-user",
    userName: "İSG Kullanıcısı",
    ...overrides,
  };
}

function createInvitation(
  overrides: Partial<UserManagementInvitationRecord> = {},
): UserManagementInvitationRecord {
  return {
    companyId: scope.companyId,
    email: "isg@example.com",
    expiresAt: "2026-07-09T10:00:00.000Z",
    id: "invite-1",
    periodId: scope.periodId,
    role: "İSG Uzmanı",
    status: "pending",
    tenantId: scope.tenantId,
    ...overrides,
  };
}

function createEmailOutboxMessage(
  overrides: Partial<UserManagementEmailOutboxRecord> = {},
): UserManagementEmailOutboxRecord {
  return {
    companyId: scope.companyId,
    createdAt: "2026-07-02T10:00:00.000Z",
    id: "mail-1",
    periodId: scope.periodId,
    recipientEmail: "isg@example.com",
    status: "pending",
    subject: "NOA İnşaat kullanıcı daveti",
    template: "user-invitation-create",
    tenantId: scope.tenantId,
    ...overrides,
  };
}

function createMemoryAuditRepository(entries: AuditLogEntryInput[]) {
  return {
    async record(input: AuditLogEntryInput) {
      entries.push(input);
    },
  };
}

function createMemoryAuditReadRepository(entries: AuditLogEntry[]) {
  return {
    async listByEntityType(input: { entityType: string }) {
      return entries.filter((entry) => entry.entityType === input.entityType);
    },
  };
}

function createAuditLog(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    action: "user-management.deactivate",
    actorUserId: scope.userId,
    companyId: scope.companyId,
    createdAt: "2026-07-03T12:00:00.000Z",
    entityId: "access-1",
    entityLabel: "İSG Kullanıcısı / isg@example.com",
    entityType: "user-access",
    id: "audit-1",
    metadata: {},
    occurredAt: "2026-07-03T12:00:00.000Z",
    periodId: scope.periodId,
    tenantId: scope.tenantId,
    ...overrides,
  };
}



