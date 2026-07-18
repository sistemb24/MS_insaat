import { describe, expect, test, vi } from "vitest";

import { defaultTenantScope } from "./tenant-scope";
import {
  canMutatePurchaseInvoices,
  createPurchaseInvoiceService,
  createSeededPurchaseInvoiceMemoryRepository,
  validatePurchaseInvoiceStockCodes,
} from "./purchase-invoice-service";

describe("purchase invoice service", () => {
  test("validates only active stock card references", () => {
    const values = {
      lines: [
        { stockCode: "STK-0001" },
        { stockCode: "STK-0001" },
        { stockCode: "STK-9999" },
        { stockCode: "" },
      ],
    } as never;

    expect(validatePurchaseInvoiceStockCodes(values, ["STK-0001"])).toEqual([
      "Aktif stok kartı bulunamadı: STK-9999",
    ]);
    expect(validatePurchaseInvoiceStockCodes(values, ["STK-0001", "STK-9999"])).toEqual([]);
  });
  const readOnlyScope = {
    ...defaultTenantScope,
    userId: "user-readonly",
    userName: "Salt Okur",
    userRole: "viewer" as const,
  };

  test("maps tenant role to purchase invoice mutation permission", () => {
    expect(canMutatePurchaseInvoices(defaultTenantScope)).toBe(true);
    expect(canMutatePurchaseInvoices(readOnlyScope)).toBe(false);
  });

  test("creates tenant scoped purchase invoice with calculated totals", async () => {
    const service = createPurchaseInvoiceService({
      repository: createSeededPurchaseInvoiceMemoryRepository(),
      now: () => "2026-06-25T10:00:00.000Z",
    });

    const result = await service.create({
      scope: defaultTenantScope,
      values: {
        documentNo: "FAT-0006",
        invoiceDate: "2026-06-23",
        dueDate: "2026-07-23",
        counterpartyCode: "TED-0001",
        counterpartyName: "ÖRNEK TEDARİKÇİ",
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        lines: [
          {
            stockCode: "STK-0001",
            stockName: "Çimento Torba",
            unit: "Adet",
            quantity: 100,
            unitPrice: 150,
            discountRate1: 10,
            vatRate: 20,
          },
        ],
      },
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        documentNo: "FAT-0006",
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
        createdBy: defaultTenantScope.userId,
        updatedBy: defaultTenantScope.userId,
        subtotal: 15000,
        discountTotal: 1500,
        netTotal: 13500,
        vatTotal: 2700,
        grandTotal: 16200,
        status: "Taslak",
      }),
    });

    const listResult = await service.list({ scope: defaultTenantScope });

    expect(listResult).toEqual({
      ok: true,
      data: {
        rows: [
          expect.objectContaining({
            documentNo: "FAT-0006",
            grandTotal: 16200,
          }),
        ],
      },
    });
  });

  test("rejects duplicate document number in the same tenant company period", async () => {
    const service = createPurchaseInvoiceService({
      repository: createSeededPurchaseInvoiceMemoryRepository(),
      now: () => "2026-06-25T10:00:00.000Z",
    });

    const input = {
      scope: defaultTenantScope,
      values: {
        documentNo: "FAT-0006",
        invoiceDate: "2026-06-23",
        counterpartyCode: "TED-0001",
        counterpartyName: "ÖRNEK TEDARİKÇİ",
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        lines: [
          {
            stockName: "Nakliye",
            unit: "Sefer",
            quantity: 1,
            unitPrice: 100,
            vatRate: 20,
          },
        ],
      },
    };

    await service.create(input);
    const duplicateResult = await service.create(input);

    expect(duplicateResult).toEqual({
      ok: false,
      errors: ["Evrak no bu dönem için zaten kullanılıyor: FAT-0006"],
    });
  });

  test("updates existing invoice while preserving identity and recalculating totals", async () => {
    let currentTime = "2026-06-25T10:00:00.000Z";
    const service = createPurchaseInvoiceService({
      repository: createSeededPurchaseInvoiceMemoryRepository(),
      now: () => currentTime,
    });

    const createResult = await service.create({
      scope: defaultTenantScope,
      values: {
        documentNo: "FAT-0006",
        invoiceDate: "2026-06-23",
        counterpartyCode: "TED-0001",
        counterpartyName: "ÖRNEK TEDARİKÇİ",
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        lines: [
          {
            stockName: "Çimento Torba",
            unit: "Adet",
            quantity: 100,
            unitPrice: 150,
            discountRate1: 10,
            vatRate: 20,
          },
        ],
      },
    });

    if (!createResult.ok) {
      throw new Error(createResult.errors.join(", "));
    }

    currentTime = "2026-06-25T11:00:00.000Z";

    const updateResult = await service.update({
      scope: defaultTenantScope,
      id: createResult.data.id,
      values: {
        documentNo: "FAT-0099",
        invoiceDate: "2026-06-24",
        counterpartyCode: "TED-0001",
        counterpartyName: "ÖRNEK TEDARİKÇİ",
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        lines: [
          {
            stockName: "Güncellenen Çimento",
            unit: "Adet",
            quantity: 2,
            unitPrice: 1000,
            vatRate: 20,
          },
        ],
      },
    });

    expect(updateResult).toEqual({
      ok: true,
      data: expect.objectContaining({
        id: createResult.data.id,
        documentNo: "FAT-0099",
        createdAt: "2026-06-25T10:00:00.000Z",
        updatedAt: "2026-06-25T11:00:00.000Z",
        status: "Taslak",
        subtotal: 2000,
        netTotal: 2000,
        vatTotal: 400,
        grandTotal: 2400,
        lineCount: 1,
        lines: [
          expect.objectContaining({
            stockName: "Güncellenen Çimento",
            quantity: 2,
            unitPrice: 1000,
          }),
        ],
      }),
    });

    await expect(service.list({ scope: defaultTenantScope })).resolves.toEqual({
      ok: true,
      data: {
        rows: [
          expect.objectContaining({
            id: createResult.data.id,
            documentNo: "FAT-0099",
            grandTotal: 2400,
          }),
        ],
      },
    });
  });

  test("cancels existing invoice without deleting its audit trail", async () => {
    let currentTime = "2026-06-25T10:00:00.000Z";
    const service = createPurchaseInvoiceService({
      repository: createSeededPurchaseInvoiceMemoryRepository(),
      now: () => currentTime,
    });

    const createResult = await service.create({
      scope: defaultTenantScope,
      values: {
        documentNo: "FAT-0006",
        invoiceDate: "2026-06-23",
        counterpartyCode: "TED-0001",
        counterpartyName: "ÖRNEK TEDARİKÇİ",
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        lines: [
          {
            stockName: "Çimento Torba",
            unit: "Adet",
            quantity: 100,
            unitPrice: 150,
            discountRate1: 10,
            vatRate: 20,
          },
        ],
      },
    });

    if (!createResult.ok) {
      throw new Error(createResult.errors.join(", "));
    }

    currentTime = "2026-06-25T12:00:00.000Z";

    const cancelResult = await service.cancel({
      scope: defaultTenantScope,
      id: createResult.data.id,
    });

    expect(cancelResult).toEqual({
      ok: true,
      data: expect.objectContaining({
        id: createResult.data.id,
        documentNo: "FAT-0006",
        status: "İptal",
        createdAt: "2026-06-25T10:00:00.000Z",
        updatedAt: "2026-06-25T12:00:00.000Z",
        updatedBy: defaultTenantScope.userId,
        grandTotal: 16200,
        lineCount: 1,
      }),
    });

    await expect(service.list({ scope: defaultTenantScope })).resolves.toEqual({
      ok: true,
      data: {
        rows: [
          expect.objectContaining({
            id: createResult.data.id,
            status: "İptal",
            grandTotal: 16200,
          }),
        ],
      },
    });
  });

  test("posts draft invoice and keeps posted invoice idempotent", async () => {
    let currentTime = "2026-06-25T10:00:00.000Z";
    const service = createPurchaseInvoiceService({
      repository: createSeededPurchaseInvoiceMemoryRepository(),
      now: () => currentTime,
    });

    const createResult = await service.create({
      scope: defaultTenantScope,
      values: {
        documentNo: "FAT-0006",
        invoiceDate: "2026-06-23",
        counterpartyCode: "TED-0001",
        counterpartyName: "ÖRNEK TEDARİKÇİ",
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        lines: [
          {
            stockName: "Çimento Torba",
            unit: "Adet",
            quantity: 100,
            unitPrice: 150,
            discountRate1: 10,
            vatRate: 20,
          },
        ],
      },
    });

    if (!createResult.ok) {
      throw new Error(createResult.errors.join(", "));
    }

    currentTime = "2026-06-25T13:00:00.000Z";

    const postResult = await service.post({
      scope: defaultTenantScope,
      id: createResult.data.id,
    });

    expect(postResult).toEqual({
      ok: true,
      data: expect.objectContaining({
        id: createResult.data.id,
        status: "Kaydedildi",
        createdAt: "2026-06-25T10:00:00.000Z",
        updatedAt: "2026-06-25T13:00:00.000Z",
        updatedBy: defaultTenantScope.userId,
        grandTotal: 16200,
      }),
    });

    currentTime = "2026-06-25T14:00:00.000Z";

    const secondPostResult = await service.post({
      scope: defaultTenantScope,
      id: createResult.data.id,
    });

    expect(secondPostResult).toEqual({
      ok: true,
      data: expect.objectContaining({
        id: createResult.data.id,
        status: "Kaydedildi",
        updatedAt: "2026-06-25T13:00:00.000Z",
      }),
    });
  });

  test("records audit log entries for successful mutations and rejected posted cancellation", async () => {
    const auditEntries: Array<{
      action: string;
      entityType: string;
      entityId: string;
      entityLabel: string;
      actorUserId: string;
      occurredAt: string;
      metadata: Record<string, unknown>;
    }> = [];
    let currentTime = "2026-06-25T10:00:00.000Z";
    const serviceOptions = {
      repository: createSeededPurchaseInvoiceMemoryRepository(),
      now: () => currentTime,
      auditLogRepository: {
        async record(entry: (typeof auditEntries)[number]) {
          auditEntries.push(entry);
        },
      },
    };
    const service = createPurchaseInvoiceService(serviceOptions);

    const createResult = await service.create({
      scope: defaultTenantScope,
      values: {
        documentNo: "FAT-0006",
        invoiceDate: "2026-06-23",
        counterpartyCode: "TED-0001",
        counterpartyName: "ÖRNEK TEDARİKÇİ",
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        lines: [
          {
            stockName: "Çimento Torba",
            unit: "Adet",
            quantity: 100,
            unitPrice: 150,
            discountRate1: 10,
            vatRate: 20,
          },
        ],
      },
    });

    if (!createResult.ok) {
      throw new Error(createResult.errors.join(", "));
    }

    currentTime = "2026-06-25T11:00:00.000Z";

    const updateResult = await service.update({
      scope: defaultTenantScope,
      id: createResult.data.id,
      values: {
        documentNo: "FAT-0099",
        invoiceDate: "2026-06-24",
        counterpartyCode: "TED-0001",
        counterpartyName: "ÖRNEK TEDARİKÇİ",
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        lines: [
          {
            stockName: "Güncellenen Çimento",
            unit: "Adet",
            quantity: 2,
            unitPrice: 1000,
            vatRate: 20,
          },
        ],
      },
    });

    if (!updateResult.ok) {
      throw new Error(updateResult.errors.join(", "));
    }

    currentTime = "2026-06-25T12:00:00.000Z";
    await service.post({ scope: defaultTenantScope, id: createResult.data.id });

    currentTime = "2026-06-25T13:00:00.000Z";
    await service.cancel({ scope: defaultTenantScope, id: createResult.data.id });

    expect(auditEntries).toEqual([
      expect.objectContaining({
        action: "purchase-invoice.create",
        entityType: "purchase-invoice",
        entityId: createResult.data.id,
        entityLabel: "FAT-0006",
        actorUserId: defaultTenantScope.userId,
        occurredAt: "2026-06-25T10:00:00.000Z",
        metadata: expect.objectContaining({
          documentNo: "FAT-0006",
          statusTo: "Taslak",
          grandTotal: 16200,
          lineCount: 1,
        }),
      }),
      expect.objectContaining({
        action: "purchase-invoice.update",
        entityId: createResult.data.id,
        entityLabel: "FAT-0099",
        occurredAt: "2026-06-25T11:00:00.000Z",
        metadata: expect.objectContaining({
          documentNo: "FAT-0099",
          statusFrom: "Taslak",
          statusTo: "Taslak",
          grandTotal: 2400,
        }),
      }),
      expect.objectContaining({
        action: "purchase-invoice.post",
        entityId: createResult.data.id,
        entityLabel: "FAT-0099",
        occurredAt: "2026-06-25T12:00:00.000Z",
        metadata: expect.objectContaining({
          statusFrom: "Taslak",
          statusTo: "Kaydedildi",
        }),
      }),
      expect.objectContaining({
        action: "purchase-invoice.cancel-rejected",
        entityId: createResult.data.id,
        entityLabel: "FAT-0099",
        occurredAt: "2026-06-25T13:00:00.000Z",
        metadata: expect.objectContaining({
          statusFrom: "Kaydedildi",
          statusTo: "Kaydedildi",
          reasonCode: "ledger-reversal-required",
        }),
      }),
    ]);
  });

  test("does not repeat success audit for idempotent post and records each posted cancellation rejection", async () => {
    const auditEntries: Array<{ action: string }> = [];
    let currentTime = "2026-06-25T10:00:00.000Z";
    const serviceOptions = {
      repository: createSeededPurchaseInvoiceMemoryRepository(),
      now: () => currentTime,
      auditLogRepository: {
        async record(entry: { action: string }) {
          auditEntries.push(entry);
        },
      },
    };
    const service = createPurchaseInvoiceService(serviceOptions);

    const createResult = await service.create({
      scope: defaultTenantScope,
      values: {
        documentNo: "FAT-0006",
        invoiceDate: "2026-06-23",
        counterpartyCode: "TED-0001",
        counterpartyName: "ÖRNEK TEDARİKÇİ",
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        lines: [
          {
            stockName: "Çimento Torba",
            unit: "Adet",
            quantity: 100,
            unitPrice: 150,
            discountRate1: 10,
            vatRate: 20,
          },
        ],
      },
    });

    if (!createResult.ok) {
      throw new Error(createResult.errors.join(", "));
    }

    currentTime = "2026-06-25T11:00:00.000Z";
    await service.post({ scope: defaultTenantScope, id: createResult.data.id });
    await service.post({ scope: defaultTenantScope, id: createResult.data.id });

    currentTime = "2026-06-25T12:00:00.000Z";
    await service.cancel({ scope: defaultTenantScope, id: createResult.data.id });
    await service.cancel({ scope: defaultTenantScope, id: createResult.data.id });

    await service.create({
      scope: readOnlyScope,
      values: {
        documentNo: "FAT-0007",
        invoiceDate: "2026-06-24",
        counterpartyCode: "TED-0001",
        counterpartyName: "ÖRNEK TEDARİKÇİ",
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        lines: [
          {
            stockName: "Yetkisiz Kayıt",
            unit: "Adet",
            quantity: 1,
            unitPrice: 100,
            vatRate: 20,
          },
        ],
      },
    });

    expect(auditEntries.map((entry) => entry.action)).toEqual([
      "purchase-invoice.create",
      "purchase-invoice.post",
      "purchase-invoice.cancel-rejected",
      "purchase-invoice.cancel-rejected",
    ]);
  });
  test("does not post cancelled invoice", async () => {
    const service = createPurchaseInvoiceService({
      repository: createSeededPurchaseInvoiceMemoryRepository(),
      now: () => "2026-06-25T10:00:00.000Z",
    });

    const createResult = await service.create({
      scope: defaultTenantScope,
      values: {
        documentNo: "FAT-0006",
        invoiceDate: "2026-06-23",
        counterpartyCode: "TED-0001",
        counterpartyName: "ÖRNEK TEDARİKÇİ",
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        lines: [
          {
            stockName: "Çimento Torba",
            unit: "Adet",
            quantity: 100,
            unitPrice: 150,
            discountRate1: 10,
            vatRate: 20,
          },
        ],
      },
    });

    if (!createResult.ok) {
      throw new Error(createResult.errors.join(", "));
    }

    await service.cancel({
      scope: defaultTenantScope,
      id: createResult.data.id,
    });

    await expect(
      service.post({
        scope: defaultTenantScope,
        id: createResult.data.id,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["İptal edilmiş fatura kesinleştirilemez."],
    });
  });

  test("rejects purchase invoice mutations for read only role", async () => {
    const service = createPurchaseInvoiceService({
      repository: createSeededPurchaseInvoiceMemoryRepository(),
      now: () => "2026-06-25T10:00:00.000Z",
    });

    const createResult = await service.create({
      scope: defaultTenantScope,
      values: {
        documentNo: "FAT-0006",
        invoiceDate: "2026-06-23",
        counterpartyCode: "TED-0001",
        counterpartyName: "ÖRNEK TEDARİKÇİ",
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        lines: [
          {
            stockName: "Çimento Torba",
            unit: "Adet",
            quantity: 100,
            unitPrice: 150,
            discountRate1: 10,
            vatRate: 20,
          },
        ],
      },
    });

    if (!createResult.ok) {
      throw new Error(createResult.errors.join(", "));
    }

    const denied = {
      ok: false,
      errors: ["Fatura işlemi için muhasebe yetkisi gereklidir."],
    };

    await expect(
      service.create({
        scope: readOnlyScope,
        values: {
          documentNo: "FAT-0007",
          invoiceDate: "2026-06-24",
          counterpartyCode: "TED-0001",
          counterpartyName: "ÖRNEK TEDARİKÇİ",
          siteCode: "SANT-0001",
          siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
          lines: [
            {
              stockName: "Nakliye",
              unit: "Sefer",
              quantity: 1,
              unitPrice: 100,
              vatRate: 20,
            },
          ],
        },
      }),
    ).resolves.toEqual(denied);

    await expect(
      service.update({
        scope: readOnlyScope,
        id: createResult.data.id,
        values: {
          documentNo: "FAT-0006",
          invoiceDate: "2026-06-23",
          counterpartyCode: "TED-0001",
          counterpartyName: "ÖRNEK TEDARİKÇİ",
          siteCode: "SANT-0001",
          siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
          lines: [
            {
              stockName: "Yetkisiz Düzeltme",
              unit: "Adet",
              quantity: 1,
              unitPrice: 100,
              vatRate: 20,
            },
          ],
        },
      }),
    ).resolves.toEqual(denied);

    await expect(
      service.cancel({
        scope: readOnlyScope,
        id: createResult.data.id,
      }),
    ).resolves.toEqual(denied);

    await expect(
      service.post({
        scope: readOnlyScope,
        id: createResult.data.id,
      }),
    ).resolves.toEqual(denied);

    await expect(service.list({ scope: readOnlyScope })).resolves.toEqual({
      ok: true,
      data: {
        rows: [
          expect.objectContaining({
            id: createResult.data.id,
            status: "Taslak",
            documentNo: "FAT-0006",
          }),
        ],
      },
    });
  });

  test("locks posted and cancelled purchase invoices against direct updates", async () => {
    let currentTime = "2026-07-15T08:00:00.000Z";
    const repository = createSeededPurchaseInvoiceMemoryRepository();
    const service = createPurchaseInvoiceService({
      now: () => currentTime,
      repository,
    });
    const postedCreate = await service.create({
      scope: defaultTenantScope,
      values: validPurchaseInvoiceValues("AF-LOCK-POSTED"),
    });
    const cancelledCreate = await service.create({
      scope: defaultTenantScope,
      values: validPurchaseInvoiceValues("AF-LOCK-CANCELLED"),
    });
    if (!postedCreate.ok || !cancelledCreate.ok) throw new Error("fixture failed");

    currentTime = "2026-07-15T09:00:00.000Z";
    await service.post({ scope: defaultTenantScope, id: postedCreate.data.id });
    await service.cancel({ scope: defaultTenantScope, id: cancelledCreate.data.id });

    await expect(
      service.update({
        scope: defaultTenantScope,
        id: postedCreate.data.id,
        values: validPurchaseInvoiceValues("AF-LOCK-POSTED"),
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Yalnız taslak alış faturası güncellenebilir."],
    });
    await expect(
      service.update({
        scope: defaultTenantScope,
        id: cancelledCreate.data.id,
        values: validPurchaseInvoiceValues("AF-LOCK-CANCELLED"),
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Yalnız taslak alış faturası güncellenebilir."],
    });
  });

  test("uses the purchase-only ledger posting service and returns ledger visibility once", async () => {
    let currentTime = "2026-07-15T10:00:00.000Z";
    const repository = createSeededPurchaseInvoiceMemoryRepository();
    const ledgerPost = vi.fn(async ({ invoice, scope }) => {
      const postedInvoice = await repository.update({
        ...invoice,
        status: "Kaydedildi" as const,
        updatedAt: currentTime,
        updatedBy: scope.userId,
      });
      return {
        ok: true as const,
        data: {
          created: true,
          invoice: postedInvoice,
          ledgerEntry: purchaseInvoiceLedgerEntry(postedInvoice),
        },
      };
    });
    const service = createPurchaseInvoiceService({
      ledgerPostingService: { post: ledgerPost },
      now: () => currentTime,
      repository,
    });
    const created = await service.create({
      scope: defaultTenantScope,
      values: validPurchaseInvoiceValues("AF-LEDGER-001"),
    });
    if (!created.ok) throw new Error(created.errors.join(", "));

    currentTime = "2026-07-15T11:00:00.000Z";
    const posted = await service.post({ scope: defaultTenantScope, id: created.data.id });
    expect(posted).toEqual({
      ok: true,
      data: expect.objectContaining({
        ledgerDocumentNo: "YVM-AF-AF-LEDGER-001",
        ledgerEntryId: `${created.data.id}::ledger-entry`,
        status: "Kaydedildi",
      }),
    });
    expect(ledgerPost).toHaveBeenCalledOnce();

    currentTime = "2026-07-15T12:00:00.000Z";
    await expect(
      service.post({ scope: defaultTenantScope, id: created.data.id }),
    ).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        status: "Kaydedildi",
        updatedAt: "2026-07-15T11:00:00.000Z",
      }),
    });
    expect(ledgerPost).toHaveBeenCalledOnce();
  });

  test("audits integrated posting rejections without leaking thrown persistence errors", async () => {
    const auditEntries: Array<{ action: string; metadata: Record<string, unknown> }> = [];
    const repository = createSeededPurchaseInvoiceMemoryRepository();
    const ledgerPost = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        errors: ["Kapalı dönemde alış faturası muhasebe fişi oluşturulamaz."],
        reasonCode: "period-closed",
      })
      .mockRejectedValueOnce(new Error("database password leaked"));
    const service = createPurchaseInvoiceService({
      auditLogRepository: {
        async record(entry) {
          auditEntries.push({ action: entry.action, metadata: entry.metadata });
        },
      },
      ledgerPostingService: { post: ledgerPost },
      now: () => "2026-07-15T13:00:00.000Z",
      repository,
    });
    const created = await service.create({
      scope: defaultTenantScope,
      values: validPurchaseInvoiceValues("AF-REJECT-001"),
    });
    if (!created.ok) throw new Error(created.errors.join(", "));

    await expect(
      service.post({
        scope: { ...defaultTenantScope, periodClosed: true },
        id: created.data.id,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Kapalı dönemde alış faturası muhasebe fişi oluşturulamaz."],
    });
    await expect(
      service.post({ scope: defaultTenantScope, id: created.data.id }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Alış faturası muhasebe fişi oluşturulamadı."],
    });

    const rejections = auditEntries.filter(
      (entry) => entry.action === "purchase-invoice.ledger-post-rejected",
    );
    expect(rejections).toHaveLength(2);
    expect(rejections.map((entry) => entry.metadata.reasonCode)).toEqual([
      "period-closed",
      "persistence-failed",
    ]);
    expect(JSON.stringify(rejections)).not.toContain("database password leaked");
    await expect(repository.list({ scope: defaultTenantScope })).resolves.toEqual([
      expect.objectContaining({ status: "Taslak" }),
    ]);
  });

  test("audits integrated permission, scope, not-found and cancelled rejections before posting", async () => {
    const auditEntries: Array<{ action: string; metadata: Record<string, unknown> }> = [];
    const repository = createSeededPurchaseInvoiceMemoryRepository();
    const ledgerPost = vi.fn();
    const service = createPurchaseInvoiceService({
      auditLogRepository: {
        async record(entry) {
          auditEntries.push({ action: entry.action, metadata: entry.metadata });
        },
      },
      ledgerPostingService: { post: ledgerPost },
      now: () => "2026-07-15T14:00:00.000Z",
      repository,
    });
    const created = await service.create({
      scope: defaultTenantScope,
      values: validPurchaseInvoiceValues("AF-REJECT-BOUNDARY"),
    });
    if (!created.ok) throw new Error(created.errors.join(", "));

    await service.post({ scope: readOnlyScope, id: created.data.id });
    await service.post({
      scope: { ...defaultTenantScope, tenantId: "" },
      id: created.data.id,
    });
    await service.post({ scope: defaultTenantScope, id: "missing-invoice" });
    await service.cancel({ scope: defaultTenantScope, id: created.data.id });
    await service.post({ scope: defaultTenantScope, id: created.data.id });

    expect(ledgerPost).not.toHaveBeenCalled();
    expect(
      auditEntries
        .filter((entry) => entry.action === "purchase-invoice.ledger-post-rejected")
        .map((entry) => entry.metadata.reasonCode),
    ).toEqual([
      "permission-denied",
      "scope-invalid",
      "invoice-not-found",
      "invalid-status",
    ]);
  });
});

function validPurchaseInvoiceValues(documentNo: string) {
  return {
    documentNo,
    invoiceDate: "2026-07-15",
    counterpartyCode: "TED-LEDGER",
    counterpartyName: "LEDGER TEDARİKÇİSİ",
    siteCode: "SANT-LEDGER",
    siteName: "LEDGER ŞANTİYESİ",
    lines: [
      {
        stockName: "Çimento",
        unit: "Adet",
        quantity: 10,
        unitPrice: 100,
        vatRate: 20,
      },
    ],
  };
}

function purchaseInvoiceLedgerEntry(invoice: {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  invoiceDate: string;
  currency: "TL" | "USD" | "EUR";
  documentNo: string;
  netTotal: number;
  vatTotal: number;
  grandTotal: number;
  updatedBy: string;
  updatedAt: string;
}) {
  return {
    id: `${invoice.id}::ledger-entry`,
    tenantId: invoice.tenantId,
    companyId: invoice.companyId,
    periodId: invoice.periodId,
    sourceType: "purchase-invoice" as const,
    sourceId: invoice.id,
    currency: invoice.currency,
    documentNo: `YVM-AF-${invoice.documentNo}`,
    entryDate: invoice.invoiceDate,
    description: `${invoice.documentNo} otomatik alış faturası fişi`,
    lines: [
      {
        accountCode: "153",
        accountName: "Ticari Mallar",
        amount: invoice.netTotal,
        direction: "debit" as const,
      },
      {
        accountCode: "191",
        accountName: "İndirilecek KDV",
        amount: invoice.vatTotal,
        direction: "debit" as const,
      },
      {
        accountCode: "320",
        accountName: "Satıcılar",
        amount: invoice.grandTotal,
        direction: "credit" as const,
      },
    ],
    status: "posted" as const,
    debitTotal: invoice.grandTotal,
    creditTotal: invoice.grandTotal,
    createdBy: invoice.updatedBy,
    updatedBy: invoice.updatedBy,
    createdAt: invoice.updatedAt,
    updatedAt: invoice.updatedAt,
  };
}

