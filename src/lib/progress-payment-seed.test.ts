import { describe, expect, test } from "vitest";

import {
  createProgressPaymentService,
  createSeededProgressPaymentMemoryRepository,
} from "./progress-payment-service";
import {
  seedDefaultProgressPaymentAuditLogs,
  seedDefaultProgressPayments,
} from "./progress-payment-seed";
import { defaultTenantScope } from "./tenant-scope";

describe("progress payment seed", () => {
  test("seeds default progress payment once", async () => {
    const service = createProgressPaymentService({
      repository: createSeededProgressPaymentMemoryRepository(),
      now: () => "2026-06-27T10:00:00.000Z",
    });

    const firstResult = await seedDefaultProgressPayments({
      scope: defaultTenantScope,
      service,
    });
    const secondResult = await seedDefaultProgressPayments({
      scope: defaultTenantScope,
      service,
    });

    expect(firstResult).toEqual({
      seeded: ["HAK-0001", "HAK-0002", "HAK-0003"],
      skipped: [],
      totalRows: 3,
    });
    expect(secondResult).toEqual({
      seeded: [],
      skipped: ["HAK-0001", "HAK-0002", "HAK-0003"],
      totalRows: 3,
    });
  });

  test("seeds demo progress payment audit history once", async () => {
    const service = createProgressPaymentService({
      repository: createSeededProgressPaymentMemoryRepository(),
      now: () => "2026-06-27T10:00:00.000Z",
    });
    const auditEntries: Array<{
      action: string;
      entityId: string;
      entityLabel: string;
      entityType: string;
      occurredAt: string;
      metadata: Record<string, unknown>;
    }> = [];
    const auditLogRepository = {
      async record(entry: (typeof auditEntries)[number]) {
        auditEntries.push(entry);
      },
      async listByEntityType() {
        return auditEntries.map((entry, index) => ({
          id: `audit-${index + 1}`,
          tenantId: defaultTenantScope.tenantId,
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          actorUserId: defaultTenantScope.userId,
          createdAt: entry.occurredAt,
          ...entry,
        }));
      },
    };

    await seedDefaultProgressPayments({
      scope: defaultTenantScope,
      service,
    });

    const firstResult = await seedDefaultProgressPaymentAuditLogs({
      auditLogRepository,
      scope: defaultTenantScope,
      service,
    });
    const secondResult = await seedDefaultProgressPaymentAuditLogs({
      auditLogRepository,
      scope: defaultTenantScope,
      service,
    });

    expect(firstResult).toEqual({
      seeded: ["HAK-0001", "HAK-0002", "HAK-0003"],
      skipped: [],
    });
    expect(secondResult).toEqual({
      seeded: [],
      skipped: ["HAK-0001", "HAK-0002", "HAK-0003"],
    });
    expect(auditEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "progress-payment.create",
          entityLabel: "HAK-0001",
          entityType: "progress-payment",
          occurredAt: "2026-06-27T10:00:00.000Z",
          metadata: expect.objectContaining({
            documentNo: "HAK-0001",
            statusTo: "Taslak",
            paymentType: "Taşeron Hakedişi",
            grandTotal: 19950,
            lineCount: 2,
          }),
        }),
        expect.objectContaining({
          action: "progress-payment.create",
          entityLabel: "HAK-0002",
          entityType: "progress-payment",
          metadata: expect.objectContaining({
            documentNo: "HAK-0002",
            statusTo: "Taslak",
            paymentType: "Taşeron Hakedişi",
            lineCount: 3,
          }),
        }),
        expect.objectContaining({
          action: "progress-payment.create",
          entityLabel: "HAK-0003",
          entityType: "progress-payment",
          metadata: expect.objectContaining({
            documentNo: "HAK-0003",
            statusTo: "Taslak",
            paymentType: "Taşeron Hakedişi",
            lineCount: 4,
          }),
        }),
      ]),
    );
    expect(auditEntries).toHaveLength(3);
  });
});
