import { describe, expect, test } from "vitest";

import type { TenantScope } from "./tenant-scope";
import { createUserManagementPrismaRepository } from "./user-management-prisma-repository";

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

describe("user management prisma repository", () => {
  test("lists active user access and invitation records in scope", async () => {
    const calls: unknown[] = [];
    const repository = createUserManagementPrismaRepository({
      appUserScopeAccess: {
        async findFirst() {
          throw new Error("not used");
        },
        async findMany(input) {
          calls.push({ appUserScopeAccess: input });

          return [
            {
              company: { id: scope.companyId, name: scope.companyName },
              id: "access-1",
              isActive: true,
              periodId: scope.periodId,
              role: "viewer",
              tenantId: scope.tenantId,
              user: {
                email: "isg@example.com",
                id: "isg-user",
                name: "İSG Kullanıcısı",
              },
            },
          ];
        },
        async update() {
          throw new Error("not used");
        },
      },
      emailOutbox: {
        async findMany(input) {
          calls.push({ emailOutbox: input });

          return [
            {
              companyId: scope.companyId,
              createdAt: new Date("2026-07-02T10:00:00.000Z"),
              id: "mail-1",
              periodId: scope.periodId,
              recipientEmail: "isg@example.com",
              status: "pending",
              subject: "NOA İnşaat kullanıcı daveti",
              template: "user-invitation-create",
              tenantId: scope.tenantId,
            },
          ];
        },
      },
      userInvitation: {
        async findMany(input) {
          calls.push({ userInvitation: input });

          return [
            {
              companyId: scope.companyId,
              email: "isg@example.com",
              expiresAt: new Date("2026-07-09T10:00:00.000Z"),
              id: "invite-1",
              periodId: scope.periodId,
              role: "İSG Uzmanı",
              status: "pending",
              tenantId: scope.tenantId,
            },
          ];
        },
      },
    });

    await expect(repository.listActiveUserAccesses({ scope })).resolves.toEqual([
      {
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
      },
    ]);
    await expect(repository.listInvitations({ scope })).resolves.toEqual([
      {
        companyId: scope.companyId,
        email: "isg@example.com",
        expiresAt: "2026-07-09T10:00:00.000Z",
        id: "invite-1",
        periodId: scope.periodId,
        role: "İSG Uzmanı",
        status: "pending",
        tenantId: scope.tenantId,
      },
    ]);
    await expect(repository.listEmailOutboxMessages({ scope })).resolves.toEqual([
      {
        companyId: scope.companyId,
        createdAt: "2026-07-02T10:00:00.000Z",
        id: "mail-1",
        periodId: scope.periodId,
        recipientEmail: "isg@example.com",
        status: "pending",
        subject: "NOA İnşaat kullanıcı daveti",
        template: "user-invitation-create",
        tenantId: scope.tenantId,
      },
    ]);
    expect(calls).toEqual([
      {
        appUserScopeAccess: {
          include: {
            company: true,
            user: true,
          },
          orderBy: [{ user: { name: "asc" } }, { role: "asc" }],
          where: {
            companyId: scope.companyId,
            isActive: true,
            periodId: scope.periodId,
            tenantId: scope.tenantId,
          },
        },
      },
      {
        userInvitation: {
          orderBy: [{ createdAt: "desc" }],
          take: 20,
          where: {
            companyId: scope.companyId,
            periodId: scope.periodId,
            tenantId: scope.tenantId,
          },
        },
      },
      {
        emailOutbox: {
          orderBy: [{ createdAt: "desc" }],
          take: 20,
          where: {
            companyId: scope.companyId,
            periodId: scope.periodId,
            tenantId: scope.tenantId,
          },
        },
      },
    ]);
  });

  test("deactivates a user access row inside the active scope", async () => {
    const calls: unknown[] = [];
    const repository = createUserManagementPrismaRepository({
      appUserScopeAccess: {
        async findFirst(input) {
          calls.push({ findFirst: input });

          return {
            company: { id: scope.companyId, name: scope.companyName },
            id: "access-1",
            isActive: true,
            periodId: scope.periodId,
            role: "viewer",
            tenantId: scope.tenantId,
            user: {
              email: "isg@example.com",
              id: "isg-user",
              name: "İSG Kullanıcısı",
            },
          };
        },
        async findMany() {
          throw new Error("not used");
        },
        async update(input) {
          calls.push({ update: input });

          return {
            company: { id: scope.companyId, name: scope.companyName },
            id: "access-1",
            isActive: false,
            periodId: scope.periodId,
            role: "viewer",
            tenantId: scope.tenantId,
            user: {
              email: "isg@example.com",
              id: "isg-user",
              name: "İSG Kullanıcısı",
            },
          };
        },
      },
      emailOutbox: {
        async findMany() {
          throw new Error("not used");
        },
      },
      userInvitation: {
        async findMany() {
          throw new Error("not used");
        },
      },
    });

    await expect(
      repository.deactivateUserAccess({
        accessId: "access-1",
        scope,
      }),
    ).resolves.toEqual({
      access: {
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
      removedAssignment: null,
    });
    expect(calls).toEqual([
      {
        findFirst: {
          include: {
            company: true,
            user: true,
          },
          where: {
            companyId: scope.companyId,
            id: "access-1",
            isActive: true,
            periodId: scope.periodId,
            tenantId: scope.tenantId,
          },
        },
      },
      {
        update: {
          data: {
            isActive: false,
          },
          include: {
            company: true,
            user: true,
          },
          where: {
            id: "access-1",
          },
        },
      },
    ]);
  });

  test("updates role and removes the scoped assignment in one transaction", async () => {
    const calls: unknown[] = [];
    const client = {
      appUserScopeAccess: {
        async findFirst(input: unknown) {
          calls.push({ findFirst: input });
          return createAccessRecord();
        },
        async findMany() {
          throw new Error("not used");
        },
        async update(input: unknown) {
          calls.push({ update: input });
          return createAccessRecord({ role: "accounting" });
        },
      },
      emailOutbox: {
        async findMany() {
          throw new Error("not used");
        },
      },
      userAccessProfileAssignment: {
        async deleteMany(input: unknown) {
          calls.push({ deleteAssignment: input });
          return { count: 1 };
        },
        async findFirst(input: unknown) {
          calls.push({ findAssignment: input });
          return {
            companyId: scope.companyId,
            id: "assignment-1",
            periodId: scope.periodId,
            profileId: "profile-1",
            tenantId: scope.tenantId,
            userId: "isg-user",
          };
        },
      },
      userInvitation: {
        async findMany() {
          throw new Error("not used");
        },
      },
    };
    const repository = createUserManagementPrismaRepository({
      ...client,
      async $transaction(callback) {
        calls.push({ transaction: "begin" });
        const result = await callback(client);
        calls.push({ transaction: "commit" });
        return result;
      },
    });

    await expect(
      repository.updateUserAccessRole({
        accessId: "access-1",
        role: "accounting",
        scope,
      }),
    ).resolves.toMatchObject({
      access: { role: "accounting", userId: "isg-user" },
      removedAssignment: {
        id: "assignment-1",
        profileId: "profile-1",
      },
    });
    expect(calls).toEqual([
      { transaction: "begin" },
      {
        findFirst: {
          include: { company: true, user: true },
          where: {
            companyId: scope.companyId,
            id: "access-1",
            isActive: true,
            periodId: scope.periodId,
            tenantId: scope.tenantId,
          },
        },
      },
      {
        findAssignment: {
          where: {
            companyId: scope.companyId,
            periodId: scope.periodId,
            tenantId: scope.tenantId,
            userId: "isg-user",
          },
        },
      },
      {
        update: {
          data: { role: "accounting" },
          include: { company: true, user: true },
          where: { id: "access-1" },
        },
      },
      {
        deleteAssignment: {
          where: {
            companyId: scope.companyId,
            id: "assignment-1",
            periodId: scope.periodId,
            tenantId: scope.tenantId,
            userId: "isg-user",
          },
        },
      },
      { transaction: "commit" },
    ]);
  });
});

function createAccessRecord(overrides: Record<string, unknown> = {}) {
  return {
    company: { id: scope.companyId, name: scope.companyName },
    id: "access-1",
    isActive: true,
    periodId: scope.periodId,
    role: "viewer",
    tenantId: scope.tenantId,
    user: {
      email: "isg@example.com",
      id: "isg-user",
      name: "İSG Kullanıcısı",
    },
    ...overrides,
  };
}
