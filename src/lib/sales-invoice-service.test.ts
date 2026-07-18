import { describe, expect, test, vi } from "vitest";

import type { AuditLogRepository } from "./audit-log";
import {
  createSalesInvoiceService,
  createSeededSalesInvoiceMemoryRepository,
} from "./sales-invoice-service";
import { createInvoiceLedgerReversalService } from "./invoice-ledger-reversal-service";
import { createLedgerService, createSeededLedgerMemoryRepository } from "./ledger-service";
import { defaultTenantScope } from "./tenant-scope";

const values = {
  counterpartyCode: "MUS-0001",
  counterpartyName: "ÖRNEK MÜŞTERİ",
  documentNo: "SAT-0001",
  invoiceDate: "2026-07-14",
  lines: [
    {
      quantity: 2,
      stockName: "Proje Hizmeti",
      unit: "Adet",
      unitPrice: 1000,
      vatRate: 20,
    },
  ],
  siteCode: "SANT-0001",
  siteName: "MERKEZ ŞANTİYESİ",
};

describe("sales invoice service", () => {
  test("validates customer separately from purchase invoice supplier", async () => {
    const service = createSalesInvoiceService({
      now: () => "2026-07-14T10:00:00.000Z",
      repository: createSeededSalesInvoiceMemoryRepository(),
    });

    const result = await service.create({
      scope: defaultTenantScope,
      values: { ...values, counterpartyCode: "", counterpartyName: "" },
    });

    expect(result).toEqual({ ok: false, errors: ["Müşteri zorunludur."] });
  });

  test("creates and posts a tenant-scoped sales invoice while rejecting reversal-free cancel", async () => {
    let now = "2026-07-14T10:00:00.000Z";
    const record = vi.fn<AuditLogRepository["record"]>();
    const service = createSalesInvoiceService({
      auditLogRepository: { record },
      now: () => now,
      repository: createSeededSalesInvoiceMemoryRepository(),
    });

    const created = await service.create({ scope: defaultTenantScope, values });
    expect(created).toEqual({
      ok: true,
      data: expect.objectContaining({
        grandTotal: 2400,
        id: expect.stringContaining("::sales-invoice::sat-0001"),
        status: "Taslak",
        tenantId: defaultTenantScope.tenantId,
      }),
    });
    if (!created.ok) throw new Error(created.errors.join(", "));

    now = "2026-07-14T11:00:00.000Z";
    const posted = await service.post({ scope: defaultTenantScope, id: created.data.id });
    expect(posted).toEqual({
      ok: true,
      data: expect.objectContaining({ status: "Kaydedildi" }),
    });

    now = "2026-07-14T12:00:00.000Z";
    const cancelled = await service.cancel({ scope: defaultTenantScope, id: created.data.id });
    expect(cancelled).toEqual({
      ok: false,
      errors: ["Kesinleşmiş satış faturası ters kayıt akışı uygulanmadan iptal edilemez."],
    });
    expect(record).toHaveBeenCalledTimes(3);
    expect(record.mock.calls.map(([entry]) => entry.action)).toEqual([
      "sales-invoice.create",
      "sales-invoice.post",
      "sales-invoice.cancel-rejected",
    ]);
  });

  test("isolates list results by tenant scope", async () => {
    const repository = createSeededSalesInvoiceMemoryRepository();
    const service = createSalesInvoiceService({
      now: () => "2026-07-14T10:00:00.000Z",
      repository,
    });
    await service.create({ scope: defaultTenantScope, values });

    const otherScope = {
      ...defaultTenantScope,
      companyId: "company-other",
      periodId: "period-other",
      tenantId: "tenant-other",
    };
    await expect(service.list({ scope: otherScope })).resolves.toEqual({
      ok: true,
      data: { rows: [] },
    });
  });

  test("reverses the source ledger before cancelling a posted sales invoice", async () => {
    const ledgerRepository = createSeededLedgerMemoryRepository();
    const invoiceRepository = createSeededSalesInvoiceMemoryRepository();
    const createResult = await createSalesInvoiceService({
      now: () => "2026-07-15T10:00:00.000Z",
      repository: invoiceRepository,
    }).create({ scope: defaultTenantScope, values });
    if (!createResult.ok) throw new Error(createResult.errors.join(", "));
    const posted = await createSalesInvoiceService({
      now: () => "2026-07-15T10:01:00.000Z",
      repository: invoiceRepository,
    }).post({ scope: defaultTenantScope, id: createResult.data.id });
    if (!posted.ok) throw new Error(posted.errors.join(", "));
    await createLedgerService({ repository: ledgerRepository }).post({
      scope: defaultTenantScope,
      draft: {
        currency: "TL",
        documentNo: "YVM-SF-SAT-0001",
        entryDate: values.invoiceDate,
        description: "Satış faturası",
        sourceType: "sales-invoice",
        sourceId: createResult.data.id,
        lines: [
          { accountCode: "120", accountName: "Alıcılar", amount: 2400, direction: "debit" },
          { accountCode: "600", accountName: "Yurtiçi Satışlar", amount: 2000, direction: "credit" },
          { accountCode: "391", accountName: "Hesaplanan KDV", amount: 400, direction: "credit" },
        ],
      },
    });
    const reversalService = createInvoiceLedgerReversalService({ kind: "sales", repository: ledgerRepository });
    const service = createSalesInvoiceService({
      now: () => "2026-07-15T10:02:00.000Z",
      repository: invoiceRepository,
      ledgerReversalService: reversalService,
      ledgerRepository,
    });
    const cancelled = await service.cancel({ scope: defaultTenantScope, id: createResult.data.id });
    expect(cancelled).toEqual({
      ok: true,
      data: expect.objectContaining({
        status: "İptal",
        ledgerDocumentNo: "YVM-SF-SAT-0001",
        ledgerReversalDocumentNo: "YVM-IA-YVM-SF-SAT-0001",
      }),
    });
    const entries = await ledgerRepository.list({ scope: defaultTenantScope });
    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceType: "sales-invoice-reversal", sourceId: createResult.data.id, documentNo: "YVM-IA-YVM-SF-SAT-0001" }),
    ]));
    await expect(createSalesInvoiceService({
      now: () => "2026-07-15T10:03:00.000Z",
      repository: invoiceRepository,
      ledgerRepository,
    }).list({ scope: defaultTenantScope })).resolves.toEqual({
      ok: true,
      data: {
        rows: [expect.objectContaining({
          id: createResult.data.id,
          ledgerDocumentNo: "YVM-SF-SAT-0001",
          ledgerReversalDocumentNo: "YVM-IA-YVM-SF-SAT-0001",
        })],
      },
    });
  });

  test("reverses linked collection movements before cancelling", async () => {
    const ledgerRepository = createSeededLedgerMemoryRepository();
    const invoiceRepository = createSeededSalesInvoiceMemoryRepository();
    const auditRecord = vi.fn<AuditLogRepository["record"]>();
    const createResult = await createSalesInvoiceService({
      now: () => "2026-07-15T10:00:00.000Z",
      repository: invoiceRepository,
    }).create({ scope: defaultTenantScope, values });
    if (!createResult.ok) throw new Error(createResult.errors.join(", "));
    const posted = await createSalesInvoiceService({
      now: () => "2026-07-15T10:01:00.000Z",
      repository: invoiceRepository,
    }).post({ scope: defaultTenantScope, id: createResult.data.id });
    if (!posted.ok) throw new Error(posted.errors.join(", "));
    await createLedgerService({ repository: ledgerRepository }).post({
      scope: defaultTenantScope,
      draft: {
        currency: "TL",
        documentNo: "YVM-SF-SAT-0001",
        entryDate: values.invoiceDate,
        description: "Satış faturası",
        sourceType: "sales-invoice",
        sourceId: createResult.data.id,
        lines: [
          { accountCode: "120", accountName: "Alıcılar", amount: 2400, direction: "debit" },
          { accountCode: "600", accountName: "Yurtiçi Satışlar", amount: 2000, direction: "credit" },
          { accountCode: "391", accountName: "Hesaplanan KDV", amount: 400, direction: "credit" },
        ],
      },
    });
    await createLedgerService({ repository: ledgerRepository }).post({
      scope: defaultTenantScope,
      draft: {
        currency: "TL",
        documentNo: "YVM-THS-SAT-0001-1",
        entryDate: values.invoiceDate,
        description: "Satış faturası tahsilatı",
        sourceType: "cash-bank-movement",
        sourceId: `movement-${createResult.data.id}`,
        lines: [
          { accountCode: "100", accountName: "Kasa", amount: 2400, direction: "debit" },
          { accountCode: "120", accountName: "Alıcılar", amount: 2400, direction: "credit" },
        ],
      },
    });
    const reversalService = createInvoiceLedgerReversalService({
      kind: "sales",
      repository: ledgerRepository,
      cashBankMovementRepository: {
        list: vi.fn().mockResolvedValue([
          {
            id: `movement-${createResult.data.id}`,
            documentNo: "YVM-THS-SAT-0001-1",
            movementDate: values.invoiceDate,
            sourceType: "sales-invoice",
            sourceId: createResult.data.id,
          },
        ]),
        create: vi.fn().mockImplementation(async (row) => row),
      } as never,
      auditLogRepository: { record: auditRecord },
    });
    const service = createSalesInvoiceService({
      now: () => "2026-07-15T10:02:00.000Z",
      repository: invoiceRepository,
      ledgerReversalService: reversalService,
    });
    await expect(service.cancel({ scope: defaultTenantScope, id: createResult.data.id })).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({ id: createResult.data.id, status: "İptal" }),
    });
    const entries = await ledgerRepository.list({ scope: defaultTenantScope });
    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceType: "cash-bank-movement-reversal", sourceId: `movement-${createResult.data.id}`, documentNo: "YVM-IA-YVM-THS-SAT-0001-1" }),
      expect.objectContaining({ sourceType: "sales-invoice-reversal", sourceId: createResult.data.id }),
    ]));
    expect(auditRecord.mock.calls.map(([entry]) => entry.action)).toEqual([
      "ledger.entry.post",
      "ledger.entry.post",
    ]);
  });
});
