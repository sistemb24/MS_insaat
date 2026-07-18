import { describe, expect, test, vi } from "vitest";

import { defaultTenantScope } from "./tenant-scope";
import { createWebhookEndpointPrismaRepository } from "./webhook-endpoint-prisma-repository";

const record = {
  companyId: defaultTenantScope.companyId,
  createdAt: new Date("2026-07-12T10:00:00.000Z"),
  createdBy: defaultTenantScope.userId,
  eventTypes: ["invoice.created", "bank.transaction.matched"],
  id: "webhook-endpoint-1",
  isActive: true,
  name: "Fatura Bildirimi",
  periodId: defaultTenantScope.periodId,
  secretHash: "hash",
  secretPrefix: "noa_whsec_123456",
  tenantId: defaultTenantScope.tenantId,
  updatedAt: new Date("2026-07-12T10:00:00.000Z"),
  url: "https://hooks.example.com/webhooks/noa",
};

function createPrismaMock() {
  return {
    webhookEndpoint: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe("webhook endpoint prisma repository", () => {
  test("lists only the active tenant, company and period scope", async () => {
    const prisma = createPrismaMock();
    prisma.webhookEndpoint.findMany.mockResolvedValue([record]);
    const repository = createWebhookEndpointPrismaRepository(prisma);

    const rows = await repository.list({ scope: defaultTenantScope });

    expect(prisma.webhookEndpoint.findMany).toHaveBeenCalledWith({
      orderBy: [{ createdAt: "desc" }],
      where: {
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    });
    expect(rows[0]).toMatchObject({
      id: "webhook-endpoint-1",
      eventTypes: ["invoice.created", "bank.transaction.matched"],
      isActive: true,
      name: "Fatura Bildirimi",
    });
    expect(rows[0]).not.toHaveProperty("secretHash");
  });

  test("counts only the active scope endpoints", async () => {
    const prisma = createPrismaMock();
    prisma.webhookEndpoint.count.mockResolvedValue(2);
    const repository = createWebhookEndpointPrismaRepository(prisma);

    await expect(repository.countByScope?.({ scope: defaultTenantScope })).resolves.toBe(2);
    expect(prisma.webhookEndpoint.count).toHaveBeenCalledWith({
      where: {
        companyId: defaultTenantScope.companyId,
        isActive: true,
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    });
  });

  test("persists the secret hash and omits the raw secret from rows", async () => {
    const prisma = createPrismaMock();
    prisma.webhookEndpoint.create.mockResolvedValue(record);
    const repository = createWebhookEndpointPrismaRepository(prisma);

    const row = await repository.create({
      record: {
        companyId: defaultTenantScope.companyId,
        createdAt: "2026-07-12T10:00:00.000Z",
        createdBy: defaultTenantScope.userId,
        eventTypes: ["invoice.created"],
        id: "webhook-endpoint-1",
        isActive: true,
        name: "Fatura Bildirimi",
        periodId: defaultTenantScope.periodId,
        secretHash: "hash",
        secretPrefix: "noa_whsec_123456",
        tenantId: defaultTenantScope.tenantId,
        url: "https://hooks.example.com/webhooks/noa",
      },
    });

    expect(prisma.webhookEndpoint.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        secretHash: "hash",
        secretPrefix: "noa_whsec_123456",
      }),
    });
    expect(row).toMatchObject({
      id: "webhook-endpoint-1",
      secretPrefix: "noa_whsec_123456",
      url: "https://hooks.example.com/webhooks/noa",
    });
  });

  test("deactivates only an in-scope active webhook endpoint", async () => {
    const prisma = createPrismaMock();
    prisma.webhookEndpoint.findFirst.mockResolvedValue(record);
    prisma.webhookEndpoint.update.mockResolvedValue({
      ...record,
      isActive: false,
      updatedAt: new Date("2026-07-12T11:00:00.000Z"),
    });
    const repository = createWebhookEndpointPrismaRepository(prisma);

    const row = await repository.deactivate({
      id: "webhook-endpoint-1",
      scope: defaultTenantScope,
      updatedAtIso: "2026-07-12T11:00:00.000Z",
    });

    expect(prisma.webhookEndpoint.findFirst).toHaveBeenCalledWith({
      where: {
        companyId: defaultTenantScope.companyId,
        id: "webhook-endpoint-1",
        isActive: true,
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    });
    expect(prisma.webhookEndpoint.update).toHaveBeenCalledWith({
      data: {
        isActive: false,
        updatedAt: new Date("2026-07-12T11:00:00.000Z"),
      },
      where: {
        companyId: defaultTenantScope.companyId,
        id: "webhook-endpoint-1",
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    });
    expect(row).toMatchObject({
      id: "webhook-endpoint-1",
      isActive: false,
    });
  });

  test("activates only an in-scope passive webhook endpoint", async () => {
    const prisma = createPrismaMock();
    prisma.webhookEndpoint.findFirst.mockResolvedValue({ ...record, isActive: false });
    prisma.webhookEndpoint.update.mockResolvedValue({
      ...record,
      isActive: true,
      updatedAt: new Date("2026-07-12T11:30:00.000Z"),
    });
    const repository = createWebhookEndpointPrismaRepository(prisma);

    const row = await repository.activate({
      id: "webhook-endpoint-1",
      scope: defaultTenantScope,
      updatedAtIso: "2026-07-12T11:30:00.000Z",
    });

    expect(prisma.webhookEndpoint.findFirst).toHaveBeenCalledWith({
      where: {
        companyId: defaultTenantScope.companyId,
        id: "webhook-endpoint-1",
        isActive: false,
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    });
    expect(prisma.webhookEndpoint.update).toHaveBeenCalledWith({
      data: {
        isActive: true,
        updatedAt: new Date("2026-07-12T11:30:00.000Z"),
      },
      where: {
        companyId: defaultTenantScope.companyId,
        id: "webhook-endpoint-1",
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    });
    expect(row).toMatchObject({ id: "webhook-endpoint-1", isActive: true });
  });

  test("updates only the scoped webhook endpoint content and preserves the secret fields", async () => {
    const prisma = createPrismaMock();
    prisma.webhookEndpoint.findFirst.mockResolvedValue(record);
    prisma.webhookEndpoint.update.mockResolvedValue({
      ...record,
      eventTypes: ["invoice.created"],
      name: "Güncel Bildirim",
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      url: "https://hooks.example.com/webhooks/guncel",
    });
    const repository = createWebhookEndpointPrismaRepository(prisma);

    const row = await repository.update({
      id: "webhook-endpoint-1",
      scope: defaultTenantScope,
      updatedAtIso: "2026-07-12T12:00:00.000Z",
      values: {
        eventTypes: ["invoice.created"],
        name: "Güncel Bildirim",
        url: "https://hooks.example.com/webhooks/guncel",
      },
    });

    expect(prisma.webhookEndpoint.findFirst).toHaveBeenCalledWith({
      where: {
        companyId: defaultTenantScope.companyId,
        id: "webhook-endpoint-1",
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    });
    expect(prisma.webhookEndpoint.update).toHaveBeenCalledWith({
      data: {
        eventTypes: ["invoice.created"],
        name: "Güncel Bildirim",
        updatedAt: new Date("2026-07-12T12:00:00.000Z"),
        url: "https://hooks.example.com/webhooks/guncel",
      },
      where: {
        companyId: defaultTenantScope.companyId,
        id: "webhook-endpoint-1",
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    });
    expect(row).toMatchObject({
      id: "webhook-endpoint-1",
      name: "Güncel Bildirim",
      url: "https://hooks.example.com/webhooks/guncel",
    });
  });

  test("rotates only the scoped webhook endpoint secret fields", async () => {
    const prisma = createPrismaMock();
    prisma.webhookEndpoint.findFirst.mockResolvedValue(record);
    prisma.webhookEndpoint.update.mockResolvedValue({
      ...record,
      secretPrefix: "noa_whsec_rotated",
      updatedAt: new Date("2026-07-12T12:30:00.000Z"),
    });
    const repository = createWebhookEndpointPrismaRepository(prisma);

    const row = await repository.rotateSecret({
      id: "webhook-endpoint-1",
      scope: defaultTenantScope,
      secretHash: "new-hash",
      secretPrefix: "noa_whsec_rotated",
      updatedAtIso: "2026-07-12T12:30:00.000Z",
    });

    expect(prisma.webhookEndpoint.findFirst).toHaveBeenCalledWith({
      where: {
        companyId: defaultTenantScope.companyId,
        id: "webhook-endpoint-1",
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    });
    expect(prisma.webhookEndpoint.update).toHaveBeenCalledWith({
      data: {
        secretHash: "new-hash",
        secretPrefix: "noa_whsec_rotated",
        updatedAt: new Date("2026-07-12T12:30:00.000Z"),
      },
      where: {
        companyId: defaultTenantScope.companyId,
        id: "webhook-endpoint-1",
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    });
    expect(row).toMatchObject({
      id: "webhook-endpoint-1",
      secretPrefix: "noa_whsec_rotated",
    });
  });
});
