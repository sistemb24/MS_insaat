import { describe, expect, test, vi } from "vitest";

import {
  PRODUCTION_TENANT_MODELS,
  type ProductionTenantModel,
} from "./production-tenant-inventory";
import { createProductionTenantInventoryPrismaRepository } from "./production-tenant-inventory-prisma-repository";

describe("production tenant inventory Prisma repository", () => {
  test("reads the exact tenant catalog in one repeatable read-only transaction", async () => {
    const { prisma, transaction, delegates } = createPrismaMock();
    const repository = createProductionTenantInventoryPrismaRepository(
      prisma as never,
    );

    const result = await repository.readTenantInventory({
      activeAt: new Date("2026-08-09T12:00:00.000Z"),
      models: PRODUCTION_TENANT_MODELS,
      tenantId: "tenant-001",
    });

    expect(result.modelCounts).toHaveLength(94);
    expect(result.tenant).toEqual({
      activeLegalHoldCount: 2,
      activeSessionCount: 3,
      lifecycleStatus: "FROZEN",
      lifecycleVersion: 4,
    });
    expect(result.documents).toEqual([
      { sizeBytes: 12, storageKey: "document-center/a/file.pdf" },
    ]);
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "RepeatableRead",
      maxWait: 10_000,
      timeout: 120_000,
    });
    for (const model of PRODUCTION_TENANT_MODELS) {
      expect(delegates.get(model)).toHaveBeenCalledWith({
        where: { tenantId: "tenant-001" },
      });
    }
  });

  test("fails before model reads when the DB transaction is not read-only", async () => {
    const { prisma, delegates, queryRaw } = createPrismaMock();
    queryRaw.mockResolvedValue([{ transaction_read_only: "off" }]);
    const repository = createProductionTenantInventoryPrismaRepository(
      prisma as never,
    );

    await expect(
      repository.readTenantInventory({
        activeAt: new Date("2026-08-09T12:00:00.000Z"),
        models: PRODUCTION_TENANT_MODELS,
        tenantId: "tenant-001",
      }),
    ).rejects.toThrow(/salt-okunur değil/);
    expect([...delegates.values()].every((delegate) => delegate.mock.calls.length === 0)).toBe(
      true,
    );
  });

  test("fails closed for catalog drift, unknown lifecycle and unsafe document size", async () => {
    const first = createPrismaMock();
    const repository = createProductionTenantInventoryPrismaRepository(
      first.prisma as never,
    );
    await expect(
      repository.readTenantInventory({
        activeAt: new Date("2026-08-09T12:00:00.000Z"),
        models: PRODUCTION_TENANT_MODELS.slice(1),
        tenantId: "tenant-001",
      }),
    ).rejects.toThrow(/exact katalog/);

    const second = createPrismaMock({ lifecycleStatus: "UNKNOWN" });
    await expect(
      createProductionTenantInventoryPrismaRepository(
        second.prisma as never,
      ).readTenantInventory({
        activeAt: new Date("2026-08-09T12:00:00.000Z"),
        models: PRODUCTION_TENANT_MODELS,
        tenantId: "tenant-001",
      }),
    ).rejects.toThrow(/yaşam döngüsü/);

    const third = createPrismaMock({
      sizeBytes: BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1),
    });
    await expect(
      createProductionTenantInventoryPrismaRepository(
        third.prisma as never,
      ).readTenantInventory({
        activeAt: new Date("2026-08-09T12:00:00.000Z"),
        models: PRODUCTION_TENANT_MODELS,
        tenantId: "tenant-001",
      }),
    ).rejects.toThrow(/güvenli tam sayı/);
  });
});

function createPrismaMock(options: {
  lifecycleStatus?: string;
  sizeBytes?: bigint;
} = {}) {
  const delegates = new Map<ProductionTenantModel, ReturnType<typeof vi.fn>>();
  const queryRaw = vi
    .fn()
    .mockResolvedValue([{ transaction_read_only: "on" }]);
  const tx: Record<string, unknown> = { $queryRaw: queryRaw };

  for (const model of PRODUCTION_TENANT_MODELS) {
    const count = vi.fn().mockResolvedValue(1);
    delegates.set(model, count);
    tx[`${model[0]?.toLowerCase()}${model.slice(1)}`] = { count };
  }

  tx.tenant = {
    findUnique: vi.fn().mockResolvedValue({
      lifecycleStatus: options.lifecycleStatus ?? "FROZEN",
      lifecycleVersion: 4,
    }),
  };
  tx.appAuthSession = { count: vi.fn().mockResolvedValue(3) };
  tx.tenantLegalHold = {
    count: vi.fn().mockImplementation((input) =>
      Promise.resolve(input.where.status === "ACTIVE" ? 2 : 1),
    ),
  };
  delegates.set(
    "TenantLegalHold",
    (tx.tenantLegalHold as { count: ReturnType<typeof vi.fn> }).count,
  );
  tx.documentFile = {
    count: delegates.get("DocumentFile"),
    findMany: vi.fn().mockResolvedValue([
      {
        sizeBytes: options.sizeBytes ?? BigInt(12),
        storageKey: "document-center/a/file.pdf",
      },
    ]),
  };

  const transaction = vi.fn(async (callback) => callback(tx));
  return { delegates, prisma: { $transaction: transaction }, queryRaw, transaction };
}
