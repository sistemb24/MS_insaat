import { describe, expect, it, vi } from "vitest";

import {
  createTenantAuthSessionPrismaRepository,
  type TenantAuthSessionPrismaClientLike,
} from "./tenant-auth-session-prisma-repository";

describe("tenant auth session prisma repository", () => {
  it("creates a short-lived opaque auth session instead of exposing the scope id", async () => {
    const create = vi.fn(async ({ data }) => ({
      expiresAt: data.expiresAt,
      id: data.id,
    }));
    const repository = createTenantAuthSessionPrismaRepository(
      createPrisma({ create }),
    );
    const now = new Date("2026-08-04T09:00:00.000Z");

    const result = await repository.create({
      now,
      scopeSessionId: "demo-accounting",
      userId: "user-main",
    });

    expect(result.id).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.id).not.toBe("demo-accounting");
    expect(result.expiresAt).toEqual(new Date("2026-08-04T17:00:00.000Z"));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scopeSessionId: "demo-accounting",
          userId: "user-main",
        }),
      }),
    );
  });

  it("returns the tenant scope only for an active auth and scope session", async () => {
    const findFirst = vi.fn(async () => createAuthSessionRow());
    const repository = createTenantAuthSessionPrismaRepository(
      createPrisma({ findFirst }),
    );

    await expect(
      repository.findActiveById({
        id: "opaque-auth-session",
        now: new Date("2026-08-04T09:00:00.000Z"),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: "opaque-auth-session",
        scopeSessionId: "demo-accounting",
        userId: "user-main",
        scope: expect.objectContaining({
          companyId: "company-demo",
          periodId: "period-2026",
          tenantId: "tenant-demo",
          userId: "user-main",
        }),
      }),
    );
  });

  it("fails closed when the auth user and scope owner differ", async () => {
    const findFirst = vi.fn(async () =>
      createAuthSessionRow({ scopeUserId: "different-user" }),
    );
    const repository = createTenantAuthSessionPrismaRepository(
      createPrisma({ findFirst }),
    );

    await expect(
      repository.findActiveById({
        id: "opaque-auth-session",
        now: new Date("2026-08-04T09:00:00.000Z"),
      }),
    ).resolves.toBeNull();
  });

  it("rejects a foreign scope switch before updating the auth session", async () => {
    const scopeFindFirst = vi.fn(async () => null);
    const updateMany = vi.fn();
    const repository = createTenantAuthSessionPrismaRepository(
      createPrisma({ scopeFindFirst, updateMany }),
    );

    await expect(
      repository.switchScope({
        authSessionId: "opaque-auth-session",
        now: new Date("2026-08-04T09:00:00.000Z"),
        scopeSessionId: "foreign-scope",
        userId: "user-main",
      }),
    ).resolves.toBeNull();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("revokes and switches only a matching active auth session", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const repository = createTenantAuthSessionPrismaRepository(
      createPrisma({
        scopeFindFirst: vi.fn(async () => ({ id: "demo-other" })),
        updateMany,
      }),
    );

    await expect(
      repository.revoke({
        id: "opaque-auth-session",
        revokedAt: new Date("2026-08-04T10:00:00.000Z"),
      }),
    ).resolves.toBe(true);
    await expect(
      repository.switchScope({
        authSessionId: "opaque-auth-session",
        now: new Date("2026-08-04T09:00:00.000Z"),
        scopeSessionId: "demo-other",
        userId: "user-main",
      }),
    ).resolves.toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
          scopeSessionId: "demo-other",
        }),
      }),
    );
  });
});

function createPrisma({
  create = vi.fn(),
  findFirst = vi.fn(),
  scopeFindFirst = vi.fn(),
  updateMany = vi.fn(),
} = {}) {
  return {
    appAuthSession: { create, findFirst, updateMany },
    appSession: { findFirst: scopeFindFirst },
  } as unknown as TenantAuthSessionPrismaClientLike;
}

function createAuthSessionRow({
  scopeUserId = "user-main",
}: {
  scopeUserId?: string;
} = {}) {
  return {
    expiresAt: new Date("2026-08-04T17:00:00.000Z"),
    id: "opaque-auth-session",
    revokedAt: null,
    scopeSessionId: "demo-accounting",
    userId: "user-main",
    scopeSession: {
      company: { id: "company-demo", name: "DEMO İNŞAAT" },
      expiresAt: null,
      id: "demo-accounting",
      licenseLabel: "Pilot P0",
      period: { id: "period-2026", label: "2026" },
      role: "accounting",
      tenant: { id: "tenant-demo", name: "NOA Demo Tenant" },
      user: { id: scopeUserId, name: "Ana Kullanıcı" },
      userId: scopeUserId,
    },
  };
}
