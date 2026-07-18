import { describe, expect, test } from "vitest";

import { createAuditLogPrismaRepository } from "./audit-log-prisma-repository";
import type { AuditLogEntryInput } from "./audit-log";
import { defaultTenantScope } from "./tenant-scope";

const entry: AuditLogEntryInput = {
  tenantId: defaultTenantScope.tenantId,
  companyId: defaultTenantScope.companyId,
  periodId: defaultTenantScope.periodId,
  actorUserId: defaultTenantScope.userId,
  action: "purchase-invoice.create",
  entityType: "purchase-invoice",
  entityId: "invoice-1",
  entityLabel: "FAT-0006",
  occurredAt: "2026-06-25T10:00:00.000Z",
  metadata: {
    documentNo: "FAT-0006",
    statusTo: "Taslak",
    grandTotal: 16200,
    lineCount: 1,
  },
};

describe("audit log prisma repository", () => {
  test("records audit entry with tenant scope, actor, entity and JSON metadata", async () => {
    const calls: unknown[] = [];
    const repository = createAuditLogPrismaRepository({
      auditLog: {
        async create(input) {
          calls.push(input);
        },
        async findMany() {
          throw new Error("not used");
        },
      },
    });

    await repository.record(entry);

    expect(calls).toEqual([
      {
        data: {
          tenantId: defaultTenantScope.tenantId,
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          actorUserId: defaultTenantScope.userId,
          action: "purchase-invoice.create",
          entityType: "purchase-invoice",
          entityId: "invoice-1",
          entityLabel: "FAT-0006",
          occurredAt: new Date("2026-06-25T10:00:00.000Z"),
          metadata: {
            documentNo: "FAT-0006",
            statusTo: "Taslak",
            grandTotal: 16200,
            lineCount: 1,
          },
        },
      },
    ]);
  });

  test("normalizes recorded audit metadata currency to the P0 base transaction currency", async () => {
    const calls: unknown[] = [];
    const repository = createAuditLogPrismaRepository({
      auditLog: {
        async create(input) {
          calls.push(input);
        },
        async findMany() {
          throw new Error("not used");
        },
      },
    });

    await repository.record({
      ...entry,
      metadata: {
        ...entry.metadata,
        currency: "USD",
      },
    });

    expect(calls).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            currency: "TL",
          }),
        }),
      }),
    ]);
  });

  test("lists tenant scoped audit entries for an entity type ordered by latest movement", async () => {
    const repository = createAuditLogPrismaRepository({
      auditLog: {
        async create() {
          throw new Error("not used");
        },
        async findMany(input) {
          expect(input).toEqual({
            where: {
              tenantId: defaultTenantScope.tenantId,
              companyId: defaultTenantScope.companyId,
              periodId: defaultTenantScope.periodId,
              entityType: "purchase-invoice",
            },
            orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
            take: 50,
          });

          return [
            {
              id: "audit-1",
              ...entry,
              action: "purchase-invoice.post",
              entityId: "invoice-1",
              entityLabel: "FAT-0006",
              occurredAt: new Date("2026-06-25T12:00:00.000Z"),
              createdAt: new Date("2026-06-25T12:00:01.000Z"),
              metadata: {
                documentNo: "FAT-0006",
                statusFrom: "Taslak",
                statusTo: "Kaydedildi",
              },
            },
          ];
        },
      },
    });

    await expect(
      repository.listByEntityType({
        entityType: "purchase-invoice",
        limit: 50,
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual([
      {
        id: "audit-1",
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
        actorUserId: defaultTenantScope.userId,
        action: "purchase-invoice.post",
        entityType: "purchase-invoice",
        entityId: "invoice-1",
        entityLabel: "FAT-0006",
        occurredAt: "2026-06-25T12:00:00.000Z",
        createdAt: "2026-06-25T12:00:01.000Z",
        metadata: {
          documentNo: "FAT-0006",
          statusFrom: "Taslak",
          statusTo: "Kaydedildi",
        },
      },
    ]);
  });

  test("normalizes listed audit metadata currency to the P0 base transaction currency", async () => {
    const repository = createAuditLogPrismaRepository({
      auditLog: {
        async create() {
          throw new Error("not used");
        },
        async findMany() {
          return [
            {
              id: "audit-1",
              ...entry,
              occurredAt: new Date("2026-06-25T12:00:00.000Z"),
              createdAt: new Date("2026-06-25T12:00:01.000Z"),
              metadata: {
                documentNo: "FAT-0006",
                currency: "EUR",
              },
            },
          ];
        },
      },
    });

    await expect(
      repository.listByEntityType({
        entityType: "purchase-invoice",
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        metadata: expect.objectContaining({
          currency: "TL",
        }),
      }),
    ]);
  });
});



