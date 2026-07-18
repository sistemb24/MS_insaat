import { describe, expect, test } from "vitest";

import { defaultTenantScope } from "./tenant-scope";
import {
  calculateProgressPaymentTotals,
  canMutateProgressPayments,
  createProgressPaymentDraft,
  createProgressPaymentService,
  createSeededProgressPaymentMemoryRepository,
} from "./progress-payment-service";

describe("progress payment service", () => {
  const readOnlyScope = {
    ...defaultTenantScope,
    userId: "user-readonly",
    userName: "Salt Okur",
    userRole: "viewer" as const,
  };

  test("calculates progress payment totals with retention and vat", () => {
    const draft = createProgressPaymentDraft({
      lines: [
        {
          description: "Kaba inşaat imalatı",
          quantity: 10,
          unit: "m2",
          unitPrice: 1000,
          vatRate: 20,
        },
      ],
      retentionRate: 5,
    });

    expect(calculateProgressPaymentTotals(draft)).toEqual({
      grossTotal: 10000,
      retentionTotal: 500,
      netTotal: 9500,
      vatTotal: 1900,
      grandTotal: 11400,
      lines: [
        {
          grossTotal: 10000,
          lineNo: 1,
          vatTotal: 2000,
        },
      ],
    });
  });

  test("normalizes progress payment currency to the P0 base transaction currency", () => {
    const draft = createProgressPaymentDraft(
      createValues({
        currency: "EUR",
        documentNo: "HAK-P0-001",
      }),
    );

    expect(draft.currency).toBe("TL");
  });

  test("creates tenant scoped progress payment with calculated totals", async () => {
    const service = createProgressPaymentService({
      repository: createSeededProgressPaymentMemoryRepository(),
      now: () => "2026-06-27T10:00:00.000Z",
    });

    const result = await service.create({
      scope: defaultTenantScope,
      values: createValues(),
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        documentNo: "HAK-0001",
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
        createdBy: defaultTenantScope.userId,
        updatedBy: defaultTenantScope.userId,
        grossTotal: 10000,
        retentionTotal: 500,
        netTotal: 9500,
        vatTotal: 1900,
        grandTotal: 11400,
        status: "Taslak",
      }),
    });
  });

  test("rejects duplicate document number in the same tenant company period", async () => {
    const service = createProgressPaymentService({
      repository: createSeededProgressPaymentMemoryRepository(),
      now: () => "2026-06-27T10:00:00.000Z",
    });

    await service.create({
      scope: defaultTenantScope,
      values: createValues(),
    });

    await expect(
      service.create({
        scope: defaultTenantScope,
        values: createValues(),
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Evrak no bu dönem için zaten kullanılıyor: HAK-0001"],
    });
  });

  test("posts and cancels progress payment with status rules", async () => {
    let currentTime = "2026-06-27T10:00:00.000Z";
    const service = createProgressPaymentService({
      repository: createSeededProgressPaymentMemoryRepository(),
      now: () => currentTime,
    });

    const createResult = await service.create({
      scope: defaultTenantScope,
      values: createValues(),
    });

    if (!createResult.ok) {
      throw new Error(createResult.errors.join(", "));
    }

    currentTime = "2026-06-27T11:00:00.000Z";

    await expect(
      service.post({
        scope: defaultTenantScope,
        id: createResult.data.id,
      }),
    ).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        id: createResult.data.id,
        status: "Kaydedildi",
        updatedAt: "2026-06-27T11:00:00.000Z",
      }),
    });

    currentTime = "2026-06-27T12:00:00.000Z";

    await expect(
      service.cancel({
        scope: defaultTenantScope,
        id: createResult.data.id,
      }),
    ).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        id: createResult.data.id,
        status: "İptal",
        updatedAt: "2026-06-27T12:00:00.000Z",
      }),
    });

    await expect(
      service.post({
        scope: defaultTenantScope,
        id: createResult.data.id,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["İptal edilmiş hakediş kesinleştirilemez."],
    });
  });

  test("maps tenant role to progress payment mutation permission", async () => {
    const service = createProgressPaymentService({
      repository: createSeededProgressPaymentMemoryRepository(),
      now: () => "2026-06-27T10:00:00.000Z",
    });

    expect(canMutateProgressPayments(defaultTenantScope)).toBe(true);
    expect(canMutateProgressPayments(readOnlyScope)).toBe(false);

    await expect(
      service.create({
        scope: readOnlyScope,
        values: createValues({ documentNo: "HAK-0002" }),
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Hakediş işlemi için muhasebe yetkisi gereklidir."],
    });
  });

  test("records audit log entries for successful progress payment mutations", async () => {
    const auditEntries: Array<{
      action: string;
      entityType: string;
      entityId: string;
      entityLabel: string;
      actorUserId: string;
      occurredAt: string;
      metadata: Record<string, unknown>;
    }> = [];
    let currentTime = "2026-06-27T10:00:00.000Z";
    const service = createProgressPaymentService({
      repository: createSeededProgressPaymentMemoryRepository(),
      now: () => currentTime,
      auditLogRepository: {
        async record(entry: (typeof auditEntries)[number]) {
          auditEntries.push(entry);
        },
      },
    });

    const createResult = await service.create({
      scope: defaultTenantScope,
      values: createValues(),
    });

    if (!createResult.ok) {
      throw new Error(createResult.errors.join(", "));
    }

    currentTime = "2026-06-27T11:00:00.000Z";
    await service.post({ scope: defaultTenantScope, id: createResult.data.id });

    currentTime = "2026-06-27T12:00:00.000Z";
    await service.cancel({ scope: defaultTenantScope, id: createResult.data.id });

    expect(auditEntries).toEqual([
      expect.objectContaining({
        action: "progress-payment.create",
        entityType: "progress-payment",
        entityId: createResult.data.id,
        entityLabel: "HAK-0001",
        actorUserId: defaultTenantScope.userId,
        occurredAt: "2026-06-27T10:00:00.000Z",
        metadata: expect.objectContaining({
          documentNo: "HAK-0001",
          statusTo: "Taslak",
          paymentType: "Taşeron Hakedişi",
          grandTotal: 11400,
          lineCount: 1,
        }),
      }),
      expect.objectContaining({
        action: "progress-payment.post",
        entityId: createResult.data.id,
        entityLabel: "HAK-0001",
        occurredAt: "2026-06-27T11:00:00.000Z",
        metadata: expect.objectContaining({
          statusFrom: "Taslak",
          statusTo: "Kaydedildi",
        }),
      }),
      expect.objectContaining({
        action: "progress-payment.cancel",
        entityId: createResult.data.id,
        entityLabel: "HAK-0001",
        occurredAt: "2026-06-27T12:00:00.000Z",
        metadata: expect.objectContaining({
          statusFrom: "Kaydedildi",
          statusTo: "İptal",
        }),
      }),
    ]);
  });

  test("does not record audit log entries for denied or idempotent progress payment mutations", async () => {
    const auditEntries: Array<{ action: string }> = [];
    let currentTime = "2026-06-27T10:00:00.000Z";
    const service = createProgressPaymentService({
      repository: createSeededProgressPaymentMemoryRepository(),
      now: () => currentTime,
      auditLogRepository: {
        async record(entry: { action: string }) {
          auditEntries.push(entry);
        },
      },
    });

    const createResult = await service.create({
      scope: defaultTenantScope,
      values: createValues(),
    });

    if (!createResult.ok) {
      throw new Error(createResult.errors.join(", "));
    }

    currentTime = "2026-06-27T11:00:00.000Z";
    await service.post({ scope: defaultTenantScope, id: createResult.data.id });
    await service.post({ scope: defaultTenantScope, id: createResult.data.id });

    currentTime = "2026-06-27T12:00:00.000Z";
    await service.cancel({ scope: defaultTenantScope, id: createResult.data.id });
    await service.cancel({ scope: defaultTenantScope, id: createResult.data.id });

    await service.create({
      scope: readOnlyScope,
      values: createValues({ documentNo: "HAK-0002" }),
    });

    expect(auditEntries.map((entry) => entry.action)).toEqual([
      "progress-payment.create",
      "progress-payment.post",
      "progress-payment.cancel",
    ]);
  });
});

function createValues(
  overrides: Partial<Parameters<typeof createProgressPaymentDraft>[0]> = {},
) {
  return {
    counterpartyCode: "TAS-0001",
    counterpartyName: "ŞİRKETİN TAŞERONU",
    currency: "TL" as const,
    description: "Haziran hakedişi",
    documentNo: "HAK-0001",
    issueDate: "2026-06-27",
    lines: [
      {
        description: "Kaba inşaat imalatı",
        quantity: 10,
        unit: "m2",
        unitPrice: 1000,
        vatRate: 20,
      },
    ],
    paymentType: "Taşeron Hakedişi" as const,
    retentionRate: 5,
    siteCode: "SANT-0001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    ...overrides,
  };
}
