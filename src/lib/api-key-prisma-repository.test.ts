import { describe, expect, test, vi } from "vitest";

import { defaultTenantScope } from "./tenant-scope";
import { createApiKeyPrismaRepository } from "./api-key-prisma-repository";
import type { ApiKeyScope } from "./api-key-service";

const record = {
  companyId: defaultTenantScope.companyId,
  createdAt: new Date("2026-07-11T10:00:00.000Z"),
  createdBy: defaultTenantScope.userId,
  expiresAt: new Date("2026-12-31T00:00:00.000Z"),
  id: "api-key-1",
  keyHash: "hash",
  keyPrefix: "noa_live_1234567",
  lastUsedAt: null,
  name: "ERP",
  periodId: defaultTenantScope.periodId,
  rateLimitPerSecond: 10,
  rateLimitWindowCount: 0,
  rateLimitWindowStartedAt: null,
  revokedAt: null,
  revokedBy: null,
  scopes: ["invoices"],
  tenantId: defaultTenantScope.tenantId,
};

function createPrismaMock() {
  return {
    apiKey: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe("api key prisma repository", () => {
  test("lists only the active tenant, company and period scope", async () => {
    const prisma = createPrismaMock();
    prisma.apiKey.findMany.mockResolvedValue([record]);
    const repository = createApiKeyPrismaRepository(prisma);

    const rows = await repository.list({ scope: defaultTenantScope, today: "2026-07-11" });

    expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
      orderBy: [{ createdAt: "desc" }],
      where: {
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    });
    expect(rows[0]).toMatchObject({ id: "api-key-1", scopes: ["invoices"], status: "active" });
    expect(rows[0]).not.toHaveProperty("keyHash");
  });

  test("does not update a missing or out-of-scope key during revocation", async () => {
    const prisma = createPrismaMock();
    prisma.apiKey.findFirst.mockResolvedValue(null);
    const repository = createApiKeyPrismaRepository(prisma);

    const result = await repository.revoke({
      id: "outside",
      nowIso: "2026-07-11T10:00:00.000Z",
      scope: defaultTenantScope,
    });

    expect(result).toBeNull();
    expect(prisma.apiKey.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      }),
    });
    expect(prisma.apiKey.update).not.toHaveBeenCalled();
  });

  test("finds a key by hash without exposing the raw secret", async () => {
    const prisma = createPrismaMock();
    prisma.apiKey.findFirst.mockResolvedValue(record);
    const repository = createApiKeyPrismaRepository(prisma);

    const row = await repository.findByKeyHash({
      keyHash: "hash",
      today: "2026-07-11",
    });

    expect(prisma.apiKey.findFirst).toHaveBeenCalledWith({
      where: {
        keyHash: "hash",
      },
    });
    expect(row).toMatchObject({
      companyId: defaultTenantScope.companyId,
      id: "api-key-1",
      periodId: defaultTenantScope.periodId,
      tenantId: defaultTenantScope.tenantId,
    });
    expect(row).not.toHaveProperty("keyHash");
  });

  test("touches lastUsedAt after a successful authentication", async () => {
    const prisma = createPrismaMock();
    prisma.apiKey.findFirst.mockResolvedValue(record);
    prisma.apiKey.update.mockResolvedValue({
      ...record,
      lastUsedAt: new Date("2026-07-11T11:00:00.000Z"),
    });
    const repository = createApiKeyPrismaRepository(prisma);

    const row = await repository.touchLastUsed({
      id: "api-key-1",
      nowIso: "2026-07-11T11:00:00.000Z",
      today: "2026-07-11",
    });

    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      data: { lastUsedAt: new Date("2026-07-11T11:00:00.000Z") },
      where: { id: "api-key-1" },
    });
    expect(row).toMatchObject({
      id: "api-key-1",
      lastUsedAt: "2026-07-11T11:00:00.000Z",
      status: "active",
    });
  });

  test("consumes usage within the current rate limit window", async () => {
    const prisma = createPrismaMock();
    prisma.apiKey.findFirst.mockResolvedValueOnce({
      ...record,
      rateLimitWindowCount: 1,
      rateLimitWindowStartedAt: new Date("2026-07-11T11:00:00.000Z"),
      lastUsedAt: new Date("2026-07-11T11:00:00.000Z"),
    });
    prisma.apiKey.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.apiKey.findFirst.mockResolvedValueOnce({
      ...record,
      lastUsedAt: new Date("2026-07-11T11:00:00.000Z"),
      rateLimitWindowCount: 2,
      rateLimitWindowStartedAt: new Date("2026-07-11T11:00:00.000Z"),
    });
    const repository = createApiKeyPrismaRepository(prisma);

    const row = await repository.consumeUsage?.({
      key: {
        ...record,
        createdAt: record.createdAt.toISOString(),
        expiresAt: "",
        lastUsedAt: "2026-07-11T11:00:00.000Z",
        rateLimitWindowStartedAt: "2026-07-11T11:00:00.000Z",
        revokedAt: "",
        revokedBy: "",
        scopes: ["invoices"] as ApiKeyScope[],
        status: "active",
      },
      nowIso: "2026-07-11T11:00:00.000Z",
      today: "2026-07-11",
    });

    expect(prisma.apiKey.updateMany).toHaveBeenCalledWith({
      data: {
        lastUsedAt: new Date("2026-07-11T11:00:00.000Z"),
        rateLimitWindowCount: { increment: 1 },
      },
      where: {
        id: "api-key-1",
        rateLimitWindowCount: 1,
        rateLimitWindowStartedAt: new Date("2026-07-11T11:00:00.000Z"),
        revokedAt: null,
      },
    });
    expect(row).toMatchObject({
      id: "api-key-1",
      rateLimitWindowCount: 2,
      rateLimitWindowStartedAt: "2026-07-11T11:00:00.000Z",
      status: "active",
    });
  });
});
