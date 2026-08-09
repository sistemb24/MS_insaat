import { describe, expect, it, vi } from "vitest";

import { createTenantLifecyclePrismaRepository } from "./tenant-lifecycle-prisma-repository";

describe("tenant lifecycle Prisma repository", () => {
  it("atomically freezes a tenant, revokes sessions and records the event", async () => {
    const tx = {
      appAuthSession: { updateMany: vi.fn(async () => ({ count: 3 })) },
      tenant: {
        findUnique: vi.fn(async () => ({
          lifecycleStatus: "ACTIVE",
          lifecycleVersion: 1,
        })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      tenantLifecycleEvent: {
        create: vi.fn(async ({ data }) => ({ id: "event-001", ...data })),
        findUnique: vi.fn(async () => null),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback) => callback(tx)),
    };
    const repository = createTenantLifecyclePrismaRepository(prisma as never);

    await expect(
      repository.transition({
        actorCredentialId: "admin-001",
        expectedVersion: 1,
        occurredAt: new Date("2026-08-09T12:00:00.000Z"),
        operationId: "operation-001",
        tenantId: "tenant-001",
        toStatus: "FROZEN",
      }),
    ).resolves.toMatchObject({ applied: true, revokedSessionCount: 3 });

    expect(tx.tenant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lifecycleStatus: "FROZEN",
          lifecycleVersion: 2,
        }),
      }),
    );
    expect(tx.appAuthSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scopeSession: { tenantId: "tenant-001" },
        }),
      }),
    );
    expect(tx.tenantLifecycleEvent.create).toHaveBeenCalledOnce();
  });

  it("does not mutate when the optimistic version is stale", async () => {
    const tx = {
      tenant: {
        findUnique: vi.fn(async () => ({
          lifecycleStatus: "ACTIVE",
          lifecycleVersion: 2,
        })),
        updateMany: vi.fn(),
      },
      tenantLifecycleEvent: { findUnique: vi.fn(async () => null) },
    };
    const repository = createTenantLifecyclePrismaRepository({
      $transaction: vi.fn(async (callback) => callback(tx)),
    } as never);

    await expect(
      repository.transition({
        actorCredentialId: "admin-001",
        expectedVersion: 1,
        occurredAt: new Date("2026-08-09T12:00:00.000Z"),
        operationId: "operation-001",
        tenantId: "tenant-001",
        toStatus: "FROZEN",
      }),
    ).resolves.toEqual({ applied: false, reason: "version-conflict" });
    expect(tx.tenant.updateMany).not.toHaveBeenCalled();
  });
});
