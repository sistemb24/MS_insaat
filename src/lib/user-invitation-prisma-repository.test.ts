import { describe, expect, test } from "vitest";

import { createUserInvitationPrismaRepository } from "./user-invitation-prisma-repository";
import type { UserInvitationRow } from "./user-invitation-service";
import { defaultTenantScope } from "./tenant-scope";

const invitation: UserInvitationRow = {
  acceptedAt: undefined,
  companyId: defaultTenantScope.companyId,
  createdAt: "2026-07-02T10:00:00.000Z",
  email: "isg@example.com",
  expiresAt: "2026-07-09T10:00:00.000Z",
  id: "tenant-noa-demo::company-demo-insaat::period-2026::user-invitation::isg-example-com",
  invitedBy: "user-main",
  periodId: defaultTenantScope.periodId,
  revokedAt: undefined,
  role: "İSG Uzmanı",
  status: "pending",
  tenantId: defaultTenantScope.tenantId,
  tokenHash: "hash-1",
  updatedAt: "2026-07-02T10:00:00.000Z",
};

describe("user invitation prisma repository", () => {
  test("creates a tenant scoped user invitation row", async () => {
    const calls: unknown[] = [];
    const repository = createUserInvitationPrismaRepository({
      appCredential: {
        async create() {
          throw new Error("not used");
        },
      },
      appSession: {
        async create() {
          throw new Error("not used");
        },
      },
      appUser: {
        async create() {
          throw new Error("not used");
        },
      },
      appUserScopeAccess: {
        async create() {
          throw new Error("not used");
        },
      },
      userInvitation: {
        async create(input) {
          calls.push(input);

          return {
            ...input.data,
            acceptedAt: null,
            createdAt: input.data.createdAt,
            expiresAt: input.data.expiresAt,
            revokedAt: null,
            updatedAt: input.data.updatedAt,
          };
        },
        async findFirst() {
          throw new Error("not used");
        },
        async findUnique() {
          throw new Error("not used");
        },
        async update() {
          throw new Error("not used");
        },
      },
    });

    await expect(repository.createInvitation({ invitation })).resolves.toEqual(
      invitation,
    );
    expect(calls).toEqual([
      {
        data: {
          acceptedAt: null,
          accessProfileId: null,
          companyId: defaultTenantScope.companyId,
          createdAt: new Date("2026-07-02T10:00:00.000Z"),
          email: "isg@example.com",
          expiresAt: new Date("2026-07-09T10:00:00.000Z"),
          id: invitation.id,
          invitedBy: "user-main",
          periodId: defaultTenantScope.periodId,
          revokedAt: null,
          role: "İSG Uzmanı",
          status: "pending",
          tenantId: defaultTenantScope.tenantId,
          tokenHash: "hash-1",
          updatedAt: new Date("2026-07-02T10:00:00.000Z"),
        },
      },
    ]);
  });

  test("accepts an invitation by creating user, session, access and credential records", async () => {
    const calls: unknown[] = [];
    const repository = createUserInvitationPrismaRepository({
      appCredential: {
        async create(input) {
          calls.push({ appCredential: input });
        },
      },
      appSession: {
        async create(input) {
          calls.push({ appSession: input });
        },
      },
      appUser: {
        async create(input) {
          calls.push({ appUser: input });
        },
      },
      appUserScopeAccess: {
        async create(input) {
          calls.push({ appUserScopeAccess: input });
        },
      },
      userInvitation: {
        async create() {
          throw new Error("not used");
        },
        async findFirst() {
          throw new Error("not used");
        },
        async findUnique() {
          throw new Error("not used");
        },
        async update(input) {
          calls.push({ userInvitation: input });

          return {
            ...invitation,
            acceptedAt: input.data.acceptedAt ?? null,
            revokedAt: null,
            status: input.data.status,
            updatedAt: input.data.updatedAt,
          };
        },
      },
    });

    await repository.acceptInvitation({
      acceptedAt: "2026-07-03T10:00:00.000Z",
      credential: {
        defaultSessionId:
          "tenant-noa-demo::company-demo-insaat::period-2026::session::isg-example-com",
        email: "isg@example.com",
        passwordHash: "hash:Strong123!",
        tenantId: defaultTenantScope.tenantId,
        userId: "tenant-noa-demo::user::isg-example-com",
      },
      invitation,
      scopeAccess: {
        companyId: defaultTenantScope.companyId,
        id: "tenant-noa-demo::company-demo-insaat::period-2026::access::isg-example-com",
        isActive: true,
        isDefault: true,
        licenseLabel: "Pilot P0",
        periodId: defaultTenantScope.periodId,
        role: "viewer",
        tenantId: defaultTenantScope.tenantId,
        userId: "tenant-noa-demo::user::isg-example-com",
      },
      session: {
        companyId: defaultTenantScope.companyId,
        expiresAt: null,
        id: "tenant-noa-demo::company-demo-insaat::period-2026::session::isg-example-com",
        licenseLabel: "Pilot P0",
        periodId: defaultTenantScope.periodId,
        role: "viewer",
        tenantId: defaultTenantScope.tenantId,
        userId: "tenant-noa-demo::user::isg-example-com",
      },
      user: {
        email: "isg@example.com",
        id: "tenant-noa-demo::user::isg-example-com",
        name: "İSG Kullanıcısı",
        tenantId: defaultTenantScope.tenantId,
      },
    });

    expect(calls).toEqual([
      {
        appUser: {
          data: {
            email: "isg@example.com",
            id: "tenant-noa-demo::user::isg-example-com",
            name: "İSG Kullanıcısı",
            tenantId: defaultTenantScope.tenantId,
          },
        },
      },
      {
        appSession: {
          data: expect.objectContaining({
            id: "tenant-noa-demo::company-demo-insaat::period-2026::session::isg-example-com",
            role: "viewer",
            userId: "tenant-noa-demo::user::isg-example-com",
          }),
        },
      },
      {
        appUserScopeAccess: {
          data: expect.objectContaining({
            id: "tenant-noa-demo::company-demo-insaat::period-2026::access::isg-example-com",
            isDefault: true,
            role: "viewer",
          }),
        },
      },
      {
        appCredential: {
          data: expect.objectContaining({
            defaultSessionId:
              "tenant-noa-demo::company-demo-insaat::period-2026::session::isg-example-com",
            email: "isg@example.com",
            passwordHash: "hash:Strong123!",
          }),
        },
      },
      {
        userInvitation: {
          data: {
            acceptedAt: new Date("2026-07-03T10:00:00.000Z"),
            status: "accepted",
            updatedAt: new Date("2026-07-03T10:00:00.000Z"),
          },
          where: {
            id: invitation.id,
          },
        },
      },
    ]);
  });

  test("finds and revokes an invitation in tenant company period scope", async () => {
    const calls: unknown[] = [];
    const repository = createUserInvitationPrismaRepository({
      appCredential: {
        async create() {
          throw new Error("not used");
        },
      },
      appSession: {
        async create() {
          throw new Error("not used");
        },
      },
      appUser: {
        async create() {
          throw new Error("not used");
        },
      },
      appUserScopeAccess: {
        async create() {
          throw new Error("not used");
        },
      },
      userInvitation: {
        async create() {
          throw new Error("not used");
        },
        async findFirst(input) {
          calls.push({ findFirst: input });

          return {
            ...invitation,
            acceptedAt: null,
            createdAt: new Date(invitation.createdAt),
            expiresAt: new Date(invitation.expiresAt),
            revokedAt: null,
            updatedAt: new Date(invitation.updatedAt),
          };
        },
        async findUnique() {
          throw new Error("not used");
        },
        async update(input) {
          calls.push({ update: input });

          return {
            ...invitation,
            acceptedAt: null,
            createdAt: new Date(invitation.createdAt),
            expiresAt: new Date(invitation.expiresAt),
            revokedAt: input.data.revokedAt ?? null,
            status: input.data.status,
            updatedAt: input.data.updatedAt,
          };
        },
      },
    });

    await expect(
      repository.findByIdInScope({
        invitationId: invitation.id,
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual(invitation);
    await expect(
      repository.revokeInvitation({
        invitation,
        revokedAt: "2026-07-03T12:00:00.000Z",
      }),
    ).resolves.toEqual({
      ...invitation,
      revokedAt: "2026-07-03T12:00:00.000Z",
      status: "revoked",
      updatedAt: "2026-07-03T12:00:00.000Z",
    });
    expect(calls).toEqual([
      {
        findFirst: {
          where: {
            companyId: defaultTenantScope.companyId,
            id: invitation.id,
            periodId: defaultTenantScope.periodId,
            tenantId: defaultTenantScope.tenantId,
          },
        },
      },
      {
        update: {
          data: {
            revokedAt: new Date("2026-07-03T12:00:00.000Z"),
            status: "revoked",
            updatedAt: new Date("2026-07-03T12:00:00.000Z"),
          },
          where: {
            id: invitation.id,
          },
        },
      },
    ]);
  });

  test("resends an invitation by renewing token, expiry and status", async () => {
    const calls: unknown[] = [];
    const repository = createUserInvitationPrismaRepository({
      appCredential: {
        async create() {
          throw new Error("not used");
        },
      },
      appSession: {
        async create() {
          throw new Error("not used");
        },
      },
      appUser: {
        async create() {
          throw new Error("not used");
        },
      },
      appUserScopeAccess: {
        async create() {
          throw new Error("not used");
        },
      },
      userInvitation: {
        async create() {
          throw new Error("not used");
        },
        async findFirst() {
          throw new Error("not used");
        },
        async findUnique() {
          throw new Error("not used");
        },
        async update(input) {
          calls.push({ update: input });

          return {
            ...invitation,
            acceptedAt: null,
            createdAt: new Date(invitation.createdAt),
            expiresAt: input.data.expiresAt ?? new Date(invitation.expiresAt),
            revokedAt: input.data.revokedAt ?? null,
            status: input.data.status,
            tokenHash: input.data.tokenHash ?? invitation.tokenHash,
            updatedAt: input.data.updatedAt,
          };
        },
      },
    });

    await expect(
      repository.resendInvitation({
        expiresAt: "2026-07-17T10:00:00.000Z",
        invitation: {
          ...invitation,
          revokedAt: "2026-07-03T12:00:00.000Z",
          status: "revoked",
        },
        resentAt: "2026-07-10T10:00:00.000Z",
        tokenHash: "hash-2",
      }),
    ).resolves.toEqual({
      ...invitation,
      expiresAt: "2026-07-17T10:00:00.000Z",
      status: "pending",
      tokenHash: "hash-2",
      updatedAt: "2026-07-10T10:00:00.000Z",
    });
    expect(calls).toEqual([
      {
        update: {
          data: {
            acceptedAt: null,
            expiresAt: new Date("2026-07-17T10:00:00.000Z"),
            revokedAt: null,
            status: "pending",
            tokenHash: "hash-2",
            updatedAt: new Date("2026-07-10T10:00:00.000Z"),
          },
          where: {
            id: invitation.id,
          },
        },
      },
    ]);
  });
});
