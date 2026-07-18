import { describe, expect, test } from "vitest";

import {
  createPurchaseInvoiceService,
  createSeededPurchaseInvoiceMemoryRepository,
} from "./purchase-invoice-service";
import {
  seedDefaultPurchaseInvoiceAuditLogs,
  seedDefaultPurchaseInvoices,
} from "./purchase-invoice-seed";
import { defaultTenantScope } from "./tenant-scope";

const defaultInvoiceDocumentNumbers = [
  "FAT-0006",
  "FAT-2026-001",
  "FAT-2026-002",
  "FAT-2026-003",
];

describe("purchase invoice seed", () => {
  test("seeds default purchase invoice rows once", async () => {
    const service = createPurchaseInvoiceService({
      repository: createSeededPurchaseInvoiceMemoryRepository(),
      now: () => "2026-06-25T10:00:00.000Z",
    });

    const firstResult = await seedDefaultPurchaseInvoices({
      scope: defaultTenantScope,
      service,
    });
    const secondResult = await seedDefaultPurchaseInvoices({
      scope: defaultTenantScope,
      service,
    });

    expect(firstResult).toEqual({
      seeded: defaultInvoiceDocumentNumbers,
      skipped: [],
      totalRows: defaultInvoiceDocumentNumbers.length,
    });
    expect(secondResult).toEqual({
      seeded: [],
      skipped: defaultInvoiceDocumentNumbers,
      totalRows: defaultInvoiceDocumentNumbers.length,
    });
  });

  test("seeds demo purchase invoice audit history once", async () => {
    const service = createPurchaseInvoiceService({
      repository: createSeededPurchaseInvoiceMemoryRepository(),
      now: () => "2026-06-25T10:00:00.000Z",
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

    await seedDefaultPurchaseInvoices({
      scope: defaultTenantScope,
      service,
    });

    const firstResult = await seedDefaultPurchaseInvoiceAuditLogs({
      auditLogRepository,
      scope: defaultTenantScope,
      service,
    });
    const secondResult = await seedDefaultPurchaseInvoiceAuditLogs({
      auditLogRepository,
      scope: defaultTenantScope,
      service,
    });

    expect(firstResult).toEqual({
      seeded: defaultInvoiceDocumentNumbers,
      skipped: [],
    });
    expect(secondResult).toEqual({
      seeded: [],
      skipped: defaultInvoiceDocumentNumbers,
    });
    expect(auditEntries.map((entry) => entry.entityLabel)).toEqual(
      defaultInvoiceDocumentNumbers,
    );
    expect(auditEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "purchase-invoice.create",
          entityLabel: "FAT-0006",
          entityType: "purchase-invoice",
          occurredAt: "2026-06-25T10:00:00.000Z",
          metadata: expect.objectContaining({
            documentNo: "FAT-0006",
            statusTo: "Taslak",
            grandTotal: 21425,
            lineCount: 2,
          }),
        }),
        expect.objectContaining({
          action: "purchase-invoice.create",
          entityLabel: "FAT-2026-003",
          entityType: "purchase-invoice",
          metadata: expect.objectContaining({
            documentNo: "FAT-2026-003",
            statusTo: "Taslak",
            lineCount: 1,
          }),
        }),
      ]),
    );
  });
});